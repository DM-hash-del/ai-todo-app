function Header() {
  return (
    <header className="w-full border-b border-border bg-surface-raised">
      <div className="mx-auto flex max-w-app items-center gap-3 px-4 py-4">
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-md bg-accent text-accent-fg"
        >
          <svg viewBox="0 0 16 16" fill="none" className="size-4">
            <path
              d="M3.5 8.5l3 3 6-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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
