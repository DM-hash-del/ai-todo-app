# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

- Never expose OPENAI_API_KEY to client code. All OpenAI calls go through server/index.ts.
- Frontend calls the backend at /api/* (proxied by Vite).
- Tests use Vitest + React Testing Library; mock fetch, never call OpenAI in tests.
- Styling uses Tailwind utility classes.

## Commands

- `npm run dev`: runs the Vite frontend (`web`) and the Express API (`api`, via `tsx watch --env-file=.env`) together using `concurrently`
- `npm run build`: `tsc -b` (project references), then `vite build`
- `npm run lint`: ESLint (flat config, `eslint.config.js`)
- `npm test`: Vitest in watch mode. Use `npx vitest run` for a single pass, `npx vitest run path/to/file.test.tsx` for one file, and `-t "name"` to filter by test name.
- `npm run typecheck`: `tsc -b` across both tsconfig projects

## Architecture

The app has two processes that run side by side in development:

- **Frontend** (`src/`): React 19, Vite 8, and Tailwind v4. Tailwind is loaded through the `@tailwindcss/vite` plugin and `@import "tailwindcss"` in `src/index.css`; there is no tailwind config file. `src/App.tsx` is still the Vite starter template and hasn't been built out yet.
- **API** (`server/index.ts`): an Express 5 server on port 3001. It exposes `POST /api/suggest`, which takes `{ description }` and calls the OpenAI **Responses API** (`openai.responses.parse`) with a Zod schema (`zodTextFormat`) to get structured output: `{ improvedName, tips[], category }`. The app's purpose is AI-assisted to-do item improvement.
- **Proxy:** in `vite.config.ts`, Vite proxies `/api` to `http://localhost:3001`. Frontend code should call relative `/api/...` URLs so the OpenAI key never reaches the browser.

TypeScript is split with project references:
- `tsconfig.app.json` covers `src/` (bundler resolution, DOM libs)
- `tsconfig.node.json` covers `server/` and `vite.config.ts` (`nodenext` modules, Node types)

Both configs enable `verbatimModuleSyntax` and `erasableSyntaxOnly`. That means type-only imports must use `import type`, and TS-only runtime syntax such as enums, namespaces, and parameter properties is not allowed.

Testing uses Vitest with jsdom and Testing Library. The setup file is `src/test/setup.ts`, which registers the `jest-dom` matchers. No tests exist yet. `src/setup.ts` is an empty stray file.

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
