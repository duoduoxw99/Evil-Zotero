import type { UserSelectionInsight } from '@/types'
import { UserInsightCard } from './UserInsightCard'

function SaveAllIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function ClearAllIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" strokeLinecap="round" />
      <line x1="14" y1="11" x2="14" y2="17" strokeLinecap="round" />
    </svg>
  )
}

interface ReaderRightPanelProps {
  agentOpen: boolean
  mode: 'angel' | 'devil'
  onModeChange: (mode: 'angel' | 'devil') => void
  activeHighlightId: string | null
  onSelectInsight: (highlightId: string) => void
  onHoverInsight: (highlightId: string | null) => void
  userInsights: UserSelectionInsight[]
  onDeleteUserInsight: (id: string) => void
  onSaveInsight: (id: string) => void
  onSaveAllInsights: () => void
  onClearAllInsights: () => void
  onAnalyzePaper: () => void
}

const EMPTY_ANGEL =
  '选择你想理解的内容，我会帮你更清晰、更理性地读懂它。'
const EMPTY_DEVIL =
  '选择你想拆穿的内容，我会帮你看见它没明说的立场与张力。'

const GLOBAL_HINT_ANGEL = '让我从整体上帮你理性地理解这篇文章。'
const GLOBAL_HINT_DEVIL = '让我从整体上揭示这篇文章隐藏的立场与张力。'

export function ReaderRightPanel({
  agentOpen,
  mode,
  onModeChange,
  activeHighlightId,
  onSelectInsight,
  onHoverInsight,
  userInsights,
  onDeleteUserInsight,
  onSaveInsight,
  onSaveAllInsights,
  onClearAllInsights,
  onAnalyzePaper,
}: ReaderRightPanelProps) {
  if (!agentOpen) {
    return null
  }

  const hasGlobalCard = userInsights.some((c) => c.cardType === 'global')
  const globalLoading = userInsights.some((c) => c.cardType === 'global' && c.status === 'loading')
  const analyzeDisabled = globalLoading

  const showMainEmpty =
    userInsights.length === 0 && !globalLoading

  return (
    <aside className="reader-right-panel flex h-full min-h-0 w-[360px] shrink-0 flex-col overflow-hidden border-l border-zotero-border bg-zotero-surface">
      <div className="reader-right-panel-header shrink-0 border-b border-zotero-border bg-zotero-surface px-3 py-2">
        <div className="mb-2 flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={onSaveAllInsights}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zotero-border/80 text-zotero-muted transition-colors hover:border-teal-500/35 hover:bg-teal-500/10 hover:text-zotero-text"
            title="Save all cards"
            aria-label="Save all cards"
          >
            <SaveAllIcon />
          </button>
          <button
            type="button"
            onClick={onClearAllInsights}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zotero-border/80 text-zotero-muted transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-200"
            title="Clear all cards and highlights"
            aria-label="Clear all cards and highlights"
          >
            <ClearAllIcon />
          </button>
        </div>

        <button
          type="button"
          disabled={analyzeDisabled}
          onClick={onAnalyzePaper}
          className="mb-2 w-full rounded border border-teal-600/45 bg-teal-500/10 px-2 py-1.5 text-center text-[11px] font-medium text-zotero-text transition-colors hover:bg-teal-500/18 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Global analysis
        </button>

        {!hasGlobalCard && (
          <p className="mb-2 text-center text-[11px] leading-snug text-zotero-muted">
            {mode === 'angel' ? GLOBAL_HINT_ANGEL : GLOBAL_HINT_DEVIL}
          </p>
        )}

        <div className="mode-switch flex items-center justify-between rounded border border-zotero-border/70 bg-zotero-bg/30 px-2 py-1">
          <button
            type="button"
            onClick={() => onModeChange('angel')}
            className={`flex-1 rounded px-2 py-1.5 text-[11px] transition-colors ${
              mode === 'angel'
                ? 'mode-switch-active bg-zotero-border text-zotero-text'
                : 'text-zotero-muted hover:text-zotero-text'
            }`}
          >
            😇 Angel
          </button>
          <div className="mx-2 h-4 w-px bg-zotero-border" />
          <button
            type="button"
            onClick={() => onModeChange('devil')}
            className={`flex-1 rounded px-2 py-1.5 text-[11px] transition-colors ${
              mode === 'devil'
                ? 'mode-switch-active bg-zotero-border text-zotero-text'
                : 'text-zotero-muted hover:text-zotero-text'
            }`}
          >
            😈 Devil
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {showMainEmpty ? (
          <p className="devil-empty-tip text-center text-[13px] leading-relaxed text-zotero-muted">
            {mode === 'angel' ? EMPTY_ANGEL : EMPTY_DEVIL}
          </p>
        ) : (
          <div className="space-y-2">
            {userInsights.map((ui) => (
              <UserInsightCard
                key={ui.id}
                insight={ui}
                isActive={ui.highlightId === activeHighlightId}
                onSelect={() => onSelectInsight(ui.highlightId)}
                onDelete={() => onDeleteUserInsight(ui.id)}
                onSave={() => onSaveInsight(ui.id)}
                onHover={onHoverInsight}
                effectiveMode={mode}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
