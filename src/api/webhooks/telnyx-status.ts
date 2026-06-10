// src/api/webhooks/telnyx-status.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import * as callRepo from '../../repositories/call.repo'
import * as callService from '../../services/call.service'
import * as automationService from '../../services/automation.service'
import {
  withTelnyxSignature,
  webhookConfig,
  captureRawBody,
  type TelnyxVerifiedRequest,
} from '../../middleware/telnyx-signature'
import { createLogger } from '../../lib/logger'

export { webhookConfig as config }

async function handler(req: TelnyxVerifiedRequest, res: NextApiResponse): Promise<void> {
  const log = createLogger(req.requestId)

  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  const event = req.telnyxEvent as {
    data: { event_type: string; payload: Record<string, unknown> }
  }
  const eventType = event?.data?.event_type
  const payload = event?.data?.payload as {
    call_control_id: string
    end_time?: string
    hangup_cause?: string
  }

  const callControlId = payload.call_control_id

  // Respond immediately — do async work after
  res.status(200).json({ received: true })

  // Find the call
  const callResult = await callRepo.findByTelnyxCallControlId(callControlId)
  if (!callResult.ok) {
    log.warn({ callControlId, eventType }, 'telnyx-status: call not found')
    return
  }

  const call = callResult.value

  if (eventType === 'call.answered') {
    log.info({ callId: call.id, eventType }, 'telnyx-status: call answered')
    await callRepo.updateStatus(call.id, 'ANSWERED')
    await callRepo.logEvent(call.id, eventType, { callControlId })
  }

  if (eventType === 'call.hangup') {
    log.info({ callId: call.id, eventType }, 'telnyx-status: call hangup')

    // Calculate duration from DB timestamps
    const createdAt = call.createdAt.getTime()
    const endTime = payload.end_time ? new Date(payload.end_time as string).getTime() : Date.now()
    const durationSeconds = Math.max(0, Math.round((endTime - createdAt) / 1000))

    await callService.completeCall(call.id, durationSeconds, req.requestId)
    await callRepo.logEvent(call.id, eventType, { callControlId, hangupCause: payload.hangup_cause, durationSeconds })

    // Evaluate automation rules asynchronously (don't block)
    automationService.evaluatePostCall(call.id, req.requestId).catch((e) => {
      log.error({ error: e, callId: call.id }, 'telnyx-status: automation evaluation failed')
    })
  }

  if (eventType === 'call.failed') {
    log.info({ callId: call.id, eventType }, 'telnyx-status: call failed')
    await callService.failCall(call.id, req.requestId)
    await callRepo.logEvent(call.id, eventType, { callControlId, hangupCause: payload.hangup_cause })

    // Trigger missed call automation
    automationService.evaluatePostCall(call.id, req.requestId).catch((e) => {
      log.error({ error: e, callId: call.id }, 'telnyx-status: automation evaluation failed')
    })
  }
}

export default async function telnyxStatusWebhook(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const rawBody = await captureRawBody(req)
  ;(req as NextApiRequest & { rawBody: Buffer }).rawBody = rawBody
  return withTelnyxSignature(handler)(req, res)
}