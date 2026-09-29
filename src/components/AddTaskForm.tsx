import { useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { MAX_TASK_LENGTH } from '../api'
import { loadTypeAhead, saveTypeAhead } from '../storage'
import { useTypeAhead } from '../useTypeAhead'
import { CheckIcon } from './icons'

type AddTaskFormProps = {
  onAdd: (name: string) => void
  // Dev states preview only: start with this text and grey suggestion showing.
  preview?: { name: string; completion: string }
}

function AddTaskForm({ onAdd, preview }: AddTaskFormProps) {
  const [name, setName] = useState(preview?.name ?? '')
  const trimmed = name.trim()
  // "Suggest as I type" is opt-in and remembered, since every typing pause costs credits.
  const [suggestAsYouType, setSuggestAsYouType] = useState(() => !!preview || loadTypeAhead())
  const typeAhead = useTypeAhead(name, preview?.completion)
  const inputRef = useRef<HTMLInputElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  // The grey text only makes sense right after the caret, and only if it fits:
  // the overlay can't follow the input when it scrolls sideways.
  const [caretAtEnd, setCaretAtEnd] = useState(true)
  const [fits, setFits] = useState(true)
  const suffix = suggestAsYouType ? typeAhead.suffix : ''
  const showSuggestion = suffix !== '' && caretAtEnd && fits
  const suggestion = name + suffix

  useLayoutEffect(() => {
    const ghost = ghostRef.current
    // Measuring the overlay is the only way to know; this can't be derived during render.
    setFits(!ghost || ghost.scrollWidth <= ghost.clientWidth)
  }, [name, suffix])

  function change(next: string) {
    setName(next)
    if (suggestAsYouType) typeAhead.change(next)
  }

  function accept() {
    change(suggestion)
    inputRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestion) return
    const { key, shiftKey, altKey, ctrlKey, metaKey } = event
    // Plain Tab accepts; with no suggestion showing, Tab moves focus as usual.
    if (key === 'Tab' && !shiftKey && !altKey && !ctrlKey && !metaKey) {
      event.preventDefault()
      accept()
    } else if (key === 'Escape') {
      event.preventDefault()
      typeAhead.dismiss()
    }
  }

  function toggleSuggestAsYouType(enabled: boolean) {
    setSuggestAsYouType(enabled)
    saveTypeAhead(enabled)
    if (enabled) typeAhead.change(name)
    else typeAhead.reset()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!trimmed) return
    // Enter adds what was typed; the grey text is only added with Tab.
    onAdd(trimmed)
    setName('')
    typeAhead.reset()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <label htmlFor="new-task" className="sr-only">
          New task
        </label>
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            id="new-task"
            type="text"
            value={name}
            onChange={(event) => change(event.target.value)}
            onKeyDown={handleKeyDown}
            onSelect={(event) => {
              const { selectionStart, selectionEnd, value } = event.currentTarget
              setCaretAtEnd(selectionStart === value.length && selectionEnd === value.length)
            }}
            aria-autocomplete={suggestAsYouType ? 'inline' : undefined}
            placeholder="Add a task…"
            autoComplete="off"
            maxLength={MAX_TASK_LENGTH}
            className="w-full rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-sm text-fg shadow-sm"
          />
          {/* Grey type-ahead drawn over the input: an invisible copy of the typed text
              pushes the rest of the suggestion to just after the caret. */}
          <div
            ref={ghostRef}
            aria-hidden="true"
            data-testid="type-ahead"
            className={`pointer-events-none absolute inset-0 overflow-hidden rounded-md border border-transparent px-3 py-2 text-sm whitespace-pre ${
              showSuggestion ? '' : 'invisible'
            }`}
          >
            <span className="invisible">{name}</span>
            <span className="text-fg-subtle">{suffix}</span>
          </div>
        </div>
        {/* Touch screens have no Tab key, so they get a button instead. */}
        {showSuggestion && (
          <button
            type="button"
            // Keep focus (and the on-screen keyboard) in the input.
            onMouseDown={(event) => event.preventDefault()}
            onClick={accept}
            aria-label={`Use suggestion "${suggestion}"`}
            className="hidden min-h-8 shrink-0 items-center justify-center rounded-md px-3 border border-border-strong bg-surface-raised text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg pointer-coarse:flex"
          >
            <CheckIcon className="size-4" />
          </button>
        )}
        <button
          type="submit"
          disabled={!trimmed}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-subtle"
        >
          Add
        </button>
      </div>
      <label className="flex min-h-6 cursor-pointer items-center gap-2 self-start text-xs text-fg-muted">
        <input
          type="checkbox"
          checked={suggestAsYouType}
          onChange={(event) => toggleSuggestAsYouType(event.target.checked)}
          className="size-4 shrink-0 cursor-pointer accent-accent"
        />
        Suggest as I type
      </label>
      {/* Screen readers can't see the grey text, so announce it. */}
      <p aria-live="polite" className="sr-only">
        {showSuggestion ? `Suggestion: ${suggestion}. Press Tab to accept, Escape to dismiss.` : ''}
      </p>
    </form>
  )
}

export default AddTaskForm
