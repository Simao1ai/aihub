import { db, aiUsageTable } from "@workspace/db";
import { logger } from "./logger";

// Claude Sonnet 4 pricing (per token)
// Input:  $3.00  / 1 000 000 tokens
// Output: $15.00 / 1 000 000 tokens
const INPUT_COST_PER_TOKEN  = 3.0  / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 15.0 / 1_000_000;

export interface UsageRecord {
  workspace: string;
  agentSlug?: string;
  model?: string;
  usage: { input_tokens: number; output_tokens: number };
}

export async function recordUsage(params: UsageRecord): Promise<void> {
  try {
    const { workspace, agentSlug, model = "claude-sonnet-4-6", usage } = params;
    const estimatedCostUsd =
      usage.input_tokens  * INPUT_COST_PER_TOKEN +
      usage.output_tokens * OUTPUT_COST_PER_TOKEN;

    await db.insert(aiUsageTable).values({
      workspace,
      agentSlug: agentSlug ?? null,
      model,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      estimatedCostUsd,
    });
  } catch (err) {
    logger.warn({ err }, "Failed to record AI usage — non-fatal");
  }
}
