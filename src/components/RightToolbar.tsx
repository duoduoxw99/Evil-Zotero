export function RightToolbar() {
  return (
    <aside className="flex w-10 shrink-0 flex-col items-center border-l border-zotero-border bg-zotero-surface py-2">
      <button
        type="button"
        className="mb-2 flex h-8 w-8 items-center justify-center rounded text-zotero-muted hover:bg-zotero-border hover:text-zotero-text"
        title="Add"
      >
        <span className="text-lg">+</span>
      </button>
      <button
        type="button"
        className="mb-2 flex h-8 w-8 items-center justify-center rounded text-zotero-muted hover:bg-zotero-border hover:text-zotero-text"
        title="Edit"
      >
        <span className="text-sm">✎</span>
      </button>
      <button
        type="button"
        className="mb-2 flex h-8 w-8 items-center justify-center rounded text-zotero-muted hover:bg-zotero-border hover:text-zotero-text"
        title="Tag"
      >
        <span className="text-sm">#</span>
      </button>
      <div className="my-2 h-px w-6 bg-zotero-border" />
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded text-zotero-muted hover:bg-zotero-border hover:text-zotero-text"
        title="More"
      >
        <span className="text-sm">⋯</span>
      </button>
    </aside>
  )
}
