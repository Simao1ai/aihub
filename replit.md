# AI Hub — Personal Business Command Center (SynthDesk.ai)

## Overview

A full-stack personal AI Agent Hub for Simao Alves to manage 5 businesses from one central hub:
1. **LESA Inspections** — Home inspection B2B with realtor network
2. **CarrierDeskHQ** — Trucking consulting and dispatch SaaS
3. **SalonSync Hub** — Salon management SaaS
4. **Sweepello** — Cleaning marketplace SaaS
5. **Real Estate Investments** — Portfolio acquisition and tracking
6. **General** — Cross-business command center

## Security & Auth

- **Passwords**: bcrypt-hashed in DB via `bcryptjs` (seed.ts hashes on upsert)
- **Session tokens**: 128-bit hex random tokens, 7-day TTL, stored in in-memory Map (`lib/session.ts`)
- **Auth middleware**: All `/api/*` endpoints require `Authorization: Bearer <token>` except `/api/auth/*`, `/api/health`, `/api/generated-images/*`
- **CORS**: Restricted to `*.replit.dev`, `*.replit.app`, `*.repl.co`, and localhost
- **Frontend**: Global fetch interceptor in `App.tsx` auto-attaches Bearer token to all `/api/*` calls from localStorage
- **Login flow**: POST `/api/auth/login` → bcrypt.compare → createSession → return token; frontend stores in Zustand + localStorage
- **Workspace scoping**: All protected routes enforce `(req as any).sessionWorkspace` server-side — no client-controlled businessTag

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express 5
- **Database**: PostgreSQL + Drizzle ORM + pgvector (for semantic search)
- **AI**: Anthropic Claude `claude-sonnet-4-6` (via Replit AI Integrations — no API key needed)
- **Embeddings**: OpenAI `text-embedding-3-small` via Replit AI Integrations (for Brain semantic search)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild

## Structure

```text
artifacts/
├── ai-hub/              # React + Vite frontend
│   ├── src/
│   │   ├── pages/       # dashboard, agents, brain, tasks, contacts, automations, pipelines, connections, workspaces, login
│   │   ├── components/  # layout.tsx (sidebar nav), ui-elements.tsx, error-boundary.tsx
│   │   ├── hooks/       # use-auth.ts, use-chat-stream.ts
│   │   └── store.ts     # Zustand global state (businessTag, account)
│   └── public/images/
└── api-server/          # Express API backend
    └── src/
        ├── routes/      # agents, anthropic, brain, automations, connections, auth, pipelines, workspaces, tasks, contacts, kpis, usage
        ├── lib/
        │   ├── cron.ts     # node-cron automation scheduler
        │   ├── pipeline.ts # Multi-agent pipeline runner (retry-with-backoff, per-step error capture)
        │   ├── usage.ts    # AI token/cost recording utility
        │   └── seed.ts     # DB seeder (runs on startup, upserts workspaces)
lib/
├── db/src/schema/       # agents, brain (pgvector), automations, connections, conversations, messages, pipelines, workspaces, tasks, contacts, kpis, ai-usage
├── api-spec/            # OpenAPI spec
├── api-client-react/    # Generated React Query hooks
├── api-zod/             # Generated Zod schemas
└── integrations-anthropic-ai/  # Anthropic AI client
```

## Key Features

### Navigation (10 sections)
1. **📊 Dashboard** — Command center: stat cards, KPI section, cross-business overview (General only), pending approvals, agent shortcuts, recent chats, social stats, AI usage widget (tokens + estimated cost this month).
2. **🤖 Agents** — Chat with 17 specialized AI agents. Streaming SSE responses. Conversation history. Manual handoff routing. Workspace-aware AI context + Brain context injected per conversation.
3. **🧠 Brain** — Upload PDFs, paste text, fetch URLs. Semantic search via pgvector cosine similarity (OpenAI embeddings), keyword fallback when embeddings unavailable. Context injected into every AI call.
4. **✅ Tasks** — Kanban board (To Do / In Progress / Done). Priority, due dates, overdue detection. Workspace-scoped.
5. **👥 Contacts** — CRM list with search and status filters. Workspace-scoped.
6. **⚡ Automations** — Scheduled and on-demand AI tasks. All outputs require approval. Pre-built templates.
7. **🔀 Pipelines** — Multi-agent sequential workflows with retry-with-backoff (3 attempts, exponential). Per-step error capture (failed steps don't kill the run).
8. **📱 Social** — AI-generated posts (SOSHI). Image generation (PIXEL). Facebook/Instagram publish via Meta API. Schedule posts. Social stats widget.
9. **🔗 Connections** — OAuth connections for LinkedIn, Google/Gmail, Twitter/X, Meta. API key connections for GoHighLevel.
10. **⚙️ Workspaces** — Create and manage workspaces. Each workspace has isolated data.

### Semantic Brain (pgvector)
- PostgreSQL `vector` extension enabled with `vector(1536)` column on `brain_documents`
- IVFFlat cosine index: `brain_documents_embedding_idx`
- Embeddings generated via OpenAI `text-embedding-3-small` (1536 dims) after document upload/update (background, non-blocking)
- `getBrainContext()` in `brain.ts`: tries vector cosine similarity first, falls back to keyword ILIKE search
- Existing documents without embeddings are served via keyword fallback

### Token & Cost Tracking
- `ai_usage` table: workspace, agent_slug, model, input_tokens, output_tokens, estimated_cost_usd, created_at
- `recordUsage()` called after every Claude `messages.create` in `anthropic.ts` (chat loop + safety round + auto-respond loop) and `pipeline.ts` (each step)
- Pricing: Claude Sonnet 4 → $3/MTok input, $15/MTok output
- GET `/api/usage` endpoint returns 30-day totals + per-agent breakdown
- Dashboard "AI Usage — This Month" widget shows input tokens, output tokens, estimated cost (visible only when there's data)

### Agent Loop Resilience
- **pipeline.ts**: `retryWithBackoff()` wraps each step's `messages.create` — 3 attempts, exponential back-off (1s, 2s, 4s). Failed steps record error in `stepsOutput` and continue; pipeline only fails if ALL steps error
- **anthropic.ts**: `autoRespondAfterHandoff` has a 90-second hard cap via `startTime` guard per round; avoids UI hangs after agent handoff

### Frontend Resilience
- **Global Error Boundary**: `ErrorBoundary` class component in `src/components/error-boundary.tsx` wraps every `ProtectedRoute` — catches render errors, shows friendly UI with "Try again" button
- Tasks, Contacts pages already have loading skeletons + empty states (pre-existing)

### Workspace System
- DB-backed workspaces with per-workspace passwords, emoji, color
- 6 pre-seeded workspaces: General + 5 businesses
- Each workspace's `businessContext` text is injected into AI system prompt for workspace-aware responses
- Workspace-scoped data: tasks, contacts, KPIs, brain documents, conversations

### AI Context Injection
- On every message, `anthropic.ts` fetches workspace `businessContext`, cross-agent team activity (last 7 days), and Brain context
- Brain context: top-4 semantically similar chunks via pgvector, keyword fallback if no embeddings

### Pipeline System
- DB tables: `pipelines` (steps as JSONB), `pipeline_runs` (stepsOutput as JSONB)
- Execution engine: `artifacts/api-server/src/lib/pipeline.ts`
- Each step receives: agent system prompt + step promptTemplate + previous step's output
- Retry-with-backoff on each step; per-step error capture (continue on step failure)
- Token usage recorded per step

### KPI Tracking (per workspace)
- `kpis` table: name, value, unit ($/%/#/etc), period, businessTag
- Dashboard shows editable KPI cards per workspace
- Full CRUD API at `/api/kpis`

### Agents (17 seeded)
| Name | Role |
|------|------|
| COMPASS | Business strategy |
| OUTREACH | Cold email & B2B sales |
| INKWELL | Copywriting & content |
| SCOUT | Market research |
| OPS | Operations & SOPs |
| DESK | Client communication |
| CASSIE | Customer support |
| SOSHI | Social media manager |
| FINN | Finance & bookkeeping |
| SEOMI | SEO |
| DEXIE | Data analysis |
| EMMA | Email marketing |
| MILLI | Sales coaching |
| HIRO | HR & recruiting |
| LEX | Legal & compliance |
| NOVA | Project management |
| PIXEL | AI image generation |

## DB Schema (all tables)
- `agents` — AI agent definitions
- `workspaces` — Multi-workspace config with businessContext
- `sessions` — Server-side session store (token, workspace, expiry)
- `conversations` + `messages` — Chat history
- `brain_documents` — Knowledge base entries (+ `embedding vector(1536)` for semantic search)
- `automations` + `automation_runs` — Scheduled AI tasks
- `pipelines` + `pipeline_runs` — Multi-agent workflows
- `connections` — OAuth/API key credentials
- `tasks` — Kanban tasks per workspace
- `contacts` — CRM contacts per workspace
- `kpis` — KPI metrics per workspace
- `social_posts` — Social media posts (status, platform, imageUrl, scheduledAt, postedAt)
- `ai_usage` — Token consumption + cost per Claude call (workspace, agent_slug, model, input_tokens, output_tokens, estimated_cost_usd)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GENERAL_PASSWORD` | General workspace password (default: aihub2024) |
| `LES_A_PASSWORD` | LESA Inspections password |
| `CARRIERDESKH_PASSWORD` | CarrierDeskHQ password |
| `SALONSYNC_PASSWORD` | SalonSync Hub password |
| `SWEEPELLO_PASSWORD` | Sweepello password |
| `REAL_ESTATE_PASSWORD` | Real Estate workspace password |
| `ENCRYPTION_KEY` | 64-char hex key for AES-256-GCM secret encryption |
| `DATABASE_URL` | Auto-provisioned PostgreSQL |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Auto-set by Replit AI Integrations |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Auto-set by Replit AI Integrations |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | Auto-set by Replit AI Integrations (used for embeddings) |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | Auto-set by Replit AI Integrations (used for embeddings) |
| `LINKEDIN_CLIENT_ID/SECRET` | LinkedIn OAuth |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth |
| `TWITTER_CLIENT_ID/SECRET` | Twitter/X OAuth |
| `META_APP_ID/SECRET` | Meta OAuth |

## Development Commands

```bash
# Push DB schema changes (use direct SQL for vector/complex types)
pnpm --filter @workspace/db run push

# Run API codegen after OpenAPI spec changes
pnpm --filter @workspace/api-spec run codegen

# Build API server
pnpm --filter @workspace/api-server run build

# Typecheck all packages
pnpm run typecheck
```

## User Preferences

- Keep Tailwind/shadcn design system consistent throughout
- Prefer incremental, reviewable changes
- Fix type errors after every change phase
- Update replit.md at end of each major feature phase
