import type {
  InsightItem,
  NormalizedAnalysisItem,
  NormalizedAnalysisOutput,
  Paper,
  PaperInsights,
} from '@/types'
import { requestOpenAiAnalysis } from '@/provider/openaiProvider'

function clampText(input: string, max = 8000): string {
  return input.length > max ? input.slice(0, max) : input
}

/** Text bundle for full-document analysis (global insight, etc.). */
export function buildPaperText(paper: Paper): string {
  const sections = [
    paper.abstractText ? `Abstract:\n${paper.abstractText}` : '',
    paper.introductionText ? `Introduction:\n${paper.introductionText}` : '',
    paper.conclusionText ? `Conclusion:\n${paper.conclusionText}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  if (sections.trim()) return clampText(sections)

  if (paper.extractedText?.trim()) return clampText(paper.extractedText)

  const fallback = [
    `${paper.title}`,
    `${paper.creator} (${paper.date}) - ${paper.publication}`,
    ...Object.values(paper.insights)
      .filter(Boolean)
      .map((item) => `${item!.quote}`),
  ].join('\n')
  return clampText(fallback, 6000)
}

function normalizeConfidence(value: string | undefined, fallback: string | undefined): string {
  const allowed = new Set(['high', 'medium', 'speculative'])
  const candidate = (value || '').trim().toLowerCase()
  if (allowed.has(candidate)) return candidate
  const fb = (fallback || '').trim().toLowerCase()
  if (allowed.has(fb)) return fb
  return 'speculative'
}

function normalizeField(
  aiItem: Partial<NormalizedAnalysisItem> | undefined,
  fallback: InsightItem,
): InsightItem {
  const pageCandidate = String(aiItem?.page ?? '').trim()
  const parsedPage = Number.parseInt(pageCandidate, 10)
  const angelText = aiItem?.angelText?.trim() || fallback.angelText || fallback.text
  const devilText = aiItem?.devilText?.trim() || fallback.devilText || fallback.text
  return {
    text: angelText,
    angelText,
    devilText,
    quote: aiItem?.quote?.trim() || fallback.quote,
    page: Number.isFinite(parsedPage) ? parsedPage : fallback.page,
    highlightId: fallback.highlightId,
    confidence: normalizeConfidence(aiItem?.confidence, fallback.confidence),
  }
}

function normalizeAnalysis(
  raw: Partial<NormalizedAnalysisOutput>,
  base: PaperInsights,
): PaperInsights {
  return {
    mainClaim: base.mainClaim
      ? normalizeField(raw.mainClaim, base.mainClaim)
      : undefined,
    respondsTo: base.respondsTo
      ? normalizeField(raw.respondsTo, base.respondsTo)
      : undefined,
    quietPushback: base.quietPushback
      ? normalizeField(raw.quietPushback, base.quietPushback)
      : undefined,
    researchMove: base.researchMove
      ? normalizeField(raw.researchMove, base.researchMove)
      : undefined,
    evidence: base.evidence,
  }
}

export async function analyzePaperInsights(paper: Paper): Promise<PaperInsights> {
  const raw = await requestOpenAiAnalysis(buildPaperText(paper))
  return normalizeAnalysis(raw, paper.insights)
}

