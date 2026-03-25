import { COLLECTIONS, type CollectionId } from '@/data/mockPapers'

interface SidebarCollectionsProps {
  selectedCollection: CollectionId
  onSelectCollection: (id: CollectionId) => void
}

export function SidebarCollections({ selectedCollection, onSelectCollection }: SidebarCollectionsProps) {
  return (
    <aside className="flex w-48 shrink-0 flex-col border-r border-zotero-border bg-zotero-surface">
      <div className="border-b border-zotero-border px-2 py-1.5 text-xs font-medium text-zotero-muted">
        Libraries
      </div>
      <ul className="flex-1 overflow-auto py-1">
        {COLLECTIONS.map((id) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onSelectCollection(id)}
              className={`w-full px-3 py-1.5 text-left text-sm ${
                selectedCollection === id
                  ? 'bg-zotero-accent/20 text-zotero-text'
                  : 'text-zotero-muted hover:bg-zotero-border/50 hover:text-zotero-text'
              }`}
            >
              {id === 'All' ? 'My Library' : id}
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t border-zotero-border px-2 py-1.5 text-xs font-medium text-zotero-muted">
        Collections
      </div>
      <ul className="flex-1 overflow-auto py-1">
        {COLLECTIONS.filter((c) => c !== 'All').map((id) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onSelectCollection(id)}
              className={`w-full px-3 py-1.5 text-left text-sm ${
                selectedCollection === id
                  ? 'bg-zotero-accent/20 text-zotero-text'
                  : 'text-zotero-muted hover:bg-zotero-border/50 hover:text-zotero-text'
              }`}
            >
              {id}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
