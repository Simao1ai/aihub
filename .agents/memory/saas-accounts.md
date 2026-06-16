---
name: SaaS multi-tenant accounts
description: Architecture of users/orgs/memberships, email+password login flow with pre-auth token, seed default owner
---

## Tables added
- `users` — email, name, password_hash, email_verified_at
- `organizations` — name, slug, owner_id FK users
- `org_memberships` — user_id + org_id + role (owner|admin|member), UNIQUE(user_id, org_id)
- `sessions` — added `user_id` (nullable FK) and `type` ('workspace' | 'pre_auth') columns
- `workspaces` — added `org_id` (nullable FK organizations)

## Email login flow (2-step)
1. POST `/api/auth/login` with `{ email, password }` → validates user, creates 5-min `pre_auth` session → returns `{ preToken, user, workspaces }`
2. POST `/api/auth/workspace-select` with `{ preToken, workspaceSlug }` → validates pre-auth token, checks org membership, destroys pre-auth session, creates full `workspace` session → returns `{ token, ... }`

Frontend stores `preToken` + workspace list in component state (not Zustand); only the final workspace token goes to the store.

## Workspace login (legacy, unchanged)
POST `/api/auth/login` with `{ workspace, password }` → bcrypt compare against workspace.password → returns workspace session token directly.

## Seed default owner
On every server start, seed.ts creates `owner@synthdesk.ai` (password: env `OWNER_PASSWORD` or `aihub2024`) + org slug `default` + owner membership. After workspace seed, associates all `org_id IS NULL` workspaces with the default org.

**Why:** Existing workspaces have no user ownership; the default owner bridges legacy workspace-password login and new email login.

**How to apply:** Set `OWNER_EMAIL`, `OWNER_NAME`, `OWNER_PASSWORD` env vars before first deploy to customize the default owner. New SaaS users sign up via `/api/auth/signup` (creates their own org + General workspace).
