import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";

export const aiUsageTable = pgTable("ai_usage", {
  id: serial("id").primaryKey(),
  workspace: text("workspace").notNull().default("general"),
  agentSlug: text("agent_slug"),
  model: text("model").notNull().default("claude-sonnet-4-6"),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  estimatedCostUsd: real("estimated_cost_usd").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AiUsage = typeof aiUsageTable.$inferSelect;
