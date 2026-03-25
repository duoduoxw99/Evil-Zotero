import type { UserSelectionInsight } from '@/types'

interface UserInsightCardProps {
  insight: UserSelectionInsight
  isActive: boolean
  effectiveMode: 'angel' | 'devil'
  onSelect: () => void
  onDelete: () => void
  onSave: () => void
  onHover: (id: string | null) => void
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      className={filled ? 'text-amber-400/90' : 'text-zotero-muted'}
      aria-hidden
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="text-zotero-muted"
      aria-hidden
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

export function UserInsightCard({
  insight,
  isActive,
  effectiveMode,
  onSelect,
  onDelete,
  onSave,
  onHover,
}: UserInsightCardProps) {
  const angelText = insight.angelText ?? (insight.status === 'loading' ? '…' : '—')
  const devilText = insight.devilText ?? (insight.status === 'loading' ? '…' : '—')
  const loading = insight.status === 'loading'
  const isGlobal = insight.cardType === 'global'
  const saved = Boolean(insight.saved)
  const canSave = insight.status === 'ready'

  const frameCls = isGlobal
    ? isActive
      ? 'border-violet-500/55 bg-violet-500/12 ring-1 ring-violet-400/25'
      : 'border-violet-500/35 bg-violet-950/20 hover:border-violet-400/45'
    : isActive
      ? 'border-teal-500/60 bg-teal-500/10'
      : 'border-zotero-border bg-zotero-surface/80 hover:border-zotero-muted hover:bg-zotero-surface'

  return (
    <div
      onMouseEnter={() => onHover(insight.highlightId)}
      onMouseLeave={() => onHover(null)}
      className={`user-insight-card w-full rounded border px-2 py-1.5 text-left transition-colors ${frameCls}`}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isGlobal ? (
              <span className="rounded bg-violet-500/20 px-1.5 text-[10px] font-medium text-violet-200/95">
                {insight.label ?? 'Global Insight'}
              </span>
            ) : (
              <span className="text-[10px] text-zotero-muted">p.{insight.page}</span>
            )}
            {insight.confidence && insight.status === 'ready' && (
              <span className="rounded bg-zotero-border/50 px-1 text-[10px] text-zotero-muted">
                {insight.confidence}
              </span>
            )}
            {insight.status === 'error' && (
              <span className="text-[10px] text-red-400">{insight.errorMessage ?? 'Error'}</span>
            )}
            {saved && (
              <span className="text-[10px] text-amber-400/80">已保存</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            disabled={!canSave}
            onClick={(e) => {
              e.stopPropagation()
              if (canSave) onSave()
            }}
            className="rounded p-1 text-zotero-muted hover:bg-zotero-border/50 hover:text-zotero-text disabled:cursor-not-allowed disabled:opacity-35"
            title={saved ? '已保存' : '保存到本地'}
          >
            <BookmarkIcon filled={saved} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="rounded p-1 text-zotero-muted hover:bg-red-500/15 hover:text-red-200"
            title="删除"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      <blockquote
        className={`insight-quote mb-2 border-l-2 pl-1.5 text-xs italic text-zotero-muted ${
          isGlobal ? 'border-violet-500/50' : 'border-teal-600/50'
        }`}
      >
        {loading && isGlobal ? (
          <span className="not-italic text-zotero-muted">正在生成全文概要…</span>
        ) : (
          <>
            &ldquo;{insight.quote.slice(0, 500)}
            {insight.quote.length > 500 ? '…' : ''}&rdquo;
          </>
        )}
      </blockquote>

      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="text-[11px] font-medium text-zotero-muted">
          {effectiveMode === 'angel' ? '😇 Angel' : '😈 Devil'}
        </div>
        <div className="relative mt-1 min-h-[3rem] overflow-hidden">
          {loading ? (
            <div className="flex flex-col gap-1">
              <div className="h-2 animate-pulse rounded bg-zotero-border/60" />
              <div className="h-2 w-4/5 animate-pulse rounded bg-zotero-border/60" />
            </div>
          ) : (
            <>
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
              <p className="invisible text-xs">
                {angelText.length > devilText.length ? angelText : devilText}
              </p>
            </>
          )}
        </div>
      </button>
    </div>
  )
}
