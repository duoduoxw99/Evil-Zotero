interface BottomSpicyPanelProps {
  isOpen: boolean
}

export function BottomSpicyPanel({ isOpen }: BottomSpicyPanelProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-zotero-border bg-zotero-surface transition-transform duration-200 ease-out"
      style={{ height: '24vh', minHeight: 160 }}
    >
      <div className="flex flex-1 overflow-hidden">
        <section className="flex w-2/5 flex-col border-r border-zotero-border p-2">
          <div className="mb-1.5 text-xs font-medium text-zotero-muted">Conversation</div>
          <div className="flex-1 space-y-2 overflow-auto rounded border border-zotero-border/70 bg-zotero-bg/50 p-2 text-xs text-zotero-muted">
            <p>Placeholder: future AI chat thread.</p>
            <p>Ask follow-up questions here.</p>
          </div>
        </section>
        <section className="flex flex-1 flex-col p-2">
          <div className="mb-1.5 text-xs font-medium text-zotero-muted">Modules</div>
          <div className="grid flex-1 grid-cols-2 gap-2 overflow-auto">
            {['Hidden tension', 'Related papers', 'Saved insights', 'Ask follow-up'].map((label) => (
              <div
                key={label}
                className="rounded border border-zotero-border/70 bg-zotero-bg/50 p-2 text-xs text-zotero-muted"
              >
                {label}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
