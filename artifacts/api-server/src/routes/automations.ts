import { Router, type IRouter } from "express";
import { db, automationsTable, automationRunsTable, agentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { runAutomationById } from "../lib/cron";
import { parseExpression } from "cron-parser";

function calcNextRunAt(cron: string | undefined): Date | null {
  if (!cron) return null;
  try {
    return parseExpression(cron, { tz: "America/New_York" }).next().toDate();
  } catch { return null; }
}

const router: IRouter = Router();

const parseId = (val: string): number | null => {
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
};

// List automations — scoped to session workspace
router.get("/", async (req, res) => {
  try {
    const ws = (req as any).sessionWorkspace as string;
    const rows = await db
      .select({
        id: automationsTable.id,
        name: automationsTable.name,
        businessTag: automationsTable.businessTag,
        agentId: automationsTable.agentId,
        agentName: agentsTable.name,
        agentIcon: agentsTable.icon,
        agentColor: agentsTable.color,
        scheduleCron: automationsTable.scheduleCron,
        promptTemplate: automationsTable.promptTemplate,
        lastRanAt: automationsTable.lastRanAt,
        nextRunAt: automationsTable.nextRunAt,
        isActive: automationsTable.isActive,
        status: automationsTable.status,
        lastOutput: automationsTable.lastOutput,
        createdAt: automationsTable.createdAt,
      })
      .from(automationsTable)
      .leftJoin(agentsTable, eq(automationsTable.agentId, agentsTable.id))
      .where(eq(automationsTable.businessTag, ws))
      .orderBy(automationsTable.createdAt);

    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch automations" });
  }
});

// Create automation — always tagged to session workspace
router.post("/", async (req, res) => {
  try {
    const ws = (req as any).sessionWorkspace as string;
    const { name, agentId, scheduleCron, promptTemplate, isActive } = req.body;
    const nextRunAt = calcNextRunAt(scheduleCron);
    const [automation] = await db
      .insert(automationsTable)
      .values({ name, agentId, scheduleCron, promptTemplate, isActive: isActive ?? true, status: "idle", nextRunAt, businessTag: ws })
      .returning();

    const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, agentId));
    res.status(201).json({ ...automation, agentName: agent?.name, agentIcon: agent?.icon, agentColor: agent?.color });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create automation" });
  }
});

// ── List / approve / discard runs — must be BEFORE /:id to avoid matching "runs" as an ID ──

// List automation runs — scoped to session workspace via automation join
router.get("/runs", async (req, res) => {
  try {
    const ws = (req as any).sessionWorkspace as string;
    const { automationId, status } = req.query;

    const rows = await db
      .select({
        id: automationRunsTable.id,
        automationId: automationRunsTable.automationId,
        automationName: automationsTable.name,
        agentName: agentsTable.name,
        agentIcon: agentsTable.icon,
        agentColor: agentsTable.color,
        output: automationRunsTable.output,
        status: automationRunsTable.status,
        ranAt: automationRunsTable.ranAt,
      })
      .from(automationRunsTable)
      .leftJoin(automationsTable, eq(automationRunsTable.automationId, automationsTable.id))
      .leftJoin(agentsTable, eq(automationsTable.agentId, agentsTable.id))
      .where(eq(automationsTable.businessTag, ws))
      .orderBy(automationRunsTable.ranAt);

    let filtered = rows;
    if (automationId) filtered = filtered.filter((r) => r.automationId === parseInt(automationId as string));
    if (status) filtered = filtered.filter((r) => r.status === status);

    res.json(filtered.reverse());
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch automation runs" });
  }
});

// Approve run
router.post("/runs/:id/approve", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid ID" });
    const [run] = await db.select().from(automationRunsTable).where(eq(automationRunsTable.id, id));
    if (!run) return res.status(404).json({ error: "Run not found" });

    const [updated] = await db
      .update(automationRunsTable)
      .set({ status: "success" })
      .where(eq(automationRunsTable.id, id))
      .returning();

    await db
      .update(automationsTable)
      .set({ lastOutput: run.output, status: "idle" })
      .where(eq(automationsTable.id, run.automationId));

    const [automation] = await db.select().from(automationsTable).where(eq(automationsTable.id, run.automationId));
    const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, automation?.agentId || 0));

    res.json({
      ...updated,
      automationName: automation?.name,
      agentName: agent?.name,
      agentIcon: agent?.icon,
      agentColor: agent?.color,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to approve run" });
  }
});

// Discard run
router.post("/runs/:id/discard", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid ID" });
    const [run] = await db.select().from(automationRunsTable).where(eq(automationRunsTable.id, id));
    if (!run) return res.status(404).json({ error: "Run not found" });

    const [updated] = await db
      .update(automationRunsTable)
      .set({ status: "failed" })
      .where(eq(automationRunsTable.id, id))
      .returning();

    await db
      .update(automationsTable)
      .set({ status: "idle" })
      .where(eq(automationsTable.id, run.automationId));

    const [automation] = await db.select().from(automationsTable).where(eq(automationsTable.id, run.automationId));
    const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, automation?.agentId || 0));

    res.json({
      ...updated,
      automationName: automation?.name,
      agentName: agent?.name,
      agentIcon: agent?.icon,
      agentColor: agent?.color,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to discard run" });
  }
});

// Get automation — scoped to session workspace
router.get("/:id", async (req, res) => {
  try {
    const ws = (req as any).sessionWorkspace as string;
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid ID" });
    const [row] = await db
      .select({
        id: automationsTable.id,
        name: automationsTable.name,
        businessTag: automationsTable.businessTag,
        agentId: automationsTable.agentId,
        agentName: agentsTable.name,
        agentIcon: agentsTable.icon,
        agentColor: agentsTable.color,
        scheduleCron: automationsTable.scheduleCron,
        promptTemplate: automationsTable.promptTemplate,
        lastRanAt: automationsTable.lastRanAt,
        nextRunAt: automationsTable.nextRunAt,
        isActive: automationsTable.isActive,
        status: automationsTable.status,
        lastOutput: automationsTable.lastOutput,
        createdAt: automationsTable.createdAt,
      })
      .from(automationsTable)
      .leftJoin(agentsTable, eq(automationsTable.agentId, agentsTable.id))
      .where(and(eq(automationsTable.id, id), eq(automationsTable.businessTag, ws)));

    if (!row) return res.status(404).json({ error: "Automation not found" });
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch automation" });
  }
});

// Update automation — scoped to session workspace
router.patch("/:id", async (req, res) => {
  try {
    const ws = (req as any).sessionWorkspace as string;
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid ID" });
    const { name, scheduleCron, promptTemplate, isActive } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (scheduleCron !== undefined) {
      updates.scheduleCron = scheduleCron;
      updates.nextRunAt = calcNextRunAt(scheduleCron);
    }
    if (promptTemplate !== undefined) updates.promptTemplate = promptTemplate;
    if (isActive !== undefined) updates.isActive = isActive;

    const [updated] = await db.update(automationsTable).set(updates)
      .where(and(eq(automationsTable.id, id), eq(automationsTable.businessTag, ws)))
      .returning();
    if (!updated) return res.status(404).json({ error: "Automation not found" });

    const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, updated.agentId));
    res.json({ ...updated, agentName: agent?.name, agentIcon: agent?.icon, agentColor: agent?.color });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update automation" });
  }
});

// Delete automation — scoped to session workspace
router.delete("/:id", async (req, res) => {
  try {
    const ws = (req as any).sessionWorkspace as string;
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid ID" });
    const [deleted] = await db.delete(automationsTable)
      .where(and(eq(automationsTable.id, id), eq(automationsTable.businessTag, ws)))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Automation not found" });
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete automation" });
  }
});

// Run automation now
router.post("/:id/run", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid ID" });
    const run = await runAutomationById(id);
    res.json(run);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to run automation" });
  }
});

export default router;
