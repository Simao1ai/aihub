import { Router, type IRouter } from "express";
import { db, workspacesTable, tasksTable, contactsTable, socialPostsTable, kpisTable } from "@workspace/db";
import { eq, and, ne, lt, asc } from "drizzle-orm";

const router: IRouter = Router();

// All admin routes require "general" workspace session
router.use((req: any, res, next) => {
  if (req.sessionWorkspace !== "general") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
});

// ── GET /api/admin/cross-workspace — aggregate data across all workspaces ────
// Returns tasks, contacts, social stats per workspace in a single call
router.get("/cross-workspace", async (_req, res) => {
  try {
    const workspaces = await db
      .select()
      .from(workspacesTable)
      .where(and(eq(workspacesTable.isActive, true), ne(workspacesTable.slug, "general")))
      .orderBy(asc(workspacesTable.sortOrder));

    const today = new Date().toISOString().split("T")[0];

    const results = await Promise.all(
      workspaces.map(async (ws) => {
        const [tasks, contacts, kpis, socialPosts] = await Promise.all([
          db.select({ status: tasksTable.status, dueDate: tasksTable.dueDate })
            .from(tasksTable)
            .where(eq(tasksTable.businessTag, ws.slug)),
          db.select({ id: contactsTable.id })
            .from(contactsTable)
            .where(eq(contactsTable.businessTag, ws.slug)),
          db.select({ name: kpisTable.name, value: kpisTable.value, unit: kpisTable.unit })
            .from(kpisTable)
            .where(eq(kpisTable.businessTag, ws.slug)),
          db.select({ status: socialPostsTable.status })
            .from(socialPostsTable)
            .where(eq(socialPostsTable.businessTag, ws.slug)),
        ]);

        const activeTasks = tasks.filter(t => t.status !== "done");
        const overdueTasks = activeTasks.filter(t => t.dueDate && t.dueDate < today);
        const pendingSocial = socialPosts.filter(p => p.status === "pending_approval");
        const postedSocial = socialPosts.filter(p => p.status === "posted");

        return {
          slug: ws.slug,
          name: ws.name,
          emoji: ws.emoji,
          color: ws.color,
          description: ws.description,
          taskCount: activeTasks.length,
          overdueCount: overdueTasks.length,
          contactCount: contacts.length,
          pendingSocialCount: pendingSocial.length,
          postedSocialCount: postedSocial.length,
          kpis: kpis.slice(0, 3),
        };
      })
    );

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
