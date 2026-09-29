import type { KeyboardEvent } from 'react'

// Keeps Tab and Shift+Tab cycling through the enabled controls inside `container`.
// Call it from a dialog's onKeyDown.
export function trapTab(event: KeyboardEvent, container: HTMLElement | null) {
  if (event.key !== 'Tab' || !container) return
  const controls = container.querySelectorAll<HTMLElement>(
    'button:not(:disabled), input:not(:disabled)',
  )
  if (!controls.length) return
  const first = controls[0]
  const last = controls[controls.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
