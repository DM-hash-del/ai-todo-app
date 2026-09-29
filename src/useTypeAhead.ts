import { useEffect, useRef, useState } from 'react'
import { requestCompletion } from './api'

// Wait this long after the last keystroke before asking for a completion.
export const TYPE_AHEAD_DELAY = 500
// Ignore very short input: there's too little to go on.
export const TYPE_AHEAD_MIN_LENGTH = 3

// The part of `completion` the user hasn't typed yet, or '' when it no longer
// continues `text`. The prefix match ignores case, so "buy m" keeps "Buy milk".
export function remainder(text: string, completion: string | null) {
  if (!completion || text.trim().length < TYPE_AHEAD_MIN_LENGTH) return ''
  if (completion.length <= text.length) return ''
  return completion.toLowerCase().startsWith(text.toLowerCase()) ? completion.slice(text.length) : ''
}

// Grey type-ahead for the new-task input. The caller passes every new value to
// `change` (from onChange, not an effect), and shows `suffix` after the caret.
// `initialCompletion` is only for the dev states preview.
export function useTypeAhead(text: string, initialCompletion: string | null = null) {
  const [completion, setCompletion] = useState(initialCompletion)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const controller = useRef<AbortController | null>(null)
  // Answers by exact input, so backspacing to earlier text doesn't ask again.
  const cache = useRef(new Map<string, string | null>())
  // Texts whose suggestion was dismissed with Escape: don't ask again for them.
  const dismissed = useRef(new Set<string>())
  const latest = useRef('')

  function cancel() {
    clearTimeout(timer.current)
    controller.current?.abort()
    controller.current = null
  }

  useEffect(() => () => cancel(), [])

  function change(next: string) {
    latest.current = next
    cancel()
    if (next.trim().length < TYPE_AHEAD_MIN_LENGTH) {
      setCompletion(null)
      return
    }
    // Typing along the suggestion (or accepting it) just uses up the grey text.
    if (completion && completion.toLowerCase().startsWith(next.toLowerCase())) return
    setCompletion(null)
    if (dismissed.current.has(next)) return
    if (cache.current.has(next)) {
      setCompletion(cache.current.get(next) ?? null)
      return
    }
    timer.current = setTimeout(async () => {
      const request = new AbortController()
      controller.current = request
      const result = await requestCompletion(next, request.signal)
      // A newer keystroke cancelled this one.
      if (request.signal.aborted) return
      controller.current = null
      cache.current.set(next, result)
      if (latest.current === next) setCompletion(result)
    }, TYPE_AHEAD_DELAY)
  }

  function dismiss() {
    dismissed.current.add(latest.current)
    cancel()
    setCompletion(null)
  }

  function reset() {
    latest.current = ''
    cancel()
    setCompletion(null)
  }

  return { suffix: remainder(text, completion), change, dismiss, reset }
}
