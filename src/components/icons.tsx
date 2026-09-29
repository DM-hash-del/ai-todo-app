import type { ReactNode } from 'react'

// Inline 16x16 stroke icons. They inherit colour from `currentColor`, so style them with text-* tokens.
type IconProps = { className?: string }

function Icon({ className = 'size-4', children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 8.5l3 3 6-7" strokeWidth="2" />
    </Icon>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </Icon>
  )
}

export function SparkleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 2v3M8 11v3M2 8h3M11 8h3M4.5 4.5l1.5 1.5M10 10l1.5 1.5M11.5 4.5L10 6M6 10l-1.5 1.5" />
    </Icon>
  )
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3.5M8 11h.01" />
    </Icon>
  )
}

export function RetryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13 8a5 5 0 11-1.5-3.5M13 2.5V5h-2.5" />
    </Icon>
  )
}

export function ListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 4.5h7M6 8h7M6 11.5h7M3 4.5h.01M3 8h.01M3 11.5h.01" />
    </Icon>
  )
}
