export type Task = {
  id: string
  name: string
  done: boolean
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
