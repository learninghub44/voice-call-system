// src/lib/pusher.ts
import Pusher from 'pusher'
import { env } from '../config/env'

declare global {
  // eslint-disable-next-line no-var
  var __pusher: Pusher | undefined
}

function createPusherClient(): Pusher {
  return new Pusher({
    appId: env.PUSHER_APP_ID,
    key: env.PUSHER_KEY,
    secret: env.PUSHER_SECRET,
    cluster: env.PUSHER_CLUSTER,
    useTLS: true,
  })
}

export const pusher: Pusher =
  globalThis.__pusher ?? createPusherClient()

if (env.NODE_ENV !== 'production') {
  globalThis.__pusher = pusher
}