import type { PageTextEntry } from '@/types'

/** Legacy: normalize extracted PDF text: line breaks → space, collapse whitespace */
export function normalizePdfText(text: string): string {
  return text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Match pipeline for quotes vs page text: lowercase, collapse whitespace,
 * line breaks, light punctuation normalization.
 */
export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/\r?\n/g, ' ')
    .replace(/[\u2018\u2019\u0060]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Simple quote → page mapping using substring search on normalized text */
export function findPageForQuote(quote: string, pages: PageTextEntry[]): number | null {
  const nq = normalizeForMatch(quote)
  if (!nq) return null
  const compactQ = nq.replace(/\s/g, '')
  for (const p of pages) {
    const pt = normalizeForMatch(p.text)
    if (pt.includes(nq)) return p.page
  }
  if (compactQ.length >= 12) {
    for (const p of pages) {
      const compact = normalizeForMatch(p.text).replace(/\s/g, '')
      if (compact.includes(compactQ)) return p.page
    }
  }
  return null
}
