// src/services/agent.service.ts
import * as agentRepo from '../repositories/agent.repo'
import * as realtimeService from './realtime.service'
import { setAgentStatus, addAgentToActiveSet, removeAgentFromActiveSet } from '../lib/redis'
import { AppError, ok, Result } from '../types/result.types'
import { createLogger } from '../lib/logger'
import type { Agent } from '@prisma/client'

export async function setStatus(
  agentId: string,
  status: 'ONLINE' | 'BUSY' | 'OFFLINE' | 'BREAK',
  requestId?: string
): Promise<Result<Agent, AppError>> {
  const log = createLogger(requestId, { agentId, status })
  log.info('agentService.setStatus: start')

  const result = await agentRepo.updateStatus(agentId, status)
  if (!result.ok) return result

  // Sync to Redis
  await setAgentStatus(agentId, status)

  if (status === 'ONLINE' || status === 'BUSY') {
    await addAgentToActiveSet(agentId)
  } else {
    await removeAgentFromActiveSet(agentId)
  }

  await realtimeService.broadcastAgentStatusChanged({
    agentId,
    status,
    currentCallId: result.value.currentCallId,
    updatedAt: new Date().toISOString(),
  })

  log.info('agentService.setStatus: done')
  return ok(result.value)
}

export async function getById(agentId: string): Promise<Result<Agent, AppError>> {
  return agentRepo.findById(agentId)
}

export async function getAll(): Promise<Result<Agent[], AppError>> {
  return agentRepo.findAll()
}

export async function getAvailability(): Promise<Result<{ online: number; busy: number; offline: number; break: number }, AppError>> {
  const result = await agentRepo.findAll()
  if (!result.ok) return result

  const counts = result.value.reduce(
    (acc, agent) => {
      const key = agent.status.toLowerCase() as 'online' | 'busy' | 'offline' | 'break'
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    },
    { online: 0, busy: 0, offline: 0, break: 0 }
  )

  return ok(counts)
}

export async function updateAgent(
  agentId: string,
  data: Partial<{ name: string; email: string; skills: string[]; shiftStart: Date; shiftEnd: Date }>,
  requestId?: string
): Promise<Result<Agent, AppError>> {
  const log = createLogger(requestId, { agentId })
  log.info('agentService.updateAgent: start')
  const result = await agentRepo.update(agentId, data)
  log.info('agentService.updateAgent: done')
  return result
}