// src/types/result.types.ts

export enum ErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TELNYX_ERROR = 'TELNYX_ERROR',
  DB_ERROR = 'DB_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  QUEUE_FULL = 'QUEUE_FULL',
  NO_AGENT_AVAILABLE = 'NO_AGENT_AVAILABLE',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly cause?: unknown

  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.cause = cause
  }

  statusCode(): number {
    switch (this.code) {
      case ErrorCode.NOT_FOUND:
        return 404
      case ErrorCode.CONFLICT:
        return 409
      case ErrorCode.VALIDATION_ERROR:
        return 400
      case ErrorCode.UNAUTHORIZED:
        return 401
      case ErrorCode.INVALID_SIGNATURE:
        return 400
      case ErrorCode.QUEUE_FULL:
        return 503
      case ErrorCode.NO_AGENT_AVAILABLE:
        return 503
      case ErrorCode.TELNYX_ERROR:
        return 502
      case ErrorCode.DB_ERROR:
        return 500
      case ErrorCode.INTERNAL_ERROR:
        return 500
      default:
        return 500
    }
  }
}

export type Result<T, E extends AppError = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E }

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

export function err<E extends AppError>(error: E): Result<never, E> {
  return { ok: false, error }
}