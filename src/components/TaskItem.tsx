import type { Task } from '../types'

type TaskItemProps = {
  task: Task
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const checkboxId = `task-${task.id}`

  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted">
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
      <button
        type="button"
        onClick={() => onDelete(task.id)}
        aria-label={`Delete "${task.name}"`}
        className="shrink-0 rounded-sm p-1 text-fg-subtle transition-colors hover:bg-danger-subtle hover:text-danger"
      >
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-4">
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </li>
  )
}

export default TaskItem
