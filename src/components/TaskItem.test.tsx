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
  it('shows when the task was created at the bottom of the details, in local time', async () => {
    const createdAt = new Date(2026, 10, 9, 15, 45).toISOString()
    renderItem({ task: { ...task, tips: ['Check the date'], createdAt } })
    const time = screen.getByText('Created: 09.11.26 at 15:45')
    const panel = document.getElementById('task-1-details')!
    expect(panel).toContainElement(time)
    expect(panel).toHaveAttribute('inert')

    await userEvent.click(screen.getByRole('button', { name: 'Details for "Buy milk"' }))
    expect(panel).not.toHaveAttribute('inert')
    expect(time).toHaveAttribute('datetime', createdAt)
    expect(time.parentElement).toHaveClass('text-fg-subtle', 'font-light')
    // Last thing in the panel, after the tips.
    expect(panel.firstElementChild!.lastElementChild).toBe(time.parentElement)
  })

  it('shows only the created time in the details when there are no tips', async () => {
    const createdAt = new Date(2026, 10, 9, 15, 45).toISOString()
    renderItem({ task: { ...task, createdAt } })
    await userEvent.click(screen.getByRole('button', { name: 'Details for "Buy milk"' }))
    const panel = document.getElementById('task-1-details')!
    expect(within(panel).queryByRole('list')).not.toBeInTheDocument()
    expect(panel).toHaveTextContent(/^Created: 09\.11\.26 at 15:45$/)
  })

  it('says the created time is unknown for tasks saved before it was recorded', () => {
    renderItem()
    expect(document.getElementById('task-1-details')).toHaveTextContent('Created: unknown')
  })

  it('explains each button in a tooltip on hover', async () => {
    const user = userEvent.setup()
    renderItem({ onSuggest: vi.fn() })
    const cases = [
      ['Details for "Buy milk"', 'Show when this task was created'],
      ['Improve "Buy milk" with AI', 'Ask AI for a clearer name, a category and tips'],
      ['Delete "Buy milk"', 'Delete this task (asks you to confirm first)'],
    ]
    for (const [name, tip] of cases) {
      const button = screen.getByRole('button', { name })
      expect(button).toHaveAccessibleDescription(tip)
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
      await user.hover(button)
      expect(screen.getByRole('tooltip')).toHaveTextContent(tip)
      await user.unhover(button)
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    }
  })

  it('shows the tooltip on keyboard focus and hides it on Escape', async () => {
    const user = userEvent.setup()
    renderItem()
    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Details for "Buy milk"' })).toHaveFocus()
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('updates the details tooltip once the details are open', async () => {
    renderItem({ task: { ...task, tips: ['Check the date'] } })
    const toggle = screen.getByRole('button', { name: 'Details for "Buy milk"' })
    expect(toggle).toHaveAccessibleDescription(
      'Show this task’s tips and when it was created',
    )
    await userEvent.click(toggle)
    expect(toggle).toHaveAccessibleDescription(
      'Hide this task’s tips and when it was created',
    )
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

    it('collapses details by default and toggles the tips', async () => {
      renderItem({ task: kept })
      const toggle = screen.getByRole('button', { name: 'Details for "Buy milk"' })
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      // Collapsed tips stay mounted (to animate) but are hidden and inert.
      expect(screen.queryByRole('list', { name: 'Tips for "Buy milk"' })).not.toBeInTheDocument()

      await userEvent.click(toggle)
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
      const list = screen.getByRole('list', { name: 'Tips for "Buy milk"' })
      expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toContainElement(list)
      expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual(
        kept.tips,
      )

      await userEvent.click(toggle)
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByRole('list', { name: 'Tips for "Buy milk"' })).not.toBeInTheDocument()
    })

    it('puts the details toggle just before Improve', () => {
      renderItem({ task: kept, onSuggest: vi.fn() })
      expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
        'Details for "Buy milk"',
        'Improve "Buy milk" with AI',
        'Delete "Buy milk"',
      ])
    })

    it('keeps the details toggle on completed tasks', () => {
      renderItem({ task: { ...kept, done: true }, onSuggest: vi.fn() })
      expect(screen.getByRole('button', { name: 'Details for "Buy milk"' })).toBeInTheDocument()
    })

    it('has no category chip or tips list when nothing was kept, but keeps Details', async () => {
      renderItem({ task: { ...task, tips: [] } })
      await userEvent.click(screen.getByRole('button', { name: 'Details for "Buy milk"' }))
      expect(screen.queryByRole('list', { name: /tips for/i })).not.toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: 'Buy milk' })).not.toHaveAccessibleDescription()
    })
  })
})
