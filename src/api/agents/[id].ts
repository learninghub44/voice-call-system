// src/api/agents/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import * as agentService from '../../services/agent.service'
import { withAuth } from '../../middleware/auth'
import { createLogger } from '../../lib/logger'
import { randomUUID } from 'crypto'

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  skills: z.array(z.string()).optional(),
  status: z.enum(['ONLINE', 'BUSY', 'OFFLINE', 'BREAK']).optional(),
  shiftStart: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
  shiftEnd: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
})

async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const requestId = randomUUID()
  const log = createLogger(requestId)
  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    const result = await agentService.getById(id)
    if (!result.ok) return res.status(result.error.statusCode()).json({ error: result.error.message, code: result.error.code })
    return res.status(200).json(result.value)
  }

  if (req.method === 'PATCH') {
    const parsed = patchSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors })
    }

    const { status, ...rest } = parsed.data

    if (status) {
      const result = await agentService.setStatus(id, status, requestId)
      if (!result.ok) return res.status(result.error.statusCode()).json({ error: result.error.message, code: result.error.code })
    }

    if (Object.keys(rest).length > 0) {
      const result = await agentService.updateAgent(id, rest, requestId)
      if (!result.ok) return res.status(result.error.statusCode()).json({ error: result.error.message, code: result.error.code })
    }

    const updated = await agentService.getById(id)
    if (!updated.ok) return res.status(updated.error.statusCode()).json({ error: updated.error.message })
    return res.status(200).json(updated.value)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)