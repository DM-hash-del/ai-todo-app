import { useEffect, useRef, useState } from 'react'
import AddTaskForm from './components/AddTaskForm'
import Header from './components/Header'
import TaskList from './components/TaskList'
import { loadState, saveState } from './storage'
import type { Suggestions } from './storage'
import type { Task } from './types'

function App() {
  // Read storage once, on first render, for both pieces of state.
  const [initial] = useState(loadState)
  const [tasks, setTasks] = useState<Task[]>(initial.tasks)
  const [suggestions, setSuggestions] = useState<Suggestions>(initial.suggestions)
  const remaining = tasks.filter((task) => !task.done).length
  const focusAfterRender = useRef<string | null>(null)

  function addTask(name: string) {
    setTasks((current) => [...current, { id: crypto.randomUUID(), name, done: false }])
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

  // Accepting renames the task and drops the suggestion, so it isn't saved again.
  function acceptSuggestion(id: string, improvedName: string) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, name: improvedName } : task)),
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
            onDelete={deleteTask}
            suggestions={suggestions}
            onAcceptSuggestion={acceptSuggestion}
            onDismissSuggestion={clearSuggestion}
          />
        </section>
      </main>
    </div>
  )
}

export default App
