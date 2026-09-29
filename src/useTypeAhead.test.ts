import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestCompletion } from './api'
import { remainder } from './useTypeAhead'

describe('remainder', () => {
  it('returns the untyped rest of a matching completion', () => {
    expect(remainder('Buy mi', 'Buy milk')).toBe('lk')
  })

  it('matches the typed prefix regardless of case', () => {
    expect(remainder('buy mi', 'Buy milk')).toBe('lk')
  })

  it.each([
    ['a completion that does not continue the text', 'Buy mi', 'Purchase milk'],
    ['a completion no longer than the text', 'Buy milk', 'Buy milk'],
    ['text under 3 characters', 'Bu', 'Buy milk'],
    ['no completion', 'Buy mi', null],
  ])('is empty for %s', (_, text, completion) => {
    expect(remainder(text, completion)).toBe('')
  })
})

describe('requestCompletion', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const respondWith = (body: unknown, status = 200) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(body), { status })),
    )

  it('returns the completion from a 200', async () => {
    respondWith({ completion: 'Buy milk' })
    expect(await requestCompletion('Buy mi')).toBe('Buy milk')
  })

  it.each([
    ['a null body', null, 200],
    ['a malformed body', { completion: 3 }, 200],
    ['a 502', { error: 'AI request failed' }, 502],
    ['a 400', { error: 'text is required' }, 400],
  ])('returns null for %s', async (_, body, status) => {
    respondWith(body, status)
    expect(await requestCompletion('Buy mi')).toBeNull()
  })

  it('returns null on a network failure or abort', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new DOMException('Aborted', 'AbortError'))))
    expect(await requestCompletion('Buy mi')).toBeNull()
  })
})
