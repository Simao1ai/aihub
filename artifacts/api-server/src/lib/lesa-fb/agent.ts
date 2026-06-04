/**
 * LESA Facebook Agent — orchestrator (SOFT GATE MODE).
 *
 * One "cycle":
 *   generate → brand-safety check → save to Social Queue as pending_approval
 *
 * Posts land in the SynthDesk Social Queue for Simao to review and approve.
 * Approve = immediate Facebook publish via the existing social-posts route.
 * This is the recommended mode for the first few weeks.
 *
 * When you're ready for fully autonomous mode, change runCycle() to call
 * publishToPage() directly using getValidPageToken() from tokenManager.ts.
 */
import cron, { ScheduledTask } from "node-cron";
import { generatePost, nextTheme } from "./contentEngine";
import { checkBrandSafety } from "./brandSafety";
import { loadState, saveState, AgentState } from "./state";
import { db, socialPostsTable, connectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../logger";

export interface CycleOutcome {
  status: "queued" | "skipped" | "disabled" | "error";
  detail: string;
  postId?: number;
  theme?: string;
  text?: string;
}

const MAX_DRAFT_ATTEMPTS = 2;

export async function runCycle(): Promise<CycleOutcome> {
  const state: AgentState = await loadState();

  if (!state.enabled)
    return { status: "disabled", detail: "LESA FB agent kill-switch is OFF." };

  const theme = nextTheme(state.postCount);
  let lastReasons: string[] = [];

  for (let attempt = 1; attempt <= MAX_DRAFT_ATTEMPTS; attempt++) {
    let draftText = "";

    try {
      const draft = await generatePost(theme);
      draftText = draft.text;
    } catch (err) {
      const detail = `Generation failed (attempt ${attempt}): ${String(err)}`;
      state.lastError = detail;
      await saveState(state);
      if (attempt === MAX_DRAFT_ATTEMPTS) return { status: "error", detail };
      continue;
    }

    const safety = checkBrandSafety(draftText);
    if (!safety.ok) {
      lastReasons = safety.reasons;
      if (attempt < MAX_DRAFT_ATTEMPTS) continue;
      const detail = `Skipped — failed brand safety: ${safety.reasons.join(" | ")}`;
      state.lastError = detail;
      await saveState(state);
      return { status: "skipped", detail, theme, text: draftText };
    }

    // Passed safety — save to Social Queue for Simao to review & approve
    try {
      // Find the Meta connection to auto-link (try les_a_inspections first, fall back to general)
      const metaConns = await db
        .select()
        .from(connectionsTable)
        .where(eq(connectionsTable.platform, "meta"));
      const metaConn = metaConns.find(c => c.workspaceSlug === "les_a_inspections")
        ?? metaConns.find(c => c.workspaceSlug === "general")
        ?? metaConns[0];

      const [saved] = await db.insert(socialPostsTable).values({
        platform: "meta",
        content: draftText,
        topic: theme.replace(/_/g, " "),
        businessTag: "les_a_inspections",
        status: "pending_approval",
        aiGenerated: true,
        agentSlug: "lesa-fb",
        connectionId: metaConn?.id ?? null,
      }).returning();

      state.postCount += 1;
      state.history.push({
        at: new Date().toISOString(),
        theme,
        postId: String(saved.id),
        text: draftText,
      });
      state.lastError = undefined;
      await saveState(state);

      logger.info({ postId: saved.id, theme }, "[lesa-fb] Post queued for approval");
      return {
        status: "queued",
        detail: `Post queued for approval (theme: ${theme}).`,
        postId: saved.id,
        theme,
        text: draftText,
      };
    } catch (err) {
      const detail = `Failed to save post to queue: ${String(err)}`;
      state.lastError = detail;
      await saveState(state);
      return { status: "error", detail, theme, text: draftText };
    }
  }

  return {
    status: "skipped",
    detail: `Exhausted attempts. Last reasons: ${lastReasons.join(" | ")}`,
  };
}

let task: ScheduledTask | null = null;

/**
 * Start the 2-3x/week schedule.
 * Default: Mon, Wed, Fri at 9:15am America/New_York.
 * Override with LESA_FB_CRON env var.
 */
export function startLesaFbSchedule(): void {
  const expr = process.env.LESA_FB_CRON ?? "15 9 * * 1,3,5";
  task = cron.schedule(
    expr,
    async () => {
      const outcome = await runCycle();
      logger.info({ outcome }, `[lesa-fb] cycle complete: ${outcome.status} — ${outcome.detail}`);
    },
    { timezone: "America/New_York" }
  );
  logger.info(`[lesa-fb] scheduled: "${expr}" (America/New_York)`);
}

export function stopLesaFbSchedule(): void {
  task?.stop();
  task = null;
  logger.info("[lesa-fb] schedule stopped");
}
