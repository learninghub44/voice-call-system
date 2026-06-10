# Voice Call Management System

A production-grade voice call management system built with Next.js 14, Telnyx, PostgreSQL, Redis, and Pusher.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (Pages Router) |
| Language | TypeScript (strict mode) |
| Telephony | Telnyx Voice API + TeXML + SMS |
| Database | PostgreSQL via Neon + Prisma ORM |
| Cache / Pub-Sub | Upstash Redis |
| Real-time | Pusher Channels |
| Validation | Zod |
| Logging | Pino (structured JSON) |
| Deployment | Vercel |

## Features

- **Inbound call handling** — IVR menu, skill-based routing, queue with hold music
- **Outbound calls** — manual + campaign dialler with retry logic
- **Agent management** — online/busy/offline status, skill assignment, shift scheduling
- **Queue system** — priority queuing (VIP), estimated wait time, real-time position updates
- **SMS automation** — missed call alerts, OTP, callback alerts, reminders
- **Call recording** — automatic recording, stored URL in database
- **Automation rules** — post-call triggers (missed call, VIP, repeat caller, after hours)
- **Real-time dashboard** — Pusher-powered live updates for calls, agents, and queue
- **Outbound campaigns** — bulk dialling with batching, retry, and completion tracking

## Project Structure