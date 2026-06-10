// src/api/calls/outbound.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import * as outboundService from '../../services/outbound.service'
import { withAuth } from '../../middleware/auth'
import { withValidation } from '../../middleware/validate'
import { createLogger } from '../../lib/logger'
import { randomUUID } from 'crypto'

const schema = z.object({
  to: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Must be E.164 format'),
  from: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(),
  campaignId: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
})

type SchemaInput = z.infer<typeof schema>

async function handler(
  req: NextApiRequest & { parsedBody: SchemaInput },
  res: NextApiResponse
): Promise<void> {
  const requestId = randomUUID()
  const log = createLogger(requestId)

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { scheduledAt, ...rest } = req.parsedBody

  const result = await outboundService.initiateCall(
    {
      ...rest,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    },
    requestId
  )

  if (!result.ok) {
    log.error({ error: result.error.message }, 'outbound: failed to initiate call')
    return res.status(result.error.statusCode()).json({
      error: result.error.message,
      code: result.error.code,
    })
  }

  log.info({ callId: result.value.id }, 'outbound: call initiated')
  return res.status(201).json(result.value)
}

export default withAuth(withValidation(schema, handler))