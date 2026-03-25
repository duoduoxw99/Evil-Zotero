import type { PageViewport } from 'pdfjs-dist'
import type { PdfTextItemRecord } from '@/types'
import { normalizeForMatch } from '@/utils/pdfText'

export interface ItemNormSegment {
  itemIndex: number
  /** Inclusive start in normalized full-page string */
  start: number
  /** Exclusive end */
  end: number
}

export interface PageTextLayer {
  page: number
  normalizedFull: string
  segments: ItemNormSegment[]
  items: PdfTextItemRecord[]
}

export interface ViewportRect {
  left: number
  top: number
  width: number
  height: number
}

/** Build normalized page string and per-item ranges (space between non-empty pieces). */
export function buildPageTextLayer(pageNum: number, items: PdfTextItemRecord[]): PageTextLayer {
  const segments: ItemNormSegment[] = []
  let acc = ''
  for (let i = 0; i < items.length; i++) {
    const piece = normalizeForMatch(items[i].str)
    if (!piece) continue
    if (acc.length > 0) acc += ' '
    const start = acc.length
    acc += piece
    segments.push({ itemIndex: i, start, end: acc.length })
  }
  return { page: pageNum, normalizedFull: acc, segments, items }
}

function textItemToViewportRect(viewport: PageViewport, item: PdfTextItemRecord): ViewportRect {
  const tx = item.transform
  const x = tx[4]
  const y = tx[5]
  const w = item.width
  const fh = Math.hypot(tx[2], tx[3])
  const h = item.height > 0 ? item.height : fh
  const pdfRect = [x, y - h, x + w, y] as [number, number, number, number]
  const vr = viewport.convertToViewportRectangle(pdfRect)
  const left = Math.min(vr[0], vr[2])
  const top = Math.min(vr[1], vr[3])
  const right = Math.max(vr[0], vr[2])
  const bottom = Math.max(vr[1], vr[3])
  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  }
}

function unionViewportRects(rects: ViewportRect[]): ViewportRect | null {
  if (rects.length === 0) return null
  let minL = Infinity
  let minT = Infinity
  let maxR = -Infinity
  let maxB = -Infinity
  for (const r of rects) {
    minL = Math.min(minL, r.left)
    minT = Math.min(minT, r.top)
    maxR = Math.max(maxR, r.left + r.width)
    maxB = Math.max(maxB, r.top + r.height)
  }
  return { left: minL, top: minT, width: maxR - minL, height: maxB - minT }
}

/** Map [qStart, qEnd) in normalizedFull to contributing item indices (any overlap). */
export function itemIndicesForNormRange(
  segments: ItemNormSegment[],
  qStart: number,
  qEnd: number,
): number[] {
  const set = new Set<number>()
  for (const seg of segments) {
    if (seg.end <= qStart || seg.start >= qEnd) continue
    set.add(seg.itemIndex)
  }
  return [...set].sort((a, b) => a - b)
}

function findSubstringRange(normFull: string, normQuote: string): { start: number; end: number } | null {
  if (!normQuote) return null
  const idx = normFull.indexOf(normQuote)
  if (idx >= 0) return { start: idx, end: idx + normQuote.length }
  return null
}

/** Longest prefix of normQuote that appears in normFull (for weak match). */
function findLongestPrefixRange(normFull: string, normQuote: string, minLen: number): { start: number; end: number } | null {
  for (let len = Math.min(normQuote.length, 120); len >= minLen; len--) {
    const sub = normQuote.slice(0, len)
    const idx = normFull.indexOf(sub)
    if (idx >= 0) return { start: idx, end: idx + len }
  }
  return null
}

/** Group items into horizontal lines by baseline y (PDF space). */
function clusterItemsByLine(items: PdfTextItemRecord[]): PdfTextItemRecord[][] {
  if (items.length === 0) return []
  const withIdx = items.map((it, i) => ({ it, i, y: it.transform[5] }))
  withIdx.sort((a, b) => b.y - a.y)
  const lines: PdfTextItemRecord[][] = []
  let current: PdfTextItemRecord[] = []
  let lastY: number | null = null
  const threshold = 8
  for (const row of withIdx) {
    if (lastY === null || Math.abs(row.y - lastY) <= threshold) {
      current.push(row.it)
      lastY = row.y
    } else {
      if (current.length) lines.push(current)
      current = [row.it]
      lastY = row.y
    }
  }
  if (current.length) lines.push(current)
  return lines
}

/** Fallback: pick line cluster whose text best overlaps quote; union those item rects. */
function paragraphBlockFallback(
  layer: Pick<PageTextLayer, 'normalizedFull' | 'segments' | 'items'>,
  viewport: PageViewport,
  quote: string,
): ViewportRect | null {
  const normQ = normalizeForMatch(quote)
  if (!normQ) return null
  const lines = clusterItemsByLine(layer.items)
  let bestScore = 0
  let bestLine: PdfTextItemRecord[] | null = null
  for (const line of lines) {
    const lineNorm = line.map((it) => normalizeForMatch(it.str)).filter(Boolean).join(' ')
    let score = 0
    if (lineNorm.includes(normQ)) score = normQ.length
    else {
      for (let len = Math.min(normQ.length, 80); len >= 15; len--) {
        const sub = normQ.slice(0, len)
        if (lineNorm.includes(sub)) {
          score = len
          break
        }
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestLine = line
    }
  }
  if (!bestLine || bestScore < 10) {
    const mid = Math.floor(layer.items.length / 2)
    const slice = layer.items.slice(Math.max(0, mid - 2), Math.min(layer.items.length, mid + 3))
    const rects = slice.map((it) => textItemToViewportRect(viewport, it))
    return unionViewportRects(rects)
  }
  const rects = bestLine.map((it) => textItemToViewportRect(viewport, it))
  return unionViewportRects(rects)
}

/**
 * Compute highlight rectangle in viewport (canvas) pixels for a quote on one page.
 */
export function computeQuoteHighlightRect(
  layer: Pick<PageTextLayer, 'normalizedFull' | 'segments' | 'items'>,
  viewport: PageViewport,
  quote: string,
): ViewportRect | null {
  const normFull = layer.normalizedFull
  const normQ = normalizeForMatch(quote)
  if (!normQ || !layer.items.length) return null

  let range = findSubstringRange(normFull, normQ)
  if (!range) {
    range = findLongestPrefixRange(normFull, normQ, 20)
  }
  if (!range) {
    return paragraphBlockFallback(layer, viewport, quote)
  }

  const indices = itemIndicesForNormRange(layer.segments, range.start, range.end)
  if (indices.length === 0) {
    return paragraphBlockFallback(layer, viewport, quote)
  }

  const rects = indices.map((ii) => textItemToViewportRect(viewport, layer.items[ii]))
  return unionViewportRects(rects)
}
