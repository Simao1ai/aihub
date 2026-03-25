import { Router, type IRouter } from "express";
import { db, agentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const agents = await db.select().from(agentsTable).orderBy(agentsTable.id);
    res.json(agents);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch agents" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, id));
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json(agent);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch agent" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { systemPrompt, isActive } = req.body;
    const updates: Record<string, unknown> = {};
    if (systemPrompt !== undefined) updates.systemPrompt = systemPrompt;
    if (isActive !== undefined) updates.isActive = isActive;
    const [updated] = await db.update(agentsTable).set(updates).where(eq(agentsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Agent not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update agent" });
  }
});

export default router;
