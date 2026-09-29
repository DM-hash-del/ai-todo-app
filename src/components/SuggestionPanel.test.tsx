import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SuggestionState } from '../types'
import SuggestionPanel from './SuggestionPanel'

function renderPanel(state: SuggestionState) {
  const props = { state, onAccept: vi.fn(), onDismiss: vi.fn(), onRetry: vi.fn() }
  render(<SuggestionPanel {...props} />)
  return props
}

const suggestion = {
  improvedName: 'Do a 30-minute strength workout',
  tips: ['Pack your bag', 'Pick a time'],
  category: 'Health',
}

describe('SuggestionPanel', () => {
  it('announces the loading skeleton to screen readers', () => {
    renderPanel({ status: 'loading' })
    expect(screen.getByRole('status')).toHaveTextContent('Getting a suggestion…')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the improved name, category and tips, and accepts or dismisses', async () => {
    const { onDismiss } = renderPanel({ status: 'ready', suggestion })
    const panel = screen.getByRole('region', { name: 'AI suggestion' })
    expect(panel).toHaveTextContent(suggestion.improvedName)
    expect(panel).toHaveTextContent('Health')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalled()
  })

  it.each([
    ['Use this name', 'name'],
    ['Use these tips', 'tips'],
    ['Use both', 'both'],
  ])('"%s" accepts with the %s choice', async (label, choice) => {
    const { onAccept } = renderPanel({ status: 'ready', suggestion })
    await userEvent.click(screen.getByRole('button', { name: label }))
    expect(onAccept).toHaveBeenCalledWith(choice)
  })

  it('lists the actions in order: name, tips, both, dismiss', () => {
    renderPanel({ status: 'ready', suggestion })
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Use this name',
      'Use these tips',
      'Use both',
      'Dismiss',
    ])
  })

  it('outlines the part each action keeps on hover and focus', async () => {
    const user = userEvent.setup()
    renderPanel({ status: 'ready', suggestion })
    const name = screen.getByText(suggestion.improvedName)
    const tips = screen.getByRole('list').parentElement!
    const both = name.parentElement!
    const category = screen.getByText('Health')
    const outlined = () =>
      [name, tips, both, category].map((el) => el.classList.contains('ring-accent'))

    expect(outlined()).toEqual([false, false, false, false])

    await user.hover(screen.getByRole('button', { name: 'Use this name' }))
    expect(outlined()).toEqual([true, false, false, true])

    await user.hover(screen.getByRole('button', { name: 'Use these tips' }))
    expect(outlined()).toEqual([false, true, false, true])

    // "Use both" outlines name and tips as a single block.
    await user.hover(screen.getByRole('button', { name: 'Use both' }))
    expect(outlined()).toEqual([false, false, true, true])

    await user.unhover(screen.getByRole('button', { name: 'Use both' }))
    expect(outlined()).toEqual([false, false, false, false])

    // Keyboard focus previews too.
    act(() => screen.getByRole('button', { name: 'Use these tips' }).focus())
    expect(outlined()).toEqual([false, true, false, true])
  })

  it('offers only the name when there are no tips, without an empty list', () => {
    renderPanel({ status: 'ready', suggestion: { ...suggestion, tips: [] } })
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Use this name',
      'Dismiss',
    ])
  })

  it('shows a "no suggestion" state for a null response', () => {
    renderPanel({ status: 'empty' })
    expect(screen.getByRole('status')).toHaveTextContent(/no suggestion/i)
  })

  it('shows a retryable error', async () => {
    const { onRetry } = renderPanel({ status: 'error' })
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn’t get a suggestion/i)
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalled()
  })
})
