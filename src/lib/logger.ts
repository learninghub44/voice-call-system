// src/lib/logger.ts
import pino, { Logger } from 'pino'
import { env } from '../config/env'

const baseLogger: Logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  ...(env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
  formatters: {
    level(label) {
      return { level: label }
    },
  },
  base: {
    env: env.NODE_ENV,
  },
})

export function createLogger(requestId?: string, context?: Record<string, unknown>): Logger {
  return baseLogger.child({
    ...(requestId ? { requestId } : {}),
    ...context,
  })
}

export function withCallContext(requestId: string, callId: string, callControlId?: string): Logger {
  return baseLogger.child({
    requestId,
    callId,
    ...(callControlId ? { callControlId } : {}),
  })
}

export function withAgentContext(requestId: string, agentId: string): Logger {
  return baseLogger.child({ requestId, agentId })
}

export { baseLogger as logger }