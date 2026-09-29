import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Task } from '../types'
import { trapTab } from './focusTrap'
import { CheckIcon } from './icons'

type DeleteTasksDialogProps = {
  tasks: Task[]
  // Called with the picked ids, in list order. The caller confirms before deleting.
  onDelete: (ids: string[]) => void
  onCancel: () => void
  // While the confirmation is open on top, this dialog stays mounted (keeping the
  // selection for when the user backs out) but is taken out of the tab order.
  inert?: boolean
}

// Picks tasks to delete in bulk. Unlike ConfirmDialog, a click outside doesn't close
// it (it would throw away the selection); Cancel or Escape does. The first task's
// checkbox gets focus, and Tab stays inside.
function DeleteTasksDialog({ tasks, onDelete, onCancel, inert }: DeleteTasksDialogProps) {
  const titleId = useId()
  const rowId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const deleteRef = useRef<HTMLButtonElement>(null)
  const wasInert = useRef(inert)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const count = selected.size

  useEffect(() => {
    dialogRef.current?.querySelector('input')?.focus()
  }, [])

  // Backing out of the confirmation returns focus to Delete.
  useEffect(() => {
    if (wasInert.current && !inert) deleteRef.current?.focus()
    wasInert.current = inert
  }, [inert])

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
      return
    }
    trapTab(event, dialogRef.current)
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-overlay p-4" inert={inert}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        className="flex max-h-full w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-surface-raised p-6 shadow-md"
      >
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-lg font-semibold text-fg">
            Delete tasks
          </h2>
          <p className="text-sm text-fg-muted">Select the tasks to delete.</p>
        </div>
        <ul className="-mx-2 flex min-h-0 flex-col gap-0.5 overflow-y-auto px-2 py-0.5">
          {tasks.map((task) => {
            const nameId = `${rowId}-${task.id}-name`
            const statusId = `${rowId}-${task.id}-status`
            return (
              <li key={task.id}>
                <label className="flex min-h-8 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-muted has-checked:bg-accent-subtle">
                  <input
                    type="checkbox"
                    // Named by the task name alone; its done status is a description.
                    aria-labelledby={nameId}
                    aria-describedby={statusId}
                    checked={selected.has(task.id)}
                    onChange={() => toggle(task.id)}
                    className="size-4 shrink-0 cursor-pointer accent-accent"
                  />
                  <span id={nameId} className="min-w-0 flex-1 break-words text-sm text-fg">
                    {task.name}
                  </span>
                  <span
                    id={statusId}
                    className="flex shrink-0 items-center gap-1 rounded-sm bg-surface-muted px-1.5 py-0.5 text-xs text-fg-muted"
                  >
                    {task.done && <CheckIcon className="size-3" />}
                    {task.done ? 'Done' : 'Not done'}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <p aria-live="polite" className="mr-auto text-xs text-fg-subtle">
            {count} selected
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-8 rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            ref={deleteRef}
            type="button"
            disabled={count === 0}
            onClick={() => onDelete(tasks.filter((task) => selected.has(task.id)).map((t) => t.id))}
            className="min-h-8 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:bg-surface-muted disabled:text-fg-subtle"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteTasksDialog
