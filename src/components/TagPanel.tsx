import type { Paper } from '@/types'

interface TagPanelProps {
  papers: Paper[]
  selectedTags: string[]
  onToggleTag: (tag: string) => void
}

export function TagPanel({ papers, selectedTags, onToggleTag }: TagPanelProps) {
  const tagCounts = new Map<string, number>()
  papers.forEach((p) => {
    p.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1))
  })
  const tags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1])

  return (
    <div className="flex shrink-0 flex-wrap gap-1 border-t border-zotero-border bg-zotero-surface px-2 py-1.5">
      <span className="mr-2 self-center text-xs text-zotero-muted">Tags:</span>
      {tags.map(([tag, count]) => (
        <button
          key={tag}
          type="button"
          onClick={() => onToggleTag(tag)}
          className={`rounded px-1.5 py-0.5 text-xs ${
            selectedTags.includes(tag)
              ? 'bg-zotero-accent/30 text-zotero-text'
              : 'bg-zotero-border/50 text-zotero-muted hover:bg-zotero-border hover:text-zotero-text'
          }`}
        >
          {tag} ({count})
        </button>
      ))}
    </div>
  )
}
