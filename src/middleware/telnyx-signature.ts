// src/middleware/telnyx-signature.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { telnyx } from '../lib/telnyx'
import { env } from '../config/env'
import { createLogger } from '../lib/logger'
import { randomUUID } from 'crypto'

type NextApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void

export interface TelnyxVerifiedRequest extends NextApiRequest {
  telnyxEvent: Record<string, unknown>
  requestId: string
}

export function withTelnyxSignature(
  handler: (req: TelnyxVerifiedRequest, res: NextApiResponse) => Promise<void> | void
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const requestId = randomUUID()
    const log = createLogger(requestId)

    const signature = req.headers['telnyx-signature-ed25519'] as string | undefined
    const timestamp = req.headers['telnyx-timestamp'] as string | undefined

    if (!signature || !timestamp) {
      log.warn({ path: req.url }, 'Missing Telnyx signature headers')
      return res.status(400).json({ error: 'Missing signature headers' })
    }

    // Raw body must be available — ensure bodyParser is disabled for this route
    const rawBody: string | Buffer | undefined = (req as NextApiRequest & { rawBody?: string | Buffer }).rawBody

    if (!rawBody) {
      log.warn({ path: req.url }, 'Raw body not available for signature verification')
      return res.status(400).json({ error: 'Raw body unavailable' })
    }

    try {
      const rawBodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf-8') : rawBody

      const event = telnyx.webhooks.constructEvent(
        rawBodyString,
        signature,
        timestamp,
        env.TELNYX_PUBLIC_KEY
      )

      const verifiedReq = req as TelnyxVerifiedRequest
      verifiedReq.telnyxEvent = event as unknown as Record<string, unknown>
      verifiedReq.requestId = requestId

      return handler(verifiedReq, res)
    } catch (error) {
      log.warn({ error: error instanceof Error ? error.message : String(error), path: req.url }, 'Telnyx signature verification failed')
      return res.status(400).json({ error: 'Invalid webhook signature' })
    }
  }
}

// Config helper to disable Next.js body parsing for webhook routes
export const webhookConfig = {
  api: {
    bodyParser: false,
  },
}

// Middleware to capture raw body before parsing
export async function captureRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}