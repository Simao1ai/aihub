import { Router, type IRouter } from "express";
import { db, workspacesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

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

// POST /api/auth/login — authenticate with workspace slug + password
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

    if (password !== ws.password) {
      return res.status(401).json({ success: false, error: "Incorrect password" });
    }

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
  const password = req.query.password as string || req.headers.authorization?.replace("Bearer ", "") || "";
  try {
    const rows = await db.select().from(workspacesTable);
    const valid = rows.some(w => w.password === password);
    if (valid) return res.json({ success: true });
    return res.status(401).json({ success: false, error: "Invalid password" });
  } catch {
    const fallback = process.env.APP_PASSWORD || "aihub2024";
    if (password === fallback) return res.json({ success: true });
    return res.status(401).json({ success: false, error: "Invalid password" });
  }
});

export default router;
