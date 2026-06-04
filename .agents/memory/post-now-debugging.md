---
name: post-now debugging
description: Root cause of post-now returning 500; how to read real errors from production
---

# post-now 500 Debugging

## What happened
`POST /api/social-posts/:id/post-now` returned 500 in production for weeks. The real error was hidden because:
1. pino-http logs "failed with status code 500" (synthetic error, not the thrown message)
2. The catch block used `logger` which was never imported in social-posts.ts — causing `ReferenceError: logger is not defined` which itself caused a 500

## The fix
- Added `import { logger } from "../lib/logger"` to social-posts.ts
- Changed the catch block to return `res.json({ success: false, errorMessage: err.message })` (200) instead of `res.status(500).json(...)`
- Wrapped the DB update at end of `publishPost` in its own try-catch so DB errors never cause 500

## How to find real errors in production
Use `fetch_deployment_logs` with `message_context` on the actual error line. Look for `[Error]- ReferenceError` or `[Error]- TypeError` lines that appear right after the 500 log.

## publishPost structure
- DB queries at top (outside try-catch) — can throw if DB is unreachable
- Platform API call inside try-catch — returns `{ success: false, errorMessage }` on failure  
- DB update at bottom (now wrapped in try-catch)
- Returns `{ success, post, platformPostId, publishedUrl, errorMessage }`
