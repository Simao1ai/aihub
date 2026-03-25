# AI Hub — Personal Business Command Center

## Overview

A full-stack personal AI Agent Hub for managing two businesses:
1. **Equifind Recovery** — Florida tax deed surplus fund recovery SaaS
2. **Home Inspection Business** — B2B with realtor network

Single-user, password-gated web app. Default password: `aihub2024` (change via APP_PASSWORD secret).

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
│   │   ├── pages/       # agents.tsx, brain.tsx, automations.tsx, connections.tsx, login.tsx
│   │   ├── components/  # layout.tsx, ui-elements.tsx
│   │   ├── hooks/       # use-auth.ts, use-chat-stream.ts
│   │   └── store.ts     # Zustand global state
│   └── public/images/   # logo.png
└── api-server/          # Express API backend
    └── src/
        ├── routes/      # agents, anthropic, brain, automations, connections, auth
        ├── lib/
        │   ├── cron.ts  # node-cron automation scheduler
        │   └── seed.ts  # DB seeder (runs on startup)
lib/
├── db/src/schema/       # agents, brain, automations, connections, conversations, messages
├── api-spec/            # OpenAPI spec
├── api-client-react/    # Generated React Query hooks
├── api-zod/             # Generated Zod schemas
└── integrations-anthropic-ai/  # Anthropic AI client
```

## Key Features

### 4 Tabs
1. **🤖 Agents** — Chat with 6 specialized AI agents (COMPASS, OUTREACH, INKWELL, SCOUT, OPS, DESK). Streaming SSE responses. Conversation history per agent.
2. **🧠 Brain** — Upload PDFs, paste text, fetch URLs. Brain context is injected into every AI call automatically.
3. **⚡ Automations** — Scheduled and on-demand AI tasks. All outputs require approval before saving. Pre-built templates for realtor outreach, strategy brief, case research.
4. **🔗 Connections** — OAuth connections for LinkedIn, Google/Gmail, Twitter/X, Meta. API key connections for GoHighLevel. Supports posting, DMing, reading messages via connected accounts.

### Agents (seeded on first run)
| Name | Emoji | Color | Role |
|------|-------|-------|------|
| COMPASS | 🧭 | #6366f1 | Strategy |
| OUTREACH | 📬 | #f59e0b | Sales & Email |
| INKWELL | ✍️ | #10b981 | Copywriter |
| SCOUT | 🔍 | #3b82f6 | Research |
| OPS | ⚙️ | #8b5cf6 | Admin |
| DESK | 💬 | #ef4444 | Client Comms |

### Pre-built Automations
- Weekly Realtor Outreach Draft (Every Monday 8am — OUTREACH agent)
- Equifind Weekly Strategy Brief (Every Friday 4pm — COMPASS agent)
- Case Research Summary (On-demand — SCOUT agent)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `APP_PASSWORD` | App password gate (default: aihub2024) |
| `DATABASE_URL` | Auto-provisioned PostgreSQL |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Auto-set by Replit AI Integrations |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Auto-set by Replit AI Integrations |
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth app ID |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `TWITTER_CLIENT_ID` | Twitter/X OAuth client ID |
| `TWITTER_CLIENT_SECRET` | Twitter/X OAuth secret |
| `META_APP_ID` | Meta (Facebook/Instagram) App ID |
| `META_APP_SECRET` | Meta App Secret |

## Social Media OAuth Setup

Replit only has a built-in Gmail connector (user dismissed it). For all OAuth platforms, developer apps must be created manually and credentials stored as secrets.

For OAuth platforms (LinkedIn, Google, Twitter/X, Meta), create developer apps and set the redirect URI to:
`https://YOUR_DOMAIN/api/connections/oauth/{platform}/callback`

Required secrets per platform:
- LinkedIn: LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
- Google/Gmail: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- Twitter/X: TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET
- Meta: META_APP_ID, META_APP_SECRET

For GoHighLevel, just paste your API key in the Connections tab (no OAuth needed).

## Development Commands

```bash
# Run codegen after OpenAPI spec changes
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes
pnpm --filter @workspace/db run push

# Build API server
pnpm --filter @workspace/api-server run build
```
