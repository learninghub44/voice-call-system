// src/api/webhooks/telnyx-recording.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import * as callRepo from '../../repositories/call.repo'
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
  if (eventType !== 'call.recording.saved') {
    res.status(200).end()
    return
  }

  const payload = event.data.payload as {
    call_control_id: string
    recording_urls: { mp3: string; wav: string }
    duration_millis: string
  }

  res.status(200).json({ received: true })

  const callResult = await callRepo.findByTelnyxCallControlId(payload.call_control_id)
  if (!callResult.ok) {
    log.warn({ callControlId: payload.call_control_id }, 'recording: call not found')
    return
  }

  const call = callResult.value
  const recordingUrl = payload.recording_urls?.mp3 ?? payload.recording_urls?.wav

  if (!recordingUrl) {
    log.warn({ callId: call.id }, 'recording: no recording URL in payload')
    return
  }

  const durationSecs = payload.duration_millis
    ? Math.round(parseInt(payload.duration_millis, 10) / 1000)
    : undefined

  try {
    // Store recording URL on call
    await callRepo.setRecordingUrl(call.id, recordingUrl)

    // Upsert Recording model
    await prisma.recording.upsert({
      where: { callId: call.id },
      update: { url: recordingUrl, durationSecs },
      create: { callId: call.id, url: recordingUrl, durationSecs, type: 'CALL' },
    })

    log.info({ callId: call.id, durationSecs }, 'recording: saved successfully')
  } catch (error) {
    log.error({ error, callId: call.id }, 'recording: failed to save recording')
  }
}

export default async function telnyxRecordingWebhook(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const rawBody = await captureRawBody(req)
  ;(req as NextApiRequest & { rawBody: Buffer }).rawBody = rawBody
  return withTelnyxSignature(handler)(req, res)
}