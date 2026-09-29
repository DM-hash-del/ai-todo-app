import { useState } from 'react'
import type { FormEvent } from 'react'

type AddTaskFormProps = {
  onAdd: (name: string) => void
}

function AddTaskForm({ onAdd }: AddTaskFormProps) {
  const [name, setName] = useState('')
  const trimmed = name.trim()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!trimmed) return
    onAdd(trimmed)
    setName('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <label htmlFor="new-task" className="sr-only">
        New task
      </label>
      <input
        id="new-task"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Add a task…"
        autoComplete="off"
        className="min-w-0 flex-1 rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-sm text-fg shadow-sm"
      />
      <button
        type="submit"
        disabled={!trimmed}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-subtle"
      >
        Add
      </button>
    </form>
  )
}

export default AddTaskForm
