import { useEffect, useRef, useState } from 'react'
import { requestSuggestion } from './api'
import AddTaskForm from './components/AddTaskForm'
import Header from './components/Header'
import TaskList from './components/TaskList'
import { loadState, saveState } from './storage'
import type { Suggestions } from './storage'
import type { SuggestionChoice, Task } from './types'

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
              name: choice === 'tips' ? task.name : improvedName,
              tips: choice === 'name' ? task.tips : tips,
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
            onDelete={deleteTask}
            suggestions={suggestions}
            onSuggest={suggest}
            onAcceptSuggestion={acceptSuggestion}
            onDismissSuggestion={clearSuggestion}
          />
        </section>
      </main>
    </div>
  )
}

export default App
