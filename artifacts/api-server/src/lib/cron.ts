import cron from "node-cron";
import { parseExpression } from "cron-parser";
import { db, automationsTable, automationRunsTable, agentsTable, socialPostsTable } from "@workspace/db";
import { eq, lte, and, isNotNull, isNull } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { logger } from "./logger";
import { sendAutomationCompletedEmail, sendPostPublishedEmail } from "./email";
import { startLesaFbSchedule } from "./lesa-fb/agent";

// ── Calculate next run time from a cron expression ─────────────────────────
export function getNextRunAt(cronExpression: string): Date | null {
  try {
    const interval = parseExpression(cronExpression, { tz: "America/New_York" });
    return interval.next().toDate();
  } catch {
    return null;
  }
}

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
      `You are working for Simao Alves, an entrepreneur running 5 businesses:`,
      `- LES A Inspections: Home inspection B2B with realtor network in NJ`,
      `- CarrierDeskHQ: Trucking consulting SaaS platform`,
      `- SalonSync Hub: Salon management SaaS`,
      `- Sweepello: Cleaning marketplace SaaS`,
      `- Equifind Recovery: Tax deed surplus fund recovery (Florida)`,
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

  // Calculate next run time
  const nextRunAt = automation.scheduleCron ? getNextRunAt(automation.scheduleCron) : null;

  // Save run
  const [run] = await db
    .insert(automationRunsTable)
    .values({ automationId, output, status })
    .returning();

  // Update automation with lastRanAt, nextRunAt, and new status
  await db.update(automationsTable).set({
    lastRanAt: new Date(),
    nextRunAt,
    status: status === "failed" ? "idle" : "pending_approval",
  }).where(eq(automationsTable.id, automationId));

  // Send email notification on completion
  sendAutomationCompletedEmail({
    automationName: automation.name,
    agentName: agent.name,
    output,
    businessTag: "general",
  }).catch(err => logger.error(err, "Failed to send automation email"));

  return {
    ...run,
    automationName: automation.name,
    agentName: agent.name,
    agentIcon: agent.icon,
    agentColor: agent.color,
  };
}

export function startCronScheduler() {
  const port = process.env.PORT || 8080;
  const internalBase = `http://localhost:${port}`;

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

  // Check every minute for scheduled social posts that are due to publish
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const duePosts = await db
        .select()
        .from(socialPostsTable)
        .where(
          and(
            eq(socialPostsTable.status, "approved"),
            isNotNull(socialPostsTable.scheduledAt),
            lte(socialPostsTable.scheduledAt, now),
            isNull(socialPostsTable.postedAt),
          )
        );

      for (const post of duePosts) {
        if (!post.connectionId) continue;
        logger.info({ postId: post.id, platform: post.platform }, "Publishing scheduled social post");
        fetch(`${internalBase}/api/social-posts/${post.id}/post-now`, { method: "POST" })
          .then(r => r.json())
          .then((result: any) => {
            if (result.success) {
              logger.info({ postId: post.id }, "Scheduled social post published successfully");
              // Send email confirmation
              sendPostPublishedEmail({
                platform: post.platform,
                content: post.content,
                platformPostId: result.platformPostId,
              }).catch(() => {});
            } else {
              logger.warn({ postId: post.id, error: result.errorMessage }, "Scheduled social post publish failed");
            }
          })
          .catch(err => logger.error(err, "Scheduled social post publish error"));
      }
    } catch (err) {
      logger.error(err, "Scheduled posts cron error");
    }
  });

  // Weekly digest — every Monday at 8 AM ET
  cron.schedule("0 8 * * 1", async () => {
    try {
      const { sendWeeklyDigestEmail } = await import("./email");
      const { db: _db, kpisTable, tasksTable, socialPostsTable: spTable, automationRunsTable: arTable } = await import("@workspace/db");
      const { eq: _eq, gte, and: _and } = await import("drizzle-orm");

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const kpis = await _db.select().from(kpisTable);
      const doneTasks = await _db.select().from(tasksTable).where(_eq(tasksTable.status, "done"));
      const publishedPosts = await _db.select().from(spTable).where(
        _and(_eq(spTable.status, "posted"), gte(spTable.postedAt!, weekAgo))
      );
      const runs = await _db.select().from(arTable).where(gte(arTable.ranAt, weekAgo));

      await sendWeeklyDigestEmail({
        kpis: kpis.map(k => ({ workspace: k.businessTag, name: k.name, value: k.value, unit: k.unit })),
        tasksCompleted: doneTasks.length,
        postsPublished: publishedPosts.length,
        automationsRan: runs.length,
      });
    } catch (err) {
      logger.error(err, "Weekly digest failed");
    }
  });

  // Start LESA FB autonomous posting schedule (Mon/Wed/Fri 9:15am ET, soft gate)
  startLesaFbSchedule();

  logger.info("Automation cron scheduler started");
}
