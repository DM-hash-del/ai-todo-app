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

## Environment

Copy `.env.example` to `.env`. The server needs:
- `OPENAI_API_KEY`: read implicitly by the OpenAI SDK
- `OPENAI_MODEL`: required; the server uses it with a non-null assertion

`.claude/settings.json` denies reading `.env`.
