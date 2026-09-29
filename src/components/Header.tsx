import { CheckIcon } from './icons'

function Header() {
  return (
    <header className="w-full border-b border-border bg-surface-raised">
      <div className="mx-auto flex max-w-app items-center gap-3 px-4 py-4">
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-md bg-accent text-accent-fg"
        >
          <CheckIcon />
        </span>
        <div>
          <h1 className="text-lg font-semibold">To-do</h1>
          <p className="text-xs text-fg-muted">Write it down, then make it better.</p>
        </div>
      </div>
    </header>
  )
}

export default Header
