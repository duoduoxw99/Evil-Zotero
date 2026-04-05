import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PageTextEntry, Paper, PdfSelectionRect, UserSelectionInsight } from '@/types'
import { PdfViewer } from './PdfViewer'
import { ReaderRightPanel } from './ReaderRightPanel'
import { interpretSelection } from '@/services/selectionInsightService'
import { analyzeWholePaper } from '@/services/globalInsightService'
import {
  clearSavedInsights,
  loadSavedInsights,
  sortInsightsForDisplay,
  writeSavedInsights,
} from '@/utils/insightStorage'

interface ReaderLayoutProps {
  paper: Paper
  onClose: () => void
  /** Right agent panel visibility (floating button toggles this in AppShell). */
  spicyOpen: boolean
  mode: 'angel' | 'devil'
  onModeChange: (mode: 'angel' | 'devil') => void
}

function newUserInsightId(): string {
  return `user-sel-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
}

function newGlobalInsightId(): string {
  return `global-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
}

export function ReaderLayout({ paper, onClose, spicyOpen, mode, onModeChange }: ReaderLayoutProps) {
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null)
  const [hoverHighlightId, setHoverHighlightId] = useState<string | null>(null)

  const [userInsights, setUserInsights] = useState<UserSelectionInsight[]>([])

  const [pdfUrl, setPdfUrl] = useState(paper.pdfPath)
  const objectUrlRef = useRef<string | null>(null)
  const [scrollTrigger, setScrollTrigger] = useState(0)
  /** Bumps when user re-clicks the same insight card to re-emphasize the PDF highlight. */
  const [highlightFocusTick, setHighlightFocusTick] = useState(0)

  const userInsightsRef = useRef(userInsights)
  const globalAnalyzeInFlightRef = useRef(false)
  useEffect(() => {
    userInsightsRef.current = userInsights
  }, [userInsights])

  const persistSavedSubset = useCallback(
    (list: UserSelectionInsight[]) => {
      writeSavedInsights(paper.id, list)
    },
    [paper.id],
  )

  useEffect(() => {
    setActiveHighlightId(null)
    setHoverHighlightId(null)
    setUserInsights(sortInsightsForDisplay(loadSavedInsights(paper.id)))
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setPdfUrl(paper.pdfPath)
  }, [paper.id, paper.pdfPath])

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    },
    [],
  )

  const handlePageTextsExtracted = useCallback((_pages: PageTextEntry[]) => {}, [])

  const handlePdfFile = useCallback((file: File) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    setPdfUrl(url)
  }, [])

  const scrollTargetPage = useMemo(() => {
    if (!activeHighlightId?.startsWith('user-sel-')) return null
    const u = userInsights.find((x) => x.highlightId === activeHighlightId)
    if (!u || u.cardType === 'global') return null
    return u.page ?? null
  }, [activeHighlightId, userInsights])

  const handleSelectInsight = useCallback((id: string) => {
    setActiveHighlightId(id)
    setScrollTrigger((t) => t + 1)
    setHighlightFocusTick((n) => n + 1)
  }, [])

  const handleDeleteUserInsight = useCallback(
    (id: string) => {
      setUserInsights((prev) => {
        const next = prev.filter((u) => u.id !== id)
        const removed = prev.find((u) => u.id === id)
        if (removed?.saved) {
          writeSavedInsights(paper.id, next)
        }
        return next
      })
      setActiveHighlightId((cur) => (cur === id ? null : cur))
      setHoverHighlightId((cur) => (cur === id ? null : cur))
    },
    [paper.id],
  )

  const handleSaveInsight = useCallback(
    (id: string) => {
      setUserInsights((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, saved: true } : c))
        persistSavedSubset(next)
        return next
      })
    },
    [persistSavedSubset],
  )

  const handleSaveAllInsights = useCallback(() => {
    setUserInsights((prev) => {
      const next = prev.map((c) => ({ ...c, saved: true }))
      persistSavedSubset(next)
      return next
    })
  }, [persistSavedSubset])

  const handleClearAllInsights = useCallback(() => {
    setUserInsights([])
    setActiveHighlightId(null)
    setHoverHighlightId(null)
    clearSavedInsights(paper.id)
  }, [paper.id])

  const handleAnalyzePaper = useCallback(async () => {
    if (globalAnalyzeInFlightRef.current) return
    globalAnalyzeInFlightRef.current = true

    const id = newGlobalInsightId()
    const loadingInsight: UserSelectionInsight = {
      id,
      highlightId: id,
      quote: '',
      page: 1,
      rects: [],
      cardType: 'global',
      status: 'loading',
      label: 'Global Insight',
    }

    const prev = userInsightsRef.current
    const withoutGlobal = prev.filter((c) => c.cardType !== 'global')
    const next = sortInsightsForDisplay([loadingInsight, ...withoutGlobal])
    persistSavedSubset(next)
    setUserInsights(next)
    setActiveHighlightId(null)

    try {
      const result = await analyzeWholePaper(paper)
      setUserInsights((p) =>
        p.map((u) =>
          u.id === id
            ? {
                ...u,
                status: 'ready' as const,
                quote: result.summary,
                angelText: result.angelText,
                devilText: result.devilText,
                confidence: result.confidence,
              }
            : u,
        ),
      )
    } catch (e) {
      setUserInsights((p) =>
        p.map((u) =>
          u.id === id
            ? {
                ...u,
                status: 'error' as const,
                errorMessage: e instanceof Error ? e.message : 'Request failed',
              }
            : u,
        ),
      )
    } finally {
      globalAnalyzeInFlightRef.current = false
    }
  }, [paper, persistSavedSubset])

  const handleSelectionIntent = useCallback(
    async (payload: {
      quote: string
      page: number
      rects: Array<{ x: number; y: number; width: number; height: number }>
    }) => {
      const id = newUserInsightId()
      const rects: PdfSelectionRect[] = payload.rects.map((r) => ({
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        page: payload.page,
      }))
      const insight: UserSelectionInsight = {
        id,
        highlightId: id,
        quote: payload.quote,
        page: payload.page,
        rects,
        cardType: 'selection',
        status: 'loading',
      }
      setUserInsights((prev) => [...prev, insight])
      setActiveHighlightId(id)
      setScrollTrigger((t) => t + 1)
      setHighlightFocusTick((n) => n + 1)

      try {
        const result = await interpretSelection(payload.quote)
        setUserInsights((prev) =>
          prev.map((u) =>
            u.id === id
              ? {
                  ...u,
                  status: 'ready' as const,
                  label: result.label,
                  angelText: result.angelText,
                  devilText: result.devilText,
                  confidence: result.confidence,
                }
              : u,
          ),
        )
      } catch (e) {
        setUserInsights((prev) =>
          prev.map((u) =>
            u.id === id
              ? {
                  ...u,
                  status: 'error' as const,
                  errorMessage: e instanceof Error ? e.message : 'Request failed',
                }
              : u,
          ),
        )
      }
    },
    [],
  )

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-zotero-border bg-zotero-surface px-2 py-1">
          <span className="text-sm text-zotero-text">{paper.title}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-xs text-zotero-muted hover:bg-zotero-border hover:text-zotero-text"
          >
            ← Library
          </button>
        </div>
        <PdfViewer
          paper={paper}
          pdfUrl={pdfUrl}
          onPdfFile={handlePdfFile}
          onPageTextsExtracted={handlePageTextsExtracted}
          scrollTrigger={scrollTrigger}
          scrollTargetPage={scrollTargetPage}
          userInsights={userInsights}
          activeHighlightId={activeHighlightId}
          hoverHighlightId={hoverHighlightId}
          highlightFocusTick={highlightFocusTick}
          onRemoveUserInsight={handleDeleteUserInsight}
          onSelectionIntent={handleSelectionIntent}
        />
      </div>
      <div
        className={`flex shrink-0 flex-col overflow-hidden border-zotero-border bg-zotero-surface transition-[width] duration-300 ease-out ${
          spicyOpen ? 'w-[360px] border-l' : 'w-0 border-l-0'
        }`}
      >
        <ReaderRightPanel
          agentOpen={spicyOpen}
          mode={mode}
          onModeChange={onModeChange}
          activeHighlightId={activeHighlightId}
          onSelectInsight={handleSelectInsight}
          onHoverInsight={setHoverHighlightId}
          userInsights={userInsights}
          onDeleteUserInsight={handleDeleteUserInsight}
          onSaveInsight={handleSaveInsight}
          onSaveAllInsights={handleSaveAllInsights}
          onClearAllInsights={handleClearAllInsights}
          onAnalyzePaper={handleAnalyzePaper}
        />
      </div>
    </div>
  )
}
