import type { InsightItem, PaperInsights } from '@/types'

const KEYS: (keyof PaperInsights)[] = [
  'mainClaim',
  'respondsTo',
  'quietPushback',
  'researchMove',
  'evidence',
]

export function findInsightByHighlightId(
  insights: PaperInsights,
  highlightId: string | null,
): InsightItem | undefined {
  if (!highlightId) return undefined
  for (const k of KEYS) {
    const item = insights[k]
    if (item?.highlightId === highlightId) return item
  }
  return undefined
}
