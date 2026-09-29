import type { Suggestion, SuggestionState, Task } from './types'

export const STORAGE_KEY = 'tasks'

// Saved shape: a task plus the last AI suggestion, if one is ready and hasn't
// been accepted or dismissed yet. Loading/error/empty states aren't worth keeping.
export type StoredTask = Task & { suggestion?: Suggestion }

export type Suggestions = Record<string, SuggestionState | undefined>

export type PersistedState = {
  tasks: Task[]
  suggestions: Suggestions
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

export function isSuggestion(value: unknown): value is Suggestion {
  if (typeof value !== 'object' || value === null) return false
  const { improvedName, tips, category, model } = value as Record<string, unknown>
  return (
    typeof improvedName === 'string' &&
    typeof category === 'string' &&
    (model === undefined || typeof model === 'string') &&
    isStringArray(tips)
  )
}

// Returns the task, or null if the required fields are malformed. A malformed
// category or tips list is dropped on its own, keeping the task.
function readTask(value: unknown): Task | null {
  if (typeof value !== 'object' || value === null) return null
  const { id, name, done, category, tips } = value as Record<string, unknown>
  if (typeof id !== 'string' || typeof name !== 'string' || typeof done !== 'boolean') return null
  const task: Task = { id, name, done }
  if (typeof category === 'string' && category) task.category = category
  if (isStringArray(tips)) task.tips = tips
  return task
}

// Storage can be unavailable (private mode, blocked site data) or hold malformed
// JSON, so any failure falls back to an empty list instead of crashing.
export function loadState(): PersistedState {
  const empty: PersistedState = { tasks: [], suggestions: {} }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return empty
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return empty

    const tasks: Task[] = []
    const suggestions: Suggestions = {}
    for (const item of parsed) {
      // Skip individual bad entries rather than throwing away the whole list.
      const task = readTask(item)
      if (!task) continue
      tasks.push(task)
      const suggestion = (item as StoredTask).suggestion
      if (isSuggestion(suggestion)) {
        suggestions[task.id] = { status: 'ready', suggestion }
      }
    }
    return { tasks, suggestions }
  } catch {
    return empty
  }
}

export function saveState(tasks: Task[], suggestions: Suggestions) {
  const stored: StoredTask[] = tasks.map((task) => {
    const state = suggestions[task.id]
    return state?.status === 'ready' ? { ...task, suggestion: state.suggestion } : task
  })
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Quota exceeded or storage unavailable: keep working in memory.
  }
}
