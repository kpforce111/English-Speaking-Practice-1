# English Speaking Practice

A mobile-friendly conversational English practice app powered by a cost-optimized, server-routed AI speaking partner.

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
- `artifacts/api-server/src/lib/aiRouter.ts` — configurable primary/secondary model routing and compact learning context
- `artifacts/api-server/src/routes/chat.ts` — validated AI conversation endpoint
- `lib/api-spec/openapi.yaml` — source of truth for the chat API contract

## Architecture decisions

- The browser stores the current conversation in localStorage, while the backend sends only a compact recent learning context to the model.
- Provider credentials and model selection stay server-side; the browser only calls backend API routes.
- `AI_PRIMARY_MODEL` selects the cheap/fast default model and `AI_SECONDARY_MODEL` selects the complex-request/fallback model.
- The practice partner receives a concise system prompt that handles natural grammar rephrasing and Hindi/English bilingual replies.

## Product

Users can start with a prompt or type freely, see short AI replies with a typing state, retry failed sends, clear the current session, and return to an in-progress conversation on the same device.

## User preferences

- Keep replies short, friendly, encouraging, and gently corrective; use Hindi and English together when the learner writes in Hindi.

## Gotchas

- Keep the API contract and generated clients synchronized by running the API codegen command after OpenAPI changes.
- This is an artifact-mode PNPM workspace. Production build, run, routing, and health-check settings belong in each artifact's `.replit-artifact/artifact.toml`, updated through the artifact validation workflow—not in `.replit`.
- Never append, concatenate, or partially regenerate `.replit`. If its workspace-level settings must change, make one atomic replacement and run `pnpm run validate:replit`; duplicated TOML tables prevent Replit from loading the project.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
