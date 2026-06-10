// src/services/queue.service.ts
import * as queueRepo from '../repositories/queue.repo'
import * as routingService from './routing.service'
import * as realtimeService from './realtime.service'
import { getQueueLength, incrQueueLength, decrQueueLength, getAvgHandleTime } from '../lib/redis'
import { AppError, ErrorCode, ok, err, Result } from '../types/result.types'
import { createLogger } from '../lib/logger'
import type { QueueEntry, Call } from '@prisma/client'

const MAX_QUEUE_SIZE = 50

export async function enqueue(
  call: Call,
  skill: string,
  isVip: boolean,
  requestId?: string
): Promise<Result<QueueEntry, AppError>> {
  const log = createLogger(requestId, { callId: call.id, skill, isVip })
  log.info('queueService.enqueue: start')

  // Check queue capacity
  const currentLength = await getQueueLength(skill)
  if (currentLength >= MAX_QUEUE_SIZE) {
    log.warn({ currentLength }, 'Queue full')
    return err(new AppError(ErrorCode.QUEUE_FULL, `Queue for skill ${skill} is full`))
  }

  const priority = isVip ? 1 : 0
  const entryResult = await queueRepo.enqueue(call.id, priority, skill)
  if (!entryResult.ok) return entryResult

  await incrQueueLength(skill)

  const entry = entryResult.value

  // Calculate estimated wait
  const waitResult = await getEstimatedWait(skill)
  const waitSecs = waitResult.ok ? waitResult.value : 0

  await queueRepo.updateEstimatedWait(call.id, waitSecs)

  // Broadcast
  await realtimeService.broadcastQueuePositionUpdated({
    callId: call.id,
    position: entry.position,
    estimatedWaitSecs: waitSecs,
    skill,
    updatedAt: new Date().toISOString(),
  })

  log.info({ position: entry.position, waitSecs }, 'queueService.enqueue: done')
  return ok({ ...entry, estimatedWaitSecs: waitSecs })
}

export async function processQueue(
  skill?: string,
  requestId?: string
): Promise<Result<number, AppError>> {
  const log = createLogger(requestId, { skill })
  log.info('queueService.processQueue: start')

  const snapshotResult = await queueRepo.getQueueSnapshot(skill)
  if (!snapshotResult.ok) return snapshotResult

  const entries = snapshotResult.value
  let assigned = 0

  for (const entry of entries) {
    const requiredSkill = entry.requiredSkill ?? (skill ?? 'general')

    const routeResult = await routingService.routeCall(
      entry.callId,
      requiredSkill,
      entry.priority,
      requestId
    )

    if (!routeResult.ok) {
      // No agents for this skill — stop trying for this skill
      log.info({ skill: requiredSkill }, 'processQueue: no agent available, stopping')
      break
    }

    const agent = routeResult.value

    // Remove from queue
    const removeResult = await queueRepo.removeFromQueue(entry.callId)
    if (!removeResult.ok) {
      log.warn({ callId: entry.callId }, 'processQueue: failed to remove entry from queue')
      continue
    }

    await decrQueueLength(entry.requiredSkill ?? undefined)
    assigned++

    // Broadcast
    await realtimeService.broadcastCallAssigned({
      callId: entry.callId,
      agentId: agent.id,
      agentName: agent.name,
      assignedAt: new Date().toISOString(),
    })

    await realtimeService.broadcastAgentStatusChanged({
      agentId: agent.id,
      status: 'BUSY',
      currentCallId: entry.callId,
      updatedAt: new Date().toISOString(),
    })
  }

  log.info({ assigned }, 'queueService.processQueue: done')
  return ok(assigned)
}

export async function getEstimatedWait(skill?: string): Promise<Result<number, AppError>> {
  try {
    const queueLength = await getQueueLength(skill)
    const avgHandleTime = await getAvgHandleTime()
    const waitSecs = queueLength * avgHandleTime
    return ok(waitSecs)
  } catch (error) {
    return err(new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to calculate estimated wait', error))
  }
}

export async function removeFromQueue(callId: string): Promise<Result<void, AppError>> {
  const removeResult = await queueRepo.removeFromQueue(callId)
  if (!removeResult.ok) return removeResult
  // Note: we don't know skill here easily, so Redis counter decrement done by caller
  return ok(undefined)
}