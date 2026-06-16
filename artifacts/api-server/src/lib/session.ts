import crypto from "node:crypto";
import { db, sessionsTable } from "@workspace/db";
import { eq, lt } from "drizzle-orm";
import { logger } from "./logger";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Purge expired sessions every hour
setInterval(async () => {
  try {
    await db.delete(sessionsTable).where(lt(sessionsTable.expiresAt, new Date()));
    logger.debug("Expired sessions purged");
  } catch (e) {
    logger.warn({ err: e }, "Session cleanup failed");
  }
}, 60 * 60 * 1000).unref();

export async function createSession(workspace: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessionsTable).values({ token, workspace, expiresAt });
  return token;
}

export async function validateSession(token: string): Promise<string | null> {
  if (!token) return null;
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token));
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    return null;
  }
  await db
    .update(sessionsTable)
    .set({ expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
    .where(eq(sessionsTable.token, token));
  return session.workspace;
}

export async function destroySession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
}
