import type { ComponentProps } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TaskItem from './TaskItem'

const task = { id: '1', name: 'Buy milk', done: false }

function renderItem(overrides: Partial<ComponentProps<typeof TaskItem>> = {}) {
  const props = { task, onToggle: vi.fn(), onDelete: vi.fn(), ...overrides }
  render(
    <ul>
      <TaskItem {...props} />
    </ul>,
  )
  return props
}

describe('TaskItem', () => {
  it('shows when the task was created, in local time', () => {
    const createdAt = new Date(2026, 10, 9, 15, 45).toISOString()
    renderItem({ task: { ...task, createdAt } })
    const time = screen.getByText('Created: 09.11.26 at 15:45')
    expect(time).toHaveAttribute('datetime', createdAt)
    expect(time.parentElement).toHaveClass('text-fg-subtle', 'font-light')
  })

  it('shows no creation time for tasks saved before it was recorded', () => {
    renderItem()
    expect(screen.queryByText(/^Created:/)).not.toBeInTheDocument()
  })

  it('renders the task name as the checkbox label', () => {
    renderItem()
    expect(screen.getByRole('checkbox', { name: 'Buy milk' })).not.toBeChecked()
  })

  it('calls onToggle with the task id when the checkbox is clicked', async () => {
    const { onToggle } = renderItem()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Buy milk' }))
    expect(onToggle).toHaveBeenCalledWith('1')
  })

  it('calls onDelete with the task id', async () => {
    const { onDelete } = renderItem()
    await userEvent.click(screen.getByRole('button', { name: 'Delete "Buy milk"' }))
    expect(onDelete).toHaveBeenCalledWith('1')
  })

  it('shows completed tasks as checked and struck through', () => {
    renderItem({ task: { ...task, done: true } })
    expect(screen.getByRole('checkbox', { name: 'Buy milk' })).toBeChecked()
    expect(screen.getByText('Buy milk')).toHaveClass('line-through')
  })

  it('hides the Improve button unless onSuggest is provided', () => {
    renderItem()
    expect(screen.queryByRole('button', { name: /improve/i })).not.toBeInTheDocument()
  })

  it('requests a suggestion with the task id', async () => {
    const { onSuggest } = renderItem({ onSuggest: vi.fn() })
    await userEvent.click(screen.getByRole('button', { name: 'Improve "Buy milk" with AI' }))
    expect(onSuggest).toHaveBeenCalledWith('1')
  })

  it('keeps Improve focusable but inert while loading, and shows the skeleton', async () => {
    const { onSuggest } = renderItem({ onSuggest: vi.fn(), suggestion: { status: 'loading' } })
    const improve = screen.getByRole('button', { name: 'Improving "Buy milk"…' })
    expect(improve).toHaveAttribute('aria-disabled', 'true')
    expect(improve).toBeEnabled()
    await userEvent.click(improve)
    expect(onSuggest).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Getting a suggestion…')
  })

  it('returns focus to the Improve button when the panel is dismissed', async () => {
    renderItem({
      onSuggest: vi.fn(),
      onDismissSuggestion: vi.fn(),
      suggestion: { status: 'error' },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.getByRole('button', { name: 'Improve "Buy milk" with AI' })).toHaveFocus()
  })

  it('returns focus to the checkbox when there is no Improve button', async () => {
    renderItem({
      onDismissSuggestion: vi.fn(),
      suggestion: { status: 'empty' },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.getByRole('checkbox', { name: 'Buy milk' })).toHaveFocus()
  })

  it('passes the task id through accept, dismiss and retry', async () => {
    const onAcceptSuggestion = vi.fn()
    const onDismissSuggestion = vi.fn()
    renderItem({
      onAcceptSuggestion,
      onDismissSuggestion,
      suggestion: {
        status: 'ready',
        suggestion: { improvedName: 'Buy oat milk', tips: [], category: 'Errands' },
      },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Use this name' }))
    expect(onAcceptSuggestion).toHaveBeenCalledWith('1', 'name')
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismissSuggestion).toHaveBeenCalledWith('1')
  })

  it('passes the chosen part through to onAcceptSuggestion', async () => {
    const onAcceptSuggestion = vi.fn()
    renderItem({
      onAcceptSuggestion,
      suggestion: {
        status: 'ready',
        suggestion: { improvedName: 'Buy oat milk', tips: ['Check the date'], category: 'Errands' },
      },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Use both' }))
    expect(onAcceptSuggestion).toHaveBeenCalledWith('1', 'both')
  })

  it('retries from the error state', async () => {
    const { onSuggest } = renderItem({ onSuggest: vi.fn(), suggestion: { status: 'error' } })
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onSuggest).toHaveBeenCalledWith('1')
  })

  describe('kept category and tips', () => {
    const kept = { ...task, category: 'Errands', tips: ['Check the date', 'Bring a bag'] }

    it('shows the category next to the name without changing the checkbox name', () => {
      renderItem({ task: kept })
      const checkbox = screen.getByRole('checkbox', { name: 'Buy milk' })
      expect(checkbox).toHaveAccessibleDescription('Errands')
      expect(screen.getByText('Errands')).toBeInTheDocument()
    })

    it('collapses tips by default and toggles them', async () => {
      renderItem({ task: kept })
      const toggle = screen.getByRole('button', { name: 'Tips for "Buy milk"' })
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByText('Check the date')).not.toBeInTheDocument()

      await userEvent.click(toggle)
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
      const list = screen.getByRole('list', { name: 'Tips for "Buy milk"' })
      expect(toggle).toHaveAttribute('aria-controls', list.id)
      expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual(
        kept.tips,
      )

      await userEvent.click(toggle)
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByText('Check the date')).not.toBeInTheDocument()
    })

    it('puts the tips toggle just before Improve', () => {
      renderItem({ task: kept, onSuggest: vi.fn() })
      expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
        'Tips for "Buy milk"',
        'Improve "Buy milk" with AI',
        'Delete "Buy milk"',
      ])
    })

    it('keeps the tips toggle on completed tasks', () => {
      renderItem({ task: { ...kept, done: true }, onSuggest: vi.fn() })
      expect(screen.getByRole('button', { name: 'Tips for "Buy milk"' })).toBeInTheDocument()
    })

    it('has no category chip or tips toggle when nothing was kept', () => {
      renderItem({ task: { ...task, tips: [] } })
      expect(screen.queryByRole('button', { name: /tips for/i })).not.toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: 'Buy milk' })).not.toHaveAccessibleDescription()
    })
  })
})
