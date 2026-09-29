import { describe, expect, it, vi } from 'vitest'
import { loadState, saveState, STORAGE_KEY } from './storage'
import type { StoredTask } from './storage'
import type { Suggestion } from './types'

const suggestion: Suggestion = {
  improvedName: 'Buy 2L of semi-skimmed milk',
  tips: ['Check the fridge first'],
  category: 'Shopping',
}

function stored(): StoredTask[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
}

describe('saveState', () => {
  it('saves ready suggestions and skips loading, error and empty ones', () => {
    saveState(
      [
        { id: 'a', name: 'Ready', done: false },
        { id: 'b', name: 'Loading', done: false },
        { id: 'c', name: 'Error', done: false },
        { id: 'd', name: 'Empty', done: false },
        { id: 'e', name: 'Idle', done: true },
      ],
      {
        a: { status: 'ready', suggestion },
        b: { status: 'loading' },
        c: { status: 'error' },
        d: { status: 'empty' },
      },
    )

    expect(stored()).toEqual([
      { id: 'a', name: 'Ready', done: false, suggestion },
      { id: 'b', name: 'Loading', done: false },
      { id: 'c', name: 'Error', done: false },
      { id: 'd', name: 'Empty', done: false },
      { id: 'e', name: 'Idle', done: true },
    ])
  })

  it('does not throw when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => saveState([{ id: 'a', name: 'A', done: false }], {})).not.toThrow()
  })
})

describe('loadState', () => {
  const empty = { tasks: [], suggestions: {} }

  it('keeps the model that generated a saved suggestion', () => {
    const withModel = { ...suggestion, model: 'gpt-4o-mini-2024-07-18' }
    saveState([{ id: 'a', name: 'Milk', done: false }], { a: { status: 'ready', suggestion: withModel } })
    expect(loadState().suggestions).toEqual({ a: { status: 'ready', suggestion: withModel } })
  })

  it('round-trips tasks and restores saved suggestions as ready', () => {
    saveState([{ id: 'a', name: 'Milk', done: false }], { a: { status: 'ready', suggestion } })
    expect(loadState()).toEqual({
      tasks: [{ id: 'a', name: 'Milk', done: false }],
      suggestions: { a: { status: 'ready', suggestion } },
    })
  })

  it('round-trips a kept category and tips', () => {
    const task = { id: 'a', name: 'Milk', done: false, category: 'Shopping', tips: ['Go early'] }
    saveState([task], {})
    expect(stored()).toEqual([task])
    expect(loadState()).toEqual({ tasks: [task], suggestions: {} })
  })

  it('round-trips the creation time and drops a malformed one', () => {
    const createdAt = '2026-11-09T15:45:00.000Z'
    saveState([{ id: 'a', name: 'Milk', done: false, createdAt }], {})
    expect(loadState().tasks).toEqual([{ id: 'a', name: 'Milk', done: false, createdAt }])

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'b', name: 'Number', done: false, createdAt: 123 },
        { id: 'c', name: 'Garbage', done: false, createdAt: 'not a date' },
      ]),
    )
    expect(loadState().tasks).toEqual([
      { id: 'b', name: 'Number', done: false },
      { id: 'c', name: 'Garbage', done: false },
    ])
  })

  it('drops a malformed category or tips list but keeps the task', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'a', name: 'Bad tips', done: false, category: 'Shopping', tips: [1, 2] },
        { id: 'b', name: 'Bad category', done: false, category: 7, tips: ['Ok'] },
        { id: 'c', name: 'Empty category', done: false, category: '' },
      ]),
    )
    expect(loadState().tasks).toEqual([
      { id: 'a', name: 'Bad tips', done: false, category: 'Shopping' },
      { id: 'b', name: 'Bad category', done: false, tips: ['Ok'] },
      { id: 'c', name: 'Empty category', done: false },
    ])
  })

  it('returns an empty list when nothing is stored', () => {
    expect(loadState()).toEqual(empty)
  })

  it.each([
    ['corrupted JSON', '{not json'],
    ['a non-array', '{"id":"a"}'],
    ['null', 'null'],
    ['a string', '"tasks"'],
  ])('returns an empty list for %s', (_, raw) => {
    localStorage.setItem(STORAGE_KEY, raw)
    expect(loadState()).toEqual(empty)
  })

  it('returns an empty list when reading storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(loadState()).toEqual(empty)
  })

  it('drops malformed tasks and malformed suggestions but keeps valid ones', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'a', name: 'Good', done: false },
        { id: 'b', name: 'No done flag' },
        null,
        42,
        { id: 'c', name: 'Bad suggestion', done: true, suggestion: { improvedName: 'X', tips: 'nope' } },
      ]),
    )
    expect(loadState()).toEqual({
      tasks: [
        { id: 'a', name: 'Good', done: false },
        { id: 'c', name: 'Bad suggestion', done: true },
      ],
      suggestions: {},
    })
  })
})
