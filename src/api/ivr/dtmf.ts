// src/api/ivr/dtmf.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import * as ivrService from '../../services/ivr.service'
import { createLogger } from '../../lib/logger'
import { randomUUID } from 'crypto'

const schema = z.object({
  CallControlId: z.string().optional(),
  Digits: z.string().optional(),
  // TeXML may send these differently
  call_control_id: z.string().optional(),
  digits: z.string().optional(),
  timeout: z.string().optional(),
})

export default async function dtmfHandler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const requestId = randomUUID()
  const log = createLogger(requestId)

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).end()
    return
  }

  const parsed = schema.safeParse({ ...req.body, ...req.query })
  if (!parsed.success) {
    res.setHeader('Content-Type', 'text/xml')
    // Return menu repeat on bad input
    const repeatTexml = ivrService.buildMenuTexml()
    return res.status(200).send(repeatTexml)
  }

  const data = parsed.data
  const callControlId = data.call_control_id ?? data.CallControlId ?? ''
  const digit = data.digits ?? data.Digits ?? ''

  // Handle timeout (no input)
  if (req.query.timeout === '1' || !digit) {
    log.info({ callControlId }, 'dtmf: timeout, repeating menu')
    res.setHeader('Content-Type', 'text/xml')
    return res.status(200).send(ivrService.buildMenuTexml())
  }

  log.info({ callControlId, digit }, 'dtmf: processing digit')

  const result = await ivrService.handleDtmf(callControlId, digit, requestId)

  if (!result.ok) {
    log.error({ error: result.error.message }, 'dtmf: handleDtmf failed')
    // Return fallback menu on error
    res.setHeader('Content-Type', 'text/xml')
    return res.status(200).send(ivrService.buildMenuTexml())
  }

  res.setHeader('Content-Type', 'text/xml')
  return res.status(200).send(result.value)
}