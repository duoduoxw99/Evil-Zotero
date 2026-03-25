import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { getDocument, GlobalWorkerOptions, TextLayer, type PDFDocumentProxy } from 'pdfjs-dist'
import type { Paper, PageTextEntry, UserSelectionInsight } from '@/types'
import { buildPageTextLayer } from '@/utils/citationGeometry'
import { rangeToLocalClientRects } from '@/utils/selectionDom'

import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

const RENDER_SCALE = 1.35

/** Cap DPR for very large displays to avoid huge canvases */
function clampOutputScale(dpr: number): number {
  return Math.min(Math.max(dpr, 1), 3)
}

async function extractTextItemsFromPage(page: import('pdfjs-dist').PDFPageProxy): Promise<
  import('@/types').PdfTextItemRecord[]
> {
  const textContent = await page.getTextContent()
  const out: import('@/types').PdfTextItemRecord[] = []
  for (const item of textContent.items) {
    if (!item || typeof item !== 'object' || !('str' in item) || !('transform' in item)) continue
    const t = item as { str: string; transform: number[]; width: number; height?: number }
    out.push({
      str: t.str,
      transform: [...t.transform],
      width: t.width,
      height: t.height ?? 0,
    })
  }
  return out
}

/** One rect fragment — positions from persisted range.getClientRects() (page-local px). */
function SavedSelectionHighlightFragment({
  rect,
  opacity,
}: {
  rect: { x: number; y: number; width: number; height: number }
  opacity: number
}) {
  const style: CSSProperties = {
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
  }
  return (
    <div className="absolute z-[32]" style={style}>
      <div
        className="pointer-events-none absolute inset-0 rounded-sm transition-colors duration-200"
        style={{ backgroundColor: `rgba(155, 35, 29, ${opacity})` }}
        aria-hidden
      />
    </div>
  )
}

/** Persistent user selection: one block per client rect (no merged bounding box). */
function SavedSelectionHighlightGroup({
  rects,
  active,
  hover,
  focusTick,
  onRemove,
}: {
  rects: Array<{ x: number; y: number; width: number; height: number }>
  active: boolean
  hover: boolean
  focusTick: number
  onRemove: () => void
}) {
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (!active) {
      setPulse(false)
      return
    }
    setPulse(true)
    const t = window.setTimeout(() => setPulse(false), 700)
    return () => window.clearTimeout(t)
  }, [focusTick, active])

  const opacity = active ? (pulse ? 0.3 : 0.24) : hover ? 0.18 : 0.12

  const btnStyle: CSSProperties = useMemo(() => {
    if (rects.length === 0) return { left: 0, top: 0 }
    let maxR = -Infinity
    let minT = Infinity
    for (const r of rects) {
      maxR = Math.max(maxR, r.x + r.width)
      minT = Math.min(minT, r.y)
    }
    return {
      position: 'absolute' as const,
      left: maxR - 20,
      top: Math.max(0, minT - 4),
      zIndex: 40,
    }
  }, [rects])

  return (
    <>
      {rects.map((r, i) => (
        <SavedSelectionHighlightFragment key={i} rect={r} opacity={opacity} />
      ))}
      <button
        type="button"
        aria-label="Remove highlight and insight"
        style={btnStyle}
        className="flex h-5 w-5 pointer-events-auto items-center justify-center rounded border border-zotero-border bg-zotero-surface text-[11px] leading-none text-zotero-muted shadow hover:border-red-500/50 hover:bg-red-500/15 hover:text-red-200"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      >
        ×
      </button>
    </>
  )
}

interface PdfPageRowProps {
  pageNum: number
  pdf: PDFDocumentProxy
  scale: number
  /** devicePixelRatio (or 1); used to render canvas at higher internal resolution */
  outputScale: number
  userRegions: Array<{
    id: string
    rects: Array<{ x: number; y: number; width: number; height: number }>
    active: boolean
    hover: boolean
  }>
  highlightFocusTick: number
  onRemoveUserInsight: (id: string) => void
}

function PdfPageRow({
  pageNum,
  pdf,
  scale,
  outputScale,
  userRegions,
  highlightFocusTick,
  onRemoveUserInsight,
}: PdfPageRowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  const innerWrapRef = useRef<HTMLDivElement>(null)
  const textLayerTaskRef = useRef<TextLayer | null>(null)

  useEffect(() => {
    let cancelled = false
    textLayerTaskRef.current?.cancel()
    textLayerTaskRef.current = null
    if (textLayerRef.current) textLayerRef.current.innerHTML = ''

    ;(async () => {
      const page = await pdf.getPage(pageNum)
      /** Single viewport for canvas + TextLayer (same as pdf.js PDFPageView). */
      const viewport = page.getViewport({ scale })
      if (cancelled) return
      const canvas = canvasRef.current
      const tlDiv = textLayerRef.current
      const inner = innerWrapRef.current
      if (!canvas || !tlDiv || !inner) return
      const ctx = canvas.getContext('2d', { alpha: false })
      if (!ctx) return
      const dw = viewport.width
      const dh = viewport.height
      inner.style.width = `${dw}px`
      inner.style.height = `${dh}px`
      tlDiv.style.setProperty('--scale-factor', String(viewport.scale))
      canvas.width = Math.floor(dw * outputScale)
      canvas.height = Math.floor(dh * outputScale)
      canvas.style.width = `${dw}px`
      canvas.style.height = `${dh}px`
      await page.render({
        canvasContext: ctx,
        viewport,
        transform:
          outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
      }).promise
      if (cancelled) return
      const textContent = await page.getTextContent()
      if (cancelled) return
      const textLayer = new TextLayer({
        textContentSource: textContent,
        container: tlDiv,
        viewport,
      })
      textLayerTaskRef.current = textLayer
      await textLayer.render()
    })()

    return () => {
      cancelled = true
      textLayerTaskRef.current?.cancel()
      textLayerTaskRef.current = null
      if (textLayerRef.current) textLayerRef.current.innerHTML = ''
    }
  }, [pdf, pageNum, scale, outputScale])

  return (
    <div
      data-pdf-page={pageNum}
      className="relative mb-4 rounded border border-zotero-border bg-zotero-surface p-2"
    >
      <div className="mb-1 text-[11px] text-zotero-muted">Page {pageNum}</div>
      <div
        ref={innerWrapRef}
        data-pdf-select-wrap={String(pageNum)}
        className="pdf-page-inner relative inline-block max-w-full"
      >
        <canvas
          ref={canvasRef}
          className="pointer-events-none relative z-0 block max-h-none max-w-full bg-white"
        />
        <div
          ref={textLayerRef}
          className="pdf-text-layer absolute left-0 top-0 overflow-hidden"
        />
        {userRegions.map((u) =>
          u.rects.length > 0 ? (
            <SavedSelectionHighlightGroup
              key={u.id}
              rects={u.rects}
              active={u.active}
              hover={u.hover}
              focusTick={highlightFocusTick}
              onRemove={() => onRemoveUserInsight(u.id)}
            />
          ) : null,
        )}
      </div>
    </div>
  )
}

interface PdfViewerProps {
  paper: Paper
  pdfUrl: string
  onPdfFile: (file: File) => void
  onPageTextsExtracted: (pages: PageTextEntry[]) => void
  scrollTrigger: number
  /** Page to scroll into view when an insight is selected (user rect or paper metadata page). */
  scrollTargetPage: number | null
  userInsights: UserSelectionInsight[]
  activeHighlightId: string | null
  hoverHighlightId: string | null
  highlightFocusTick: number
  onRemoveUserInsight: (id: string) => void
  onSelectionIntent: (payload: {
    quote: string
    page: number
    rects: Array<{ x: number; y: number; width: number; height: number }>
  }) => void
}

export function PdfViewer({
  paper,
  pdfUrl,
  onPdfFile,
  onPageTextsExtracted,
  scrollTrigger,
  scrollTargetPage,
  userInsights,
  activeHighlightId,
  hoverHighlightId,
  highlightFocusTick,
  onRemoveUserInsight,
  onSelectionIntent,
}: PdfViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [outputScale, setOutputScale] = useState(() =>
    typeof window !== 'undefined' ? clampOutputScale(window.devicePixelRatio) : 1,
  )

  useEffect(() => {
    const sync = () => setOutputScale(clampOutputScale(window.devicePixelRatio))
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const onSelectionIntentRef = useRef(onSelectionIntent)
  useEffect(() => {
    onSelectionIntentRef.current = onSelectionIntent
  }, [onSelectionIntent])

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    setPdfDoc(null)
    setNumPages(0)
    setLoading(true)
    onPageTextsExtracted([])

    ;(async () => {
      try {
        const loadingTask = getDocument({ url: pdfUrl, withCredentials: false })
        const pdf = await loadingTask.promise
        if (cancelled) return
        setPdfDoc(pdf)
        setNumPages(pdf.numPages)

        const texts: PageTextEntry[] = []
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const items = await extractTextItemsFromPage(page)
          const layer = buildPageTextLayer(i, items)
          texts.push({
            page: i,
            text: layer.normalizedFull,
            items,
          })
        }

        if (!cancelled) {
          onPageTextsExtracted(texts)
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Failed to load PDF')
          onPageTextsExtracted([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reload when URL changes; parent passes stable callback
  }, [pdfUrl])

  useEffect(() => {
    if (scrollTargetPage == null) return
    const el = scrollRef.current?.querySelector(`[data-pdf-page="${scrollTargetPage}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [scrollTrigger, scrollTargetPage])

  const userRegionsByPage = useMemo(() => {
    const m: Record<
      number,
      Array<{
        id: string
        rects: Array<{ x: number; y: number; width: number; height: number }>
        active: boolean
        hover: boolean
      }>
    > = {}
    for (const u of userInsights) {
      if (u.cardType === 'global' || u.rects.length === 0) continue
      if (!m[u.page]) m[u.page] = []
      m[u.page].push({
        id: u.id,
        rects: u.rects.map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })),
        active: u.highlightId === activeHighlightId,
        hover:
          u.highlightId === hoverHighlightId &&
          hoverHighlightId !== activeHighlightId,
      })
    }
    return m
  }, [userInsights, activeHighlightId, hoverHighlightId])

  const pages = numPages > 0 ? Array.from({ length: numPages }, (_, i) => i + 1) : []

  useEffect(() => {
    const onMouseUp = () => {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        return
      }
      const text = sel.toString().replace(/\s+/g, ' ').trim()
      if (text.length < 2) {
        return
      }
      const range = sel.getRangeAt(0)
      const root =
        range.commonAncestorContainer.nodeType === Node.TEXT_NODE
          ? range.commonAncestorContainer.parentElement
          : (range.commonAncestorContainer as HTMLElement)
      const wrap = root?.closest?.('[data-pdf-select-wrap]') as HTMLElement | null
      if (!wrap || !scrollRef.current?.contains(wrap)) {
        return
      }
      const pageNum = parseInt(wrap.getAttribute('data-pdf-select-wrap') || '0', 10)
      if (!pageNum) return
      const rects = rangeToLocalClientRects(range, wrap)
      if (rects.length === 0) return

      onSelectionIntentRef.current({
        quote: text,
        page: pageNum,
        rects,
      })
    }

    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-zotero-bg">
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2 border-b border-zotero-border px-4 pb-2 pt-2">
        <button
          type="button"
          className="rounded border border-zotero-border px-2 py-1 text-xs text-zotero-muted hover:bg-zotero-surface"
          onClick={() => fileInputRef.current?.click()}
        >
          Open PDF…
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onPdfFile(f)
            e.target.value = ''
          }}
        />
        <span className="ml-2 max-w-md truncate text-xs text-zotero-muted" title={pdfUrl}>
          {paper.title}
        </span>
        {numPages > 0 && (
          <span className="text-xs text-zotero-muted">
            {numPages} page{numPages === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto px-4 pb-4">
        {loading && (
          <div className="py-8 text-center text-xs text-zotero-muted">Loading PDF…</div>
        )}
        {loadError && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {loadError}
            <div className="mt-1 text-zotero-muted">
              Place a file at <code className="text-zotero-text">public{paper.pdfPath}</code> or use Open PDF.
            </div>
          </div>
        )}
        {!loading && !loadError && pdfDoc && pages.map((pageNum) => {
          const ur = userRegionsByPage[pageNum] ?? []
          return (
            <PdfPageRow
              key={pageNum}
              pdf={pdfDoc}
              pageNum={pageNum}
              scale={RENDER_SCALE}
              outputScale={outputScale}
              userRegions={ur}
              highlightFocusTick={highlightFocusTick}
              onRemoveUserInsight={onRemoveUserInsight}
            />
          )
        })}
      </div>
    </div>
  )
}
