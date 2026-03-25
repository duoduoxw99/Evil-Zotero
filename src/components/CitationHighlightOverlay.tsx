interface CitationHighlightOverlayProps {
  highlightId: string | null
  hoverHighlightId: string | null
  highlights: { id: string; page: number }[]
  pageHeight: number
}

export function CitationHighlightOverlay({
  highlightId,
  hoverHighlightId,
  highlights,
  pageHeight,
}: CitationHighlightOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col gap-2">
      {highlights.map((h) => {
        const isActive = h.id === highlightId
        const isHover = h.id === hoverHighlightId && !isActive
        const top = 8 + (h.page - 1) * (pageHeight + 8) + 24
        const opacity = isActive ? 0.35 : isHover ? 0.2 : 0.08
        const borderOpacity = isActive ? 0.9 : isHover ? 0.5 : 0.25
        return (
          <div
            key={h.id}
            className="absolute left-4 right-4 rounded border-2 bg-yellow-500/20 transition-colors"
            style={{
              top: `${top}px`,
              height: 48,
              borderColor: `rgba(234, 179, 8, ${borderOpacity})`,
              backgroundColor: `rgba(234, 179, 8, ${opacity})`,
            }}
          />
        )
      })}
    </div>
  )
}
