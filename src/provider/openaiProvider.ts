import type { NormalizedAnalysisOutput } from '@/types'

/**
 * Browser → same-origin `/api/*` (Vite dev proxy → Express).
 * Never send API keys from the client; keys live only on the server.
 */
function apiBase(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
  return raw ? raw.replace(/\/$/, '') : ''
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const url = `${apiBase()}${path}`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const netFail =
      e instanceof TypeError ||
      /failed to fetch|fetch failed|networkerror|load failed/i.test(msg)
    if (netFail) {
      throw new Error(
        `无法连接 API（${msg}）。本地请执行 npm run dev（Express 8787 + Vite）或 vercel dev；Vercel 部署请保持 VITE_API_BASE_URL 为空（同源 /api）或指向你的生产 API 根地址。`,
      )
    }
    throw e
  }
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = data as { error?: string }
    const msg =
      typeof err.error === 'string' && err.error
        ? err.error
        : `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data as T
}

export async function requestOpenAiAnalysis(
  paperText: string,
): Promise<Partial<NormalizedAnalysisOutput>> {
  return postJson<Partial<NormalizedAnalysisOutput>>('/api/ai/paper-insights', { paperText })
}

export interface GlobalPaperInsightResult {
  summary: string
  angelText: string
  devilText: string
  confidence: string
}

export async function requestGlobalPaperInsight(
  paperText: string,
): Promise<GlobalPaperInsightResult> {
  return postJson<GlobalPaperInsightResult>('/api/ai/global-insight', { paperText })
}

export type SelectionInterpretationMode = 'both' | 'angel' | 'devil'

export interface SelectionInterpretationResult {
  label: string
  angelText: string
  devilText: string
  confidence: string
}

export async function requestSelectionInterpretation(
  quote: string,
  _mode: SelectionInterpretationMode,
): Promise<SelectionInterpretationResult> {
  return postJson<SelectionInterpretationResult>('/api/ai/selection', { quote })
}
