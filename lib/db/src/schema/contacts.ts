import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const contactsTable = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  status: text("status").notNull().default("lead"), // lead | prospect | client | partner
  notes: text("notes").notNull().default(""),
  businessTag: text("business_tag").notNull().default("general"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Contact = typeof contactsTable.$inferSelect;
