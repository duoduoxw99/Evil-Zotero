import type { SelectionInterpretationMode } from '@/provider/openaiProvider'
import { requestSelectionInterpretation } from '@/provider/openaiProvider'
import type { SelectionInsightAction } from '@/types'

/** @deprecated Menu actions all use the same full interpretation; kept for API stability. */
export function actionToMode(action: SelectionInsightAction): SelectionInterpretationMode {
  if (action === 'create') return 'both'
  if (action === 'angel') return 'angel'
  return 'devil'
}

/** Full insight from user-selected text (angel, devil, confidence). */
export async function interpretSelection(quote: string) {
  return requestSelectionInterpretation(quote.trim(), 'both')
}
