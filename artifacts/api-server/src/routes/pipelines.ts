import { Router, type IRouter } from "express";
import { db, pipelinesTable, pipelineRunsTable, socialPostsTable, brainDocumentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { runPipelineById, pipelineEmitter } from "../lib/pipeline";
import { sendEmail } from "../lib/email";

function detectPipelineType(name: string): "social" | "blog" | "email" | "generic" {
  const n = name.toLowerCase();
  if (n.includes("social") || n.includes("post") || n.includes("soshi")) return "social";
  if (n.includes("blog") || n.includes("content") || n.includes("article")) return "blog";
  if (n.includes("email") || n.includes("newsletter") || n.includes("campaign")) return "email";
  return "generic";
}

const router: IRouter = Router();

const parseId = (val: string): number | null => {
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
};

// List all pipelines — scoped to session workspace
router.get("/", async (req, res) => {
  try {
    const ws = (req as any).sessionWorkspace as string;
    const rows = await db.select().from(pipelinesTable)
      .where(eq(pipelinesTable.businessTag, ws))
      .orderBy(pipelinesTable.createdAt);
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch pipelines" });
  }
});

// Create pipeline — always tagged to session workspace
router.post("/", async (req, res) => {
  try {
    const ws = (req as any).sessionWorkspace as string;
    const { name, description, steps } = req.body;
    if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: "name and steps[] required" });
    }
    const [pipeline] = await db.insert(pipelinesTable).values({ name, description, steps, businessTag: ws }).returning();
    res.status(201).json(pipeline);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create pipeline" });
  }
});

// Get pipeline — scoped to session workspace
router.get("/:id", async (req, res) => {
  try {
    const ws = (req as any).sessionWorkspace as string;
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid ID" });
    const [row] = await db.select().from(pipelinesTable)
      .where(and(eq(pipelinesTable.id, id), eq(pipelinesTable.businessTag, ws)));
    if (!row) return res.status(404).json({ error: "Pipeline not found" });
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch pipeline" });
  }
});

// Update pipeline — scoped to session workspace
router.patch("/:id", async (req, res) => {
  try {
    const ws = (req as any).sessionWorkspace as string;
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid ID" });
    const { name, description, steps, isActive } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (steps !== undefined) updates.steps = steps;
    if (isActive !== undefined) updates.isActive = isActive;
    const [updated] = await db.update(pipelinesTable).set(updates)
      .where(and(eq(pipelinesTable.id, id), eq(pipelinesTable.businessTag, ws)))
      .returning();
    if (!updated) return res.status(404).json({ error: "Pipeline not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update pipeline" });
  }
});

// Delete pipeline — scoped to session workspace
router.delete("/:id", async (req, res) => {
  try {
    const ws = (req as any).sessionWorkspace as string;
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid ID" });
    const [deleted] = await db.delete(pipelinesTable)
      .where(and(eq(pipelinesTable.id, id), eq(pipelinesTable.businessTag, ws)))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Pipeline not found" });
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete pipeline" });
  }
});

// ── Run pipeline (standard — returns when complete) ────────────────────────
router.post("/:id/run", async (req, res) => {
  try {
    const ws = (req as any).sessionWorkspace as string;
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid ID" });
    const { topic } = req.body ?? {};
    const run = await runPipelineById(id, { topic, businessTag: ws });
    res.json(run);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to run pipeline" });
  }
});

// ── SSE streaming run — real-time step-by-step progress ───────────────────
router.get("/:id/stream", async (req, res) => {
  const ws = (req as any).sessionWorkspace as string;
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const { topic } = req.query as { topic?: string };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendEvent = (type: string, data: object) => {
    try {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    } catch {
      // client disconnected
    }
  };

  sendEvent("connected", { pipelineId: id, topic });

  const onStepStart = (data: object) => sendEvent("step_start", data);
  const onStepDone = (data: object) => sendEvent("step_done", data);

  const onDone = (data: object) => {
    sendEvent("done", data);
    cleanup();
    res.end();
  };

  const onError = (data: object) => {
    sendEvent("error", data);
    cleanup();
    res.end();
  };

  const cleanup = () => {
    pipelineEmitter.off(`pipeline:${id}:step_start`, onStepStart);
    pipelineEmitter.off(`pipeline:${id}:step_done`, onStepDone);
    pipelineEmitter.off(`pipeline:${id}:done`, onDone);
    pipelineEmitter.off(`pipeline:${id}:error`, onError);
  };

  pipelineEmitter.on(`pipeline:${id}:step_start`, onStepStart);
  pipelineEmitter.on(`pipeline:${id}:step_done`, onStepDone);
  pipelineEmitter.once(`pipeline:${id}:done`, onDone);
  pipelineEmitter.once(`pipeline:${id}:error`, onError);

  req.on("close", () => {
    cleanup();
  });

  runPipelineById(id, { topic, businessTag: ws }).catch((err) => {
    sendEvent("error", { message: err.message ?? "Unknown error" });
    cleanup();
    res.end();
  });
});

// List pipeline runs — scoped to session workspace via pipeline join
router.get("/runs/list", async (req, res) => {
  try {
    const ws = (req as any).sessionWorkspace as string;
    const { status } = req.query;
    const rows = await db.select({
      id: pipelineRunsTable.id,
      pipelineId: pipelineRunsTable.pipelineId,
      status: pipelineRunsTable.status,
      stepsOutput: pipelineRunsTable.stepsOutput,
      finalOutput: pipelineRunsTable.finalOutput,
      ranAt: pipelineRunsTable.ranAt,
    })
      .from(pipelineRunsTable)
      .leftJoin(pipelinesTable, eq(pipelineRunsTable.pipelineId, pipelinesTable.id))
      .where(eq(pipelinesTable.businessTag, ws))
      .orderBy(pipelineRunsTable.ranAt);
    const filtered = status ? rows.filter(r => r.status === status) : rows;
    res.json(filtered.reverse());
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch pipeline runs" });
  }
});

// Approve pipeline run — smart side-effects based on pipeline type
router.post("/runs/:id/approve", async (req, res) => {
  try {
    const ws = (req as any).sessionWorkspace as string;
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: "Invalid ID" });
    const [run] = await db.select().from(pipelineRunsTable).where(eq(pipelineRunsTable.id, id));
    if (!run) return res.status(404).json({ error: "Run not found" });

    const [pipeline] = await db.select().from(pipelinesTable).where(eq(pipelinesTable.id, run.pipelineId));
    const pipelineType = detectPipelineType(pipeline?.name ?? "");
    const output = run.finalOutput ?? "";
    const sideEffects: string[] = [];

    if (pipelineType === "social" && output) {
      const platform = pipeline?.name?.toLowerCase().includes("linkedin") ? "linkedin"
        : pipeline?.name?.toLowerCase().includes("twitter") ? "twitter"
        : "meta";
      await db.insert(socialPostsTable).values({
        platform,
        content: output,
        businessTag: ws,
        topic: pipeline?.name,
        status: "pending_approval",
        aiGenerated: true,
        agentSlug: "pipeline",
      });
      sideEffects.push("social_post_created");
    } else if (pipelineType === "blog" && output) {
      await db.insert(brainDocumentsTable).values({
        title: pipeline?.name ?? "Pipeline Output",
        content: output,
        type: "text",
        category: "marketing",
        businessTag: ws,
      });
      sideEffects.push("brain_doc_created");
    } else if (pipelineType === "email" && output) {
      await sendEmail({
        subject: `📧 Pipeline Draft: ${pipeline?.name}`,
        html: `<div style="font-family: system-ui; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f0f14; color: #e5e7eb;">
          <h2 style="color: #a78bfa;">${pipeline?.name}</h2>
          <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6; background: #1a1a2e; padding: 16px; border-radius: 8px;">${output}</div>
        </div>`,
        text: output,
      });
      sideEffects.push("email_sent");
    }

    const [updated] = await db.update(pipelineRunsTable).set({ status: "success" }).where(eq(pipelineRunsTable.id, id)).returning();
    await db.update(pipelinesTable).set({ lastOutput: run.finalOutput, status: "idle" }).where(eq(pipelinesTable.id, run.pipelineId));

    res.json({ ...updated, sideEffects, pipelineType });
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
