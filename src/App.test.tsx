import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

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
})
