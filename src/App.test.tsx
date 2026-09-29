import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { STORAGE_KEY } from './storage'
import type { StoredTask } from './storage'
import type { Suggestion } from './types'

describe('App', () => {
  it('shows an empty state and disables Add until text is entered', async () => {
    render(<App />)
    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument()

    const add = screen.getByRole('button', { name: 'Add' })
    expect(add).toBeDisabled()

    await userEvent.type(screen.getByLabelText('New task'), '   ')
    expect(add).toBeDisabled()
  })

  it('adds a trimmed task, toggles it, and deletes it', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('New task')
    await user.type(input, '  Buy milk  {Enter}')
    expect(input).toHaveValue('')

    const list = screen.getByRole('list')
    const checkbox = within(list).getByRole('checkbox', { name: 'Buy milk' })
    expect(screen.getByText('1 of 1 left')).toBeInTheDocument()

    await user.click(checkbox)
    expect(checkbox).toBeChecked()
    expect(screen.getByText('0 of 1 left')).toBeInTheDocument()

    await user.click(within(list).getByRole('button', { name: 'Delete "Buy milk"' }))
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument()
  })

  it('moves focus to a neighbouring task, then to the input, after deleting', async () => {
    const user = userEvent.setup()
    render(<App />)
    const input = screen.getByLabelText('New task')
    await user.type(input, 'First{Enter}')
    await user.type(input, 'Second{Enter}')

    await user.click(screen.getByRole('button', { name: 'Delete "First"' }))
    expect(screen.getByRole('checkbox', { name: 'Second' })).toHaveFocus()

    // Tab past the Improve button to Delete.
    await user.keyboard('{Tab}{Tab}{Enter}')
    expect(input).toHaveFocus()
  })
})

describe('App persistence', () => {
  const suggestion: Suggestion = {
    improvedName: 'Buy 2L of semi-skimmed milk',
    tips: ['Check the fridge first', 'Grab a bag'],
    category: 'Shopping',
  }

  function seed(tasks: StoredTask[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }

  function stored(): StoredTask[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
  }

  it('loads a seeded task with its saved suggestion on render', () => {
    seed([
      { id: '1', name: 'milk', done: false, suggestion },
      { id: '2', name: 'Walk dog', done: true },
    ])
    render(<App />)

    expect(screen.getByRole('checkbox', { name: 'milk' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Walk dog' })).toBeChecked()
    expect(screen.getByText('1 of 2 left')).toBeInTheDocument()

    const panel = screen.getByRole('region', { name: 'AI suggestion' })
    expect(within(panel).getByText('Buy 2L of semi-skimmed milk')).toBeInTheDocument()
    expect(within(panel).getByText('Shopping')).toBeInTheDocument()
    expect(within(panel).getByText('Check the fridge first')).toBeInTheDocument()
    expect(within(panel).getByText('Grab a bag')).toBeInTheDocument()
  })

  it.each([
    ['corrupted JSON', '{"id": "1", "name": '],
    ['a non-array value', '{"tasks": []}'],
  ])('starts with an empty list when storage holds %s', (_, raw) => {
    localStorage.setItem(STORAGE_KEY, raw)
    render(<App />)
    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument()
  })

  it('starts with an empty list when storage is missing', () => {
    render(<App />)
    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument()
  })

  it('keeps tasks across a reload', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await user.type(screen.getByLabelText('New task'), 'Buy milk{Enter}')
    await user.click(screen.getByRole('checkbox', { name: 'Buy milk' }))
    unmount()

    render(<App />)
    expect(screen.getByRole('checkbox', { name: 'Buy milk' })).toBeChecked()
  })

  it('renames the task and stops saving the suggestion once it is accepted', async () => {
    const user = userEvent.setup()
    seed([{ id: '1', name: 'milk', done: false, suggestion }])
    const { unmount } = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Use this name' }))
    expect(screen.getByRole('checkbox', { name: suggestion.improvedName })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'AI suggestion' })).not.toBeInTheDocument()
    expect(stored()).toEqual([
      { id: '1', name: suggestion.improvedName, done: false, category: 'Shopping' },
    ])

    unmount()
    render(<App />)
    expect(screen.getByRole('checkbox', { name: suggestion.improvedName })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'AI suggestion' })).not.toBeInTheDocument()
  })

  it('keeps the tips and category across a reload, collapsed by default', async () => {
    const user = userEvent.setup()
    seed([{ id: '1', name: 'milk', done: false, suggestion }])
    const { unmount } = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Use both' }))
    unmount()
    render(<App />)

    const checkbox = screen.getByRole('checkbox', { name: suggestion.improvedName })
    expect(checkbox).toHaveAccessibleDescription('Shopping')
    const toggle = screen.getByRole('button', { name: `Tips for "${suggestion.improvedName}"` })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(screen.getByText('Check the fridge first')).toBeInTheDocument()
    expect(screen.getByText('Grab a bag')).toBeInTheDocument()
  })

  it('stops saving the suggestion once it is dismissed', async () => {
    const user = userEvent.setup()
    seed([{ id: '1', name: 'milk', done: false, suggestion }])
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('region', { name: 'AI suggestion' })).not.toBeInTheDocument()
    expect(stored()).toEqual([{ id: '1', name: 'milk', done: false }])
  })

  it('removes a deleted task from storage', async () => {
    const user = userEvent.setup()
    seed([{ id: '1', name: 'milk', done: false, suggestion }])
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Delete "milk"' }))
    expect(stored()).toEqual([])
  })
})

describe('App AI suggestions', () => {
  const suggestion: Suggestion = {
    improvedName: 'Buy 2L of semi-skimmed milk',
    tips: ['Check the fridge first'],
    category: 'Shopping',
  }

  function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Resolve the request by hand, so the loading state can be asserted.
  function deferredFetch() {
    let resolve!: (res: Response) => void
    const fetchMock = vi.fn(() => new Promise<Response>((r) => (resolve = r)))
    vi.stubGlobal('fetch', fetchMock)
    return { fetchMock, respond: (res: Response) => resolve(res) }
  }

  function seedMilk() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: '1', name: 'milk', done: false }]))
  }

  function stored(): StoredTask[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
  }

  const improve = () => screen.getByRole('button', { name: 'Improve "milk" with AI' })
  const busy = () => screen.getByRole('button', { name: 'Improving "milk"…' })
  const panel = () => screen.findByRole('region', { name: 'AI suggestion' })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the task name, shows loading, then renders and saves the suggestion', async () => {
    const user = userEvent.setup()
    const { fetchMock, respond } = deferredFetch()
    seedMilk()
    const { unmount } = render(<App />)

    await user.click(improve())
    expect(fetchMock).toHaveBeenCalledWith('/api/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'milk' }),
    })
    expect(busy()).toHaveAttribute('aria-disabled', 'true')
    // Loading isn't persisted.
    expect(stored()).toEqual([{ id: '1', name: 'milk', done: false }])

    respond(jsonResponse(suggestion))
    const region = await panel()
    expect(within(region).getByText(suggestion.improvedName)).toBeInTheDocument()
    expect(within(region).getByText('Shopping')).toBeInTheDocument()
    expect(within(region).getByText('Check the fridge first')).toBeInTheDocument()
    expect(improve()).toHaveAttribute('aria-disabled', 'false')
    expect(stored()).toEqual([{ id: '1', name: 'milk', done: false, suggestion }])

    unmount()
    render(<App />)
    expect(within(await panel()).getByText(suggestion.improvedName)).toBeInTheDocument()
  })

  it('renames the task when the suggestion is accepted', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(suggestion)))
    seedMilk()
    render(<App />)

    await user.click(improve())
    await user.click(within(await panel()).getByRole('button', { name: 'Use this name' }))
    expect(screen.getByRole('checkbox', { name: suggestion.improvedName })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'AI suggestion' })).not.toBeInTheDocument()
    // The category comes with the name; the tips don't.
    expect(screen.queryByRole('button', { name: /tips for/i })).not.toBeInTheDocument()
    expect(stored()).toEqual([
      { id: '1', name: suggestion.improvedName, done: false, category: 'Shopping' },
    ])
  })

  it('keeps the tips and category but not the name with "Use these tips"', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(suggestion)))
    seedMilk()
    render(<App />)

    await user.click(improve())
    await user.click(within(await panel()).getByRole('button', { name: 'Use these tips' }))
    expect(screen.getByRole('checkbox', { name: 'milk' })).toHaveAccessibleDescription('Shopping')
    expect(screen.queryByRole('region', { name: 'AI suggestion' })).not.toBeInTheDocument()
    // Focus lands on Improve rather than being stranded.
    expect(improve()).toHaveFocus()
    expect(stored()).toEqual([
      { id: '1', name: 'milk', done: false, category: 'Shopping', tips: suggestion.tips },
    ])
  })

  it('keeps the name, tips and category with "Use both"', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(suggestion)))
    seedMilk()
    render(<App />)

    await user.click(improve())
    await user.click(within(await panel()).getByRole('button', { name: 'Use both' }))
    expect(stored()).toEqual([
      {
        id: '1',
        name: suggestion.improvedName,
        done: false,
        category: 'Shopping',
        tips: suggestion.tips,
      },
    ])
  })

  it('replaces kept tips and category when a later suggestion is used', async () => {
    const user = userEvent.setup()
    const next: Suggestion = {
      improvedName: 'Buy oat milk',
      tips: ['Try the barista one'],
      category: 'Groceries',
    }
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(next)))
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: '1', name: 'milk', done: false, category: 'Shopping', tips: ['Old tip'] },
      ]),
    )
    render(<App />)

    // Name only: the new category replaces the old one, but the old tips stay.
    await user.click(improve())
    await user.click(within(await panel()).getByRole('button', { name: 'Use this name' }))
    expect(stored()).toEqual([
      { id: '1', name: 'Buy oat milk', done: false, category: 'Groceries', tips: ['Old tip'] },
    ])

    await user.click(screen.getByRole('button', { name: 'Improve "Buy oat milk" with AI' }))
    await user.click(within(await panel()).getByRole('button', { name: 'Use these tips' }))
    expect(stored()).toEqual([
      { id: '1', name: 'Buy oat milk', done: false, category: 'Groceries', tips: next.tips },
    ])
  })

  it('shows the empty state when the body is null', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(null)))
    seedMilk()
    render(<App />)

    await user.click(improve())
    expect(await screen.findByText(/no suggestion for this one/i)).toBeInTheDocument()
    expect(stored()).toEqual([{ id: '1', name: 'milk', done: false }])
  })

  it('shows a retryable error on a 502 and succeeds on retry', async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'AI request failed' }, 502))
      .mockResolvedValueOnce(jsonResponse(suggestion))
    vi.stubGlobal('fetch', fetchMock)
    seedMilk()
    render(<App />)

    await user.click(improve())
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/couldn’t get a suggestion/i)
    // The error body must never be treated as a suggestion.
    expect(screen.queryByRole('region', { name: 'AI suggestion' })).not.toBeInTheDocument()

    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(within(await panel()).getByText(suggestion.improvedName)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shows the error state on a network failure', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    seedMilk()
    render(<App />)

    await user.click(improve())
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('ignores clicks while a request is loading', async () => {
    const user = userEvent.setup()
    const { fetchMock, respond } = deferredFetch()
    seedMilk()
    render(<App />)

    await user.click(improve())
    await user.click(busy())
    await user.click(busy())
    expect(fetchMock).toHaveBeenCalledTimes(1)

    respond(jsonResponse(suggestion))
    expect(await panel()).toBeInTheDocument()
  })

  it('drops a response that arrives after its task was deleted', async () => {
    const user = userEvent.setup()
    const { respond } = deferredFetch()
    seedMilk()
    render(<App />)

    await user.click(improve())
    await user.click(screen.getByRole('button', { name: 'Delete "milk"' }))
    respond(jsonResponse(suggestion))

    await waitFor(() => expect(stored()).toEqual([]))
    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument()
  })
})
