// src/workers/scheduler.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { runQueueProcessor } from './queue-processor'
import { runAutomationRules } from './automation-rules'
import { runCampaigns } from './campaign-runner'
import { env } from '../config/env'
import { createLogger } from '../lib/logger'
import { randomUUID } from 'crypto'

export default async function schedulerHandler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const requestId = randomUUID()
  const log = createLogger(requestId)

  // Vercel cron sends a GET request with Authorization header
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${env.API_SECRET_KEY}`) {
    log.warn('scheduler: unauthorized cron request')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const job = req.query.job as string | undefined

  log.info({ job }, 'scheduler: running job')

  try {
    if (!job || job === 'queue-processor') {
      await runQueueProcessor()
    }

    if (!job || job === 'automation-rules') {
      await runAutomationRules()
    }

    if (!job || job === 'campaign-runner') {
      await runCampaigns()
    }

    log.info({ job }, 'scheduler: job completed')
    return res.status(200).json({ ok: true, job: job ?? 'all', requestId })
  } catch (error) {
    log.error({ error, job }, 'scheduler: job failed')
    return res.status(500).json({ error: 'Job failed', job })
  }
}