// src/services/call.service.ts
import * as callRepo from '../repositories/call.repo'
import * as agentRepo from '../repositories/agent.repo'
import * as realtimeService from './realtime.service'
import { setAgentStatus, updateAvgHandleTime } from '../lib/redis'
import { AppError, ErrorCode, ok, err, Result } from '../types/result.types'
import { createLogger } from '../lib/logger'
import type { Call } from '@prisma/client'

export async function assignAgent(
  callId: string,
  agentId: string,
  requestId?: string
): Promise<Result<Call, AppError>> {
  const log = createLogger(requestId, { callId, agentId })
  log.info('callService.assignAgent: start')

  const agentResult = await agentRepo.findById(agentId)
  if (!agentResult.ok) return agentResult

  if (agentResult.value.status !== 'ONLINE') {
    return err(new AppError(ErrorCode.CONFLICT, 'Agent is not available'))
  }

  const callResult = await callRepo.setAgent(callId, agentId)
  if (!callResult.ok) return callResult

  const assignResult = await agentRepo.assignCall(agentId, callId)
  if (!assignResult.ok) return assignResult

  await setAgentStatus(agentId, 'BUSY')

  await realtimeService.broadcastCallUpdated({
    callId,
    status: 'ANSWERED',
    agentId,
    updatedAt: new Date().toISOString(),
  })

  await realtimeService.broadcastAgentStatusChanged({
    agentId,
    status: 'BUSY',
    currentCallId: callId,
    updatedAt: new Date().toISOString(),
  })

  log.info('callService.assignAgent: done')
  return ok(callResult.value)
}

export async function completeCall(
  callId: string,
  durationSeconds: number,
  requestId?: string
): Promise<Result<Call, AppError>> {
  const log = createLogger(requestId, { callId, durationSeconds })
  log.info('callService.completeCall: start')

  const callResult = await callRepo.complete(callId, durationSeconds)
  if (!callResult.ok) return callResult

  const call = callResult.value

  // Unassign agent if assigned
  if (call.agentId) {
    const unassignResult = await agentRepo.unassignCall(call.agentId)
    if (!unassignResult.ok) {
      log.warn({ agentId: call.agentId }, 'callService.completeCall: failed to unassign agent')
    } else {
      await setAgentStatus(call.agentId, 'ONLINE')

      await realtimeService.broadcastAgentStatusChanged({
        agentId: call.agentId,
        status: 'ONLINE',
        currentCallId: null,
        updatedAt: new Date().toISOString(),
      })
    }

    // Update rolling average handle time
    if (durationSeconds > 0) {
      await updateAvgHandleTime(durationSeconds)
    }
  }

  await realtimeService.broadcastCallUpdated({
    callId,
    status: 'COMPLETED',
    agentId: call.agentId ?? undefined,
    updatedAt: new Date().toISOString(),
  })

  log.info('callService.completeCall: done')
  return ok(call)
}

export async function failCall(
  callId: string,
  requestId?: string
): Promise<Result<Call, AppError>> {
  const log = createLogger(requestId, { callId })
  log.info('callService.failCall: start')

  const callResult = await callRepo.updateStatus(callId, 'FAILED')
  if (!callResult.ok) return callResult

  const call = callResult.value

  if (call.agentId) {
    await agentRepo.unassignCall(call.agentId)
    await setAgentStatus(call.agentId, 'ONLINE')

    await realtimeService.broadcastAgentStatusChanged({
      agentId: call.agentId,
      status: 'ONLINE',
      currentCallId: null,
      updatedAt: new Date().toISOString(),
    })
  }

  await realtimeService.broadcastCallUpdated({
    callId,
    status: 'FAILED',
    updatedAt: new Date().toISOString(),
  })

  log.info('callService.failCall: done')
  return ok(call)
}

export async function getCallById(id: string): Promise<Result<Call, AppError>> {
  return callRepo.findById(id)
}

export async function listCalls(filters: callRepo.ListCallsFilters): Promise<Result<{ calls: Call[]; total: number }, AppError>> {
  return callRepo.listWithFilters(filters)
}