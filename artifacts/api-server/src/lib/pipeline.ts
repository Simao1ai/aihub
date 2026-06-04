import { db, pipelinesTable, pipelineRunsTable, agentsTable, workspacesTable } from "@workspace/db";
import type { PipelineStep, StepOutput } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { logger } from "./logger";
import { EventEmitter } from "events";

export const pipelineEmitter = new EventEmitter();
pipelineEmitter.setMaxListeners(200);

const SIMAO_CONTEXT = `You are part of Simao Alves' Personal AI Business Hub — a private system powering 5 businesses:
• LESA Inspections — Home inspection B2B (realtors refer buyers, per-inspection revenue)
• CarrierDeskHQ — Trucking consulting & dispatch SaaS for owner-operators
• SalonSync Hub — Salon management SaaS (appointments, staff, payments)
• Sweepello — Cleaning marketplace SaaS (homeowners ↔ vetted cleaners)
• Real Estate — Investment portfolio (tax deed auctions, MLS, off-market)

You are collaborating with other specialized AI agents in a multi-step pipeline. Your job is to produce a precise, high-quality deliverable that the next agent can build on. Be thorough, structured, and specific.`;

export async function runPipelineById(
  pipelineId: number,
  opts: { topic?: string; businessTag?: string } = {}
) {
  const { topic, businessTag } = opts;

  const [pipeline] = await db.select().from(pipelinesTable).where(eq(pipelinesTable.id, pipelineId));
  if (!pipeline) throw new Error("Pipeline not found");

  const steps = pipeline.steps as PipelineStep[];
  if (!steps || steps.length === 0) throw new Error("Pipeline has no steps");

  let businessContext = "";
  if (businessTag) {
    const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.slug, businessTag));
    businessContext = ws?.businessContext ?? "";
  }

  await db.update(pipelinesTable).set({ status: "running" }).where(eq(pipelinesTable.id, pipelineId));

  const stepsOutput: StepOutput[] = [];
  let previousOutput = "";
  let finalOutput = "";
  let runStatus: "pending_approval" | "failed" = "pending_approval";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  try {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, step.agentId));
      if (!agent) throw new Error(`Agent not found for step ${i + 1}: ${step.stepName}`);

      pipelineEmitter.emit(`pipeline:${pipelineId}:step_start`, {
        stepIndex: i,
        stepName: step.stepName,
        agentName: agent.name,
        agentIcon: agent.icon ?? "🤖",
        agentColor: agent.color ?? "#6366f1",
        totalSteps: steps.length,
      });

      let promptText = step.promptTemplate;
      if (topic) promptText = promptText.replace(/\{\{TOPIC\}\}/gi, topic);

      const contextSuffix = businessContext ? `\n\nBUSINESS CONTEXT:\n${businessContext}` : "";

      const userMessage =
        i === 0
          ? `${topic ? `TASK: "${topic}"\n\n` : ""}${promptText}${contextSuffix}`
          : `${topic ? `ORIGINAL TASK: "${topic}"\n\n` : ""}${promptText}${contextSuffix}\n\n---\n📋 **Output from ${steps[i - 1].stepName} (${stepsOutput[i - 1]?.agentName}):**\n\n${previousOutput}`;

      const systemPrompt = [
        agent.systemPrompt,
        SIMAO_CONTEXT,
        `Today: ${today}`,
        `You are step ${i + 1} of ${steps.length} in the "${pipeline.name}" pipeline.`,
        i > 0
          ? "The previous agent's work is provided below. Build on it and produce your specific deliverable."
          : "You are starting this pipeline. Produce structured, thorough output that the next agents can build on.",
      ].filter(Boolean).join("\n\n");

      logger.info({ pipelineId, step: i + 1, agentName: agent.name }, "Running pipeline step");

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      const block = response.content[0];
      const stepOutput = block.type === "text" ? block.text : "";

      const stepResult: StepOutput = {
        stepIndex: i,
        stepName: step.stepName,
        agentId: agent.id,
        agentName: agent.name,
        agentIcon: agent.icon ?? "🤖",
        agentColor: agent.color ?? "#6366f1",
        input: userMessage,
        output: stepOutput,
      };

      stepsOutput.push(stepResult);
      previousOutput = stepOutput;
      finalOutput = stepOutput;

      pipelineEmitter.emit(`pipeline:${pipelineId}:step_done`, stepResult);
    }

    runStatus = "pending_approval";
  } catch (err) {
    logger.error(err, "Pipeline run failed");
    runStatus = "failed";
    finalOutput = `Pipeline failed at step ${stepsOutput.length + 1}: ${err instanceof Error ? err.message : "Unknown error"}`;
    pipelineEmitter.emit(`pipeline:${pipelineId}:error`, { message: finalOutput });
  }

  const [run] = await db
    .insert(pipelineRunsTable)
    .values({ pipelineId, status: runStatus, stepsOutput, finalOutput })
    .returning();

  await db.update(pipelinesTable)
    .set({ lastRanAt: new Date(), status: runStatus === "failed" ? "idle" : "pending_approval" })
    .where(eq(pipelinesTable.id, pipelineId));

  const result = { ...run, pipelineName: pipeline.name };
  pipelineEmitter.emit(`pipeline:${pipelineId}:done`, result);
  return result;
}
