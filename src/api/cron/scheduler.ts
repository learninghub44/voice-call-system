// src/api/cron/scheduler.ts
// This file re-exports the scheduler worker as a Next.js API route.
// Vercel Cron will call GET /api/cron/scheduler with the Authorization header.
export { default } from '../../workers/scheduler'