import { useRef } from 'react'
import type { SuggestionState, Task } from '../types'
import { CloseIcon, SparkleIcon } from './icons'
import SuggestionPanel from './SuggestionPanel'

type TaskItemProps = {
  task: Task
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  // AI suggestion props are optional: without `onSuggest`, the Improve button is hidden.
  suggestion?: SuggestionState
  onSuggest?: (id: string) => void
  onAcceptSuggestion?: (id: string, improvedName: string) => void
  onDismissSuggestion?: (id: string) => void
}

function TaskItem({
  task,
  onToggle,
  onDelete,
  suggestion,
  onSuggest,
  onAcceptSuggestion,
  onDismissSuggestion,
}: TaskItemProps) {
  const checkboxRef = useRef<HTMLInputElement>(null)
  const improveRef = useRef<HTMLButtonElement>(null)
  const isLoading = suggestion?.status === 'loading'
  const showImprove = onSuggest && !task.done

  // Panel buttons unmount when the suggestion state changes, so move focus
  // back onto the row first. Otherwise keyboard focus falls back to <body>.
  function refocusRow() {
    const target = improveRef.current ?? checkboxRef.current
    target?.focus()
  }

  return (
    <li className="flex flex-col gap-2 px-3 py-2 transition-colors hover:bg-surface-muted/50 focus-within:bg-surface-muted/50 sm:px-4">
      <div className="flex items-center gap-1">
        {/* The label wraps the checkbox so the whole name is one large click target. */}
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md py-1.5 pr-1 pl-1">
          <input
            ref={checkboxRef}
            id={`task-${task.id}`}
            type="checkbox"
            checked={task.done}
            onChange={() => onToggle(task.id)}
            className="size-4 shrink-0 cursor-pointer accent-accent"
          />
          <span
            className={`min-w-0 flex-1 break-words text-sm ${
              task.done ? 'text-fg-subtle line-through' : 'text-fg'
            }`}
          >
            {task.name}
          </span>
        </label>
        {showImprove && (
          <button
            ref={improveRef}
            type="button"
            // aria-disabled rather than disabled: a disabled button drops keyboard focus.
            aria-disabled={isLoading}
            onClick={() => !isLoading && onSuggest(task.id)}
            aria-label={isLoading ? `Improving "${task.name}"…` : `Improve "${task.name}" with AI`}
            className="flex min-h-8 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium text-accent-text transition-colors hover:bg-accent-subtle aria-disabled:cursor-wait aria-disabled:text-fg-subtle aria-disabled:hover:bg-transparent"
          >
            <SparkleIcon className="size-4 sm:size-3.5" />
            <span className="hidden sm:inline">{isLoading ? 'Improving…' : 'Improve'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          aria-label={`Delete "${task.name}"`}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-danger-subtle hover:text-danger"
        >
          <CloseIcon />
        </button>
      </div>
      {suggestion && (
        <div className="pb-1 pl-8">
          <SuggestionPanel
            state={suggestion}
            onAccept={(name) => {
              refocusRow()
              onAcceptSuggestion?.(task.id, name)
            }}
            onDismiss={() => {
              refocusRow()
              onDismissSuggestion?.(task.id)
            }}
            onRetry={() => {
              refocusRow()
              onSuggest?.(task.id)
            }}
          />
        </div>
      )}
    </li>
  )
}

export default TaskItem
