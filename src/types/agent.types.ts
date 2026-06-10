// src/types/agent.types.ts

export type AgentStatus = 'ONLINE' | 'BUSY' | 'OFFLINE' | 'BREAK'

export interface AgentSkill {
  name: string
  level?: number
}

export interface Agent {
  id: string
  name: string
  email: string
  status: AgentStatus
  skills: string[]
  shiftStart?: Date | null
  shiftEnd?: Date | null
  currentCallId?: string | null
  createdAt: Date
}