---
name: Security architecture
description: How auth, sessions, secrets encryption, and route scoping work across the API server
---

## Session system
- Postgres-backed: `sessionsTable` (token TEXT PK, workspace TEXT, expires_at TIMESTAMPTZ)
- 7-day rolling TTL; cleanup runs every hour via setInterval
- `createSession(workspace)` → random 32-byte hex token stored in DB
- `validateSession(token)` → returns workspace slug or null; rolls expiry on access
- `destroySession(token)` → used on logout
- All functions in `artifacts/api-server/src/lib/session.ts`

## Auth middleware (app.ts)
- All `/api/*` except `PUBLIC_PREFIXES` (`/api/auth/`, `/api/health`, `/api/connections/oauth/`) require `Authorization: Bearer <token>`
- On success: sets `(req as any).sessionWorkspace = workspace`
- Frontend: App.tsx global `window.fetch` interceptor auto-adds Bearer header to all `/api/` calls

## Route scoping
- Every protected route uses `(req as any).sessionWorkspace` — ignores any `?businessTag=` query param
- Exception: `/api/admin/cross-workspace` is only accessible when sessionWorkspace === "general" and returns aggregate data across all workspaces
- `workspaces.ts`: PUT /:id — allows "general" to update any workspace; others can only update their own

## Secret encryption
- `artifacts/api-server/src/lib/crypto.ts` — AES-256-GCM `encryptSecret` / `decryptSecret`
- Key: `ENCRYPTION_KEY` env var (64 hex chars = 32 bytes); falls back to plaintext with WARN if not set
- Encrypted values prefixed with `enc:` so decryptSecret gracefully handles legacy plaintext
- Applied in `connections.ts`: apiKey encrypted on POST (manual) and meta/seed; decrypted before test/API calls

## Password policy
- Passwords stored as bcrypt hashes only (`$2a$` / `$2b$` prefix checked in login)
- Seed: removes `|| "aihub2024"` fallback; env vars (`GENERAL_PASSWORD`, etc.) or random on first insert; password NOT updated on conflict (preserves existing hashes)
- Login: rate-limited to 10/min per IP via express-rate-limit
- Workspace create: bcrypt hash applied before INSERT

**Why:** Previous system stored and compared plaintext passwords; session tokens were in-memory Map (lost on restart).
