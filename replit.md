# AI Hub — Personal Business Command Center (Sintra.ai Competitor)

## Overview

A full-stack personal AI Agent Hub for Simao Alves to manage 5 businesses from one central hub:
1. **LES A Inspections** — Home inspection B2B with realtor network
2. **CarrierDeskHQ** — Trucking consulting and dispatch SaaS
3. **SalonSync Hub** — Salon management SaaS
4. **Sweepello** — Cleaning marketplace SaaS
5. **Real Estate Investments** — Portfolio acquisition and tracking
6. **General** — Cross-business command center

Multi-workspace login system. Each workspace has its own password. Default password: `aihub2024`.

## Security & Auth (implemented April 2026)

- **Passwords**: bcrypt-hashed in DB via `bcryptjs` (seed.ts hashes on upsert)
- **Session tokens**: 128-bit hex random tokens, 7-day TTL, stored in in-memory Map (`lib/session.ts`)
- **Auth middleware**: All `/api/*` endpoints require `Authorization: Bearer <token>` except `/api/auth/*`, `/api/health`, `/api/generated-images/*`
- **CORS**: Restricted to `*.replit.dev`, `*.replit.app`, `*.repl.co`, and localhost
- **Frontend**: Global fetch interceptor in `App.tsx` auto-attaches Bearer token to all `/api/*` calls from localStorage
- **Login flow**: POST `/api/auth/login` → bcrypt.compare → createSession → return token; frontend stores in Zustand + localStorage

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: Anthropic Claude (via Replit AI Integrations — no API key needed)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild

## Structure

```text
artifacts/
├── ai-hub/              # React + Vite frontend
│   ├── src/
│   │   ├── pages/       # dashboard, agents, brain, tasks, contacts, automations, pipelines, connections, workspaces, login
│   │   ├── components/  # layout.tsx (sidebar nav), ui-elements.tsx
│   │   ├── hooks/       # use-auth.ts, use-chat-stream.ts
│   │   └── store.ts     # Zustand global state (businessTag, account)
│   └── public/images/
└── api-server/          # Express API backend
    └── src/
        ├── routes/      # agents, anthropic, brain, automations, connections, auth, pipelines, workspaces, tasks, contacts, kpis
        ├── lib/
        │   ├── cron.ts  # node-cron automation scheduler
        │   └── seed.ts  # DB seeder (runs on startup, upserts workspaces)
lib/
├── db/src/schema/       # agents, brain, automations, connections, conversations, messages, pipelines, workspaces, tasks, contacts, kpis
├── api-spec/            # OpenAPI spec
├── api-client-react/    # Generated React Query hooks
├── api-zod/             # Generated Zod schemas
└── integrations-anthropic-ai/  # Anthropic AI client
```

## Key Features

### Navigation (10 sections)
1. **📊 Dashboard** — Command center: stat cards (agents, brain, tasks, contacts, connections, pending), KPI section per workspace, cross-business overview (General only), pending approvals queue, agent shortcuts, recent chats, social post stats widget.
2. **🤖 Agents** — Chat with 17 specialized AI agents. Streaming SSE responses. Conversation history with search. Export conversation to .txt. Per-message copy buttons. Manual handoff routing between agents. Workspace-aware AI context injected per conversation.
3. **🧠 Brain** — Upload PDFs, paste text, fetch URLs. Brain context injected into every AI call automatically.
4. **✅ Tasks** — Kanban board with To Do / In Progress / Done columns. Create, edit, move, delete tasks. Priority (low/medium/high), due dates with overdue detection. Scoped per workspace.
5. **👥 Contacts** — CRM list with search and status filters (Lead → Prospect → Client → Partner). Add/edit/delete contacts with name, company, email, phone, notes. Scoped per workspace.
6. **⚡ Automations** — Scheduled and on-demand AI tasks. All outputs require approval before saving. Pre-built templates.
7. **🔀 Pipelines** — Multi-agent sequential workflows. Chain agents where each step receives the previous output as context.
8. **📱 Social** — Social Media Command Center. AI-generated posts per platform (SOSHI agent). Image generation via PIXEL agent. Post to Facebook/Instagram via Meta API (`/photos` endpoint for image posts). One-click post copy. Schedule posts with datetime picker (cron auto-publish). Social stats (queued/scheduled/posted today/total).
9. **🔗 Connections** — OAuth connections for LinkedIn, Google/Gmail, Twitter/X, Meta. API key connections for GoHighLevel.
10. **⚙️ Workspaces** — Create and manage workspaces (name, emoji, color, password). Each workspace has isolated data.

### Workspace System
- DB-backed workspaces with per-workspace passwords, emoji, color
- 6 pre-seeded workspaces: General + 5 businesses
- Each workspace's `businessContext` text is injected into AI system prompt for workspace-aware responses
- Workspace-scoped data: tasks, contacts, KPIs, brain documents, conversations
- Seed upserts on every server start (updates businessContext/emoji/color)

### AI Context Injection
- `conversations.businessTag` links conversations to workspaces
- On every message, `anthropic.ts` looks up the workspace by `businessTag` and prepends its `businessContext` to the agent's system prompt
- Brain documents are also keyword-searched and injected for additional context

### Pipeline System
- DB tables: `pipelines` (steps as JSONB), `pipeline_runs` (stepsOutput as JSONB)
- Execution engine: `artifacts/api-server/src/lib/pipeline.ts`
- Each step receives: agent's system prompt + step promptTemplate + previous step's output

### KPI Tracking (per workspace)
- `kpis` table: name, value, unit ($/%/#/etc), period, businessTag
- Dashboard shows editable KPI cards per workspace
- Full CRUD API at `/api/kpis`

### Agents (17 seeded on first run)
| Name | Role |
|------|------|
| COMPASS | Strategy |
| OUTREACH | Sales & Email |
| INKWELL | Copywriter |
| SCOUT | Research |
| OPS | Admin |
| DESK | Client Comms |
| SOSHI | Social Media Content |
| PIXEL | Image Generation (generates images via OpenAI, saves to /generated-images/) |
| NEXUS | Integration & Data |
| PRISM | Analytics & Insights |
| FORGE | Product & Development |
| VAULT | Finance & Legal |
| HERALD | PR & Communications |
| CATALYST | Growth & Marketing |
| ORACLE | Forecasting |
| GUARDIAN | Risk & Compliance |
| MENTOR | Training & Onboarding |

## DB Schema (all tables)
- `agents` — AI agent definitions
- `workspaces` — Multi-workspace config with businessContext
- `conversations` + `messages` — Chat history
- `brain_documents` — Knowledge base entries
- `automations` + `automation_runs` — Scheduled AI tasks
- `pipelines` + `pipeline_runs` — Multi-agent workflows
- `connections` — OAuth/API key credentials
- `tasks` — Kanban tasks per workspace
- `contacts` — CRM contacts per workspace
- `kpis` — KPI metrics per workspace
- `social_posts` — Social media posts (status: draft/pending_approval/approved/posted/failed, platform, imageUrl, scheduledAt, postedAt)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GENERAL_PASSWORD` | General workspace password (default: aihub2024) |
| `LES_A_PASSWORD` | LES A Inspections password |
| `CARRIERDESKH_PASSWORD` | CarrierDeskHQ password |
| `SALONSYNC_PASSWORD` | SalonSync Hub password |
| `SWEEPELLO_PASSWORD` | Sweepello password |
| `REAL_ESTATE_PASSWORD` | Real Estate workspace password |
| `DATABASE_URL` | Auto-provisioned PostgreSQL |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Auto-set by Replit AI Integrations |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Auto-set by Replit AI Integrations |
| `LINKEDIN_CLIENT_ID/SECRET` | LinkedIn OAuth |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth |
| `TWITTER_CLIENT_ID/SECRET` | Twitter/X OAuth |
| `META_APP_ID/SECRET` | Meta OAuth |

## Development Commands

```bash
# Push DB schema changes
pnpm --filter @workspace/db run push

# Run API codegen after OpenAPI spec changes
pnpm --filter @workspace/api-spec run codegen

# Build API server
pnpm --filter @workspace/api-server run build
```
