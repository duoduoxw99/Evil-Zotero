import type { PdfSelectionRect, UserSelectionInsight } from '@/types'

const PREFIX = 'zotero-agent-saved-insights:'

export function storageKeyForPaper(paperId: string): string {
  return `${PREFIX}${paperId}`
}

export function serializeSavedInsights(cards: UserSelectionInsight[]): string {
  const saved = cards.filter((c) => c.saved && c.status === 'ready')
  const payload = saved.map((c) => ({
    id: c.id,
    highlightId: c.highlightId,
    quote: c.quote,
    page: c.page,
    rects: c.rects as PdfSelectionRect[],
    cardType: c.cardType,
    saved: true as const,
    label: c.label,
    angelText: c.angelText,
    devilText: c.devilText,
    confidence: c.confidence,
    status: 'ready' as const,
  }))
  return JSON.stringify(payload)
}

export function loadSavedInsights(paperId: string): UserSelectionInsight[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKeyForPaper(paperId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: UserSelectionInsight[] = []
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue
      const o = row as Record<string, unknown>
      const id = typeof o.id === 'string' ? o.id : ''
      const highlightId = typeof o.highlightId === 'string' ? o.highlightId : id
      const quote = typeof o.quote === 'string' ? o.quote : ''
      const page = typeof o.page === 'number' && Number.isFinite(o.page) ? o.page : 1
      const cardType = o.cardType === 'global' ? 'global' : 'selection'
      const rects = Array.isArray(o.rects)
        ? (o.rects as PdfSelectionRect[]).filter(
            (r) =>
              r &&
              typeof r.x === 'number' &&
              typeof r.y === 'number' &&
              typeof r.width === 'number' &&
              typeof r.height === 'number' &&
              typeof r.page === 'number',
          )
        : []
      if (!id) continue
      out.push({
        id,
        highlightId,
        quote,
        page,
        rects: cardType === 'global' ? [] : rects,
        cardType,
        saved: true,
        label: typeof o.label === 'string' ? o.label : undefined,
        angelText: typeof o.angelText === 'string' ? o.angelText : undefined,
        devilText: typeof o.devilText === 'string' ? o.devilText : undefined,
        confidence: typeof o.confidence === 'string' ? o.confidence : undefined,
        status: 'ready',
      })
    }
    return out
  } catch {
    return []
  }
}

export function writeSavedInsights(paperId: string, cards: UserSelectionInsight[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(storageKeyForPaper(paperId), serializeSavedInsights(cards))
  } catch {
    // quota / private mode
  }
}

export function clearSavedInsights(paperId: string): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(storageKeyForPaper(paperId))
  } catch {
    // ignore
  }
}

export function sortInsightsForDisplay(list: UserSelectionInsight[]): UserSelectionInsight[] {
  const globals = list.filter((c) => c.cardType === 'global')
  const rest = list.filter((c) => c.cardType !== 'global')
  return [...globals, ...rest]
}
