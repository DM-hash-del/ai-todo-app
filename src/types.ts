export type Task = {
  id: string
  name: string
  done: boolean
  // Kept from an accepted AI suggestion. Read-only: the user can't edit or add these.
  category?: string
  tips?: string[]
}

// Mirrors the Zod `Suggestion` schema in server/index.ts. Keep them in sync.
export type Suggestion = {
  improvedName: string
  tips: string[]
  category: string
}

// Per-task AI suggestion state. `undefined` means idle (nothing requested).
export type SuggestionState =
  | { status: 'loading' }
  | { status: 'ready'; suggestion: Suggestion }
  | { status: 'empty' } // 200 with a null body: the model had nothing to offer
  | { status: 'error' } // 502 / network failure, retryable

// Which parts of a ready suggestion the user keeps. The category is kept with any of them.
export type SuggestionChoice = 'name' | 'tips' | 'both'
