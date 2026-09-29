import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
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

    await user.keyboard('{Tab}{Enter}')
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
    expect(stored()).toEqual([{ id: '1', name: suggestion.improvedName, done: false }])

    unmount()
    render(<App />)
    expect(screen.getByRole('checkbox', { name: suggestion.improvedName })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'AI suggestion' })).not.toBeInTheDocument()
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
