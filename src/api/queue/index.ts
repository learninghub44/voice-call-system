// src/api/queue/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import * as queueRepo from '../../repositories/queue.repo'
import * as queueService from '../../services/queue.service'
import { withAuth } from '../../middleware/auth'
import { createLogger } from '../../lib/logger'
import { randomUUID } from 'crypto'

const querySchema = z.object({
  skill: z.string().optional(),
})

async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const requestId = randomUUID()
  const log = createLogger(requestId)

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const parsed = querySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid query parameters' })
  }

  const { skill } = parsed.data

  const [snapshotResult, waitResult] = await Promise.all([
    queueRepo.getQueueSnapshot(skill),
    queueService.getEstimatedWait(skill),
  ])

  if (!snapshotResult.ok) {
    log.error({ error: snapshotResult.error.message }, 'queue/index: snapshot failed')
    return res.status(snapshotResult.error.statusCode()).json({
      error: snapshotResult.error.message,
      code: snapshotResult.error.code,
    })
  }

  return res.status(200).json({
    entries: snapshotResult.value,
    total: snapshotResult.value.length,
    estimatedWaitSecs: waitResult.ok ? waitResult.value : null,
    skill: skill ?? null,
  })
}

export default withAuth(handler)