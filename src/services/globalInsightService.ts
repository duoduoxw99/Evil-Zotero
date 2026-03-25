import type { Paper } from '@/types'
import { buildPaperText } from '@/services/analysisService'
import { requestGlobalPaperInsight } from '@/provider/openaiProvider'

export async function analyzeWholePaper(paper: Paper) {
  const text = buildPaperText(paper)
  return requestGlobalPaperInsight(text)
}
