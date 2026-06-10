// src/api/webhooks/telnyx-sms.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import * as smsRepo from '../../repositories/sms.repo'
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
  if (eventType !== 'message.received') {
    res.status(200).end()
    return
  }

  const payload = event.data.payload as {
    id: string
    from: { phone_number: string }
    to: Array<{ phone_number: string }>
    text: string
    received_at: string
  }

  res.status(200).json({ received: true })

  try {
    // Log inbound SMS
    await smsRepo.create({
      to: payload.to?.[0]?.phone_number ?? '',
      from: payload.from?.phone_number ?? '',
      body: payload.text ?? '',
      trigger: 'REMINDER', // inbound messages logged as REMINDER type
      telnyxMessageId: payload.id,
      status: 'received',
    })

    log.info({ messageId: payload.id }, 'sms webhook: inbound message logged')

    // TODO: Add keyword-based automation (e.g. "CALLBACK" → schedule outbound)
  } catch (error) {
    log.error({ error }, 'sms webhook: failed to log inbound message')
  }
}

export default async function telnyxSmsWebhook(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const rawBody = await captureRawBody(req)
  ;(req as NextApiRequest & { rawBody: Buffer }).rawBody = rawBody
  return withTelnyxSignature(handler)(req, res)
}