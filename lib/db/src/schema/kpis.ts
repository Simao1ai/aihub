import { pgTable, text, serial, timestamp, real } from "drizzle-orm/pg-core";

export const kpisTable = pgTable("kpis", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  value: real("value").notNull().default(0),
  unit: text("unit").notNull().default(""), // $, %, #, hrs, etc.
  period: text("period").notNull().default(""), // e.g. "Apr 2026", "Q1 2026"
  businessTag: text("business_tag").notNull().default("general"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Kpi = typeof kpisTable.$inferSelect;
