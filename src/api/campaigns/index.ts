// src/api/campaigns/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { withAuth } from '../../middleware/auth'
import { createLogger } from '../../lib/logger'
import { randomUUID } from 'crypto'

const createSchema = z.object({
  name: z.string().min(1).max(255),
  targets: z
    .array(z.string().regex(/^\+[1-9]\d{1,14}$/, 'Each target must be E.164 format'))
    .min(1)
    .max(10000),
  scheduledAt: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
})

async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const requestId = randomUUID()
  const log = createLogger(requestId)

  if (req.method === 'GET') {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { calls: true } },
      },
    })
    return res.status(200).json(campaigns)
  }

  if (req.method === 'POST') {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten().fieldErrors,
      })
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: parsed.data.name,
        targets: parsed.data.targets,
        scheduledAt: parsed.data.scheduledAt,
        status: 'DRAFT',
      },
    })

    log.info({ campaignId: campaign.id }, 'campaigns/index: created')
    return res.status(201).json(campaign)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)