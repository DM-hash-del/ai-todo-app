import { useState } from 'react'
import AddTaskForm from './components/AddTaskForm'
import Header from './components/Header'
import TaskList from './components/TaskList'
import type { Task } from './types'

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const remaining = tasks.filter((task) => !task.done).length

  function addTask(name: string) {
    setTasks((current) => [...current, { id: crypto.randomUUID(), name, done: false }])
  }

  function toggleTask(id: string) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    )
  }

  function deleteTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id))
  }

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
