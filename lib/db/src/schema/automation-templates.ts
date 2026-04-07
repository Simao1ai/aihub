import { pgTable, text, serial, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const automationTemplatesTable = pgTable("automation_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("general"),
  agentSlug: text("agent_slug").notNull(),
  promptTemplate: text("prompt_template").notNull(),
  emoji: text("emoji").notNull().default("⚡"),
  useCases: jsonb("use_cases").$type<string[]>().default([]),
  isBuiltIn: boolean("is_built_in").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AutomationTemplate = typeof automationTemplatesTable.$inferSelect;
