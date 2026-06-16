import { Router, type IRouter } from "express";
import { db, workspacesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

const parseId = (val: string): number | null => {
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
};

// ── GET /api/workspaces — public: list active workspaces (passwords omitted) ──
router.get("/", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.isActive, true))
      .orderBy(asc(workspacesTable.sortOrder), asc(workspacesTable.createdAt));

    res.json(rows.map(({ password: _p, ...rest }) => rest));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/workspaces/all — admin: all workspaces ───────────────────────────
// Requires "general" workspace session
router.get("/all", async (req: any, res) => {
  const ws = req.sessionWorkspace as string;
  if (ws !== "general") return res.status(403).json({ error: "Admin access required" });
  try {
    const rows = await db
      .select()
      .from(workspacesTable)
      .orderBy(asc(workspacesTable.sortOrder), asc(workspacesTable.createdAt));
    res.json(rows.map(({ password: _p, ...rest }) => rest));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/workspaces — admin: create workspace ───────────────────────────
router.post("/", async (req: any, res) => {
  const ws = req.sessionWorkspace as string;
  if (ws !== "general") return res.status(403).json({ error: "Admin access required" });

  const { name, slug, description = "", emoji = "⚡", color = "#6366f1", password, sortOrder = 0 } = req.body as any;
  if (!name || typeof name !== "string") return res.status(400).json({ error: "name is required" });
  if (!slug || typeof slug !== "string") return res.status(400).json({ error: "slug is required" });
  if (!/^[a-z0-9_]+$/.test(slug)) return res.status(400).json({ error: "slug must be lowercase letters, numbers, and underscores only" });
  if (!password || typeof password !== "string" || password.length < 8) return res.status(400).json({ error: "password must be at least 8 characters" });

  try {
    const existing = await db.select().from(workspacesTable).where(eq(workspacesTable.slug, slug));
    if (existing.length > 0) return res.status(409).json({ error: "A workspace with that slug already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const [ws_row] = await db
      .insert(workspacesTable)
      .values({ name, slug, description, emoji, color, password: hashedPassword, sortOrder, isActive: true })
      .returning();

    const { password: _p, ...safe } = ws_row;
    return res.status(201).json(safe);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/workspaces/:id — update workspace ────────────────────────────────
// "general" can update any workspace; other sessions can only update their own
router.put("/:id", async (req: any, res) => {
  const sessionWs = req.sessionWorkspace as string;
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const { name, description, emoji, color, password, sortOrder, isActive, externalKpiUrl, businessContext } = req.body as any;

  // Non-admin: only allow updating their own workspace
  if (sessionWs !== "general") {
    const [existing] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, id));
    if (!existing || existing.slug !== sessionWs) {
      return res.status(403).json({ error: "You can only update your own workspace" });
    }
  }

  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (emoji !== undefined) updates.emoji = emoji;
  if (color !== undefined) updates.color = color;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  if (isActive !== undefined && sessionWs === "general") updates.isActive = isActive;
  if (externalKpiUrl !== undefined) updates.externalKpiUrl = externalKpiUrl || null;
  if (businessContext !== undefined) updates.businessContext = businessContext;
  // Only hash+update password if provided and admin
  if (password !== undefined && password.length >= 8) {
    updates.password = await bcrypt.hash(password, 10);
  }

  try {
    const [updated] = await db
      .update(workspacesTable)
      .set(updates)
      .where(eq(workspacesTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Workspace not found" });
    const { password: _p, ...safe } = updated;
    return res.json(safe);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/workspaces/:id — admin: soft-delete (deactivate) ─────────────
router.delete("/:id", async (req: any, res) => {
  const ws = req.sessionWorkspace as string;
  if (ws !== "general") return res.status(403).json({ error: "Admin access required" });

  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  try {
    const [updated] = await db
      .update(workspacesTable)
      .set({ isActive: false })
      .where(eq(workspacesTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Workspace not found" });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
