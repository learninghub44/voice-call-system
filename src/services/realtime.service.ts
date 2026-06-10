// src/services/realtime.service.ts
import { pusher } from '../lib/pusher'
import { PusherChannel, PusherEvent } from '../types/realtime.types'
import type {
  CallUpdatedPayload,
  AgentStatusChangedPayload,
  QueuePositionUpdatedPayload,
  CallAssignedPayload,
} from '../types/realtime.types'
import { createLogger } from '../lib/logger'

const log = createLogger()

async function broadcast(
  channel: PusherChannel,
  event: PusherEvent,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await pusher.trigger(channel, event, payload)
  } catch (error) {
    log.error({ error, channel, event }, 'realtime: broadcast failed')
    // Fire-and-forget: don't propagate
  }
}

export async function broadcastCallUpdated(payload: CallUpdatedPayload): Promise<void> {
  return broadcast(PusherChannel.CALLS, PusherEvent.CALL_UPDATED, payload as unknown as Record<string, unknown>)
}

export async function broadcastAgentStatusChanged(payload: AgentStatusChangedPayload): Promise<void> {
  return broadcast(PusherChannel.AGENTS, PusherEvent.AGENT_STATUS_CHANGED, payload as unknown as Record<string, unknown>)
}

export async function broadcastQueuePositionUpdated(payload: QueuePositionUpdatedPayload): Promise<void> {
  return broadcast(PusherChannel.QUEUE, PusherEvent.QUEUE_POSITION_UPDATED, payload as unknown as Record<string, unknown>)
}

export async function broadcastCallAssigned(payload: CallAssignedPayload): Promise<void> {
  return broadcast(PusherChannel.CALLS, PusherEvent.CALL_ASSIGNED, payload as unknown as Record<string, unknown>)
}