/**
 * Automatic Facebook token management for LESA FB agent.
 * Exchanges short-lived user tokens for long-lived ones (~60 days),
 * persists them in state, and auto-refreshes before expiry.
 * Only needed for fully-autonomous mode — soft gate posts use the
 * existing SynthDesk connection token via the social-posts approve flow.
 */
import { getLongLivedUserToken, getPageToken, inspectToken } from "./graphClient";
import { loadState, saveState, AgentState, TokenRecord } from "./state";

const REFRESH_WHEN_WITHIN_DAYS = 10;
const SOFT_REFRESH_AGE_DAYS = 45;
const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / DAY_MS;
}

async function userTokenNeedsRefresh(rec: TokenRecord): Promise<boolean> {
  try {
    const info = await inspectToken(rec.longLivedUserToken);
    if (!info.isValid) return true;
    if (info.expiresAt && info.expiresAt > 0) {
      const msUntilExpiry = info.expiresAt * 1000 - Date.now();
      return msUntilExpiry < REFRESH_WHEN_WITHIN_DAYS * DAY_MS;
    }
    return false;
  } catch {
    return daysSince(rec.userTokenRefreshedAt) >= SOFT_REFRESH_AGE_DAYS;
  }
}

async function bootstrapFromEnv(): Promise<TokenRecord> {
  const seed = process.env.FB_USER_TOKEN;
  if (!seed)
    throw new Error(
      "No stored tokens and FB_USER_TOKEN is not set. Add it as a Secret (one-time setup)."
    );
  const longLived = await getLongLivedUserToken(seed);
  const pageToken = await getPageToken(longLived);
  const now = new Date().toISOString();
  return { longLivedUserToken: longLived, userTokenRefreshedAt: now, pageToken, pageTokenDerivedAt: now };
}

export async function getValidPageToken(): Promise<string> {
  if (process.env.FB_PAGE_TOKEN) return process.env.FB_PAGE_TOKEN;

  const state: AgentState = await loadState();
  let changed = false;

  if (!state.tokens) {
    state.tokens = await bootstrapFromEnv();
    changed = true;
  }

  if (await userTokenNeedsRefresh(state.tokens)) {
    try {
      const refreshed = await getLongLivedUserToken(state.tokens.longLivedUserToken);
      state.tokens.longLivedUserToken = refreshed;
      state.tokens.userTokenRefreshedAt = new Date().toISOString();
      state.tokens.pageToken = undefined;
      changed = true;
    } catch (err) {
      try {
        state.tokens = await bootstrapFromEnv();
        changed = true;
      } catch {
        throw new Error(
          `Token refresh failed and re-seed also failed: ${String(err)}. ` +
          `Re-mint FB_USER_TOKEN in Graph Explorer and update the Secret.`
        );
      }
    }
  }

  if (!state.tokens.pageToken) {
    state.tokens.pageToken = await getPageToken(state.tokens.longLivedUserToken);
    state.tokens.pageTokenDerivedAt = new Date().toISOString();
    changed = true;
  }

  if (changed) await saveState(state);
  return state.tokens.pageToken!;
}

export async function tokenHealth(): Promise<{
  hasStoredToken: boolean;
  userTokenRefreshedAt: string | null;
  userTokenValid: boolean | null;
  userTokenExpiresAt: number | null;
  pageTokenDerivedAt: string | null;
  envTokenPresent: boolean;
}> {
  const state = await loadState();
  const envTokenPresent = !!process.env.FB_USER_TOKEN || !!process.env.FB_PAGE_TOKEN;

  if (!state.tokens) {
    return {
      hasStoredToken: false,
      userTokenRefreshedAt: null,
      userTokenValid: null,
      userTokenExpiresAt: null,
      pageTokenDerivedAt: null,
      envTokenPresent,
    };
  }

  let valid: boolean | null = null;
  let expiresAt: number | null = null;
  try {
    const info = await inspectToken(state.tokens.longLivedUserToken);
    valid = info.isValid;
    expiresAt = info.expiresAt;
  } catch { /* leave null if inspection fails */ }

  return {
    hasStoredToken: true,
    userTokenRefreshedAt: state.tokens.userTokenRefreshedAt,
    userTokenValid: valid,
    userTokenExpiresAt: expiresAt,
    pageTokenDerivedAt: state.tokens.pageTokenDerivedAt ?? null,
    envTokenPresent,
  };
}
