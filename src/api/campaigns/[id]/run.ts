// src/api/campaigns/[id]/run.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { withAuth } from '../../../middleware/auth'
import { createLogger } from '../../../lib/logger'
import { randomUUID } from 'crypto'

async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const requestId = randomUUID()
  const log = createLogger(requestId)
  const { id } = req.query as { id: string }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const campaign = await prisma.campaign.findUnique({ where: { id } })

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found', code: 'NOT_FOUND' })
  }

  if (campaign.status === 'RUNNING') {
    return res.status(409).json({ error: 'Campaign is already running', code: 'CONFLICT' })
  }

  if (campaign.status === 'COMPLETED') {
    return res.status(409).json({ error: 'Campaign has already completed', code: 'CONFLICT' })
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: { status: 'RUNNING' },
  })

  log.info({ campaignId: id }, 'campaigns/run: campaign set to RUNNING')

  return res.status(200).json(updated)
}

export default withAuth(handler)