// src/services/sms.service.ts
import { telnyx } from '../lib/telnyx'
import * as smsRepo from '../repositories/sms.repo'
import { env } from '../config/env'
import { AppError, ErrorCode, ok, err, Result } from '../types/result.types'
import { createLogger } from '../lib/logger'
import type { SmsLog } from '@prisma/client'

export interface SendSmsParams {
  to: string
  body: string
  trigger: 'MISSED_CALL' | 'OTP' | 'REMINDER' | 'CALLBACK_ALERT'
}

export async function send(
  params: SendSmsParams,
  requestId?: string
): Promise<Result<SmsLog, AppError>> {
  const log = createLogger(requestId, { to: '[redacted]', trigger: params.trigger })
  log.info('smsService.send: start')

  try {
    const response = await telnyx.messages.create({
      from: env.TELNYX_PHONE_NUMBER,
      to: params.to,
      text: params.body,
    })

    const data = response.data as { id: string; to: Array<{ status: string }> }
    const telnyxMessageId = data?.id
    const status = data?.to?.[0]?.status ?? 'sent'

    const logResult = await smsRepo.create({
      to: params.to,
      from: env.TELNYX_PHONE_NUMBER,
      body: params.body,
      trigger: params.trigger,
      telnyxMessageId,
      status,
    })

    if (!logResult.ok) {
      log.warn({ trigger: params.trigger }, 'smsService.send: message sent but failed to log')
      return logResult
    }

    log.info({ trigger: params.trigger, telnyxMessageId }, 'smsService.send: done')
    return ok(logResult.value)
  } catch (error) {
    const appError = new AppError(ErrorCode.TELNYX_ERROR, 'Failed to send SMS', error)
    log.error({ error: appError.message }, 'smsService.send: failed')
    return err(appError)
  }
}

// ─── SMS Templates ────────────────────────────────────────────────────────────

export function missedCallTemplate(callerNumber: string): string {
  return `We missed your call from ${callerNumber}. Please call us back at ${env.TELNYX_PHONE_NUMBER} or reply to schedule a callback.`
}

export function otpCodeTemplate(code: string): string {
  return `Your verification code is: ${code}. Valid for 10 minutes. Do not share this code.`
}

export function callbackAlertTemplate(etaMinutes: number): string {
  return `Good news! An agent will call you back in approximately ${etaMinutes} minute${etaMinutes !== 1 ? 's' : ''}. Please keep your phone nearby.`
}

export function reminderTemplate(text: string): string {
  return `Reminder: ${text}. Reply STOP to unsubscribe.`
}

export async function sendMissedCall(
  to: string,
  callerNumber: string,
  requestId?: string
): Promise<Result<SmsLog, AppError>> {
  return send({ to, body: missedCallTemplate(callerNumber), trigger: 'MISSED_CALL' }, requestId)
}

export async function sendOtp(
  to: string,
  code: string,
  requestId?: string
): Promise<Result<SmsLog, AppError>> {
  return send({ to, body: otpCodeTemplate(code), trigger: 'OTP' }, requestId)
}

export async function sendCallbackAlert(
  to: string,
  etaMinutes: number,
  requestId?: string
): Promise<Result<SmsLog, AppError>> {
  return send({ to, body: callbackAlertTemplate(etaMinutes), trigger: 'CALLBACK_ALERT' }, requestId)
}

export async function sendReminder(
  to: string,
  text: string,
  requestId?: string
): Promise<Result<SmsLog, AppError>> {
  return send({ to, body: reminderTemplate(text), trigger: 'REMINDER' }, requestId)
}