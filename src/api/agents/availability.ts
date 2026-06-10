// src/api/agents/availability.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import * as agentService from '../../services/agent.service'
import { withAuth } from '../../middleware/auth'
import { createLogger } from '../../lib/logger'
import { randomUUID } from 'crypto'

async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const requestId = randomUUID()
  const log = createLogger(requestId)

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const result = await agentService.getAvailability()

  if (!result.ok) {
    log.error({ error: result.error.message }, 'agents/availability: failed')
    return res.status(result.error.statusCode()).json({
      error: result.error.message,
      code: result.error.code,
    })
  }

  return res.status(200).json(result.value)
}

export default withAuth(handler)