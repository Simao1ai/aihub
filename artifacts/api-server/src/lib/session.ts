import crypto from "node:crypto";
import { logger } from "./logger";

// In-memory session store: token → { workspace, expires }
const sessions = new Map<string, { workspace: string; expires: number }>();
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Clean up expired sessions every hour
setInterval(() => {
  const now = Date.now();
  let removed = 0;
  for (const [token, session] of sessions.entries()) {
    if (session.expires < now) {
      sessions.delete(token);
      removed++;
    }
  }
  if (removed > 0) logger.info({ removed }, "Cleaned up expired sessions");
}, 60 * 60 * 1000);

export function createSession(workspace: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { workspace, expires: Date.now() + SESSION_TTL_MS });
  return token;
}

export function validateSession(token: string): string | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expires < Date.now()) {
    sessions.delete(token);
    return null;
  }
  // Refresh TTL on use
  session.expires = Date.now() + SESSION_TTL_MS;
  return session.workspace;
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

export function getSessionCount(): number {
  return sessions.size;
}
