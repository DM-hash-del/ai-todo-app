import type { SuggestionState } from '../types'
import { AlertIcon, RetryIcon, SparkleIcon } from './icons'

type SuggestionPanelProps = {
  state: SuggestionState
  onAccept: (improvedName: string) => void
  onDismiss: () => void
  onRetry: () => void
}

const ghostButton =
  'rounded-md px-2.5 py-1 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg'

// Inline panel rendered below a TaskItem, indented to line up with the task name.
function SuggestionPanel({ state, onAccept, onDismiss, onRetry }: SuggestionPanelProps) {
  switch (state.status) {
    case 'loading':
      return (
        <div
          role="status"
          className="rounded-md border border-border bg-surface-raised p-3"
        >
          <span className="sr-only">Getting a suggestion…</span>
          <div aria-hidden="true" className="flex animate-pulse flex-col gap-2 motion-reduce:animate-none">
            <div className="h-3 w-16 rounded-sm bg-border" />
            <div className="h-4 w-3/4 rounded-sm bg-border" />
            <div className="h-3 w-full rounded-sm bg-border" />
            <div className="h-3 w-2/3 rounded-sm bg-border" />
          </div>
        </div>
      )

    case 'ready': {
      const { improvedName, tips, category } = state.suggestion
      return (
        <section
          aria-label="AI suggestion"
          className="flex flex-col gap-2 rounded-md border border-border bg-accent-subtle p-3"
        >
          <div className="flex items-center gap-2">
            <SparkleIcon className="size-3.5 text-accent-text" />
            <span className="text-xs font-medium text-accent-text">Suggestion</span>
            {category && (
              <span className="rounded-sm bg-surface-raised px-1.5 py-0.5 text-xs text-fg-muted">
                {category}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-fg">{improvedName}</p>
          {tips.length > 0 && (
            <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-fg-muted marker:text-fg-subtle">
              {tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onAccept(improvedName)}
              className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-hover"
            >
              Use this name
            </button>
            <button type="button" onClick={onDismiss} className={ghostButton}>
              Dismiss
            </button>
          </div>
        </section>
      )
    }

    case 'empty':
      return (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-muted px-3 py-2"
        >
          <p className="text-xs text-fg-muted">No suggestion for this one. Try adding more detail.</p>
          <button type="button" onClick={onDismiss} className={ghostButton}>
            Dismiss
          </button>
        </div>
      )

    case 'error':
      return (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger-subtle px-3 py-2"
        >
          <AlertIcon className="size-4 shrink-0 text-danger" />
          <p className="flex-1 text-xs text-fg">Couldn’t get a suggestion. Please try again.</p>
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-danger transition-colors hover:bg-surface-raised"
          >
            <RetryIcon className="size-3.5" />
            Retry
          </button>
          <button type="button" onClick={onDismiss} className={ghostButton}>
            Dismiss
          </button>
        </div>
      )
  }
}

export default SuggestionPanel
