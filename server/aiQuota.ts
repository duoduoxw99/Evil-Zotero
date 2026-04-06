import { randomUUID } from 'node:crypto'

const COOKIE_NAME = 'za_ai_sid'

/** Express / Node http / Vercel 通用：仅有 cookie 的请求头 */
export type ReqWithCookieHeader = {
  headers: { cookie?: string | string[] | undefined }
}

type ResWithSetCookie = {
  appendHeader?(name: string, value: string): void
  append?(name: string, value: string): void
}

function getCookieRaw(req: ReqWithCookieHeader): string | undefined {
  const c = req.headers?.cookie
  if (typeof c === 'string') return c
  if (Array.isArray(c)) return c.join('; ')
  return undefined
}

function maxCalls(): number {
  const raw = process.env.AI_QUOTA_PER_USER?.trim()
  const n = raw ? Number.parseInt(raw, 10) : 10
  return Number.isFinite(n) && n >= 0 ? n : 10
}

const counts = new Map<string, number>()

function parseSessionIdFromHeader(rawCookie: string | undefined): string | undefined {
  if (!rawCookie) return undefined
  const escaped = COOKIE_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = rawCookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`))
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

function appendSetCookieLine(res: ResWithSetCookie, line: string): void {
  if (typeof res.appendHeader === 'function') {
    res.appendHeader('Set-Cookie', line)
    return
  }
  if (typeof res.append === 'function') {
    res.append('Set-Cookie', line)
    return
  }
  throw new Error('Response cannot set Set-Cookie (missing appendHeader/append)')
}

/** 确保 HttpOnly 会话 cookie；Vercel HTTPS 时附带 Secure */
export function ensureAiSession(req: ReqWithCookieHeader, res: ResWithSetCookie): string {
  let sid = parseSessionIdFromHeader(getCookieRaw(req))
  if (!sid || !isValidSid(sid)) sid = randomUUID()
  const val = encodeURIComponent(sid)
  const secure = process.env.VERCEL === '1' ? '; Secure' : ''
  const line = `${COOKIE_NAME}=${val}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`
  appendSetCookieLine(res, line)
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
