// src/api/calls/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import * as callService from '../../services/call.service'
import { withAuth } from '../../middleware/auth'
import { createLogger } from '../../lib/logger'
import { randomUUID } from 'crypto'

const querySchema = z.object({
  status: z.string().optional(),
  agentId: z.string().optional(),
  direction: z.enum(['INBOUND', 'OUTBOUND']).optional(),
  from: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
  to: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const requestId = randomUUID()
  const log = createLogger(requestId)

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const parsed = querySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.flatten().fieldErrors })
  }

  const result = await callService.listCalls(parsed.data)

  if (!result.ok) {
    log.error({ error: result.error.message }, 'calls/index: list failed')
    return res.status(result.error.statusCode()).json({ error: result.error.message, code: result.error.code })
  }

  return res.status(200).json(result.value)
}

export default withAuth(handler)