// src/api/webhooks/telnyx-voice.ts
import type { NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import * as callRepo from '../../repositories/call.repo'
import * as queueService from '../../services/queue.service'
import * as routingService from '../../services/routing.service'
import * as ivrService from '../../services/ivr.service'
import * as texml from '../../lib/texml'
import {
  withTelnyxSignature,
  webhookConfig,
  captureRawBody,
  type TelnyxVerifiedRequest,
} from '../../middleware/telnyx-signature'
import { createLogger } from '../../lib/logger'
import type { NextApiRequest } from 'next'

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
    call_session_id: string
    from: string
    to: string
    direction: string
  }

  if (eventType !== 'call.initiated') {
    res.status(200).end()
    return
  }

  log.info({ eventType }, 'telnyx-voice webhook: call.initiated received')

  const { call_control_id, call_session_id, from, to, direction } = payload

  // Build IVR menu TeXML and return FAST
  const menuTexml = ivrService.buildMenuTexml()
  res.setHeader('Content-Type', 'text/xml')
  res.status(200).send(menuTexml)

  // Async work after response sent
  try {
    // Upsert user
    const user = await prisma.user.upsert({
      where: { phone: from },
      update: { callCount: { increment: 1 } },
      create: { phone: from, callCount: 1 },
    })

    // Create call record
    const callResult = await callRepo.create({
      telnyxCallControlId: call_control_id,
      telnyxCallSessionId: call_session_id,
      direction: direction === 'inbound' ? 'INBOUND' : 'OUTBOUND',
      fromNumber: from,
      toNumber: to,
      userId: user.id,
    })

    if (!callResult.ok) {
      log.error({ error: callResult.error.message }, 'telnyx-voice: failed to create call record')
    } else {
      log.info({ callId: callResult.value.id }, 'telnyx-voice: call record created')
    }
  } catch (error) {
    log.error({ error }, 'telnyx-voice: async post-processing error')
  }
}

export default async function telnyxVoiceWebhook(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // Capture raw body before any parsing
  const rawBody = await captureRawBody(req)
  ;(req as NextApiRequest & { rawBody: Buffer }).rawBody = rawBody

  return withTelnyxSignature(handler)(req, res)
}