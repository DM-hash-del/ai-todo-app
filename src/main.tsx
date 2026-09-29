import { StrictMode } from 'react'
import type { ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const root = createRoot(document.getElementById('root')!)

function render(Component: ComponentType) {
  root.render(
    <StrictMode>
      <Component />
    </StrictMode>,
  )
}

// Dev-only component states gallery at /#states. `import.meta.env.DEV` is false in builds, so this is tree-shaken out.
if (import.meta.env.DEV && location.hash === '#states') {
  import('./dev/StatesPreview.tsx').then(({ default: StatesPreview }) => render(StatesPreview))
} else {
  render(App)
}
