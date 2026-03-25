import cron from "node-cron";
import { db, automationsTable, automationRunsTable, agentsTable, conversations, messages } from "@workspace/db";
import { eq, lte, and } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { logger } from "./logger";

export async function runAutomationById(automationId: number) {
  const [automation] = await db.select().from(automationsTable).where(eq(automationsTable.id, automationId));
  if (!automation) throw new Error("Automation not found");

  const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, automation.agentId));
  if (!agent) throw new Error("Agent not found");

  // Mark as running
  await db.update(automationsTable).set({ status: "running" }).where(eq(automationsTable.id, automationId));

  let output = "";
  let status: "pending_approval" | "failed" = "pending_approval";

  try {
    const systemPrompt = [
      agent.systemPrompt,
      `You are working for Simao, an entrepreneur running Equifind Recovery (Florida tax deed surplus fund recovery SaaS) and a home inspection business with realtor network.`,
      `Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`,
    ].join("\n\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: automation.promptTemplate }],
    });

    const block = response.content[0];
    output = block.type === "text" ? block.text : "";
    status = "pending_approval";
  } catch (err) {
    logger.error(err, "Automation run failed");
    status = "failed";
    output = `Error: ${err instanceof Error ? err.message : "Unknown error"}`;
  }

  // Save run
  const [run] = await db
    .insert(automationRunsTable)
    .values({ automationId, output, status })
    .returning();

  // Update automation
  await db.update(automationsTable).set({
    lastRanAt: new Date(),
    status: status === "failed" ? "idle" : "pending_approval",
  }).where(eq(automationsTable.id, automationId));

  const [agentData] = await db.select().from(agentsTable).where(eq(agentsTable.id, automation.agentId));

  return {
    ...run,
    automationName: automation.name,
    agentName: agentData?.name,
    agentIcon: agentData?.icon,
    agentColor: agentData?.color,
  };
}

export function startCronScheduler() {
  // Check every minute for due automations
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const activeAutomations = await db
        .select()
        .from(automationsTable)
        .where(and(eq(automationsTable.isActive, true), eq(automationsTable.status, "idle")));

      for (const automation of activeAutomations) {
        if (!automation.scheduleCron) continue;

        // Check if automation is due
        const shouldRun = automation.nextRunAt ? automation.nextRunAt <= now : false;

        if (shouldRun) {
          logger.info({ automationId: automation.id, name: automation.name }, "Running scheduled automation");
          runAutomationById(automation.id).catch((err) => {
            logger.error(err, "Scheduled automation failed");
          });
        }
      }
    } catch (err) {
      logger.error(err, "Cron scheduler error");
    }
  });

  logger.info("Automation cron scheduler started");
}
