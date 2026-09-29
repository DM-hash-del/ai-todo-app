export type Task = {
  id: string
  name: string
  done: boolean
  // When the task was added, as an ISO timestamp. Optional: tasks saved before it existed lack it.
  createdAt?: string
  // Kept from an accepted AI suggestion. Read-only: the user can't edit or add these.
  category?: string
  tips?: string[]
}

// Mirrors the Zod `Suggestion` schema in server/index.ts (plus the `model` the
// server adds to it). Keep them in sync. `model` is optional so suggestions saved
// before it existed still load.
export type Suggestion = {
  improvedName: string
  tips: string[]
  category: string
  model?: string
}

// Per-task AI suggestion state. `undefined` means idle (nothing requested).
export type SuggestionState =
  | { status: 'loading' }
  | { status: 'ready'; suggestion: Suggestion }
  | { status: 'empty' } // 200 with a null body: the model had nothing to offer
  | { status: 'error' } // 502 / network failure, retryable

// Which parts of a ready suggestion the user keeps. The category is kept with any of them.
// 'category' keeps only the category: offered when the name is unchanged and there are no tips.
export type SuggestionChoice = 'name' | 'tips' | 'both' | 'category'
