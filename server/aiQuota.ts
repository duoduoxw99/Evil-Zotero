import { randomUUID } from 'node:crypto'
import type { Request, Response } from 'express'

const COOKIE_NAME = 'za_ai_sid'

function maxCalls(): number {
  const raw = process.env.AI_QUOTA_PER_USER?.trim()
  const n = raw ? Number.parseInt(raw, 10) : 10
  return Number.isFinite(n) && n >= 0 ? n : 10
}

const counts = new Map<string, number>()

function parseSessionId(req: Request): string | undefined {
  const raw = req.headers.cookie
  if (!raw) return undefined
  const escaped = COOKIE_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = raw.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`))
  if (!m?.[1]) return undefined
  try {
    return decodeURIComponent(m[1].trim())
  } catch {
    return undefined
  }
}

function isValidSid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(s)
}

/** Ensure HttpOnly session id cookie (one browser profile ≈ one "user" for quota). */
export function ensureAiSession(req: Request, res: Response): string {
  let sid = parseSessionId(req)
  if (!sid || !isValidSid(sid)) sid = randomUUID()
  const val = encodeURIComponent(sid)
  res.append(
    'Set-Cookie',
    `${COOKIE_NAME}=${val}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`,
  )
  return sid
}

export function quotaRemaining(sid: string): number {
  const max = maxCalls()
  const used = counts.get(sid) ?? 0
  return Math.max(0, max - used)
}

export function quotaAllowsCall(sid: string): boolean {
  return quotaRemaining(sid) > 0
}

export function recordSuccessfulAiCall(sid: string): void {
  const used = (counts.get(sid) ?? 0) + 1
  counts.set(sid, used)
}
