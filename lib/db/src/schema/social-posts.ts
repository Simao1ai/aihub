import { pgTable, text, serial, boolean, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const socialPostsTable = pgTable("social_posts", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id"), // FK -> connections.id (nullable for drafts without a chosen account)
  platform: text("platform").notNull(), // 'linkedin' | 'twitter' | 'meta'
  content: text("content").notNull().default(""),
  mediaUrls: jsonb("media_urls").$type<string[]>().default([]),
  status: text("status").notNull().default("draft"), // draft | pending_approval | approved | posted | failed
  aiGenerated: boolean("ai_generated").notNull().default(false),
  agentSlug: text("agent_slug"), // which agent drafted it
  businessTag: text("business_tag").notNull().default("general"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  topic: text("topic"), // what the user asked AI to write about
  imagePrompt: text("image_prompt"), // PIXEL's AI image prompt for this post
  imageUrl: text("image_url"),       // URL path to the generated image file
  platformPostId: text("platform_post_id"),  // ID returned from the social platform after posting
  publishedUrl: text("published_url"),        // Direct link to the published post
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SocialPost = typeof socialPostsTable.$inferSelect;
export type InsertSocialPost = typeof socialPostsTable.$inferInsert;
