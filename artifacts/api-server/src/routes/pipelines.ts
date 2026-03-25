import { Router, type IRouter } from "express";
import { db, pipelinesTable, pipelineRunsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { runPipelineById } from "../lib/pipeline";

const router: IRouter = Router();

const parseId = (val: string): number | null => {
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
};

// List all pipelines
router.get("/", async (req, res) => {
  try {
    const rows = await db.select().from(pipelinesTable).orderBy(pipelinesTable.createdAt);
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch pipelines" });
  }
});

// Create pipeline
router.post("/", async (req, res) => {
  try {
    const { name, description, steps } = req.body;
    if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: "name and steps[] required" });
    }
    const [pipeline] = await db.insert(pipelinesTable).values({ name, description, steps }).returning();
    res.status(201).json(pipeline);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create pipeline" });
  }
});

// Get pipeline
router.get("/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid ID" });
    const [row] = await db.select().from(pipelinesTable).where(eq(pipelinesTable.id, id));
    if (!row) return res.status(404).json({ error: "Pipeline not found" });
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch pipeline" });
  }
});

// Update pipeline
router.patch("/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid ID" });
    const { name, description, steps, isActive } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (steps !== undefined) updates.steps = steps;
    if (isActive !== undefined) updates.isActive = isActive;
    const [updated] = await db.update(pipelinesTable).set(updates).where(eq(pipelinesTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Pipeline not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update pipeline" });
  }
});

// Delete pipeline
router.delete("/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid ID" });
    const [deleted] = await db.delete(pipelinesTable).where(eq(pipelinesTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Pipeline not found" });
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete pipeline" });
  }
});

// Run pipeline
router.post("/:id/run", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid ID" });
    const run = await runPipelineById(id);
    res.json(run);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to run pipeline" });
  }
});

// List pipeline runs
router.get("/runs/list", async (req, res) => {
  try {
    const { status } = req.query;
    const rows = await db.select().from(pipelineRunsTable).orderBy(pipelineRunsTable.ranAt);
    const filtered = status ? rows.filter(r => r.status === status) : rows;
    res.json(filtered.reverse());
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch pipeline runs" });
  }
});

// Approve pipeline run
router.post("/runs/:id/approve", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid ID" });
    const [run] = await db.select().from(pipelineRunsTable).where(eq(pipelineRunsTable.id, id));
    if (!run) return res.status(404).json({ error: "Run not found" });

    const [updated] = await db.update(pipelineRunsTable).set({ status: "success" }).where(eq(pipelineRunsTable.id, id)).returning();

    await db.update(pipelinesTable).set({
      lastOutput: run.finalOutput,
      status: "idle",
    }).where(eq(pipelinesTable.id, run.pipelineId));

    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to approve run" });
  }
});

// Discard pipeline run
router.post("/runs/:id/discard", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid ID" });
    const [run] = await db.select().from(pipelineRunsTable).where(eq(pipelineRunsTable.id, id));
    if (!run) return res.status(404).json({ error: "Run not found" });

    const [updated] = await db.update(pipelineRunsTable).set({ status: "failed" }).where(eq(pipelineRunsTable.id, id)).returning();
    await db.update(pipelinesTable).set({ status: "idle" }).where(eq(pipelinesTable.id, run.pipelineId));

    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to discard run" });
  }
});

export default router;
