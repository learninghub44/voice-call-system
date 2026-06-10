// src/config/env.ts
import { z } from 'zod'

const envSchema = z.object({
  TELNYX_API_KEY: z.string().min(1),
  TELNYX_PUBLIC_KEY: z.string().min(1),
  TELNYX_CONNECTION_ID: z.string().min(1),
  TELNYX_PHONE_NUMBER: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Must be E.164 format'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  PUSHER_APP_ID: z.string().min(1),
  PUSHER_KEY: z.string().min(1),
  PUSHER_SECRET: z.string().min(1),
  PUSHER_CLUSTER: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_SECRET_KEY: z.string().min(32),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Missing or invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  throw new Error('Invalid environment configuration. App cannot start.')
}

export const env = parsed.data
export type Env = z.infer<typeof envSchema>