// src/workers/queue-processor.ts
import { ivrMenu } from '../config/ivr-menu'
import * as queueService from '../services/queue.service'
import { acquireLock, releaseLock } from '../lib/redis'
import { createLogger } from '../lib/logger'
import { randomUUID } from 'crypto'

const LOCK_KEY = 'queue:processor:lock'
const LOCK_TTL = 25 // seconds

export async function runQueueProcessor(): Promise<void> {
  const requestId = randomUUID()
  const log = createLogger(requestId)
  log.info('queue-processor: starting')

  // Acquire distributed lock to prevent parallel runs
  const acquired = await acquireLock(LOCK_KEY, LOCK_TTL)
  if (!acquired) {
    log.info('queue-processor: lock not acquired, another instance is running')
    return
  }

  try {
    // Process each skill queue
    const skills = Object.values(ivrMenu).map((o) => o.skill)
    const uniqueSkills = [...new Set(skills)]

    let totalAssigned = 0

    for (const skill of uniqueSkills) {
      const result = await queueService.processQueue(skill, requestId)
      if (result.ok) {
        totalAssigned += result.value
        log.info({ skill, assigned: result.value }, 'queue-processor: processed skill')
      } else {
        log.error({ skill, error: result.error.message }, 'queue-processor: error processing skill')
      }
    }

    // Also process default/no-skill queue
    const defaultResult = await queueService.processQueue(undefined, requestId)
    if (defaultResult.ok) {
      totalAssigned += defaultResult.value
    }

    log.info({ totalAssigned }, 'queue-processor: done')
  } finally {
    await releaseLock(LOCK_KEY)
    log.info('queue-processor: lock released')
  }
}