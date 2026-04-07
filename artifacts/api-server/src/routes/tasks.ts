import { Router, type IRouter } from "express";
import { db, tasksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { businessTag, status } = req.query as Record<string, string>;
    let rows = await db.select().from(tasksTable).orderBy(tasksTable.createdAt);
    if (businessTag) rows = rows.filter(r => r.businessTag === businessTag);
    if (status) rows = rows.filter(r => r.status === status);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, description, status, priority, businessTag, dueDate } = req.body;
    if (!title || !businessTag) return res.status(400).json({ error: "title and businessTag required" });
    const [row] = await db.insert(tasksTable).values({
      title,
      description: description ?? "",
      status: status ?? "todo",
      priority: priority ?? "medium",
      businessTag,
      dueDate: dueDate ?? null,
    }).returning();
    res.status(201).json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, status, priority, dueDate } = req.body;
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    const [row] = await db.update(tasksTable).set(updates).where(eq(tasksTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Task not found" });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(tasksTable).where(eq(tasksTable.id, id));
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
