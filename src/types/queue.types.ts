// src/types/queue.types.ts

export type QueuePriority = 0 | 1  // 0=normal, 1=vip

export interface QueueEntry {
  id: string
  callId: string
  position: number
  priority: QueuePriority
  requiredSkill?: string | null
  estimatedWaitSecs: number
  enteredAt: Date
}