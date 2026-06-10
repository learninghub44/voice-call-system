// src/api/queue/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next'
import * as queueRepo from '../../repositories/queue.repo'
import { decrQueueLength } from '../../lib/redis'
import { withAuth } from '../../middleware/auth'
import { createLogger } from '../../lib/logger'
import { randomUUID } from 'crypto'

async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const requestId = randomUUID()
  const log = createLogger(requestId)
  const { id } = req.query as { id: string }

  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const snapshotResult = await queueRepo.getQueueSnapshot()
  if (!snapshotResult.ok) {
    res.status(snapshotResult.error.statusCode()).json({
      error: snapshotResult.error.message,
      code: snapshotResult.error.code,
    })
    return
  }

  const entry = snapshotResult.value.find((e) => e.id === id)
  if (!entry) {
    res.status(404).json({ error: 'Queue entry not found', code: 'NOT_FOUND' })
    return
  }

  const removeResult = await queueRepo.removeFromQueue(entry.callId)
  if (!removeResult.ok) {
    log.error({ error: removeResult.error.message, entryId: id }, 'queue/[id]: remove failed')
    res.status(removeResult.error.statusCode()).json({
      error: removeResult.error.message,
      code: removeResult.error.code,
    })
    return
  }

  await decrQueueLength(entry.requiredSkill ?? undefined)
  log.info({ entryId: id, callId: entry.callId }, 'queue/[id]: entry removed')
  res.status(204).end()
}

export default withAuth(handler)