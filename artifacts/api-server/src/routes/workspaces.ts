import { Router, type IRouter } from "express";
import { db, workspacesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

const parseId = (val: string): number | null => {
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
};

// ── Auth middleware — any valid workspace password ────────────────────────────
async function requireAuth(req: any, res: any, next: any) {
  const token =
    (req.headers.authorization as string)?.replace("Bearer ", "") ||
    (req.headers["x-admin-password"] as string);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const all = await db.select().from(workspacesTable);
    const valid = all.some((w) => w.password === token);
    if (!valid) return res.status(401).json({ error: "Unauthorized" });
    next();
  } catch {
    return res.status(500).json({ error: "Auth check failed" });
  }
}

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
router.get("/all", requireAuth, async (_req, res) => {
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

// ── POST /api/workspaces — admin: create workspace ────────────────────────────
router.post("/", requireAuth, async (req, res) => {
  const { name, slug, description = "", emoji = "⚡", color = "#6366f1", password = "aihub2024", sortOrder = 0 } = req.body as any;

  if (!name || typeof name !== "string") return res.status(400).json({ error: "name is required" });
  if (!slug || typeof slug !== "string") return res.status(400).json({ error: "slug is required" });
  if (!/^[a-z0-9_]+$/.test(slug)) return res.status(400).json({ error: "slug must be lowercase letters, numbers, and underscores only" });
  if (!password || typeof password !== "string" || password.length < 4) return res.status(400).json({ error: "password must be at least 4 characters" });

  try {
    const existing = await db.select().from(workspacesTable).where(eq(workspacesTable.slug, slug));
    if (existing.length > 0) return res.status(409).json({ error: "A workspace with that slug already exists" });

    const [ws] = await db
      .insert(workspacesTable)
      .values({ name, slug, description, emoji, color, password, sortOrder, isActive: true })
      .returning();

    const { password: _p, ...safe } = ws;
    return res.status(201).json(safe);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/workspaces/:id — admin: update workspace ────────────────────────
router.put("/:id", requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const { name, description, emoji, color, password, sortOrder, isActive } = req.body as any;
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (emoji !== undefined) updates.emoji = emoji;
  if (color !== undefined) updates.color = color;
  if (password !== undefined && password.length >= 4) updates.password = password;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  if (isActive !== undefined) updates.isActive = isActive;

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
router.delete("/:id", requireAuth, async (req, res) => {
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
