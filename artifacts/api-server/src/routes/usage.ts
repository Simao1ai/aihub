import { Router, type IRouter } from "express";
import { db, aiUsageTable } from "@workspace/db";
import { eq, gte, sql, and } from "drizzle-orm";

const router: IRouter = Router();

// GET /api/usage?workspace=&days=30
router.get("/", async (req, res) => {
  try {
    const workspace = (req as any).sessionWorkspace as string;
    const days = Math.min(parseInt(req.query.days as string ?? "30", 10) || 30, 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        totalInputTokens:  sql<number>`coalesce(sum(input_tokens), 0)::int`,
        totalOutputTokens: sql<number>`coalesce(sum(output_tokens), 0)::int`,
        totalCostUsd:      sql<number>`coalesce(sum(estimated_cost_usd), 0)::real`,
        callCount:         sql<number>`count(*)::int`,
      })
      .from(aiUsageTable)
      .where(and(eq(aiUsageTable.workspace, workspace), gte(aiUsageTable.createdAt, since)));

    const totals = rows[0] ?? { totalInputTokens: 0, totalOutputTokens: 0, totalCostUsd: 0, callCount: 0 };

    // Top agents breakdown
    const byAgent = await db
      .select({
        agentSlug: aiUsageTable.agentSlug,
        callCount: sql<number>`count(*)::int`,
        costUsd:   sql<number>`coalesce(sum(estimated_cost_usd), 0)::real`,
      })
      .from(aiUsageTable)
      .where(and(eq(aiUsageTable.workspace, workspace), gte(aiUsageTable.createdAt, since)))
      .groupBy(aiUsageTable.agentSlug)
      .orderBy(sql`sum(estimated_cost_usd) desc`)
      .limit(10);

    res.json({ ...totals, byAgent, days });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch usage" });
  }
});

export default router;
