import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { organizationsTable } from "./organizations";

export const orgMembershipsTable = pgTable("org_memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueUserOrg: unique().on(t.userId, t.orgId),
}));

export type OrgMembership = typeof orgMembershipsTable.$inferSelect;
export type InsertOrgMembership = typeof orgMembershipsTable.$inferInsert;
