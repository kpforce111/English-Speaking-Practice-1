# English Speaking Practice

A mobile-friendly conversational English practice app powered by a friendly Claude speaking partner.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/english-speaking-practice/src/App.tsx` — chat experience, session persistence, and client interaction state
- `artifacts/english-speaking-practice/src/index.css` — purple/lavender visual theme and motion system
- `artifacts/api-server/src/routes/chat.ts` — validated Claude conversation endpoint
- `lib/api-spec/openapi.yaml` — source of truth for the chat API contract

## Architecture decisions

- The browser stores the current conversation in localStorage so the AI can receive session context without requiring accounts or a database.
- The Anthropic API key stays server-side in `ANTHROPIC_API_KEY`; the browser only calls the local `/api/chat` endpoint.
- The practice partner receives a concise system prompt that handles natural grammar rephrasing and Hindi/English bilingual replies.

## Product

Users can start with a prompt or type freely, see short AI replies with a typing state, retry failed sends, clear the current session, and return to an in-progress conversation on the same device.

## User preferences

- Keep replies short, friendly, encouraging, and gently corrective; use Hindi and English together when the learner writes in Hindi.

## Gotchas

- Keep the API contract and generated clients synchronized by running the API codegen command after OpenAPI changes.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
