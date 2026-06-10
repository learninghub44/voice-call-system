// src/services/routing.service.ts
import * as agentRepo from '../repositories/agent.repo'
import * as callRepo from '../repositories/call.repo'
import { setAgentStatus, getRoundRobinIndex } from '../lib/redis'
import { AppError, ErrorCode, ok, err, Result } from '../types/result.types'
import { createLogger } from '../lib/logger'
import type { Agent } from '@prisma/client'

export async function routeCall(
  callId: string,
  skill: string,
  priority: number,
  requestId?: string
): Promise<Result<Agent, AppError>> {
  const log = createLogger(requestId, { callId, skill, priority })
  const start = Date.now()
  log.info('routeCall: start')

  // Step 1: Find skill-matched ONLINE agents
  let agentsResult = await agentRepo.findAvailableBySkill(skill)
  if (!agentsResult.ok) return agentsResult

  let agents = agentsResult.value

  // Step 2: Fallback to any ONLINE agent if no skill match
  if (agents.length === 0) {
    log.info({ skill }, 'No skill-matched agents, falling back to any ONLINE agent')
    const fallbackResult = await agentRepo.findOnlineAgents()
    if (!fallbackResult.ok) return fallbackResult
    agents = fallbackResult.value
  }

  if (agents.length === 0) {
    log.info('No available agents, queuing call')
    return err(new AppError(ErrorCode.NO_AGENT_AVAILABLE, 'No agents available'))
  }

  // Step 3: Round-robin selection using Redis counter
  const rrIndex = await getRoundRobinIndex(skill)
  const selectedAgent = agents[rrIndex % agents.length]!

  // Step 4: VIP logic — for v1 we still assign from available agents, flag for v2 upgrade
  if (priority === 1) {
    log.info({ agentId: selectedAgent.id }, 'VIP caller — assigning with priority')
  }

  // Step 5: Assign call to agent
  const assignResult = await agentRepo.assignCall(selectedAgent.id, callId)
  if (!assignResult.ok) return assignResult

  // Step 6: Update call with agentId
  const callResult = await callRepo.setAgent(callId, selectedAgent.id)
  if (!callResult.ok) return callResult

  // Step 7: Sync status to Redis
  await setAgentStatus(selectedAgent.id, 'BUSY')

  log.info({ agentId: selectedAgent.id, durationMs: Date.now() - start }, 'routeCall: assigned')
  return ok(assignResult.value)
}