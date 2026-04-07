import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("todo"), // todo | in_progress | done
  priority: text("priority").notNull().default("medium"), // low | medium | high
  businessTag: text("business_tag").notNull().default("general"),
  dueDate: text("due_date"), // ISO date string or null
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Task = typeof tasksTable.$inferSelect;
