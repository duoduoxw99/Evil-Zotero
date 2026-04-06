/**
 * OpenAI calls — server-only. Key from process.env.OPENAI_API_KEY.
 * Prompts mirror the former client-side provider for identical behavior.
 */

import {
  fetch as undiciFetch,
  getGlobalDispatcher,
  ProxyAgent,
  Socks5ProxyAgent,
} from 'undici'
import type { Dispatcher, Response } from 'undici'

/** REST 根路径，形如 https://api.openai.com/v1（无末尾 /） */
export function getOpenAiApiRoot(): string {
  let base = (process.env.OPENAI_BASE_URL ?? '').trim().replace(/\r/g, '').replace(/\/$/, '')
  if (!base) return 'https://api.openai.com/v1'
  if (base === 'https://api.openai.com') return 'https://api.openai.com/v1'
  return base
}

function openAiChatCompletionsUrl(): string {
  return `${getOpenAiApiRoot()}/chat/completions`
}

/** 健康检查等接口返回体脱敏 */
export function sanitizeOpenAiErrorText(raw: string): string {
  return raw
    .replace(/sk-proj-[a-zA-Z0-9_-]+/gi, 'sk-proj-…')
    .replace(/sk-[a-zA-Z0-9_-]+/gi, 'sk-…')
    .slice(0, 400)
}

function getModel(): string {
  return process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
}

function normalizeApiKey(raw: string): string {
  let k = raw.trim().replace(/\r/g, '')
  if (k.charCodeAt(0) === 0xfeff) k = k.slice(1).trim()
  if (/^["']/.test(k) && k.endsWith(k[0]!)) k = k.slice(1, -1).trim()
  if (k.toLowerCase().startsWith('bearer ')) k = k.slice(7).trim()
  return k
}

/** 与请求 OpenAI 时使用的规范一致，供路由层判断「是否已配置」 */
export function hasOpenAiCredential(): boolean {
  return normalizeApiKey(process.env.OPENAI_API_KEY ?? '') !== ''
}

/** 设置 OPENAI_DEBUG=1 时额外打印脱敏信息（前缀与长度，永不打印完整 key） */
export function logOpenAiStartupDiagnostics(): void {
  if (process.env.OPENAI_DEBUG?.trim() !== '1') return
  const key = normalizeApiKey(process.env.OPENAI_API_KEY ?? '')
  const safePrefix = key ? `${key.slice(0, 10)}…` : '(empty)'
  const hasOrg = !!(process.env.OPENAI_ORGANIZATION ?? '').trim()
  const hasOrgAlt = !!(process.env.OPENAI_ORG_ID ?? '').trim()
  const hasProj = !!(process.env.OPENAI_PROJECT ?? '').trim()
  const hasProjAlt = !!(process.env.OPENAI_PROJECT_ID ?? '').trim()
  console.log('[zotero-agent-api][OPENAI_DEBUG] API key:', safePrefix, 'length=', key.length)
  console.log('[zotero-agent-api][OPENAI_DEBUG] resolved API root:', getOpenAiApiRoot())
  console.log(
    '[zotero-agent-api][OPENAI_DEBUG] optional headers → org:',
    hasOrg || hasOrgAlt,
    'project:',
    hasProj || hasProjAlt,
    'third_party:',
    process.env.OPENAI_THIRD_PARTY?.trim() === '1',
  )
}

function assertOpenAiKeyLoaded(): string {
  const key = normalizeApiKey(process.env.OPENAI_API_KEY ?? '')
  if (!key) throw new Error('OPENAI_KEY_NOT_CONFIGURED')
  return key
}

/**
 * 官方规范：https://platform.openai.com/docs/api-reference/authentication
 * - 默认：Authorization: Bearer <OPENAI_API_KEY>，Content-Type: application/json
 * - 多组织 / 项目可附加：OpenAI-Organization、OpenAI-Project（官方可选头）
 * - 仅当明确使用第三方兼容网关时设置 OPENAI_THIRD_PARTY=1，改用 api-key 头（非 Bearer）
 */
function openAiBearerHeaders(apiKey: string): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const thirdParty = process.env.OPENAI_THIRD_PARTY?.trim() === '1'
  if (thirdParty) {
    h['api-key'] = apiKey
  } else {
    h.Authorization = `Bearer ${apiKey}`
  }

  const org =
    (process.env.OPENAI_ORGANIZATION ?? '').trim().replace(/\r/g, '') ||
    (process.env.OPENAI_ORG_ID ?? '').trim().replace(/\r/g, '')
  const skipOrg =
    process.env.OPENAI_SKIP_ORG?.trim() === '1' ||
    process.env.OPENAI_SKIP_ORG?.trim()?.toLowerCase() === 'true'
  if (org && !skipOrg) h['OpenAI-Organization'] = org

  const project =
    (process.env.OPENAI_PROJECT ?? '').trim().replace(/\r/g, '') ||
    (process.env.OPENAI_PROJECT_ID ?? '').trim().replace(/\r/g, '')
  const skipProject =
    process.env.OPENAI_SKIP_PROJECT?.trim() === '1' ||
    process.env.OPENAI_SKIP_PROJECT?.trim()?.toLowerCase() === 'true'
  if (project && !skipProject) h['OpenAI-Project'] = project

  return h
}

export interface OpenAiKeyHealthResult {
  ok: boolean
  /** 实际用于校验的路径（官方常无 /v1/me，会 fallback /v1/models） */
  checkedVia?: string
  upstreamStatus?: number
  /** 已脱敏 */
  error?: string
  note?: string
}

/**
 * GET /v1/me（若存在）；否则 GET /v1/models。用于快速判断 Key 是否有效。
 */
export async function checkOpenAiKeyHealth(): Promise<OpenAiKeyHealthResult> {
  const key = normalizeApiKey(process.env.OPENAI_API_KEY ?? '')
  if (!key) {
    return { ok: false, error: 'OPENAI_API_KEY missing or empty' }
  }

  const root = getOpenAiApiRoot()
  const headers = openAiBearerHeaders(key)
  const dispatcher = getGlobalDispatcher()

  async function httpGet(path: string): Promise<Response> {
    const url = `${root}${path.startsWith('/') ? path : `/${path}`}`
    return undiciFetch(url, { method: 'GET', headers, dispatcher })
  }

  try {
    let r = await httpGet('/me')
    if (r.ok) {
      return { ok: true, checkedVia: 'GET /v1/me' }
    }
    if (r.status !== 404) {
      const err = sanitizeOpenAiErrorText(await r.text().catch(() => ''))
      return {
        ok: false,
        checkedVia: 'GET /v1/me',
        upstreamStatus: r.status,
        error: err || r.statusText,
      }
    }

    r = await httpGet('/models')
    if (r.ok) {
      return {
        ok: true,
        checkedVia: 'GET /v1/models',
        note:
          'OpenAI 官方未提供 GET /v1/me，已通过 GET /v1/models 校验密钥；若你为第三方网关且 /models 不可用，请查看对方文档。',
      }
    }
    const err = sanitizeOpenAiErrorText(await r.text().catch(() => ''))
    return {
      ok: false,
      checkedVia: 'GET /v1/models',
      upstreamStatus: r.status,
      error: err || r.statusText,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: sanitizeOpenAiErrorText(msg) }
  }
}

function extractJson(content: string): string {
  const trimmed = content.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) return fenced[1].trim()

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return trimmed
}

function transportTimeouts(): {
  connectTimeout: number
  headersTimeout: number
  bodyTimeout: number
} {
  const raw = process.env.OPENAI_CONNECT_TIMEOUT_MS?.trim()
  const n = raw ? Number.parseInt(raw, 10) : 60_000
  const connectTimeout = Number.isFinite(n) ? Math.min(300_000, Math.max(5_000, n)) : 60_000
  return { connectTimeout, headersTimeout: 300_000, bodyTimeout: 300_000 }
}

function userConfiguredOutboundProxy(): boolean {
  return !!(
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.SOCKS5_PROXY?.trim() ||
    (process.env.ALL_PROXY?.trim()?.toLowerCase().startsWith('socks') ?? false)
  )
}

function isLikelyTransportError(e: unknown): boolean {
  if (!(e instanceof Error)) return true
  const c = e.cause instanceof Error ? e.cause.message : e.cause != null ? String(e.cause) : ''
  const m = `${e.message} ${c}`.toLowerCase()
  return (
    m.includes('fetch failed') ||
    m.includes('timeout') ||
    m.includes('connect') ||
    m.includes('econnrefused') ||
    m.includes('econnreset') ||
    m.includes('socket') ||
    m.includes('network') ||
    m.includes('undici')
  )
}

async function closeDispatcher(d: Dispatcher): Promise<void> {
  if (typeof (d as { close?: () => Promise<void> }).close === 'function') {
    await (d as { close: () => Promise<void> }).close().catch(() => undefined)
  }
}

/**
 * Use undici fetch + global dispatcher (HTTPS_PROXY / SOCKS from env.ts), then optionally
 * try common local Clash ports if the user did not set any proxy env (China / restricted networks).
 */
async function openAiFetchWithOptionalLocalFallback(
  url: string,
  fetchInit: Omit<NonNullable<Parameters<typeof undiciFetch>[1]>, 'dispatcher'>,
): Promise<{ response: Response; cleanup: () => Promise<void> }> {
  const globalD = getGlobalDispatcher()
  try {
    const response = await undiciFetch(url, { ...fetchInit, dispatcher: globalD })
    const cleanup = async () => {}
    return { response, cleanup }
  } catch (e) {
    const noAuto =
      process.env.OPENAI_NO_LOCAL_PROXY_FALLBACK?.trim() === '1' ||
      process.env.OPENAI_NO_LOCAL_PROXY_FALLBACK?.trim().toLowerCase() === 'true'
    if (noAuto || userConfiguredOutboundProxy() || !isLikelyTransportError(e)) throw e

    const t = transportTimeouts()
    const fallbacks: Array<{ hint: string; dispatcher: Dispatcher }> = [
      {
        hint: 'HTTPS_PROXY=http://127.0.0.1:7890',
        dispatcher: new ProxyAgent({ uri: 'http://127.0.0.1:7890', ...t }),
      },
      {
        hint: 'HTTPS_PROXY=http://127.0.0.1:7897',
        dispatcher: new ProxyAgent({ uri: 'http://127.0.0.1:7897', ...t }),
      },
      {
        hint: 'SOCKS5_PROXY=socks5://127.0.0.1:7891',
        dispatcher: new Socks5ProxyAgent('socks5://127.0.0.1:7891', t),
      },
    ]

    let last: unknown = e
    for (const { hint, dispatcher } of fallbacks) {
      try {
        console.warn(
          `[zotero-agent-api] OpenAI 直连失败，正在尝试本机代理（${hint}）。`,
        )
        const response = await undiciFetch(url, { ...fetchInit, dispatcher })
        console.warn(
          `[zotero-agent-api] 已通过本机代理连上 OpenAI。请在项目根目录 .env.local 中追加下面一行（或核对端口后修改），保存后重启 npm run dev，可省去每次启动时的代理探测：\n` +
            `    ${hint}`,
        )
        const cleanup = async () => {
          await closeDispatcher(dispatcher)
        }
        return { response, cleanup }
      } catch (err) {
        last = err
        await closeDispatcher(dispatcher)
      }
    }
    throw last
  }
}

async function chatJson(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
): Promise<string> {
  const apiKey = assertOpenAiKeyLoaded()
  const model = getModel()
  const url = openAiChatCompletionsUrl()
  const fetchInit = {
    method: 'POST',
    headers: openAiBearerHeaders(apiKey),
    body: JSON.stringify({
      model,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  }

  let cleanup: (() => Promise<void>) | undefined
  try {
    const result = await openAiFetchWithOptionalLocalFallback(url, fetchInit)
    cleanup = result.cleanup
    const { response } = result

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      const snippet = errText.slice(0, 280)
      if (response.status === 401) {
        throw new Error(
          `OpenAI 身份校验失败 (401)。常见原因：① sk-proj- 密钥需 OPENAI_PROJECT=proj_…；多组织需 OPENAI_ORGANIZATION=org_…；② OPENAI_BASE_URL 须与 Key 匹配（官方可留空，默认 https://api.openai.com/v1）；③ 勿用 ChatGPT 网页密钥；④ 密钥吊销/轮换。第三方网关设 OPENAI_THIRD_PARTY=1（api-key 头）并填写其 BASE_URL。误配组织头可试 OPENAI_SKIP_ORG=1。改 .env 后重启 dev；可用 GET /api/health/openai 自测。${snippet ? ` API 说明: ${snippet}` : ''}`,
        )
      }
      if (response.status === 403) {
        throw new Error(
          `OpenAI 拒绝访问 (403)：可能没有该模型权限、账单/地区受限，或缺少组织信息。可尝试在 .env 中设置 OPENAI_ORGANIZATION=org-…。${snippet ? ` 详情: ${snippet}` : ''}`,
        )
      }
      throw new Error(
        `OpenAI request failed: ${response.status}${snippet ? ` ${snippet}` : ''}`,
      )
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('Empty model response')
    return content
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('OpenAI request failed')) throw e
    if (e instanceof Error && e.message.startsWith('OpenAI 身份校验失败')) throw e
    if (e instanceof Error && e.message.startsWith('OpenAI 拒绝访问')) throw e
    if (e instanceof Error && e.message === 'Empty model response') throw e

    const err = e instanceof Error ? e : new Error(String(e))
    const c = err.cause
    const causeText = c instanceof Error ? c.message : c != null ? String(c) : ''
    const detail = [err.message, causeText].filter(Boolean).join(' — ')
    throw new Error(
      `OPENAI_NETWORK_ERROR: ${detail}。请检查：① 目标 ${url.split('/').slice(0, 3).join('/')} 是否可访问；② 在 .env.local 设置 HTTPS_PROXY / SOCKS5_PROXY 并重启；③ 或 OPENAI_BASE_URL 指向可用兼容网关。可设置 OPENAI_NO_LOCAL_PROXY_FALLBACK=1 关闭本机端口自动尝试。`,
    )
  } finally {
    if (cleanup) await cleanup().catch(() => undefined)
  }
}

export async function requestOpenAiAnalysis(paperText: string): Promise<Record<string, unknown>> {
  const systemPrompt = 'You are an academic reading assistant.'
  const userPrompt = `Analyze the provided paper text and generate four insight objects.

For each insight produce two interpretations:
- ANGEL MODE: rational, conservative, evidence-first, academically neutral
- DEVIL MODE: reveal subtle hidden tension, infer what the author is strategically pushing against, sharp but evidence-based, avoid exaggeration

Required insights:
1. Main Claim
2. Responds To
3. Quiet Pushback
4. Research Move

Rules:
- quote exact source sentence only
- no invented citations
- no paraphrase in quote
- keep both interpretations concise
- confidence must be exactly one of: high / medium / speculative

Return strict JSON only with this exact schema:
{
  "mainClaim": { "angelText": "", "devilText": "", "quote": "", "page": "", "confidence": "" },
  "respondsTo": { "angelText": "", "devilText": "", "quote": "", "page": "", "confidence": "" },
  "quietPushback": { "angelText": "", "devilText": "", "quote": "", "page": "", "confidence": "" },
  "researchMove": { "angelText": "", "devilText": "", "quote": "", "page": "", "confidence": "" }
}

Paper text:
${paperText}`

  const content = await chatJson(systemPrompt, userPrompt, 0.2)
  try {
    return JSON.parse(extractJson(content)) as Record<string, unknown>
  } catch {
    throw new Error('Failed to parse JSON response')
  }
}

export interface GlobalPaperInsightResult {
  summary: string
  angelText: string
  devilText: string
  confidence: string
}

export async function requestGlobalPaperInsight(paperText: string): Promise<GlobalPaperInsightResult> {
  const userPrompt = `You are an academic reading assistant.

Read the following paper text and produce:
1) summary: a concise overview of the whole paper (2–4 sentences, neutral, evidence-grounded).
2) angelText: rational, conservative, evidence-first interpretation of the paper's overall contribution (2–3 sentences).
3) devilText: reveal hidden assumptions, strategic positioning, or tensions across the paper — sharp but grounded in the text (2–3 sentences).
4) confidence: exactly one of: high / medium / speculative

Return strict JSON only:
{ "summary": "", "angelText": "", "devilText": "", "confidence": "" }

Paper text:
${paperText}`

  const content = await chatJson(
    'You are an academic reading assistant.',
    userPrompt,
    0.25,
  )

  try {
    const parsed = JSON.parse(extractJson(content)) as Partial<GlobalPaperInsightResult>
    const confidence = String(parsed.confidence ?? '').toLowerCase()
    const okConf = ['high', 'medium', 'speculative'].includes(confidence) ? confidence : 'medium'
    return {
      summary: String(parsed.summary ?? '—').trim() || '—',
      angelText: String(parsed.angelText ?? '—').trim() || '—',
      devilText: String(parsed.devilText ?? '—').trim() || '—',
      confidence: okConf,
    }
  } catch {
    throw new Error('Failed to parse JSON response')
  }
}

export interface SelectionInterpretationResult {
  label: string
  angelText: string
  devilText: string
  confidence: string
}

export async function requestSelectionInterpretation(quote: string): Promise<SelectionInterpretationResult> {
  const userPrompt = `You are an academic reading assistant.

The user selected this exact passage from a PDF (do not invent or alter the quote elsewhere):
"""
${quote}
"""

Produce:
- angelText: rational, conservative, evidence-first, academically neutral (1–2 sentences).
- devilText: subtle tension / strategic positioning; sharp but evidence-based; avoid exaggeration (1–2 sentences).
- confidence: exactly one of: high / medium / speculative
- label: very short title (max 8 words) for this selection.

Return strict JSON only:
{ "label": "", "angelText": "", "devilText": "", "confidence": "" }`

  const content = await chatJson(
    'You are an academic reading assistant.',
    userPrompt,
    0.3,
  )

  try {
    const parsed = JSON.parse(extractJson(content)) as Partial<SelectionInterpretationResult>
    const confidence = String(parsed.confidence ?? '').toLowerCase()
    const okConf = ['high', 'medium', 'speculative'].includes(confidence) ? confidence : 'medium'
    return {
      label: String(parsed.label ?? 'Selection'),
      angelText: String(parsed.angelText ?? '—'),
      devilText: String(parsed.devilText ?? '—'),
      confidence: okConf,
    }
  } catch {
    throw new Error('Failed to parse JSON response')
  }
}
