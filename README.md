# AI To-Do App

A to-do list with AI help. Add tasks, tick them off, and ask an LLM to improve any task: it suggests a clearer name, a category and a few tips, and you choose what to keep. An optional "Suggest as I type" mode completes task names inline while you type.

The frontend is React 19, TypeScript, Vite and Tailwind CSS v4. Tasks are saved in your browser's `localStorage`; there is no database. The AI features run through a small backend so the API key never reaches the browser. That backend comes in two versions:

- **PHP** (current `main`): `public/api/suggest.php` and `public/api/complete.php`
- **Express** (Node/TypeScript): `server/`, run by the [`express-backend`](https://github.com/DM-hash-del/ai-todo-app/releases/tag/express-backend) tag

Both expose the same endpoints, `POST /api/suggest` and `POST /api/complete`.

## You need an LLM API key

The AI features (the Improve button and type-ahead) call the **OpenAI Responses API**, so you need an [OpenAI API key](https://platform.openai.com/api-keys) with credit on the account. Each Improve click or type-ahead completion is a paid request.

Without a key the app still works as a plain to-do list. AI requests just fail: Improve shows a retryable "AI request failed" error, and type-ahead shows nothing.

The key stays on the server. It goes in `config/config.php` (PHP) or `.env` (Express), both gitignored. Never commit it or put it in frontend code.

## Requirements

- [Node.js](https://nodejs.org/) 20.19+ or 22.12+ and npm
- For the PHP backend: PHP 8.1+ on your `PATH`, with the `curl` and `mbstring` extensions enabled

## Setup with PHP (default)

```bash
git clone https://github.com/DM-hash-del/ai-todo-app.git
cd ai-todo-app
npm install
cp config/config.example.php config/config.php
```

Edit `config/config.php`:

```php
return [
    'openai_api_key' => 'sk-...',      // your OpenAI API key
    'suggest_model'  => 'gpt-...',     // model for Improve
    'complete_model' => 'gpt-...',     // model for type-ahead (must accept reasoning.effort "none")
    // 'base_url'    => 'https://api.openai.com/v1',  // optional
];
```

Then start it:

```bash
npm run dev
```

This runs the Vite dev server and `php -S localhost:3001 -t public` side by side. Open http://localhost:5173. Vite forwards `/api/*` to the PHP server, and API errors are logged in the terminal.

## Setup with Express

The Express backend is the version before the PHP port, saved under the `express-backend` tag:

```bash
git clone https://github.com/DM-hash-del/ai-todo-app.git
cd ai-todo-app
git checkout express-backend
npm install
cp .env.example .env
```

Edit `.env`:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-...
```

Then start it:

```bash
npm run dev
```

This runs Vite and the Express server (`tsx watch server/index.ts`) on port 3001. Open http://localhost:5173.

`git checkout express-backend` leaves you on a detached HEAD. Run `git switch -c my-branch` if you want to make changes there.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Frontend and API together |
| `npm run build` | Type-check, then build the frontend into `dist/` |
| `npm test` | Vitest in watch mode (`npx vitest run` for a single pass) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript across the app and server projects |

Tests mock `fetch` and the OpenAI client, so they don't need an API key.

## Project layout

```
src/            React app (components, API client, localStorage persistence)
public/api/     PHP backend (copied into dist/ by vite build)
server/         Express backend (not started by npm run dev on main)
config/         PHP config; config.php is gitignored
```

## Deploying

This setup is meant for local development. The `/api` proxy only exists in the Vite dev server. To deploy with PHP, serve `dist/` from Apache with PHP enabled (`public/api/.htaccess` maps the `/api/*` routes) and put the config in a `config/` folder next to the web root (so `api/lib.php` finds it at `../../config/config.php`). The API has no auth or rate limiting, so anyone who can reach it can spend your OpenAI credits.
