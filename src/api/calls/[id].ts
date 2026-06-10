// src/api/calls/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import * as callService from '../../services/call.service'
import * as callRepo from '../../repositories/call.repo'
import { withAuth } from '../../middleware/auth'
import { createLogger } from '../../lib/logger'
import { randomUUID } from 'crypto'

const patchSchema = z.object({
  status: z.enum(['INITIATED', 'RINGING', 'ANSWERED', 'QUEUED', 'COMPLETED', 'FAILED']).optional(),
  agentId: z.string().optional(),
})

async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const requestId = randomUUID()
  const log = createLogger(requestId)
  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    const result = await callService.getCallById(id)
    if (!result.ok) {
      return res.status(result.error.statusCode()).json({ error: result.error.message, code: result.error.code })
    }
    return res.status(200).json(result.value)
  }

  if (req.method === 'PATCH') {
    const parsed = patchSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors })
    }

    const { status, agentId } = parsed.data

    if (status) {
      const result = await callRepo.updateStatus(id, status)
      if (!result.ok) {
        return res.status(result.error.statusCode()).json({ error: result.error.message, code: result.error.code })
      }
    }

    if (agentId) {
      const result = await callService.assignAgent(id, agentId, requestId)
      if (!result.ok) {
        return res.status(result.error.statusCode()).json({ error: result.error.message, code: result.error.code })
      }
    }

    const updated = await callService.getCallById(id)
    if (!updated.ok) return res.status(updated.error.statusCode()).json({ error: updated.error.message })
    return res.status(200).json(updated.value)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)