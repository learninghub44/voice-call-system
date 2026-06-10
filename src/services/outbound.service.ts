// src/services/outbound.service.ts
import * as callRepo from '../repositories/call.repo'
import { calls as telnyxCalls } from '../lib/telnyx'
import { env } from '../config/env'
import { AppError, ErrorCode, ok, err, Result } from '../types/result.types'
import { createLogger } from '../lib/logger'
import type { Call } from '@prisma/client'

export interface InitiateCallParams {
  to: string
  from?: string
  campaignId?: string
  scheduledAt?: Date
}

export async function initiateCall(
  params: InitiateCallParams,
  requestId?: string
): Promise<Result<Call, AppError>> {
  const log = createLogger(requestId, { to: '[redacted]', campaignId: params.campaignId })
  log.info('outboundService.initiateCall: start')

  const from = params.from ?? env.TELNYX_PHONE_NUMBER

  const initiateResult = await telnyxCalls.initiate({
    connection_id: env.TELNYX_CONNECTION_ID,
    to: params.to,
    from,
    webhook_url: `${process.env.NEXTAUTH_URL ?? ''}/api/webhooks/telnyx-voice`,
  })

  if (!initiateResult.ok) return initiateResult

  const { callControlId, callSessionId } = initiateResult.value

  const createResult = await callRepo.create({
    telnyxCallControlId: callControlId,
    telnyxCallSessionId: callSessionId,
    direction: 'OUTBOUND',
    fromNumber: from,
    toNumber: params.to,
    campaignId: params.campaignId,
    scheduledAt: params.scheduledAt,
  })

  if (!createResult.ok) return createResult

  log.info({ callId: createResult.value.id }, 'outboundService.initiateCall: done')
  return ok(createResult.value)
}