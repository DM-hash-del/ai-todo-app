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
