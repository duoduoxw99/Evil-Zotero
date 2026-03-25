export interface InsightItem {
  text: string
  angelText?: string
  devilText?: string
  quote: string
  page: number
  highlightId: string
  confidence?: string
}

export interface PaperInsights {
  mainClaim?: InsightItem
  respondsTo?: InsightItem
  quietPushback?: InsightItem
  researchMove?: InsightItem
  evidence?: InsightItem
}

export interface Paper {
  id: string
  title: string
  creator: string
  date: string
  publication: string
  collection: string
  tags: string[]
  pdfPath: string
  insights: PaperInsights
  abstractText?: string
  introductionText?: string
  conclusionText?: string
  extractedText?: string
}

export type ViewMode = 'library' | 'reader'
export type InsightKey = keyof PaperInsights

/** Single text run from pdf.js getTextContent (for geometry + matching) */
export interface PdfTextItemRecord {
  str: string
  transform: number[]
  width: number
  height: number
}

/** Per-page normalized text for citation matching & AI */
export interface PageTextEntry {
  page: number
  text: string
  /** Optional: raw text items when extracted with pdf.js */
  items?: PdfTextItemRecord[]
}

/**
 * One fragment from `Range.getClientRects()`, in CSS px relative to the PDF page inner container.
 * Multiple rects per selection (multi-line / multi-column); do not merge into one box.
 */
export interface PdfSelectionRect {
  x: number
  y: number
  width: number
  height: number
  page: number
}

export type UserInsightCardType = 'selection' | 'global'

/** User-created insight: selection (with highlight) or global “Analyze Paper” (no highlight). */
export interface UserSelectionInsight {
  id: string
  highlightId: string
  quote: string
  page: number
  /** Persisted geometry: one entry per client rect (tight line/column fragments). Empty for global. */
  rects: PdfSelectionRect[]
  cardType: UserInsightCardType
  /** When true, card is stored in localStorage and restored on next visit. */
  saved?: boolean
  label?: string
  angelText?: string
  devilText?: string
  /** AI: high | medium | speculative */
  confidence?: string
  status: 'loading' | 'ready' | 'error'
  errorMessage?: string
}

export type SelectionInsightAction = 'create' | 'angel' | 'devil'

export interface NormalizedAnalysisItem {
  angelText: string
  devilText: string
  quote: string
  page: string | number
  confidence: string
}

export interface NormalizedAnalysisOutput {
  mainClaim: NormalizedAnalysisItem
  respondsTo: NormalizedAnalysisItem
  quietPushback: NormalizedAnalysisItem
  researchMove: NormalizedAnalysisItem
}
