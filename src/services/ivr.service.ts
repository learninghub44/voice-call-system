// src/services/ivr.service.ts
import { prisma } from '../lib/prisma'
import * as callRepo from '../repositories/call.repo'
import * as queueService from './queue.service'
import * as routingService from './routing.service'
import { ivrMenu, getSkillForDigit, getIvrMenuPrompt } from '../config/ivr-menu'
import { AppError, ErrorCode, ok, err, Result } from '../types/result.types'
import { createLogger } from '../lib/logger'
import * as texml from '../lib/texml'
import { env } from '../config/env'

export async function handleDtmf(
  callControlId: string,
  digit: string,
  requestId?: string
): Promise<Result<string, AppError>> {
  const log = createLogger(requestId, { callControlId, digit })
  const start = Date.now()
  log.info('handleDtmf: start')

  // Voicemail / fallback
  if (digit === '0') {
    log.info('handleDtmf: voicemail selected')
    const voicemailTexml = texml.response([
      texml.say('Please leave a message after the beep. Press any key when done.'),
      texml.record({
        action: `${process.env.NEXTAUTH_URL ?? ''}/api/webhooks/telnyx-recording`,
        maxLength: 120,
        playBeep: true,
        finishOnKey: '#',
      }),
      texml.hangup(),
    ])
    return ok(voicemailTexml)
  }

  const skill = getSkillForDigit(digit)

  if (!skill) {
    // Invalid digit — repeat menu
    log.info({ digit }, 'handleDtmf: invalid digit, repeating menu')
    const repeatTexml = texml.response([
      texml.gather({
        action: '/api/ivr/dtmf',
        numDigits: 1,
        timeout: 5,
        children: [
          texml.say(`Invalid option. ${getIvrMenuPrompt()}`),
        ],
      }),
      texml.redirect('/api/ivr/dtmf?timeout=1'),
    ])
    return ok(repeatTexml)
  }

  // Look up call by callControlId
  const callResult = await callRepo.findByTelnyxCallControlId(callControlId)
  if (!callResult.ok) return callResult
  const call = callResult.value

  // Log IVR selection
  try {
    await prisma.ivrLog.create({
      data: {
        callId: call.id,
        digit,
        routedTo: skill,
      },
    })
  } catch (e) {
    log.warn({ error: e }, 'handleDtmf: failed to log IVR selection')
  }

  // Update IVR path on call
  await callRepo.setIvrPath(call.id, skill)

  // Check if user is VIP
  const user = call.userId
    ? await prisma.user.findUnique({ where: { id: call.userId } })
    : null
  const priority = user?.isVip ? 1 : 0

  // Attempt routing
  const routeResult = await routingService.routeCall(call.id, skill, priority, requestId)

  if (routeResult.ok) {
    const agent = routeResult.value
    log.info({ agentId: agent.id, durationMs: Date.now() - start }, 'handleDtmf: routed to agent')

    // Dial agent — in a real deployment this would be agent's SIP endpoint or phone
    // For now we redirect to their phone number stored externally or use Call Control bridge
    const connectTexml = texml.response([
      texml.say(`Connecting you to our ${ivrMenu[digit]?.label ?? skill} team. Please hold.`),
      texml.dial(env.TELNYX_PHONE_NUMBER, {
        timeout: 30,
        record: 'record-from-answer',
        action: '/api/webhooks/telnyx-status',
      }),
    ])
    return ok(connectTexml)
  }

  // No agent — enqueue
  const enqueueResult = await queueService.enqueue(call, skill, priority === 1)
  if (!enqueueResult.ok) return enqueueResult

  const waitSecs = await queueService.getEstimatedWait(skill)
  const waitMins = Math.ceil((waitSecs.ok ? waitSecs.value : 180) / 60)

  log.info({ waitMins, durationMs: Date.now() - start }, 'handleDtmf: call queued')

  const queueTexml = texml.response([
    texml.say(`All ${ivrMenu[digit]?.label ?? skill} agents are currently busy. Your estimated wait time is ${waitMins} minute${waitMins !== 1 ? 's' : ''}. Please hold.`),
    texml.play('http://com.twilio.music.classical.s3.amazonaws.com/MARKOVICHAMP-Borghestral.mp3', 10),
    texml.redirect('/api/queue/hold'),
  ])
  return ok(queueTexml)
}

export function buildMenuTexml(): string {
  return texml.response([
    texml.gather({
      action: '/api/ivr/dtmf',
      numDigits: 1,
      timeout: 5,
      children: [
        texml.say(getIvrMenuPrompt()),
      ],
    }),
    // If no input, redirect back to menu
    texml.redirect('/api/ivr/dtmf?timeout=1'),
  ])
}