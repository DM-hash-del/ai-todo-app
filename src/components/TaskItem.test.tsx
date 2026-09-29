import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
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

  it('disables Improve and shows the skeleton while loading', () => {
    renderItem({ onSuggest: vi.fn(), suggestion: { status: 'loading' } })
    expect(screen.getByRole('button', { name: /improve/i })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Getting a suggestion…')
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
    expect(onAcceptSuggestion).toHaveBeenCalledWith('1', 'Buy oat milk')
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismissSuggestion).toHaveBeenCalledWith('1')
  })

  it('retries from the error state', async () => {
    const { onSuggest } = renderItem({ onSuggest: vi.fn(), suggestion: { status: 'error' } })
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onSuggest).toHaveBeenCalledWith('1')
  })
})
