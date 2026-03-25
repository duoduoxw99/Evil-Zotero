interface TabBarProps {
  activeTab: string
  tabs: string[]
  onSelectTab: (tab: string) => void
}

export function TabBar({ activeTab, tabs, onSelectTab }: TabBarProps) {
  return (
    <div className="flex shrink-0 border-b border-zotero-border bg-zotero-surface">
      <div className="flex gap-0.5 px-1 py-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onSelectTab(tab)}
            className={`rounded px-2 py-1 text-xs ${
              activeTab === tab
                ? 'bg-zotero-bg text-zotero-text'
                : 'text-zotero-muted hover:bg-zotero-border/50 hover:text-zotero-text'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  )
}
