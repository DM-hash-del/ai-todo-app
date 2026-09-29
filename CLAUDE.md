# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

- Never expose OPENAI_API_KEY to client code. All OpenAI calls go through server/index.ts.
- Frontend calls the backend at /api/* (proxied by Vite).
- Tests use Vitest + React Testing Library; mock fetch, never call OpenAI in tests.
- Styling uses Tailwind utility classes built from the design tokens in `src/index.css`. Never use raw hex/rgb/oklch values or arbitrary values like `bg-[#fff]` in components (see "Design system" below).

## Commands

- `npm run dev`: runs the Vite frontend (`web`) and the Express API (`api`, via `tsx watch --env-file=.env`) together using `concurrently`
- `npm run build`: `tsc -b` (project references), then `vite build`
- `npm run lint`: ESLint (flat config, `eslint.config.js`)
- `npm test`: Vitest in watch mode. Use `npx vitest run` for a single pass, `npx vitest run path/to/file.test.tsx` for one file, and `-t "name"` to filter by test name.
- `npm run typecheck`: `tsc -b` across both tsconfig projects

## Outstanding tasks

Remove each item here once it's done.

- [ ] **Save tasks to `localStorage`.** Tasks only live in React state in `src/App.tsx`, so a reload clears them. Load on startup and save on change. Wrap reads and writes in `try/catch` (storage can be unavailable or hold malformed JSON) and fall back to an empty list.
- [ ] **Connect `/api/suggest` to the UI.** The UI states already exist (see "AI suggestion states" under Architecture). What's left is keeping a `suggestions` map in `App`, passing `onSuggest` / `onAcceptSuggestion` / `onDismissSuggestion` to `TaskList`, and making the request as the API contract below describes:
  - check `res.ok` first: a failure maps to `error`, and a `null` body maps to `empty`;
  - ignore clicks while a request is `loading`;
  - accepting a suggestion renames the task;
  - mock `fetch` in the tests.

## Design system

All visual tokens live in `src/index.css` (Tailwind v4 `@theme`). The look is calm and minimal: neutral greys, **one** accent colour (a calm blue), thin borders, soft shadows, plenty of whitespace.

**Rules for every component:**

- **Use tokens only.** No hex, `rgb()`, `oklch()` or named colours in `.tsx`/`.css`, and no arbitrary values (`bg-[#…]`, `p-[13px]`, `text-[15px]`, `rounded-[6px]`). Colour literals may only appear in the primitives block of `src/index.css`. If a value is missing, add a token there first. Don't inline it.
- **Use semantic colour utilities, not palette steps.** Tailwind's default palette is reset (`--color-*: initial`), so `bg-gray-200`, `text-blue-600`, `bg-red-500`, etc. **don't exist** and silently produce no CSS. The grey/accent/danger scales (`--gray-*`, `--accent-*`, `--danger-*`) are primitives for `index.css` only; don't use `var(--gray-500)` in components.
- **Don't write `dark:` colour overrides.** Semantic tokens switch automatically in dark mode. Use `dark:` only for non-colour tweaks, and rarely.
- **One accent.** Use `accent` only for the primary action, checked/active state, focus, and AI-suggestion highlights. `danger` is only for error states (e.g. the 502 "AI request failed" message). Don't add new hues.

**Colour tokens** (use as `bg-*`, `text-*`, `border-*`, `ring-*`, `outline-*`, `fill-*`, `divide-*`):

| Token | Use for |
|---|---|
| `surface` | page background |
| `surface-raised` | cards, list container, inputs, popovers |
| `surface-muted` | row hover, chips, subtle fills, disabled backgrounds |
| `fg` | primary text |
| `fg-muted` | secondary text, descriptions, tips |
| `fg-subtle` | placeholders, meta text, completed (struck-through) to-dos |
| `border` | dividers, card outlines |
| `border-strong` | input/control outlines (≥3:1 against surfaces), hover borders |
| `accent` / `accent-hover` | primary button background, checked checkbox |
| `accent-fg` | text/icons on `bg-accent` |
| `accent-subtle` | tinted background (e.g. the AI suggestion panel) |
| `accent-text` | links and accent-coloured text on surfaces |
| `danger` / `danger-subtle` | error text/border / error background |

Every text token passes WCAG AA (≥4.5:1) on `surface`, `surface-raised` and `surface-muted` in both themes. `border-strong` meets WCAG 1.4.11 (≥3:1 for non-text UI) against `surface` and `surface-raised`: `--gray-450` in light, `--gray-500` in dark. Keep both true when you change the primitives. Plain `border` is only for decorative dividers. The base layer sets `border-color: var(--border)` on every element, so a bare `border` / `divide-y` is already the right colour.

**Type scale:** `text-xs` 12 · `text-sm` 14 · `text-base` 16 (body default) · `text-lg` 18 · `text-xl` 20 · `text-2xl` 24 · `text-3xl` 30. Each size carries its own line-height. Larger sizes (`text-4xl`+) are removed. Weights: `font-normal` for body, `font-medium` for labels/buttons, `font-semibold` for headings. Fonts: `font-sans` (system stack, the default) and `font-mono`.

**Spacing:** 4px grid via `--spacing: 0.25rem` (`p-1` = 4px, `p-4` = 16px). Stick to steps `0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16`. Use `max-w-app` (40rem) for the main column.

**Radius:** `rounded-sm` (4px: chips, checkboxes) · `rounded-md` (8px: buttons, inputs) · `rounded-lg` (12px: cards, list container) · `rounded-xl` (16px: dialogs) · `rounded-full` (pills, avatars). Other radius sizes are removed.

**Shadows:** only `shadow-sm` (cards) and `shadow-md` (popovers/dialogs). Prefer a `border` over a shadow.

**Focus:** a global `:focus-visible` outline (2px accent, 2px offset) is set in the base layer. Don't remove outlines. If a component needs a custom ring, use `focus-visible:outline-accent`.

**Accessibility and responsive rules** (checked at 375px and 1280px, light and dark):
- **Real controls only.** Use `<button>`, `<input>` and `<label>`; never put click handlers on a `div`. Wrap a checkbox and its text in one `<label>` so the whole row is the click target.
- **Targets:** at least 24×24px, and 32px (`size-8` / `min-h-8`) for icon and panel buttons. Icon-only buttons need an `aria-label`.
- **Don't strand focus.** When an action unmounts the focused control (delete, accept, dismiss, retry), move focus to something sensible first: the next or previous task's checkbox, the row's Improve button, or the `#new-task` input.
- **Busy, not disabled.** For controls that are busy with a request, use `aria-disabled` and ignore clicks instead of `disabled`, which drops focus. `disabled` is fine for Add while the input is empty.
- **Mobile layout:** no horizontal scroll at 375px, and long unbroken task names must wrap (`break-words` with `min-w-0`). Secondary button labels may collapse to icon-only below `sm` (keep the `aria-label`), and panel actions wrap under their message.

**Dark mode:** follows the OS (`prefers-color-scheme`) by default. Setting `data-theme="dark"` or `data-theme="light"` on `<html>` forces a theme. The custom `dark:` variant respects both. To change a colour, re-point the semantic variable in both the light block and the `@variant dark` block in `index.css`. Never change it per component.

Example: `<button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:bg-surface-muted disabled:text-fg-subtle">`

## Architecture

The app has two processes that run side by side in development:

- **Frontend** (`src/`): React 19, Vite 8, and Tailwind v4. Tailwind is loaded through the `@tailwindcss/vite` plugin and `@import "tailwindcss"` in `src/index.css`, which also holds the design tokens (`@theme`); there is no tailwind config file. `src/App.tsx` owns the to-do list (`Task[]` in React state; the type is in `src/types.ts`) and lays out a full-width `Header` above a centred `max-w-app` column containing `AddTaskForm` and `TaskList`, which renders one `TaskItem` per task. Components live in `src/components/`, one per file, with tests next to them (`*.test.tsx`). Shared SVG icons are in `src/components/icons.tsx`; they use `currentColor`, so colour them with `text-*` tokens.
  - **AI suggestion states:** `TaskItem` takes an optional `suggestion?: SuggestionState` (`src/types.ts`) and renders `SuggestionPanel` inline below the task. `undefined` means idle, then `loading` (pulsing skeleton, Improve button disabled), `ready` (improved name, category, tips, plus "Use this name" / Dismiss), `empty` (200 with a `null` body), and `error` (502 or network failure, with Retry). The Improve button only appears when `onSuggest` is passed, so it's hidden until the API is connected. `TaskList` passes these props through from a `suggestions` map keyed by task id.
  - **States preview:** under `npm run dev`, open `http://localhost:5173/#states` to see every `TaskItem` state and the empty list together (`src/dev/StatesPreview.tsx`). It's dev-only and dropped from production builds. When you add a new state, add it there too.
- **API** (`server/index.ts`): an Express 5 server on port 3001. It exposes `POST /api/suggest`, which takes `{ description }` and calls the OpenAI **Responses API** (`openai.responses.parse`) with a Zod schema (`zodTextFormat`) to get structured output: `{ improvedName, tips[], category }`. The app's purpose is AI-assisted to-do item improvement.
- **Proxy:** in `vite.config.ts`, Vite proxies `/api` to `http://localhost:3001`. Frontend code should call relative `/api/...` URLs so the OpenAI key never reaches the browser.

TypeScript is split with project references:
- `tsconfig.app.json` covers `src/` (bundler resolution, DOM libs)
- `tsconfig.node.json` covers `server/` and `vite.config.ts` (`nodenext` modules, Node types)

Both configs enable `verbatimModuleSyntax` and `erasableSyntaxOnly`. That means type-only imports must use `import type`, and TS-only runtime syntax such as enums, namespaces, and parameter properties is not allowed.

Testing uses Vitest with jsdom and Testing Library. The setup file is `src/test/setup.ts`, which registers the `jest-dom` matchers and calls Testing Library's `cleanup` after each test. Vitest `globals` is off, so that cleanup doesn't happen automatically, and without it rendered DOM carries over between tests. Import `describe`/`it`/`expect`/`vi` from `vitest` explicitly. `src/setup.ts` is an empty stray file.

## API contract (design the frontend around this)

`POST /api/suggest` is the only endpoint. Keep frontend code in line with `server/index.ts`:

- **Request:** `fetch("/api/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description }) })`. The `Content-Type` header is required because `express.json()` only parses JSON bodies. Without it, the server sees no `description` and returns 400.
- **Responses:**
  - `200`: `{ improvedName: string, tips: string[], category: string }`. The prompt asks for 1–3 tips, but the schema doesn't enforce it, so render any length, including 0.
  - `200` with a `null` body: the model refused or produced no parseable output. Handle this as a "no suggestion" state, not a crash.
  - `400 { error: "description is required" }`: `description` is missing, not a string, or whitespace only. Trim the input and disable submit when it's empty, so this is only a fallback.
  - `502 { error: "AI request failed" }`: any OpenAI failure (bad key, bad/missing `OPENAI_MODEL`, outage). It's generic by design; the real error is logged in the API terminal. Show a retryable error in the UI.
- **Always check `res.ok`** before treating the body as a suggestion; error bodies have the shape `{ error: string }`.
- **Requests are slow** (an LLM round trip), so show a loading state and prevent duplicate submits while one is in flight.
- **One description per request, with no history.** The server doesn't batch and doesn't remember earlier calls.
- **The server is stateless and has no database.** The frontend owns the to-do list (React state, optionally `localStorage`); the API only improves a single item on demand.
- **Response types aren't shared.** `server/` and `src/` are separate TS projects, so the frontend declares its own `Suggestion` type. If the Zod `Suggestion` schema in `server/index.ts` changes, update the frontend type and its tests to match.
- **Never call `http://localhost:3001` directly.** The server has no CORS, so only same-origin requests through the Vite proxy work.
- **New endpoints must live under `/api/`**, since that's the only prefix the proxy forwards.
- **Port 3001 is hard-coded** in both `server/index.ts` and `vite.config.ts`. Change them together.
- **No auth, rate limiting, or length cap** beyond Express's default 100 KB JSON body limit. Each request costs OpenAI credits, so avoid calling on every keystroke (call on submit or an explicit action).
- **Development only:** `npm run build` doesn't compile or bundle the server (`noEmit`), Express doesn't serve `dist/`, and the Vite proxy doesn't exist in `vite preview` or production builds. Deploying needs extra setup.

## Environment

Copy `.env.example` to `.env`. The server needs:
- `OPENAI_API_KEY`: read implicitly by the OpenAI SDK
- `OPENAI_MODEL`: required; the server uses it with a non-null assertion

`.claude/settings.json` denies reading `.env`.
