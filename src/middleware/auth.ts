// src/middleware/auth.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { env } from '../config/env'
import { createLogger } from '../lib/logger'

type NextApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void

export function withAuth(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const log = createLogger()
    const apiKey = req.headers['x-api-key'] as string | undefined

    if (!apiKey || apiKey !== env.API_SECRET_KEY) {
      log.warn({ path: req.url }, 'Unauthorized API request')
      return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' })
    }

    return handler(req, res)
  }
}