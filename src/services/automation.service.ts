// src/services/automation.service.ts
import { prisma } from '../lib/prisma'
import * as smsService from './sms.service'
import * as outboundService from './outbound.service'
import * as routingService from './routing.service'
import { AppError, ErrorCode, ok, err, Result } from '../types/result.types'
import { createLogger } from '../lib/logger'

interface AutomationCondition {
  skill?: string
  minCallCount?: number
  afterHour?: number
  beforeHour?: number
}

function evaluateCondition(
  condition: AutomationCondition,
  context: {
    callCount: number
    ivrPath?: string | null
    callCreatedAt: Date
  }
): boolean {
  const hour = context.callCreatedAt.getHours()

  if (condition.minCallCount !== undefined && context.callCount < condition.minCallCount) {
    return false
  }

  if (condition.afterHour !== undefined && hour < condition.afterHour) {
    return false
  }

  if (condition.beforeHour !== undefined && hour >= condition.beforeHour) {
    return false
  }

  if (condition.skill !== undefined && context.ivrPath !== condition.skill) {
    return false
  }

  return true
}

export async function evaluatePostCall(
  callId: string,
  requestId?: string
): Promise<Result<void, AppError>> {
  const log = createLogger(requestId, { callId })
  log.info('automationService.evaluatePostCall: start')

  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: { user: true },
  })

  if (!call) {
    return err(new AppError(ErrorCode.NOT_FOUND, `Call ${callId} not found for automation`))
  }

  const rules = await prisma.automationRule.findMany({
    where: { enabled: true },
  })

  const callCount = call.user?.callCount ?? 0
  const isMissedCall =
    !call.agentId &&
    (call.status === 'FAILED' || (call.durationSeconds !== null && call.durationSeconds < 10))

  for (const rule of rules) {
    const condition = rule.condition as AutomationCondition

    const shouldFire =
      (rule.trigger === 'MISSED_CALL' && isMissedCall) ||
      (rule.trigger === 'VIP_CALLER' && call.user?.isVip === true) ||
      (rule.trigger === 'REPEAT_CALLER' &&
        evaluateCondition(condition, {
          callCount,
          ivrPath: call.ivrPath,
          callCreatedAt: call.createdAt,
        })) ||
      (rule.trigger === 'AFTER_HOURS' &&
        evaluateCondition(condition, {
          callCount,
          ivrPath: call.ivrPath,
          callCreatedAt: call.createdAt,
        }))

    if (!shouldFire) continue

    log.info({ ruleId: rule.id, trigger: rule.trigger, action: rule.action }, 'automation: rule fired')

    if (rule.action === 'SEND_SMS' && call.fromNumber) {
      await smsService.sendMissedCall(call.fromNumber, call.fromNumber, requestId)
    }

    if (rule.action === 'CALLBACK' && call.fromNumber) {
      await outboundService.initiateCall({ to: call.fromNumber }, requestId)
    }

    if (rule.action === 'PRIORITY_ROUTE' && call.ivrPath) {
      await routingService.routeCall(call.id, call.ivrPath, 1, requestId)
    }

    // Mark rule last fired
    await prisma.automationRule.update({
      where: { id: rule.id },
      data: { lastFiredAt: new Date() },
    })
  }

  log.info('automationService.evaluatePostCall: done')
  return ok(undefined)
}