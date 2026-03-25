import type { Paper, InsightKey } from '@/types'
import { InsightCard } from './InsightCard'

interface InsightPanelProps {
  paper: Paper
  activeHighlightId: string | null
  onSelectInsight: (highlightId: string) => void
  onHoverInsight: (highlightId: string | null) => void
}

const SECTIONS: InsightKey[] = ['mainClaim', 'respondsTo', 'quietPushback', 'researchMove', 'evidence']

export function InsightPanel({ paper, activeHighlightId, onSelectInsight, onHoverInsight }: InsightPanelProps) {
  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-zotero-border bg-zotero-surface overflow-hidden">
      <div className="border-b border-zotero-border px-2 py-1.5 text-xs font-medium text-zotero-muted">
        Insights
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {SECTIONS.map((key) => {
          const item = paper.insights[key]
          if (!item) return null
          return (
            <InsightCard
              key={key}
              kind={key}
              item={item}
              isActive={item.highlightId === activeHighlightId}
              onSelect={() => onSelectInsight(item.highlightId)}
              onHover={onHoverInsight}
              effectiveMode="angel"
              isOverridden={false}
              onToggleOverride={() => {}}
            />
          )
        })}
      </div>
    </aside>
  )
}
