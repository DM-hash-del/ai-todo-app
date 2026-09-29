import { isSuggestion } from './storage'
import type { SuggestionState } from './types'

// Settled states only: the caller owns `loading`. Never throws.
export type SuggestionResult = Exclude<SuggestionState, { status: 'loading' }>

export async function requestSuggestion(description: string): Promise<SuggestionResult> {
  try {
    const res = await fetch('/api/suggest', {
      method: 'POST',
      // express.json() only parses JSON bodies, so the header is required.
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    })
    // Error bodies are `{ error }`, never a suggestion.
    if (!res.ok) return { status: 'error' }
    const body: unknown = await res.json()
    // A null body means the model refused or had nothing parseable to offer.
    if (body === null) return { status: 'empty' }
    return isSuggestion(body) ? { status: 'ready', suggestion: body } : { status: 'error' }
  } catch {
    // Network failure or a non-JSON body.
    return { status: 'error' }
  }
}

// Type-ahead for the new-task input. Resolves to the model's full task name
// for `text`, or null for anything else (error, refusal, abort). Never throws:
// the grey type-ahead text is optional, so failures are silent.
export async function requestCompletion(text: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch('/api/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal,
    })
    if (!res.ok) return null
    const body: unknown = await res.json()
    if (typeof body !== 'object' || body === null) return null
    const { completion } = body as Record<string, unknown>
    return typeof completion === 'string' ? completion : null
  } catch {
    return null
  }
}
