# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup        # One-time setup: install deps, generate Prisma client, run migrations
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run all Vitest tests
npm run db:reset     # Force reset SQLite database
```

Run a single test file:
```bash
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx
```

## Environment

Requires `.env` with:
```
ANTHROPIC_API_KEY=   # Optional — omit to use MockLanguageModel fallback
JWT_SECRET=          # Optional — auto-generated if absent
```

## Architecture

UIGen is an AI-powered React component generator. Users describe components in natural language; Claude generates code that is rendered in a sandboxed live preview.

### Request Flow

1. User types in `ChatInterface` → sent to `/api/chat`
2. `/api/chat` calls Claude (Haiku 4.5) via Vercel AI SDK with streaming
3. Claude uses two tools to modify a **virtual file system** (in-memory, never disk):
   - `str_replace_editor` — view/create/edit files
   - `file_manager` — create/delete files and directories
4. Tool calls are streamed back and applied to the `FileSystemContext`
5. `PreviewFrame` picks up updated files, transforms JSX via Babel standalone, builds an import-map HTML document, and renders it in a sandboxed `<iframe>`

### Key Directories

| Path | Purpose |
|------|---------|
| `src/app/` | Next.js App Router pages and `/api/chat` route |
| `src/components/` | UI components (`chat/`, `editor/`, `preview/`, `auth/`, `ui/`) |
| `src/lib/contexts/` | `ChatContext` and `FileSystemContext` — central state |
| `src/lib/tools/` | AI tool definitions (`str-replace.ts`, `file-manager.ts`) |
| `src/lib/prompts/` | System prompt sent to Claude |
| `src/lib/provider.ts` | Selects real vs. mock language model |
| `src/actions/` | Next.js server actions for auth and project CRUD |
| `prisma/` | SQLite schema — `User` and `Project` models |

### Database

The schema is defined in `prisma/schema.prisma`. Reference it whenever you need to understand the structure of data stored in the database.

### Virtual File System

`src/lib/file-system.ts` is a pure in-memory tree. The `FileSystemContext` wraps it for React. Projects are persisted to SQLite by serializing the entire file system to a JSON string in `Project.data`.

### Live Preview

`PreviewFrame.tsx` discovers the entry point (`App.jsx` / `index.jsx`), runs Babel standalone on JSX files, constructs an import map for `@/` aliases and React/ReactDOM CDN URLs, and writes a full HTML document into an `srcdoc` iframe. No server round-trip needed.

### Auth

JWT sessions stored in HTTP-only cookies (7-day expiry, `jose` library). `middleware.ts` protects routes. Passwords hashed with bcrypt. Server actions in `src/actions/index.ts`.

### AI Provider

`src/lib/provider.ts` exports the language model. When `ANTHROPIC_API_KEY` is absent, a `MockLanguageModel` returns a placeholder component so the app remains functional without credentials.

## Code Style

Use comments sparingly. Only comment complex or non-obvious code.

### Testing

Vitest + React Testing Library with `jsdom`. Tests live in `__tests__/` subdirectories next to source. The `@/` path alias is resolved via `vitest.config.mts`.
