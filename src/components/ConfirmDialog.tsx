import { useEffect, useId, useRef } from 'react'
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { trapTab } from './focusTrap'

type ConfirmDialogProps = {
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

// A modal confirmation. Cancel gets focus first so Enter can't confirm by accident;
// Escape or a click on the dimmed backdrop cancels, and Tab stays inside the dialog.
// The caller decides where focus goes once it closes.
function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
      return
    }
    trapTab(event, dialogRef.current)
  }

  // Only a click that both starts and ends on the backdrop cancels, so dragging
  // out of the dialog (e.g. while selecting text) doesn't close it.
  const pressedBackdrop = useRef(false)

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    pressedBackdrop.current = event.target === event.currentTarget
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (pressedBackdrop.current && event.target === event.currentTarget) onCancel()
    pressedBackdrop.current = false
  }

  return (
    // The backdrop isn't a control: keyboard users cancel with Escape or Cancel. It sits
    // above the Delete tasks picker (z-10) when confirming a bulk delete.
    <div
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-20 flex items-center justify-center bg-overlay p-4"
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleKeyDown}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-surface-raised p-6 shadow-md"
      >
        <div className="flex flex-col gap-2">
          <h2 id={titleId} className="text-lg font-semibold text-fg">
            {title}
          </h2>
          <div
            id={descriptionId}
            className="flex min-w-0 flex-col gap-1 break-words text-sm text-fg-muted"
          >
            {children}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="min-h-8 rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-8 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
