// src/api/queue/hold.ts
// TeXML endpoint that keeps a queued caller on hold with music.
// Called via <Redirect> loop until an agent is assigned and bridges the call.
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import * as callRepo from '../../repositories/call.repo'
import * as queueRepo from '../../repositories/queue.repo'
import * as queueService from '../../services/queue.service'
import * as texml from '../../lib/texml'
import { createLogger } from '../../lib/logger'
import { randomUUID } from 'crypto'

const querySchema = z.object({
  CallControlId: z.string().optional(),
  call_control_id: z.string().optional(),
})

export default async function holdHandler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const requestId = randomUUID()
  const log = createLogger(requestId)

  const parsed = querySchema.safeParse(req.query)
  const callControlId =
    (parsed.success ? parsed.data.call_control_id ?? parsed.data.CallControlId : undefined) ?? ''

  // Look up call
  let queuePosition: number | null = null
  let waitSecs = 180

  if (callControlId) {
    const callResult = await callRepo.findByTelnyxCallControlId(callControlId)
    if (callResult.ok) {
      const call = callResult.value

      // If call is no longer QUEUED, it's been answered — hang up hold loop
      if (call.status !== 'QUEUED') {
        log.info({ callId: call.id }, 'hold: call no longer queued, ending hold')
        res.setHeader('Content-Type', 'text/xml')
        return res.status(200).send(
          texml.response([
            texml.say('An agent will be with you shortly. Please stay on the line.'),
          ])
        )
      }

      const posResult = await queueRepo.getPosition(call.id)
      if (posResult.ok) queuePosition = posResult.value

      const waitResult = await queueService.getEstimatedWait(call.ivrPath ?? undefined)
      if (waitResult.ok) waitSecs = waitResult.value
    }
  }

  const waitMins = Math.max(1, Math.ceil(waitSecs / 60))
  const positionText =
    queuePosition !== null
      ? `You are number ${queuePosition} in the queue. `
      : ''

  const holdTexml = texml.response([
    texml.say(`${positionText}Estimated wait time is ${waitMins} minute${waitMins !== 1 ? 's' : ''}. Please continue to hold.`),
    texml.play(
      'http://com.twilio.music.classical.s3.amazonaws.com/MARKOVICHAMP-Borghestral.mp3',
      5
    ),
    texml.redirect(`/api/queue/hold?call_control_id=${encodeURIComponent(callControlId)}`),
  ])

  res.setHeader('Content-Type', 'text/xml')
  return res.status(200).send(holdTexml)
}