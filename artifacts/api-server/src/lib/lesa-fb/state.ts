/**
 * Postgres-backed state for the LESA FB agent.
 * Uses DATABASE_URL (already available in the API server env).
 * Table is created on first use — no separate migration needed.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export interface TokenRecord {
  longLivedUserToken: string;
  userTokenRefreshedAt: string;
  pageToken?: string;
  pageTokenDerivedAt?: string;
}

export interface PostRecord {
  at: string;
  theme: string;
  postId: string;
  text: string;
}

export interface AgentState {
  enabled: boolean;
  postCount: number;
  history: PostRecord[];
  lastError?: string;
  tokens?: TokenRecord;
}

const DEFAULT_STATE: AgentState = { enabled: true, postCount: 0, history: [] };

let initialized = false;

async function ensureTable(): Promise<void> {
  if (initialized) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS lesa_fb_agent_state (
      id         INTEGER PRIMARY KEY DEFAULT 1,
      enabled    BOOLEAN NOT NULL DEFAULT TRUE,
      post_count INTEGER NOT NULL DEFAULT 0,
      history    JSONB   NOT NULL DEFAULT '[]'::jsonb,
      last_error TEXT,
      tokens     JSONB,
      CHECK (id = 1)
    )
  `);
  await db.execute(sql`
    ALTER TABLE lesa_fb_agent_state ADD COLUMN IF NOT EXISTS tokens JSONB
  `);
  await db.execute(sql`
    INSERT INTO lesa_fb_agent_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING
  `);
  initialized = true;
}

export async function loadState(): Promise<AgentState> {
  await ensureTable();
  const rows = await db.execute(sql`
    SELECT enabled, post_count, history, last_error, tokens
    FROM lesa_fb_agent_state WHERE id = 1
  `);
  if (!rows.rows || rows.rows.length === 0) return { ...DEFAULT_STATE };
  const r = rows.rows[0] as any;
  return {
    enabled: r.enabled,
    postCount: r.post_count,
    history: (r.history as PostRecord[]) ?? [],
    lastError: r.last_error ?? undefined,
    tokens: (r.tokens as TokenRecord | null) ?? undefined,
  };
}

export async function saveState(state: AgentState): Promise<void> {
  await ensureTable();
  await db.execute(sql`
    UPDATE lesa_fb_agent_state SET
      enabled    = ${state.enabled},
      post_count = ${state.postCount},
      history    = ${JSON.stringify(state.history)}::jsonb,
      last_error = ${state.lastError ?? null},
      tokens     = ${state.tokens ? JSON.stringify(state.tokens) : null}::jsonb
    WHERE id = 1
  `);
}
