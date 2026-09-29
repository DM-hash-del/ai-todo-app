import type { SuggestionState, Task } from '../types'
import { ListIcon } from './icons'
import TaskItem from './TaskItem'

type TaskListProps = {
  tasks: Task[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  suggestions?: Record<string, SuggestionState | undefined>
  onSuggest?: (id: string) => void
  onAcceptSuggestion?: (id: string, improvedName: string) => void
  onDismissSuggestion?: (id: string) => void
}

function TaskList({ tasks, suggestions, ...handlers }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong px-6 py-12 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-surface-muted text-fg-subtle">
          <ListIcon className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-fg">No tasks yet</p>
          <p className="text-sm text-fg-muted">
            Add your first task above. You can ask AI to sharpen it once it’s on the list.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-raised shadow-sm">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} suggestion={suggestions?.[task.id]} {...handlers} />
      ))}
    </ul>
  )
}

export default TaskList
