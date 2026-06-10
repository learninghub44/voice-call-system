// src/middleware/validate.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { ZodSchema, ZodError } from 'zod'

type NextApiHandler<T = unknown> = (
  req: NextApiRequest & { body: T },
  res: NextApiResponse
) => Promise<void> | void

export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: (req: NextApiRequest & { parsedBody: T }, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      const errors = (result.error as ZodError).flatten()
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.fieldErrors,
      })
    }

    const parsedReq = req as NextApiRequest & { parsedBody: T }
    parsedReq.parsedBody = result.data

    return handler(parsedReq, res)
  }
}

export function withQueryValidation<T>(
  schema: ZodSchema<T>,
  handler: (req: NextApiRequest & { parsedQuery: T }, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const result = schema.safeParse(req.query)

    if (!result.success) {
      const errors = (result.error as ZodError).flatten()
      return res.status(400).json({
        error: 'Invalid query parameters',
        code: 'VALIDATION_ERROR',
        details: errors.fieldErrors,
      })
    }

    const parsedReq = req as NextApiRequest & { parsedQuery: T }
    parsedReq.parsedQuery = result.data

    return handler(parsedReq, res)
  }
}