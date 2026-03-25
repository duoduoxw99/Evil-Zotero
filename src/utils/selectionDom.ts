import type { ViewportRect } from '@/utils/citationGeometry'

/** Map a DOM Range to coordinates relative to `container` (e.g. PDF page inner wrap). */
export function rangeToLocalUnionRect(range: Range, container: HTMLElement): ViewportRect | null {
  const cRect = container.getBoundingClientRect()
  const rects = Array.from(range.getClientRects())
  if (rects.length === 0) return null
  let minL = Infinity
  let minT = Infinity
  let maxR = -Infinity
  let maxB = -Infinity
  for (const r of rects) {
    minL = Math.min(minL, r.left)
    minT = Math.min(minT, r.top)
    maxR = Math.max(maxR, r.right)
    maxB = Math.max(maxB, r.bottom)
  }
  const w = maxR - minL
  const h = maxB - minT
  if (w <= 0 || h <= 0) return null
  return {
    left: minL - cRect.left,
    top: minT - cRect.top,
    width: w,
    height: h,
  }
}

export interface LocalClientRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Map each `range.getClientRects()` entry to coordinates relative to `container`.
 * Preserves line/column fragments — do not merge (multi-line & multi-column PDFs).
 */
export function rangeToLocalClientRects(range: Range, container: HTMLElement): LocalClientRect[] {
  const cRect = container.getBoundingClientRect()
  const list = range.getClientRects()
  const out: LocalClientRect[] = []
  for (let i = 0; i < list.length; i++) {
    const r = list[i]
    if (r.width <= 0 || r.height <= 0) continue
    out.push({
      x: r.left - cRect.left + container.scrollLeft,
      y: r.top - cRect.top + container.scrollTop,
      width: r.width,
      height: r.height,
    })
  }
  return out
}
