import { useEffect, useRef, useState } from 'react'
import AddTaskForm from './components/AddTaskForm'
import Header from './components/Header'
import TaskList from './components/TaskList'
import type { Task } from './types'

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
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

  function deleteTask(id: string) {
    const index = tasks.findIndex((task) => task.id === id)
    const neighbour = tasks[index + 1] ?? tasks[index - 1]
    // The delete button is about to unmount; send keyboard focus somewhere useful.
    focusAfterRender.current = neighbour ? `task-${neighbour.id}` : 'new-task'
    setTasks((current) => current.filter((task) => task.id !== id))
  }

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
          <TaskList tasks={tasks} onToggle={toggleTask} onDelete={deleteTask} />
        </section>
      </main>
    </div>
  )
}

export default App
