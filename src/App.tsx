import { useEffect, useRef, useState } from 'react'
import { requestSuggestion } from './api'
import AddTaskForm from './components/AddTaskForm'
import ConfirmDialog from './components/ConfirmDialog'
import DeleteTasksDialog from './components/DeleteTasksDialog'
import Header from './components/Header'
import TaskList from './components/TaskList'
import { loadState, saveState } from './storage'
import type { Suggestions } from './storage'
import type { SuggestionChoice, Task } from './types'

function unfinishedNote(total: number, unfinished: number) {
  if (total === 1) return 'It isn’t done yet.'
  if (unfinished === total) return 'None of them are done yet.'
  return `${unfinished} of them ${unfinished === 1 ? 'isn’t' : 'aren’t'} done yet.`
}

function App() {
  // Read storage once, on first render, for both pieces of state.
  const [initial] = useState(loadState)
  const [tasks, setTasks] = useState<Task[]>(initial.tasks)
  const [suggestions, setSuggestions] = useState<Suggestions>(initial.suggestions)
  const remaining = tasks.filter((task) => !task.done).length
  const focusAfterRender = useRef<string | null>(null)
  // The unfinished task waiting on the delete confirmation, if any.
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const pendingDelete = tasks.find((task) => task.id === pendingDeleteId)
  // Bulk delete: the "Delete tasks" picker, then the tasks it's asking to confirm.
  const [pickingTasks, setPickingTasks] = useState(false)
  const [pendingBulkIds, setPendingBulkIds] = useState<string[] | null>(null)
  const pendingBulk = pendingBulkIds && tasks.filter((task) => pendingBulkIds.includes(task.id))
  const pendingBulkUnfinished = pendingBulk?.filter((task) => !task.done).length ?? 0

  function addTask(name: string) {
    setTasks((current) => [
      ...current,
      { id: crypto.randomUUID(), name, done: false, createdAt: new Date().toISOString() },
    ])
  }

  function toggleTask(id: string) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    )
  }

  function clearSuggestion(id: string) {
    setSuggestions((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  function deleteTask(id: string) {
    const index = tasks.findIndex((task) => task.id === id)
    const neighbour = tasks[index + 1] ?? tasks[index - 1]
    // The delete button is about to unmount; send keyboard focus somewhere useful.
    focusAfterRender.current = neighbour ? `task-${neighbour.id}` : 'new-task'
    setTasks((current) => current.filter((task) => task.id !== id))
    clearSuggestion(id)
  }

  // Completed tasks go straight away; unfinished ones ask first.
  function requestDelete(id: string) {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    if (task.done) deleteTask(id)
    else setPendingDeleteId(id)
  }

  function confirmDelete() {
    if (pendingDeleteId) deleteTask(pendingDeleteId)
    setPendingDeleteId(null)
  }

  function cancelDelete() {
    // Hand focus back to the Delete button that opened the dialog.
    if (pendingDeleteId) document.getElementById(`task-${pendingDeleteId}-delete`)?.focus()
    setPendingDeleteId(null)
  }

  // Always confirmed, even when every picked task is done.
  function deleteTasks(ids: string[]) {
    const remove = new Set(ids)
    const left = tasks.filter((task) => !remove.has(task.id))
    // The picker and its button may unmount; land on the button, or the input if the list is now empty.
    focusAfterRender.current = left.length > 0 ? 'delete-tasks' : 'new-task'
    setTasks(left)
    setSuggestions((current) => {
      const next = { ...current }
      for (const id of ids) delete next[id]
      return next
    })
  }

  function confirmBulkDelete() {
    if (pendingBulkIds) deleteTasks(pendingBulkIds)
    setPendingBulkIds(null)
    setPickingTasks(false)
  }

  function cancelBulkDelete() {
    // Back to the picker, selection intact; it refocuses its own Delete button.
    setPendingBulkIds(null)
  }

  function cancelPicking() {
    setPickingTasks(false)
    document.getElementById('delete-tasks')?.focus()
  }

  // Ids with a request in flight. A ref, not state, so a quick double click
  // can't slip past before the `loading` render lands.
  const inFlight = useRef(new Set<string>())

  async function suggest(id: string) {
    const task = tasks.find((t) => t.id === id)
    if (!task || inFlight.current.has(id)) return
    inFlight.current.add(id)
    setSuggestions((current) => ({ ...current, [id]: { status: 'loading' } }))
    try {
      const result = await requestSuggestion(task.name)
      // Only settle if still loading: a delete or dismiss meanwhile wins.
      setSuggestions((current) =>
        current[id]?.status === 'loading' ? { ...current, [id]: result } : current,
      )
    } finally {
      inFlight.current.delete(id)
    }
  }

  // Accepting keeps the chosen parts, plus the category, then drops the suggestion
  // so it isn't saved again. Keeping only the name leaves any earlier tips in place.
  function acceptSuggestion(id: string, choice: SuggestionChoice) {
    const state = suggestions[id]
    if (state?.status !== 'ready') return
    const { improvedName, tips, category } = state.suggestion
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              name: choice === 'name' || choice === 'both' ? improvedName : task.name,
              tips: choice === 'tips' || choice === 'both' ? tips : task.tips,
              category: category.trim() || task.category,
            }
          : task,
      ),
    )
    clearSuggestion(id)
  }

  useEffect(() => {
    saveState(tasks, suggestions)
  }, [tasks, suggestions])

  useEffect(() => {
    if (!focusAfterRender.current) return
    document.getElementById(focusAfterRender.current)?.focus()
    focusAfterRender.current = null
  }, [tasks])

  return (
    <div className="min-h-dvh">
      <Header />
      <main className="mx-auto flex w-full max-w-app flex-col gap-6 px-4 py-8">
        <AddTaskForm onAdd={addTask} />
        <section aria-labelledby="tasks-heading" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 id="tasks-heading" className="text-sm font-medium text-fg-muted">
              Tasks
            </h2>
            {tasks.length > 0 && (
              <p className="text-xs text-fg-subtle">
                {remaining} of {tasks.length} left
              </p>
            )}
          </div>
          <TaskList
            tasks={tasks}
            onToggle={toggleTask}
            onDelete={requestDelete}
            suggestions={suggestions}
            onSuggest={suggest}
            onAcceptSuggestion={acceptSuggestion}
            onDismissSuggestion={clearSuggestion}
          />
          {tasks.length > 0 && (
            <div className="flex justify-end">
              <button
                id="delete-tasks"
                type="button"
                onClick={() => setPickingTasks(true)}
                className="min-h-8 rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-muted"
              >
                Delete tasks
              </button>
            </div>
          )}
        </section>
      </main>
      {pendingDelete && (
        <ConfirmDialog
          title="Delete task?"
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        >
          <p>“{pendingDelete.name}” isn’t done yet.</p>
          <p className="underline">This can’t be undone.</p>
        </ConfirmDialog>
      )}
      {pickingTasks && (
        <DeleteTasksDialog
          tasks={tasks}
          onDelete={setPendingBulkIds}
          onCancel={cancelPicking}
          inert={pendingBulkIds !== null}
        />
      )}
      {pendingBulk && (
        <ConfirmDialog
          title={`Delete ${pendingBulk.length} ${pendingBulk.length === 1 ? 'task' : 'tasks'}?`}
          confirmLabel="Delete"
          onConfirm={confirmBulkDelete}
          onCancel={cancelBulkDelete}
        >
          {pendingBulkUnfinished > 0 && (
            <p>{unfinishedNote(pendingBulk.length, pendingBulkUnfinished)}</p>
          )}
          <p className="underline">This can’t be undone.</p>
        </ConfirmDialog>
      )}
    </div>
  )
}

export default App
