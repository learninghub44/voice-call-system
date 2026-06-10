// src/workers/campaign-runner.ts
import { prisma } from '../lib/prisma'
import * as outboundService from '../services/outbound.service'
import { acquireLock, releaseLock } from '../lib/redis'
import { createLogger } from '../lib/logger'
import { randomUUID } from 'crypto'

const LOCK_KEY = 'campaign:runner:lock'
const LOCK_TTL = 55
const BATCH_SIZE = 10
const INTER_CALL_DELAY_MS = 200
const MAX_RETRY_COUNT = 3

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function runCampaigns(): Promise<void> {
  const requestId = randomUUID()
  const log = createLogger(requestId)
  log.info('campaign-runner: starting')

  const acquired = await acquireLock(LOCK_KEY, LOCK_TTL)
  if (!acquired) {
    log.info('campaign-runner: lock not acquired, skipping')
    return
  }

  try {
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: 'RUNNING',
        retryCount: { lt: MAX_RETRY_COUNT },
      },
    })

    log.info({ count: campaigns.length }, 'campaign-runner: found running campaigns')

    for (const campaign of campaigns) {
      log.info({ campaignId: campaign.id, name: campaign.name }, 'campaign-runner: processing campaign')

      // Get already-dialled numbers for this campaign
      const dialledCalls = await prisma.call.findMany({
        where: { campaignId: campaign.id },
        select: { toNumber: true },
      })
      const dialledNumbers = new Set(dialledCalls.map((c) => c.toNumber))

      // Find next batch of undialled targets
      const undialledTargets = campaign.targets
        .filter((t) => !dialledNumbers.has(t))
        .slice(0, BATCH_SIZE)

      if (undialledTargets.length === 0) {
        // All targets dialled — mark complete
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        })
        log.info({ campaignId: campaign.id }, 'campaign-runner: campaign completed')
        continue
      }

      let batchErrors = 0

      for (const target of undialledTargets) {
        const result = await outboundService.initiateCall(
          { to: target, campaignId: campaign.id },
          requestId
        )

        if (!result.ok) {
          log.warn({ campaignId: campaign.id, target: '[redacted]', error: result.error.message }, 'campaign-runner: call failed')
          batchErrors++
        } else {
          log.info({ campaignId: campaign.id, callId: result.value.id }, 'campaign-runner: call initiated')
        }

        // Delay between calls to avoid rate limits
        await delay(INTER_CALL_DELAY_MS)
      }

      // If too many errors, increment retry count
      if (batchErrors > undialledTargets.length / 2) {
        const newRetryCount = campaign.retryCount + 1
        if (newRetryCount >= MAX_RETRY_COUNT) {
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: 'FAILED', retryCount: newRetryCount },
          })
          log.error({ campaignId: campaign.id }, 'campaign-runner: campaign failed after max retries')
        } else {
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { retryCount: newRetryCount },
          })
          log.warn({ campaignId: campaign.id, retryCount: newRetryCount }, 'campaign-runner: incrementing retry count')
        }
      }
    }

    log.info('campaign-runner: done')
  } catch (error) {
    log.error({ error }, 'campaign-runner: unexpected error')
  } finally {
    await releaseLock(LOCK_KEY)
  }
}