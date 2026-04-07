import { Router, type IRouter } from "express";
import { db, kpisTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { businessTag } = req.query as Record<string, string>;
    let rows = await db.select().from(kpisTable).orderBy(kpisTable.createdAt);
    if (businessTag) rows = rows.filter(r => r.businessTag === businessTag);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, value, unit, period, businessTag } = req.body;
    if (!name || !businessTag) return res.status(400).json({ error: "name and businessTag required" });
    const [row] = await db.insert(kpisTable).values({
      name,
      value: value ?? 0,
      unit: unit ?? "",
      period: period ?? "",
      businessTag,
    }).returning();
    res.status(201).json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, value, unit, period } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (value !== undefined) updates.value = value;
    if (unit !== undefined) updates.unit = unit;
    if (period !== undefined) updates.period = period;
    const [row] = await db.update(kpisTable).set(updates).where(eq(kpisTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "KPI not found" });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(kpisTable).where(eq(kpisTable.id, id));
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
