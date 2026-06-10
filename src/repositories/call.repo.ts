// src/repositories/call.repo.ts
import { prisma } from '../lib/prisma'
import { AppError, ErrorCode, ok, err, Result } from '../types/result.types'
import type { Call, Prisma } from '@prisma/client'

export async function create(data: {
  telnyxCallControlId: string
  telnyxCallSessionId?: string
  direction: 'INBOUND' | 'OUTBOUND'
  fromNumber: string
  toNumber: string
  userId?: string
  campaignId?: string
  scheduledAt?: Date
}): Promise<Result<Call, AppError>> {
  try {
    const call = await prisma.call.create({ data })
    return ok(call)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to create call', error))
  }
}

export async function findById(id: string): Promise<Result<Call, AppError>> {
  try {
    const call = await prisma.call.findUnique({ where: { id } })
    if (!call) return err(new AppError(ErrorCode.NOT_FOUND, `Call ${id} not found`))
    return ok(call)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to fetch call', error))
  }
}

export async function findByTelnyxCallControlId(callControlId: string): Promise<Result<Call, AppError>> {
  try {
    const call = await prisma.call.findUnique({
      where: { telnyxCallControlId: callControlId },
    })
    if (!call) return err(new AppError(ErrorCode.NOT_FOUND, `Call with controlId ${callControlId} not found`))
    return ok(call)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to fetch call by controlId', error))
  }
}

export async function updateStatus(
  id: string,
  status: 'INITIATED' | 'RINGING' | 'ANSWERED' | 'QUEUED' | 'COMPLETED' | 'FAILED'
): Promise<Result<Call, AppError>> {
  try {
    const call = await prisma.call.update({ where: { id }, data: { status } })
    return ok(call)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to update call status', error))
  }
}

export async function setAgent(callId: string, agentId: string): Promise<Result<Call, AppError>> {
  try {
    const call = await prisma.call.update({
      where: { id: callId },
      data: { agentId, status: 'ANSWERED' },
    })
    return ok(call)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to assign agent to call', error))
  }
}

export async function setRecordingUrl(callId: string, url: string): Promise<Result<Call, AppError>> {
  try {
    const call = await prisma.call.update({
      where: { id: callId },
      data: { recordingUrl: url },
    })
    return ok(call)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to set recording URL', error))
  }
}

export async function complete(
  callId: string,
  durationSeconds: number
): Promise<Result<Call, AppError>> {
  try {
    const call = await prisma.call.update({
      where: { id: callId },
      data: { status: 'COMPLETED', durationSeconds },
    })
    return ok(call)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to complete call', error))
  }
}

export async function setIvrPath(callId: string, ivrPath: string): Promise<Result<Call, AppError>> {
  try {
    const call = await prisma.call.update({
      where: { id: callId },
      data: { ivrPath },
    })
    return ok(call)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to set IVR path', error))
  }
}

export interface ListCallsFilters {
  status?: string
  agentId?: string
  direction?: 'INBOUND' | 'OUTBOUND'
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}

export async function listWithFilters(
  filters: ListCallsFilters
): Promise<Result<{ calls: Call[]; total: number }, AppError>> {
  const { status, agentId, direction, from, to, limit = 20, offset = 0 } = filters
  try {
    const where: Prisma.CallWhereInput = {
      ...(status ? { status: status as Call['status'] } : {}),
      ...(agentId ? { agentId } : {}),
      ...(direction ? { direction } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    }

    const [calls, total] = await prisma.$transaction([
      prisma.call.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: { agent: true, queueEntry: true },
      }),
      prisma.call.count({ where }),
    ])

    return ok({ calls, total })
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to list calls', error))
  }
}

export async function logEvent(
  callId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<Result<void, AppError>> {
  try {
    await prisma.callEvent.create({
      data: { callId, eventType, payload: payload as any },
    })
    return ok(undefined)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to log call event', error))
  }
}
