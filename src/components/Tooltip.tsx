import { useEffect, useId, useRef, useState } from 'react'
import type { FocusEvent, KeyboardEvent, ReactNode } from 'react'

type TooltipProps = {
  text: string
  // Render prop: put the id on the control's `aria-describedby` so the tooltip is announced.
  children: (tooltipId: string) => ReactNode
}

type Position = { top: number; right: number }

// Shows `text` above the wrapped control on hover or keyboard focus, right-aligned
// to it. Escape hides it. It's `fixed` so the list's `overflow-hidden` can't clip it,
// which means it's placed from the control's rect and hides on scroll.
function Tooltip({ text, children }: TooltipProps) {
  const id = useId()
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [position, setPosition] = useState<Position | null>(null)
  const open = (hovered || focused) && !dismissed

  function show(set: (value: boolean) => void) {
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (rect) setPosition({ top: rect.top, right: window.innerWidth - rect.right })
    setDismissed(false)
    set(true)
  }

  function handleFocus(event: FocusEvent) {
    // Only keyboard focus: a mouse click also focuses the button, and the tooltip
    // shouldn't then stick around after the pointer leaves.
    let keyboard = true
    try {
      keyboard = event.target.matches(':focus-visible')
    } catch {
      // Selector unsupported: treat as keyboard focus.
    }
    if (keyboard) show(setFocused)
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) setDismissed(true)
  }

  useEffect(() => {
    if (!open) return
    const hide = () => {
      setHovered(false)
      setFocused(false)
    }
    window.addEventListener('scroll', hide, { capture: true, passive: true })
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide, { capture: true })
      window.removeEventListener('resize', hide)
    }
  }, [open])

  return (
    <span
      ref={wrapperRef}
      className="flex shrink-0"
      onMouseEnter={() => show(setHovered)}
      onMouseLeave={() => setHovered(false)}
      onFocus={handleFocus}
      onBlur={() => setFocused(false)}
      onKeyDown={handleKeyDown}
    >
      {children(id)}
      {/* Always rendered so aria-describedby resolves; only shown while open. */}
      <span
        id={id}
        role="tooltip"
        hidden={!open}
        style={position ? { top: position.top, right: position.right } : undefined}
        className="pointer-events-none fixed z-10 w-max max-w-60 -translate-y-full pb-1"
      >
        <span className="block rounded-md border border-border bg-surface-raised px-2 py-1 text-xs text-fg shadow-md">
          {text}
        </span>
      </span>
    </span>
  )
}

export default Tooltip
