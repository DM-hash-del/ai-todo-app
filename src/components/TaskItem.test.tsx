import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TaskItem from './TaskItem'

const task = { id: '1', name: 'Buy milk', done: false }

function renderItem(overrides = {}) {
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
})
