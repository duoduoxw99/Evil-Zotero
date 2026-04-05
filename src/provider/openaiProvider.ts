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
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
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
