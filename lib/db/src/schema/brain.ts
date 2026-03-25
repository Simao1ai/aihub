import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const brainDocumentsTable = pgTable("brain_documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // pdf | text | url
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  businessTag: text("business_tag").notNull().default("general"), // equifind | home_inspection | general
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBrainDocumentSchema = createInsertSchema(brainDocumentsTable).omit({ id: true, createdAt: true });
export type InsertBrainDocument = z.infer<typeof insertBrainDocumentSchema>;
export type BrainDocument = typeof brainDocumentsTable.$inferSelect;
