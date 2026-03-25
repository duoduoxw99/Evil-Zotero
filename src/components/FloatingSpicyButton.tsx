import { useCallback, useRef, useState } from 'react'
import ModeToggleButton from './ModeToggleButton'

const DRAG_THRESHOLD_PX = 8

interface FloatingSpicyButtonProps {
  mode: 'angel' | 'devil'
  onToggleMode: () => void
  isPanelOpen: boolean
}

export function FloatingSpicyButton({
  mode,
  onToggleMode,
  isPanelOpen,
}: FloatingSpicyButtonProps) {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const pointerRef = useRef({
    active: false,
    dragged: false,
    startX: 0,
    startY: 0,
    originLeft: 0,
    originTop: 0,
  })

  const defaultStyle =
    position === null
      ? {
          right: 24,
          bottom: 24,
          left: undefined as number | undefined,
          top: undefined as number | undefined,
        }
      : { left: position.left, top: position.top, right: undefined, bottom: undefined }

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const left = position?.left ?? rect.left
    const top = position?.top ?? rect.top
    if (position === null) {
      setPosition({ left, top })
    }
    pointerRef.current = {
      active: true,
      dragged: false,
      startX: e.clientX,
      startY: e.clientY,
      originLeft: left,
      originTop: top,
    }
    el.setPointerCapture(e.pointerId)
  }, [position])

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointerRef.current.active) return
      const dx = e.clientX - pointerRef.current.startX
      const dy = e.clientY - pointerRef.current.startY
      if (!pointerRef.current.dragged && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        pointerRef.current.dragged = true
      }
      if (!pointerRef.current.dragged) return
      const el = e.currentTarget
      const w = el.offsetWidth
      const h = el.offsetHeight
      const left = Math.max(8, Math.min(window.innerWidth - w - 8, pointerRef.current.originLeft + dx))
      const top = Math.max(8, Math.min(window.innerHeight - h - 8, pointerRef.current.originTop + dy))
      setPosition({ left, top })
      pointerRef.current.originLeft = left
      pointerRef.current.originTop = top
      pointerRef.current.startX = e.clientX
      pointerRef.current.startY = e.clientY
    },
    [],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointerRef.current.active) return
      const wasDrag = pointerRef.current.dragged
      pointerRef.current.active = false
      pointerRef.current.dragged = false
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      if (!wasDrag) {
        onToggleMode()
      }
    },
    [onToggleMode],
  )

  return (
    <div
      aria-label={mode === 'angel' ? 'Switch to devil mode' : 'Switch to angel mode'}
      className={`fixed z-[60] h-14 w-14 cursor-grab overflow-hidden rounded-full border shadow-lg transition-[box-shadow,transform] active:cursor-grabbing ${
        isPanelOpen
          ? 'border-teal-500/50 bg-zotero-surface shadow-teal-900/20 ring-2 ring-teal-500/30'
          : 'border-zotero-border bg-zotero-surface hover:border-zotero-muted'
      }`}
      style={{ position: 'fixed', ...defaultStyle }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 scale-[0.22] -translate-x-1/2 -translate-y-1/2">
        <ModeToggleButton isOn={mode === 'angel'} onToggle={() => {}} />
      </div>
    </div>
  )
}
