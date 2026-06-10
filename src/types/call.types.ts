// src/types/call.types.ts

export type CallDirection = 'INBOUND' | 'OUTBOUND'
export type CallStatus =
  | 'INITIATED'
  | 'RINGING'
  | 'ANSWERED'
  | 'QUEUED'
  | 'COMPLETED'
  | 'FAILED'

export interface Call {
  id: string
  telnyxCallControlId: string
  telnyxCallSessionId?: string | null
  direction: CallDirection
  status: CallStatus
  fromNumber: string
  toNumber: string
  ivrPath?: string | null
  recordingUrl?: string | null
  durationSeconds?: number | null
  scheduledAt?: Date | null
  campaignId?: string | null
  agentId?: string | null
  userId?: string | null
  createdAt: Date
  updatedAt: Date
}