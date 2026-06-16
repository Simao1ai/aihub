import { pgTable, text, serial, timestamp, jsonb, customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

const vector = customType<{
  data: number[];
  config: { dimensions: number };
  configRequired: true;
  driverData: string;
}>({
  dataType(config) {
    return `vector(${config.dimensions})`;
  },
  toDriver(value: number[]) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: unknown) {
    const str = value as string;
    return str.slice(1, -1).split(",").map(Number);
  },
});

export const brainDocumentsTable = pgTable("brain_documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // pdf | text | url
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  category: text("category").notNull().default("general"), // general | processes | clients | products | finance | marketing | legal | hr
  businessTag: text("business_tag").notNull().default("general"),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBrainDocumentSchema = createInsertSchema(brainDocumentsTable).omit({ id: true, createdAt: true, embedding: true });
export type InsertBrainDocument = z.infer<typeof insertBrainDocumentSchema>;
export type BrainDocument = typeof brainDocumentsTable.$inferSelect;
