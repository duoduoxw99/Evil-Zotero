interface ReaderSpicyPanelProps {
  isOpen: boolean
}

export function ReaderSpicyPanel({ isOpen }: ReaderSpicyPanelProps) {
  if (!isOpen) return null

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-zotero-border bg-zotero-surface overflow-hidden">
      <div className="sticky top-0 z-10 border-b border-zotero-border bg-zotero-surface px-2 py-1.5">
        <div className="text-xs font-medium text-zotero-muted">Spicy</div>
        <div className="mt-1 rounded border border-zotero-border/70 bg-zotero-bg/50 p-2 text-xs text-zotero-muted">
          <div className="mb-1 font-medium text-zotero-muted">Conversation</div>
          <div className="space-y-1">
            <p>Placeholder: future AI chat thread.</p>
            <p>Ask follow-up questions here.</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2">
        <div className="mb-1.5 text-xs font-medium text-zotero-muted">Modules</div>
        <div className="space-y-2">
          {['Hidden tension', 'Related papers', 'Saved insights', 'Ask follow-up'].map((label) => (
            <div
              key={label}
              className="rounded border border-zotero-border/70 bg-zotero-bg/50 p-2 text-xs text-zotero-muted"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

