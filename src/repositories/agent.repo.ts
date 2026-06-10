// src/repositories/agent.repo.ts
import { prisma } from '../lib/prisma'
import { AppError, ErrorCode, ok, err, Result } from '../types/result.types'
import type { Agent, Prisma } from '@prisma/client'

export async function findById(id: string): Promise<Result<Agent, AppError>> {
  try {
    const agent = await prisma.agent.findUnique({ where: { id } })
    if (!agent) return err(new AppError(ErrorCode.NOT_FOUND, `Agent ${id} not found`))
    return ok(agent)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to fetch agent', error))
  }
}

export async function findAll(): Promise<Result<Agent[], AppError>> {
  try {
    const agents = await prisma.agent.findMany({ orderBy: { createdAt: 'desc' } })
    return ok(agents)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to fetch agents', error))
  }
}

export async function findAvailableBySkill(skill: string): Promise<Result<Agent[], AppError>> {
  try {
    const agents = await prisma.agent.findMany({
      where: {
        status: 'ONLINE',
        skills: { has: skill },
      },
      orderBy: [{ currentCallId: 'asc' }],
    })
    return ok(agents)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to fetch available agents', error))
  }
}

export async function findOnlineAgents(): Promise<Result<Agent[], AppError>> {
  try {
    const agents = await prisma.agent.findMany({
      where: { status: 'ONLINE' },
      orderBy: { createdAt: 'asc' },
    })
    return ok(agents)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to fetch online agents', error))
  }
}

export async function updateStatus(
  id: string,
  status: 'ONLINE' | 'BUSY' | 'OFFLINE' | 'BREAK'
): Promise<Result<Agent, AppError>> {
  try {
    const agent = await prisma.agent.update({
      where: { id },
      data: { status },
    })
    return ok(agent)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to update agent status', error))
  }
}

export async function assignCall(agentId: string, callId: string): Promise<Result<Agent, AppError>> {
  try {
    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: 'BUSY',
        currentCallId: callId,
      },
    })
    return ok(agent)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to assign call to agent', error))
  }
}

export async function unassignCall(agentId: string): Promise<Result<Agent, AppError>> {
  try {
    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: 'ONLINE',
        currentCallId: null,
      },
    })
    return ok(agent)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to unassign call from agent', error))
  }
}

export interface ListAgentsParams {
  limit?: number
  offset?: number
  status?: 'ONLINE' | 'BUSY' | 'OFFLINE' | 'BREAK'
}

export async function list(params: ListAgentsParams = {}): Promise<Result<{ agents: Agent[]; total: number }, AppError>> {
  const { limit = 20, offset = 0, status } = params
  try {
    const where: Prisma.AgentWhereInput = status ? { status } : {}
    const [agents, total] = await prisma.$transaction([
      prisma.agent.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.agent.count({ where }),
    ])
    return ok({ agents, total })
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to list agents', error))
  }
}

export async function create(data: {
  name: string
  email: string
  skills: string[]
  shiftStart?: Date
  shiftEnd?: Date
}): Promise<Result<Agent, AppError>> {
  try {
    const agent = await prisma.agent.create({ data })
    return ok(agent)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to create agent', error))
  }
}

export async function update(
  id: string,
  data: Partial<{ name: string; email: string; skills: string[]; shiftStart: Date; shiftEnd: Date; status: 'ONLINE' | 'BUSY' | 'OFFLINE' | 'BREAK' }>
): Promise<Result<Agent, AppError>> {
  try {
    const agent = await prisma.agent.update({ where: { id }, data })
    return ok(agent)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to update agent', error))
  }
}