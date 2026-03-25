import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { agentsTable } from "./agents";

export const automationsTable = pgTable("automations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  agentId: integer("agent_id").notNull().references(() => agentsTable.id),
  scheduleCron: text("schedule_cron"),
  promptTemplate: text("prompt_template").notNull(),
  lastRanAt: timestamp("last_ran_at", { withTimezone: true }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  status: text("status").notNull().default("idle"), // idle | running | pending_approval
  lastOutput: text("last_output"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const automationRunsTable = pgTable("automation_runs", {
  id: serial("id").primaryKey(),
  automationId: integer("automation_id").notNull().references(() => automationsTable.id),
  output: text("output"),
  status: text("status").notNull(), // success | failed | pending_approval
  ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAutomationSchema = createInsertSchema(automationsTable).omit({ id: true, createdAt: true, lastRanAt: true, nextRunAt: true });
export type InsertAutomation = z.infer<typeof insertAutomationSchema>;
export type Automation = typeof automationsTable.$inferSelect;

export const insertAutomationRunSchema = createInsertSchema(automationRunsTable).omit({ id: true, ranAt: true });
export type InsertAutomationRun = z.infer<typeof insertAutomationRunSchema>;
export type AutomationRun = typeof automationRunsTable.$inferSelect;
