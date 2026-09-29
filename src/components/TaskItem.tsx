import { useRef, useState } from 'react'
import type { SuggestionChoice, SuggestionState, Task } from '../types'
import { ChevronDownIcon, CloseIcon, SparkleIcon } from './icons'
import SuggestionPanel from './SuggestionPanel'
import Tooltip from './Tooltip'

const pad = (n: number) => String(n).padStart(2, '0')

// "Created: 09.11.26 at 15:45" (DD.MM.YY at HH:MM, in the user's local time).
function formatCreated(iso: string) {
  const date = new Date(iso)
  const day = `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${pad(date.getFullYear() % 100)}`
  return `Created: ${day} at ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

type TaskItemProps = {
  task: Task
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  // AI suggestion props are optional: without `onSuggest`, the Improve button is hidden.
  suggestion?: SuggestionState
  onSuggest?: (id: string) => void
  onAcceptSuggestion?: (id: string, choice: SuggestionChoice) => void
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
  const tips = task.tips ?? []
  // Details (kept tips and the created time) start collapsed. View state only, so it isn't saved.
  const [detailsOpen, setDetailsOpen] = useState(false)
  const nameId = `task-${task.id}-name`
  const categoryId = `task-${task.id}-category`
  const detailsId = `task-${task.id}-details`
  const detailsWhat = tips.length > 0 ? 'this task’s tips and when it was created' : 'when this task was created'

  // Panel buttons unmount when the suggestion state changes, so move focus
  // back onto the row first. Otherwise keyboard focus falls back to <body>.
  function refocusRow() {
    const target = improveRef.current ?? checkboxRef.current
    target?.focus()
  }

  return (
    <li className="flex flex-col gap-2 px-3 py-2 transition-colors hover:bg-surface-muted/50 focus-within:bg-surface-muted/50 sm:px-4">
      {/* No gap here: the collapsed tips panel below has zero height and mustn't add space. */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          {/* The label wraps the checkbox so the whole name is one large click target. */}
          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md py-1.5 pr-1 pl-1">
            <input
              ref={checkboxRef}
              id={`task-${task.id}`}
              type="checkbox"
              // Named by the task name alone; the category chip is a description.
              aria-labelledby={nameId}
              aria-describedby={task.category ? categoryId : undefined}
              checked={task.done}
              onChange={() => onToggle(task.id)}
              className="size-4 shrink-0 cursor-pointer accent-accent"
            />
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
              <span
                id={nameId}
                className={`min-w-0 break-words text-sm ${
                  task.done ? 'text-fg-subtle line-through' : 'text-fg'
                }`}
              >
                {task.name}
              </span>
              {task.category && (
                <span
                  id={categoryId}
                  className="rounded-sm bg-surface-muted px-1.5 py-0.5 text-xs text-fg-muted"
                >
                  {task.category}
                </span>
              )}
            </span>
          </label>
          <Tooltip text={`${detailsOpen ? 'Hide' : 'Show'} ${detailsWhat}`}>
            {(tooltipId) => (
              <button
                type="button"
                aria-expanded={detailsOpen}
                aria-controls={detailsId}
                aria-describedby={tooltipId}
                onClick={() => setDetailsOpen((open) => !open)}
                aria-label={`Details for "${task.name}"`}
                className="flex min-h-8 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
              >
                <span className="hidden sm:inline">Details</span>
                <ChevronDownIcon
                  className={`size-4 transition-transform duration-200 ease-out motion-reduce:transition-none sm:size-3.5 ${detailsOpen ? 'rotate-180' : ''}`}
                />
              </button>
            )}
          </Tooltip>
          {showImprove && (
            <Tooltip
              text={
                isLoading
                  ? 'Waiting for the AI suggestion'
                  : 'Ask AI for a clearer name, a category and tips'
              }
            >
              {(tooltipId) => (
                <button
                  ref={improveRef}
                  type="button"
                  // aria-disabled rather than disabled: a disabled button drops keyboard focus.
                  aria-disabled={isLoading}
                  aria-describedby={tooltipId}
                  onClick={() => !isLoading && onSuggest(task.id)}
                  aria-label={
                    isLoading ? `Improving "${task.name}"…` : `Improve "${task.name}" with AI`
                  }
                  className="flex min-h-8 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium text-accent-text transition-colors hover:bg-accent-subtle aria-disabled:cursor-wait aria-disabled:text-fg-subtle aria-disabled:hover:bg-transparent"
                >
                  <SparkleIcon className="size-4 sm:size-3.5" />
                  <span className="hidden sm:inline">{isLoading ? 'Improving…' : 'Improve'}</span>
                </button>
              )}
            </Tooltip>
          )}
          <Tooltip
            text={task.done ? 'Delete this task' : 'Delete this task (asks you to confirm first)'}
          >
            {(tooltipId) => (
              <button
                id={`task-${task.id}-delete`}
                type="button"
                aria-describedby={tooltipId}
                onClick={() => onDelete(task.id)}
                aria-label={`Delete "${task.name}"`}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-danger-subtle hover:text-danger"
              >
                <CloseIcon />
              </button>
            )}
          </Tooltip>
        </div>
        {/* Stays mounted so it can animate open and closed (grid rows 0fr <-> 1fr).
            While closed it's inert and hidden from assistive tech. */}
        <div
          id={detailsId}
          inert={!detailsOpen}
          aria-hidden={!detailsOpen}
          className={`grid transition-all duration-200 ease-out motion-reduce:transition-none ${
            detailsOpen ? 'grid-rows-expanded opacity-100' : 'grid-rows-collapsed opacity-0'
          }`}
        >
          <div className="flex min-h-0 flex-col gap-1 overflow-hidden pt-2 pb-1">
            {tips.length > 0 && (
              <ul
                aria-label={`Tips for "${task.name}"`}
                className="flex list-disc flex-col gap-1 pl-12 text-xs text-fg-muted marker:text-fg-subtle"
              >
                {tips.map((tip, index) => (
                  <li key={index} className="break-words">
                    {tip}
                  </li>
                ))}
              </ul>
            )}
            <p className="pr-1 text-right text-xs font-light text-fg-subtle">
              {task.createdAt ? (
                <time dateTime={task.createdAt}>{formatCreated(task.createdAt)}</time>
              ) : (
                // Tasks saved before creation times were recorded.
                'Created: unknown'
              )}
            </p>
          </div>
        </div>
      </div>
      {suggestion && (
        <div className="pb-1 pl-8">
          <SuggestionPanel
            state={suggestion}
            taskName={task.name}
            onAccept={(choice) => {
              refocusRow()
              onAcceptSuggestion?.(task.id, choice)
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
