import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TYPE_AHEAD_KEY } from '../storage'
import { TYPE_AHEAD_DELAY } from '../useTypeAhead'
import AddTaskForm from './AddTaskForm'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Answers each `text` from the table; anything missing gets a null body.
function mockCompletions(table: Record<string, string>) {
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const { text } = JSON.parse(init.body as string) as { text: string }
    return jsonResponse(text in table ? { completion: table[text] } : null)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function setup({ enabled = true } = {}) {
  if (enabled) localStorage.setItem(TYPE_AHEAD_KEY, 'true')
  const onAdd = vi.fn()
  // No delay between keystrokes, so user-event never waits on the faked timers.
  const user = userEvent.setup({ delay: null })
  render(<AddTaskForm onAdd={onAdd} />)
  return { user, onAdd, input: screen.getByLabelText('New task') }
}

// Let the debounce run out and the mocked request settle.
const wait = (ms = TYPE_AHEAD_DELAY) => act(() => vi.advanceTimersByTimeAsync(ms))

// The grey text itself, and the screen-reader announcement of it.
const ghost = () => screen.getByTestId('type-ahead')
const ghostSuffix = () => (ghost().classList.contains('invisible') ? '' : ghost().lastChild!.textContent)
const announcement = () => screen.getByText(/^Suggestion:/)

describe('AddTaskForm type-ahead', () => {
  beforeEach(() => {
    // Only the debounce timer is faked; user-event and React need the rest.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    // Testing Library waits on setTimeout(0) after each event and only knows to
    // advance fake timers through a `jest` global, which Vitest doesn't define.
    vi.stubGlobal('jest', { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('is off by default and never calls the API', async () => {
    const fetchMock = mockCompletions({ 'Buy mi': 'Buy milk' })
    const { user, input } = setup({ enabled: false })
    expect(screen.getByRole('checkbox', { name: 'Suggest as I type' })).not.toBeChecked()
    expect(input).not.toHaveAttribute('aria-autocomplete')

    await user.type(input, 'Buy mi')
    await wait()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(ghostSuffix()).toBe('')
  })

  it('remembers the "Suggest as I type" setting', async () => {
    mockCompletions({})
    const { user } = setup({ enabled: false })
    await user.click(screen.getByRole('checkbox', { name: 'Suggest as I type' }))
    expect(localStorage.getItem(TYPE_AHEAD_KEY)).toBe('true')
    await user.click(screen.getByRole('checkbox', { name: 'Suggest as I type' }))
    expect(localStorage.getItem(TYPE_AHEAD_KEY)).toBe('false')
  })

  it('waits for a pause in typing, then asks once', async () => {
    const fetchMock = mockCompletions({ 'Buy mi': 'Buy milk' })
    const { user, input } = setup()
    expect(input).toHaveAttribute('aria-autocomplete', 'inline')

    await user.type(input, 'Buy mi')
    await wait(TYPE_AHEAD_DELAY - 1)
    expect(fetchMock).not.toHaveBeenCalled()

    await wait(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Buy mi' }),
      signal: expect.any(AbortSignal),
    })
    expect(ghostSuffix()).toBe('lk')
    expect(announcement()).toHaveTextContent(
      'Suggestion: Buy milk. Press Tab to accept, Escape to dismiss.',
    )
  })

  it('does not ask until there are 3 characters', async () => {
    const fetchMock = mockCompletions({})
    const { user, input } = setup()
    await user.type(input, ' Bu ')
    await wait()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('accepts the whole suggestion with Tab and keeps focus', async () => {
    const fetchMock = mockCompletions({ 'Buy mi': 'Buy milk and eggs' })
    const { user, input } = setup()
    await user.type(input, 'Buy mi')
    await wait()

    await user.keyboard('{Tab}')
    expect(input).toHaveValue('Buy milk and eggs')
    expect(input).toHaveFocus()
    expect(ghostSuffix()).toBe('')
    // Accepting doesn't trigger another request.
    await wait()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('leaves Tab alone when there is no suggestion', async () => {
    mockCompletions({})
    const { user, input } = setup()
    await user.type(input, 'Buy mi')
    await wait()
    await user.keyboard('{Tab}')
    expect(input).toHaveValue('Buy mi')
    expect(screen.getByRole('button', { name: 'Add' })).toHaveFocus()
  })

  it('dismisses with Escape and does not ask again for the same text', async () => {
    const fetchMock = mockCompletions({ 'Buy mi': 'Buy milk' })
    const { user, input } = setup()
    await user.type(input, 'Buy mi')
    await wait()

    await user.keyboard('{Escape}')
    expect(ghostSuffix()).toBe('')
    expect(input).toHaveValue('Buy mi')
    await wait()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Tab now moves on instead of accepting.
    await user.keyboard('{Tab}')
    expect(input).toHaveValue('Buy mi')
  })

  it('uses up the grey text as the user types along it, without asking again', async () => {
    const fetchMock = mockCompletions({ 'Buy mi': 'Buy milk' })
    const { user, input } = setup()
    await user.type(input, 'Buy mi')
    await wait()

    await user.type(input, 'L')
    expect(ghostSuffix()).toBe('k')
    await wait()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('drops the suggestion when the text stops matching it', async () => {
    mockCompletions({ 'Buy mi': 'Buy milk' })
    const { user, input } = setup()
    await user.type(input, 'Buy mi')
    await wait()
    await user.type(input, 'x')
    expect(ghostSuffix()).toBe('')
  })

  it('reuses an earlier answer when the user backspaces to it', async () => {
    // "Buy mix" gets no suggestion, so the earlier one has to come from the cache.
    const fetchMock = mockCompletions({ 'Buy mi': 'Buy milk' })
    const { user, input } = setup()
    await user.type(input, 'Buy mi')
    await wait()
    await user.type(input, 'x')
    await wait()
    expect(ghostSuffix()).toBe('')

    await user.type(input, '{Backspace}')
    expect(ghostSuffix()).toBe('lk')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('ignores a response for text that has since changed', async () => {
    let respond: (res: Response) => void = () => {}
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((resolve) => (respond = resolve))),
    )
    const { user, input } = setup()
    await user.type(input, 'Buy mi')
    await wait()
    // A keystroke while the request is in flight cancels it.
    await user.type(input, 'x')
    respond(jsonResponse({ completion: 'Buy mixed nuts' }))
    await wait(0)
    expect(ghostSuffix()).toBe('')
  })

  it('ignores completions that do not continue the typed text', async () => {
    mockCompletions({ 'Buy mi': 'Purchase milk' })
    const { user, input } = setup()
    await user.type(input, 'Buy mi')
    await wait()
    expect(ghostSuffix()).toBe('')
    expect(screen.queryByText(/^Suggestion:/)).not.toBeInTheDocument()
  })

  it('fails silently when the API errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'AI request failed' }, 502)))
    const { user, input } = setup()
    await user.type(input, 'Buy mi')
    await wait()
    expect(ghostSuffix()).toBe('')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('adds only the typed text on Enter, then clears the suggestion', async () => {
    mockCompletions({ 'Buy mi': 'Buy milk' })
    const { user, input, onAdd } = setup()
    await user.type(input, 'Buy mi')
    await wait()

    await user.keyboard('{Enter}')
    expect(onAdd).toHaveBeenCalledWith('Buy mi')
    expect(input).toHaveValue('')
    expect(ghostSuffix()).toBe('')
  })

  it('offers a touch-friendly accept button while a suggestion shows', async () => {
    mockCompletions({ 'Buy mi': 'Buy milk' })
    const { user, input } = setup()
    expect(screen.queryByRole('button', { name: /use suggestion/i })).not.toBeInTheDocument()
    await user.type(input, 'Buy mi')
    await wait()

    await user.click(screen.getByRole('button', { name: 'Use suggestion "Buy milk"' }))
    expect(input).toHaveValue('Buy milk')
    expect(input).toHaveFocus()
  })

  it('clears the suggestion when the setting is turned off', async () => {
    mockCompletions({ 'Buy mi': 'Buy milk' })
    const { user, input } = setup()
    await user.type(input, 'Buy mi')
    await wait()
    await user.click(screen.getByRole('checkbox', { name: 'Suggest as I type' }))
    expect(ghostSuffix()).toBe('')
  })
})
