import { Router, type IRouter } from "express";
import { db, workspacesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createSession, destroySession, validateSession } from "../lib/session";

const router: IRouter = Router();

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
router.post("/login", async (req, res) => {
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

    // Support both bcrypt hashes (new) and plaintext (migration period)
    let passwordValid = false;
    if (ws.password.startsWith("$2a$") || ws.password.startsWith("$2b$")) {
      passwordValid = await bcrypt.compare(password, ws.password);
    } else {
      // Plaintext comparison (legacy, before bcrypt migration)
      passwordValid = password === ws.password;
    }

    if (!passwordValid) {
      return res.status(401).json({ success: false, error: "Incorrect password" });
    }

    const token = createSession(ws.slug);

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
router.post("/logout", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) destroySession(token);
  res.json({ success: true });
});

// GET /api/auth/me — validate current token, return workspace info
router.get("/me", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ success: false, error: "No token" });

  const workspace = validateSession(token);
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

// Legacy GET /api/auth/verify — backward compat
router.get("/verify", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "") || (req.query.password as string) || "";
  if (!token) return res.status(401).json({ success: false, error: "No token" });

  // First try as a session token
  const workspace = validateSession(token);
  if (workspace) return res.json({ success: true, workspace });

  // Legacy: compare as plaintext or bcrypt password
  try {
    const rows = await db.select().from(workspacesTable);
    for (const w of rows) {
      let valid = false;
      if (w.password.startsWith("$2a$") || w.password.startsWith("$2b$")) {
        valid = await bcrypt.compare(token, w.password);
      } else {
        valid = token === w.password;
      }
      if (valid) return res.json({ success: true });
    }
    return res.status(401).json({ success: false, error: "Invalid token" });
  } catch {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
});

export default router;
