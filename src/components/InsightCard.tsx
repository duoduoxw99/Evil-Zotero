import type { InsightItem } from '@/types'
import type { InsightKey } from '@/types'

const LABELS: Record<InsightKey, string> = {
  mainClaim: 'Main Claim',
  respondsTo: 'Responds To',
  quietPushback: 'Quiet Pushback',
  researchMove: 'Research Move',
  evidence: 'Evidence',
}

interface InsightCardProps {
  kind: InsightKey
  item: InsightItem
  isActive: boolean
  onSelect: () => void
  onHover: (highlightId: string | null) => void
  effectiveMode: 'angel' | 'devil'
  isOverridden: boolean
  onToggleOverride: () => void
}

export function InsightCard({
  kind,
  item,
  isActive,
  onSelect,
  onHover,
  effectiveMode,
  isOverridden,
  onToggleOverride,
}: InsightCardProps) {
  const angelText = item.angelText || item.text
  const devilText = item.devilText || item.text
  const badge = effectiveMode === 'angel' ? '😇' : '😈'

  return (
    <div
      onMouseEnter={() => onHover(item.highlightId)}
      onMouseLeave={() => onHover(null)}
      className={`insight-card w-full rounded border px-2 py-1.5 text-left transition-colors ${
        isActive
          ? 'border-amber-500/60 bg-amber-500/10'
          : 'border-zotero-border bg-zotero-surface/80 hover:border-zotero-muted hover:bg-zotero-surface'
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-zotero-muted">{LABELS[kind]}</div>
        <div className="flex items-center gap-1">
          {isOverridden && (
            <span
              className="rounded border border-zotero-border/70 bg-zotero-bg/40 px-1 py-0.5 text-[10px] leading-none text-zotero-text"
              title="Local override"
            >
              {badge}
            </span>
          )}
          <button
            type="button"
            onClick={onToggleOverride}
            className="rounded border border-zotero-border/70 bg-zotero-bg/40 px-2 py-1 text-[11px] text-zotero-muted hover:text-zotero-text hover:bg-zotero-surface"
            title="Override this card"
          >
            ↺
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left"
      >
        <div className="relative min-h-[3.5rem] overflow-hidden">
          <p
            className={`absolute inset-0 text-xs text-zotero-text transition-all duration-200 ${
              effectiveMode === 'angel' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
            }`}
          >
            {angelText}
          </p>
          <p
            className={`absolute inset-0 text-xs text-zotero-text transition-all duration-200 ${
              effectiveMode === 'devil' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
            }`}
          >
            {devilText}
          </p>
          <p className="invisible text-xs">{angelText.length > devilText.length ? angelText : devilText}</p>
        </div>
      </button>
      <blockquote className="insight-quote mt-1 line-clamp-3 border-l-2 border-zotero-border pl-1.5 text-xs italic leading-snug text-zotero-muted">
        &ldquo;{item.quote}&rdquo;
      </blockquote>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-[10px] text-zotero-muted">p.{item.page}</span>
        <span className="rounded bg-zotero-border/50 px-1 text-[10px] text-zotero-muted">
          {item.confidence ?? 'n/a'}
        </span>
      </div>
    </div>
  )
}
