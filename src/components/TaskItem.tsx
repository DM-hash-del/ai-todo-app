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
  const checkboxId = `task-${task.id}`
  const isLoading = suggestion?.status === 'loading'

  return (
    <li className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-surface-muted/50 focus-within:bg-surface-muted/50">
      <div className="flex items-center gap-3">
        <input
          id={checkboxId}
          type="checkbox"
          checked={task.done}
          onChange={() => onToggle(task.id)}
          className="size-4 shrink-0 cursor-pointer accent-accent"
        />
        <label
          htmlFor={checkboxId}
          className={`min-w-0 flex-1 cursor-pointer break-words text-sm ${
            task.done ? 'text-fg-subtle line-through' : 'text-fg'
          }`}
        >
          {task.name}
        </label>
        {onSuggest && !task.done && (
          <button
            type="button"
            onClick={() => onSuggest(task.id)}
            disabled={isLoading}
            aria-label={`Improve "${task.name}" with AI`}
            className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-accent-text transition-colors hover:bg-accent-subtle disabled:cursor-wait disabled:text-fg-subtle disabled:hover:bg-transparent"
          >
            <SparkleIcon className="size-3.5" />
            {isLoading ? 'Improving…' : 'Improve'}
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          aria-label={`Delete "${task.name}"`}
          className="shrink-0 rounded-sm p-1 text-fg-subtle transition-colors hover:bg-danger-subtle hover:text-danger"
        >
          <CloseIcon />
        </button>
      </div>
      {suggestion && (
        <div className="pl-7">
          <SuggestionPanel
            state={suggestion}
            onAccept={(name) => onAcceptSuggestion?.(task.id, name)}
            onDismiss={() => onDismissSuggestion?.(task.id)}
            onRetry={() => onSuggest?.(task.id)}
          />
        </div>
      )}
    </li>
  )
}

export default TaskItem
