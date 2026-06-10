// src/api/sms/send.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import * as smsService from '../../services/sms.service'
import { withAuth } from '../../middleware/auth'
import { withValidation } from '../../middleware/validate'
import { createLogger } from '../../lib/logger'
import { randomUUID } from 'crypto'

const schema = z.object({
  to: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Must be E.164 format'),
  body: z.string().min(1).max(1600),
  trigger: z.enum(['MISSED_CALL', 'OTP', 'REMINDER', 'CALLBACK_ALERT']),
})

async function handler(
  req: NextApiRequest & { parsedBody: z.infer<typeof schema> },
  res: NextApiResponse
): Promise<void> {
  const requestId = randomUUID()
  const log = createLogger(requestId)

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const result = await smsService.send(req.parsedBody, requestId)

  if (!result.ok) {
    log.error({ error: result.error.message }, 'sms/send: failed')
    return res.status(result.error.statusCode()).json({
      error: result.error.message,
      code: result.error.code,
    })
  }

  log.info({ smsLogId: result.value.id }, 'sms/send: done')
  return res.status(201).json(result.value)
}

export default withAuth(withValidation(schema, handler))