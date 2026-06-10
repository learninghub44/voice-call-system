// src/workers/automation-rules.ts
import { prisma } from '../lib/prisma'
import * as automationService from '../services/automation.service'
import { acquireLock, releaseLock } from '../lib/redis'
import { createLogger } from '../lib/logger'
import { randomUUID } from 'crypto'

const LOCK_KEY = 'automation:rules:lock'
const LOCK_TTL = 55 // seconds

// Evaluates automation rules for recent calls that haven't been processed yet.
// This acts as a catch-up for any calls that missed real-time evaluation.
export async function runAutomationRules(): Promise<void> {
  const requestId = randomUUID()
  const log = createLogger(requestId)
  log.info('automation-rules: starting')

  const acquired = await acquireLock(LOCK_KEY, LOCK_TTL)
  if (!acquired) {
    log.info('automation-rules: lock not acquired, skipping')
    return
  }

  try {
    // Find completed/failed calls from last 10 minutes that may not have been evaluated
    const since = new Date(Date.now() - 10 * 60 * 1000)

    const recentCalls = await prisma.call.findMany({
      where: {
        status: { in: ['COMPLETED', 'FAILED'] },
        updatedAt: { gte: since },
        agentId: null,  // missed calls
      },
      take: 50,
      orderBy: { updatedAt: 'desc' },
    })

    log.info({ count: recentCalls.length }, 'automation-rules: evaluating recent calls')

    for (const call of recentCalls) {
      const result = await automationService.evaluatePostCall(call.id, requestId)
      if (!result.ok) {
        log.warn({ callId: call.id, error: result.error.message }, 'automation-rules: evaluation failed')
      }
    }

    log.info('automation-rules: done')
  } catch (error) {
    log.error({ error }, 'automation-rules: unexpected error')
  } finally {
    await releaseLock(LOCK_KEY)
  }
}