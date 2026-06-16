import { Router, type IRouter } from "express";
import { db, workspacesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { createSession, destroySession, validateSession } from "../lib/session";

const router: IRouter = Router();

// Rate-limit login attempts: max 10 per minute per IP
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many login attempts. Please wait a minute." },
});

// GET /api/auth/workspaces — public: list active workspaces for login page
router.get("/workspaces", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.isActive, true))
      .orderBy(asc(workspacesTable.sortOrder), asc(workspacesTable.createdAt));

    res.json(rows.map(w => ({
      id: w.id,
      slug: w.slug,
      name: w.name,
      description: w.description,
      emoji: w.emoji,
      color: w.color,
      businessTag: w.slug,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login — authenticate with workspace slug + password, return session token
router.post("/login", loginLimiter, async (req, res) => {
  const { workspace, password } = req.body as { workspace?: string; password?: string };

  if (!workspace || !password) {
    return res.status(400).json({ success: false, error: "workspace and password are required" });
  }

  try {
    const [ws] = await db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.slug, workspace));

    if (!ws || !ws.isActive) {
      return res.status(400).json({ success: false, error: "Unknown workspace" });
    }

    // Require bcrypt hash — reject any plaintext passwords still in DB
    if (!ws.password.startsWith("$2a$") && !ws.password.startsWith("$2b$")) {
      return res.status(401).json({ success: false, error: "Password not configured. Contact the administrator." });
    }

    const passwordValid = await bcrypt.compare(password, ws.password);
    if (!passwordValid) {
      return res.status(401).json({ success: false, error: "Incorrect password" });
    }

    const token = await createSession(ws.slug);

    return res.json({
      success: true,
      token,
      workspace: ws.slug,
      displayName: ws.name,
      businessTag: ws.slug,
      color: ws.color,
      emoji: ws.emoji,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/logout — invalidate session token
router.post("/logout", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) await destroySession(token);
  res.json({ success: true });
});

// GET /api/auth/me — validate current token, return workspace info
router.get("/me", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ success: false, error: "No token" });

  const workspace = await validateSession(token);
  if (!workspace) return res.status(401).json({ success: false, error: "Invalid or expired session" });

  try {
    const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.slug, workspace));
    if (!ws) return res.status(401).json({ success: false, error: "Workspace not found" });
    return res.json({
      success: true,
      workspace: ws.slug,
      displayName: ws.name,
      businessTag: ws.slug,
      color: ws.color,
      emoji: ws.emoji,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/verify — validate session token (token-only, no plaintext fallback)
router.get("/verify", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "") || (req.query.token as string) || "";
  if (!token) return res.status(401).json({ success: false, error: "No token" });

  const workspace = await validateSession(token);
  if (!workspace) return res.status(401).json({ success: false, error: "Invalid or expired session" });

  return res.json({ success: true, workspace });
});

export default router;
