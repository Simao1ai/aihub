---
name: AI token & cost tracking
description: How token usage is tracked across all Claude calls in this project
---

## Table

`ai_usage` in `lib/db/src/schema/ai-usage.ts`:
- workspace, agent_slug, model, input_tokens, output_tokens, estimated_cost_usd, created_at

## Utility function

`artifacts/api-server/src/lib/usage.ts` exports `recordUsage(params)`.
- Called fire-and-forget (`.catch(() => {})`) — never blocking
- Pricing baked in: Claude Sonnet 4 = $3/MTok input, $15/MTok output

## Where it's called

Every `anthropic.messages.create` response carries `response.usage` with `{ input_tokens, output_tokens }`:
1. `anthropic.ts` main chat loop (each round)
2. `anthropic.ts` safety final-response round
3. `anthropic.ts` `autoRespondAfterHandoff` loop (each round)
4. `pipeline.ts` per step (after retryWithBackoff resolves)

## API endpoint

GET `/api/usage` — returns 30-day totals + per-agent breakdown for the session workspace.
Dashboard widget shows it when `callCount > 0`.

**Why:** Need to track LLM costs across agents and pipelines without blocking the response path.
**How to apply:** Import `recordUsage` from `../lib/usage` and call after every `messages.create`, passing `response.usage`.
