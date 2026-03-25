import type { Paper } from '@/types'

interface PaperTableProps {
  papers: Paper[]
  selectedPaperId: string | null
  onSelectPaper: (id: string) => void
  onOpenPaper: (id: string) => void
}

export function PaperTable({
  papers,
  selectedPaperId,
  onSelectPaper,
  onOpenPaper,
}: PaperTableProps) {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-zotero-surface">
          <tr className="border-b border-zotero-border">
            <th className="w-8 border-r border-zotero-border bg-zotero-surface px-2 py-1.5 text-left text-xs font-medium text-zotero-muted" />
            <th className="border-r border-zotero-border px-2 py-1.5 text-left text-xs font-medium text-zotero-muted">
              Title
            </th>
            <th className="w-32 border-r border-zotero-border px-2 py-1.5 text-left text-xs font-medium text-zotero-muted">
              Creator
            </th>
            <th className="w-16 border-r border-zotero-border px-2 py-1.5 text-left text-xs font-medium text-zotero-muted">
              Date
            </th>
            <th className="w-28 border-zotero-border px-2 py-1.5 text-left text-xs font-medium text-zotero-muted">
              Publication
            </th>
          </tr>
        </thead>
        <tbody>
          {papers.map((p) => (
            <tr
              key={p.id}
              onClick={() => onSelectPaper(p.id)}
              onDoubleClick={() => onOpenPaper(p.id)}
              className={`cursor-pointer border-b border-zotero-border/70 ${
                selectedPaperId === p.id ? 'bg-zotero-accent/15' : 'hover:bg-zotero-surface/80'
              }`}
            >
              <td className="border-r border-zotero-border/70 px-2 py-1.5" />
              <td className="border-r border-zotero-border/70 px-2 py-1.5 text-zotero-text">
                {p.title}
              </td>
              <td className="border-r border-zotero-border/70 px-2 py-1.5 text-zotero-muted">
                {p.creator}
              </td>
              <td className="border-r border-zotero-border/70 px-2 py-1.5 text-zotero-muted">
                {p.date}
              </td>
              <td className="px-2 py-1.5 text-zotero-muted">{p.publication}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
