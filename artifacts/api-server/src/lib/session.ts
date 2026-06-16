import crypto from "node:crypto";
import { db, sessionsTable } from "@workspace/db";
import { eq, lt, and } from "drizzle-orm";
import { logger } from "./logger";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const PRE_AUTH_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Purge expired sessions every hour
setInterval(async () => {
  try {
    await db.delete(sessionsTable).where(lt(sessionsTable.expiresAt, new Date()));
    logger.debug("Expired sessions purged");
  } catch (e) {
    logger.warn({ err: e }, "Session cleanup failed");
  }
}, 60 * 60 * 1000).unref();

export async function createSession(workspace: string, userId?: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessionsTable).values({
    token,
    workspace,
    type: "workspace",
    userId: userId ?? null,
    expiresAt,
  });
  return token;
}

export async function createPreAuthSession(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + PRE_AUTH_TTL_MS);
  await db.insert(sessionsTable).values({
    token,
    workspace: null,
    type: "pre_auth",
    userId,
    expiresAt,
  });
  return token;
}

export async function validateSession(token: string): Promise<string | null> {
  if (!token) return null;
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token));
  if (!session || session.type !== "workspace" || !session.workspace) return null;
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

export async function validatePreAuthSession(token: string): Promise<{ userId: number } | null> {
  if (!token) return null;
  const [session] = await db.select().from(sessionsTable).where(
    and(eq(sessionsTable.token, token), eq(sessionsTable.type, "pre_auth"))
  );
  if (!session || !session.userId) return null;
  if (session.expiresAt < new Date()) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    return null;
  }
  return { userId: session.userId };
}

export async function destroySession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
}
