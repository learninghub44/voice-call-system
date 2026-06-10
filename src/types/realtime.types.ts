// src/types/realtime.types.ts

export enum PusherChannel {
  CALLS = 'calls',
  AGENTS = 'agents',
  QUEUE = 'queue',
}

export enum PusherEvent {
  CALL_UPDATED = 'call.updated',
  AGENT_STATUS_CHANGED = 'agent.status.changed',
  QUEUE_POSITION_UPDATED = 'queue.position.updated',
  CALL_ASSIGNED = 'call.assigned',
}

export interface CallUpdatedPayload {
  callId: string
  status: string
  agentId?: string
  updatedAt: string
}

export interface AgentStatusChangedPayload {
  agentId: string
  status: string
  currentCallId?: string | null
  updatedAt: string
}

export interface QueuePositionUpdatedPayload {
  callId: string
  position: number
  estimatedWaitSecs: number
  skill?: string
  updatedAt: string
}

export interface CallAssignedPayload {
  callId: string
  agentId: string
  agentName: string
  assignedAt: string
}

export type PusherEventPayload =
  | CallUpdatedPayload
  | AgentStatusChangedPayload
  | QueuePositionUpdatedPayload
  | CallAssignedPayload