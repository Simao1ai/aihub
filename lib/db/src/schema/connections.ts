import { pgTable, text, serial, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const connectionsTable = pgTable("connections", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(), // linkedin | google | twitter | meta | gohighlevel | email
  displayName: text("display_name").notNull(),
  accountLabel: text("account_label"),
  authType: text("auth_type").notNull(), // oauth | api_key
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  apiKey: text("api_key"),
  scopes: text("scopes").array().notNull().default([]),
  metadata: jsonb("metadata"),
  isConnected: boolean("is_connected").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConnectionSchema = createInsertSchema(connectionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type Connection = typeof connectionsTable.$inferSelect;
