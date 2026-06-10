// src/lib/redis.ts
import { Redis } from '@upstash/redis'
import { env } from '../config/env'

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined
}

function createRedisClient(): Redis {
  return new Redis({ url: env.REDIS_URL, token: env.REDIS_URL })
}

// Note: Upstash Redis constructor expects { url, token } where url is the REST endpoint
// and token is the REST token. If REDIS_URL is in format:
// rediss://default:<TOKEN>@<HOST>:PORT  — parse it accordingly.
// Upstash also supports: new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN })
// For env simplicity we store both in a single REDIS_URL as JSON-like or two vars.
// We'll use @upstash/redis fromEnv() pattern:
export const redis: Redis =
  globalThis.__redis ??
  Redis.fromEnv()  // reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN automatically

if (env.NODE_ENV !== 'production') {
  globalThis.__redis = redis
}

// ─── Agent Status Helpers ─────────────────────────────────────────────────────

const AGENT_STATUS_PREFIX = 'agent:status:'
const AGENT_STATUS_TTL = 86400 // 24 hours

export async function getAgentStatus(agentId: string): Promise<string | null> {
  return redis.get<string>(`${AGENT_STATUS_PREFIX}${agentId}`)
}

export async function setAgentStatus(agentId: string, status: string): Promise<void> {
  await redis.set(`${AGENT_STATUS_PREFIX}${agentId}`, status, { ex: AGENT_STATUS_TTL })
}

export async function getActiveAgents(): Promise<string[]> {
  // Returns list of agentIds that are ONLINE or BUSY
  const onlineKey = 'agents:online'
  const result = await redis.smembers(onlineKey)
  return result as string[]
}

export async function addAgentToActiveSet(agentId: string): Promise<void> {
  await redis.sadd('agents:online', agentId)
}

export async function removeAgentFromActiveSet(agentId: string): Promise<void> {
  await redis.srem('agents:online', agentId)
}

// ─── Queue Helpers ────────────────────────────────────────────────────────────

function queueKey(skill?: string): string {
  return skill ? `queue:${skill}:length` : 'queue:default:length'
}

export async function getQueueLength(skill?: string): Promise<number> {
  const val = await redis.get<number>(queueKey(skill))
  return val ?? 0
}

export async function incrQueueLength(skill?: string): Promise<number> {
  return redis.incr(queueKey(skill))
}

export async function decrQueueLength(skill?: string): Promise<number> {
  const result = await redis.decr(queueKey(skill))
  // Don't go below zero
  if (result < 0) {
    await redis.set(queueKey(skill), 0)
    return 0
  }
  return result
}

// ─── Avg Handle Time ─────────────────────────────────────────────────────────

const AVG_HANDLE_TIME_KEY = 'metrics:avg_handle_time_secs'

export async function getAvgHandleTime(): Promise<number> {
  const val = await redis.get<number>(AVG_HANDLE_TIME_KEY)
  return val ?? 180 // default 3 minutes
}

export async function updateAvgHandleTime(durationSecs: number): Promise<void> {
  // Rolling average using Lua-like approach: store (sum, count) and compute
  const sumKey = 'metrics:handle_time_sum'
  const countKey = 'metrics:handle_time_count'
  const maxSamples = 100

  const [sum, count] = await Promise.all([
    redis.get<number>(sumKey),
    redis.get<number>(countKey),
  ])

  const currentSum = sum ?? 0
  const currentCount = count ?? 0

  if (currentCount >= maxSamples) {
    // Reset to avoid skew
    await Promise.all([
      redis.set(sumKey, durationSecs),
      redis.set(countKey, 1),
      redis.set(AVG_HANDLE_TIME_KEY, durationSecs),
    ])
  } else {
    const newSum = currentSum + durationSecs
    const newCount = currentCount + 1
    const newAvg = Math.round(newSum / newCount)
    await Promise.all([
      redis.set(sumKey, newSum),
      redis.set(countKey, newCount),
      redis.set(AVG_HANDLE_TIME_KEY, newAvg),
    ])
  }
}

// ─── Round-Robin Counter ──────────────────────────────────────────────────────

export async function getRoundRobinIndex(skill: string): Promise<number> {
  const key = `rr:${skill}:index`
  return await redis.incr(key)
}

// ─── Distributed Lock ─────────────────────────────────────────────────────────

export async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  const result = await redis.set(key, '1', { nx: true, ex: ttlSeconds })
  return result === 'OK'
}

export async function releaseLock(key: string): Promise<void> {
  await redis.del(key)
}