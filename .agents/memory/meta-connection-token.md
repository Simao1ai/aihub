---
name: Meta connection token flow
description: How Meta/Facebook tokens are stored and why they expire; the correct server-side exchange approach
---

# Meta Connection Token Flow

## The rule
Meta connections must call `POST /api/connections/meta/pages` (server-side) instead of calling `me/accounts` directly from the browser. The server exchanges the short-lived Graph Explorer token for a long-lived one using `META_APP_ID` + `META_APP_SECRET`.

**Why:** Short-lived user tokens expire in 1–2 hours. Page tokens from short-lived user tokens also expire. Page tokens from a long-lived (60-day) user token are **permanent** — they never expire. This eliminates the need for users to reconnect every 60 days.

**How to apply:** `/api/connections/meta/pages` does the exchange and returns `{ longLivedToken, pages }`. The frontend replaces the token field with `longLivedToken` and saves `pageAccessToken` from the page in metadata. `publishPost` checks `meta.pageAccessToken` first — if present, skips `me/accounts` call entirely and posts directly.

## Required permissions
Token must have: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`

## Connection metadata shape
```json
{ "pageId": "...", "pageName": "...", "pageAccessToken": "..." }
```

## Secrets used
`META_APP_ID` and `META_APP_SECRET` are available as Replit secrets. The token exchange call: `GET https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={short_token}`
