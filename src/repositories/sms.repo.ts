// src/repositories/sms.repo.ts
import { prisma } from '../lib/prisma'
import { AppError, ErrorCode, ok, err, Result } from '../types/result.types'
import type { SmsLog } from '@prisma/client'

export async function create(data: {
  to: string
  from: string
  body: string
  trigger: 'MISSED_CALL' | 'OTP' | 'REMINDER' | 'CALLBACK_ALERT'
  telnyxMessageId?: string
  status?: string
}): Promise<Result<SmsLog, AppError>> {
  try {
    const smsLog = await prisma.smsLog.create({ data })
    return ok(smsLog)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to create SMS log', error))
  }
}

export async function updateStatus(
  telnyxMessageId: string,
  status: string
): Promise<Result<SmsLog, AppError>> {
  try {
    const smsLog = await prisma.smsLog.update({
      where: { telnyxMessageId },
      data: { status },
    })
    return ok(smsLog)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to update SMS status', error))
  }
}

export async function findById(id: string): Promise<Result<SmsLog, AppError>> {
  try {
    const smsLog = await prisma.smsLog.findUnique({ where: { id } })
    if (!smsLog) return err(new AppError(ErrorCode.NOT_FOUND, `SMS log ${id} not found`))
    return ok(smsLog)
  } catch (error) {
    return err(new AppError(ErrorCode.DB_ERROR, 'Failed to fetch SMS log', error))
  }
}