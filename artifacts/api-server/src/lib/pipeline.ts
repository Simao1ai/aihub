import { db, pipelinesTable, pipelineRunsTable, agentsTable } from "@workspace/db";
import type { PipelineStep, StepOutput } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { logger } from "./logger";

const OWNER_CONTEXT = `You are working for Simao, an entrepreneur running Equifind Recovery (Florida tax deed surplus fund recovery SaaS) and a home inspection business with realtor network.`;

export async function runPipelineById(pipelineId: number) {
  const [pipeline] = await db.select().from(pipelinesTable).where(eq(pipelinesTable.id, pipelineId));
  if (!pipeline) throw new Error("Pipeline not found");

  const steps = pipeline.steps as PipelineStep[];
  if (!steps || steps.length === 0) throw new Error("Pipeline has no steps");

  // Mark as running
  await db.update(pipelinesTable).set({ status: "running" }).where(eq(pipelinesTable.id, pipelineId));

  const stepsOutput: StepOutput[] = [];
  let previousOutput = "";
  let finalOutput = "";
  let runStatus: "pending_approval" | "failed" = "pending_approval";

  try {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, step.agentId));
      if (!agent) throw new Error(`Agent not found for step ${i + 1}: ${step.stepName}`);

      // Build user message — include previous step output as context if not first step
      const userMessage = i === 0
        ? step.promptTemplate
        : `${step.promptTemplate}\n\n---\n**Context from previous step (${steps[i - 1].stepName}):**\n${previousOutput}`;

      const systemPrompt = [
        agent.systemPrompt,
        OWNER_CONTEXT,
        `Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`,
        i > 0 ? `You are step ${i + 1} of ${steps.length} in a multi-agent pipeline. Your job is to process the output from the previous step and produce your specific deliverable.` : "",
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

      stepsOutput.push({
        stepIndex: i,
        stepName: step.stepName,
        agentId: agent.id,
        agentName: agent.name,
        agentIcon: agent.icon || "🤖",
        agentColor: agent.color || "#6366f1",
        input: userMessage,
        output: stepOutput,
      });

      previousOutput = stepOutput;
      finalOutput = stepOutput;
    }

    runStatus = "pending_approval";
  } catch (err) {
    logger.error(err, "Pipeline run failed");
    runStatus = "failed";
    finalOutput = `Pipeline failed at step ${stepsOutput.length + 1}: ${err instanceof Error ? err.message : "Unknown error"}`;
  }

  // Save run record
  const [run] = await db
    .insert(pipelineRunsTable)
    .values({ pipelineId, status: runStatus, stepsOutput, finalOutput })
    .returning();

  // Update pipeline
  await db.update(pipelinesTable).set({
    lastRanAt: new Date(),
    status: runStatus === "failed" ? "idle" : "pending_approval",
  }).where(eq(pipelinesTable.id, pipelineId));

  return { ...run, pipelineName: pipeline.name };
}
