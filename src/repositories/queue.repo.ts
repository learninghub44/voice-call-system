// src/repositories/queue.repo.ts
import { prisma } from '../lib/prisma'
import { AppError, ErrorCode, ok, err, Result } from '../types/result.types'
import type { QueueEntry } from '@prisma/client'

export async function enqueue(
  callId: string,
  priority: number,
  skill?: string
): Promise<Result<QueueEntry, AppError>> {
  try {
    const entry = await prisma.$transaction(async (tx) => {
      // Find current max position for this skill
      const maxEntry = await tx.queueEntry.findFirst({
        where: skill ? { requiredSkill: skill } : { requiredSkill: null },
        orderBy: { position: 'desc' },
      })

      let position: number
      if (priority === 1) {
        // VIP: place at front (min position - 1)
        const minEntry = await tx.queueEntry.findFirst({
          where: skill ? { requiredSkill: skill } : { requiredSkill: null },
          orderBy: { position: 'asc' },
        })
        position = minEntry ? minEntry.position - 1 : 1
      } else {
        position = maxEntry ? maxEntry.position + 1 : 1
      }

      return tx.queueEntry.create({
        data: {
          callId,
          position,
          priority,
          requiredSkill: skill ?? null,
          estimatedWaitSecs: 0,
        },
      })
    })

    // Update call status to QUEUED
    await prisma.call.update({
      where: { id: callId },
      data: { status: 'QUEUED' },
    })

    return ok(entry)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to enqueue call', error))
  }
}

export async function dequeue(skill?: string): Promise<Result<QueueEntry | null, AppError>> {
  try {
    const entry = await prisma.queueEntry.findFirst({
      where: skill ? { requiredSkill: skill } : {},
      orderBy: [{ priority: 'desc' }, { enteredAt: 'asc' }],
    })
    return ok(entry)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to dequeue', error))
  }
}

export async function getPosition(callId: string): Promise<Result<number, AppError>> {
  try {
    const entry = await prisma.queueEntry.findUnique({
      where: { callId },
    })
    if (!entry) return err(new AppError(ErrorCode.NOT_FOUND, `Queue entry for call ${callId} not found`))
    return ok(entry.position)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to get queue position', error))
  }
}

export async function updateEstimatedWait(
  callId: string,
  secs: number
): Promise<Result<QueueEntry, AppError>> {
  try {
    const entry = await prisma.queueEntry.update({
      where: { callId },
      data: { estimatedWaitSecs: secs },
    })
    return ok(entry)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to update estimated wait', error))
  }
}

export async function removeFromQueue(callId: string): Promise<Result<void, AppError>> {
  try {
    await prisma.queueEntry.delete({ where: { callId } })
    return ok(undefined)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to remove from queue', error))
  }
}

export async function getQueueSnapshot(skill?: string): Promise<Result<QueueEntry[], AppError>> {
  try {
    const entries = await prisma.queueEntry.findMany({
      where: skill ? { requiredSkill: skill } : {},
      orderBy: [{ priority: 'desc' }, { enteredAt: 'asc' }],
      include: { call: true },
    })
    return ok(entries)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to get queue snapshot', error))
  }
}

export async function countBySkill(skill?: string): Promise<Result<number, AppError>> {
  try {
    const count = await prisma.queueEntry.count({
      where: skill ? { requiredSkill: skill } : {},
    })
    return ok(count)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to count queue', error))
  }
}