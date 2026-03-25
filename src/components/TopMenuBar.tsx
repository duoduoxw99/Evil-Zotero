export function TopMenuBar() {
  return (
    <header className="flex h-9 shrink-0 items-center border-b border-zotero-border bg-zotero-bg px-2 text-sm">
      <span className="mr-4 font-medium text-zotero-text">Zotero Agent</span>
      <nav className="flex gap-4 text-zotero-muted">
        <button type="button" className="hover:text-zotero-text">File</button>
        <button type="button" className="hover:text-zotero-text">Edit</button>
        <button type="button" className="hover:text-zotero-text">View</button>
        <button type="button" className="hover:text-zotero-text">Tools</button>
        <button type="button" className="hover:text-zotero-text">Help</button>
      </nav>
    </header>
  )
}
