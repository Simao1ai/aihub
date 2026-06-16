import { pgTable, text, serial, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export interface PipelineStep {
  stepName: string;
  agentId: number;
  promptTemplate: string;
}

export interface StepOutput {
  stepIndex: number;
  stepName: string;
  agentId: number;
  agentName: string;
  agentIcon: string;
  agentColor: string;
  input: string;
  output: string;
}

export const pipelinesTable = pgTable("pipelines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  businessTag: text("business_tag").notNull().default("general"),
  description: text("description"),
  steps: jsonb("steps").notNull().$type<PipelineStep[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  status: text("status").notNull().default("idle"), // idle | running | pending_approval
  lastOutput: text("last_output"),
  lastRanAt: timestamp("last_ran_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pipelineRunsTable = pgTable("pipeline_runs", {
  id: serial("id").primaryKey(),
  pipelineId: serial("pipeline_id").references(() => pipelinesTable.id),
  status: text("status").notNull().default("running"), // running | pending_approval | success | failed
  stepsOutput: jsonb("steps_output").$type<StepOutput[]>().default([]),
  finalOutput: text("final_output"),
  ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Pipeline = typeof pipelinesTable.$inferSelect;
export type PipelineRun = typeof pipelineRunsTable.$inferSelect;
