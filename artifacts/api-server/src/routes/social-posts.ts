import { Router, type IRouter } from "express";
import { db, socialPostsTable, connectionsTable, agentsTable, workspacesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, "../../generated-images");

const router: IRouter = Router();

// ── GET /api/social-posts/stats ───────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const { businessTag } = req.query as Record<string, string>;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const allPosts = businessTag
      ? await db.select().from(socialPostsTable).where(eq(socialPostsTable.businessTag, businessTag))
      : await db.select().from(socialPostsTable);

    const queued = allPosts.filter(p => p.status === 'pending_approval').length;
    const scheduled = allPosts.filter(p =>
      p.status === 'approved' && p.scheduledAt && new Date(p.scheduledAt) > now
    ).length;
    const postedToday = allPosts.filter(p =>
      p.status === 'posted' && p.postedAt && new Date(p.postedAt) >= todayStart
    ).length;
    const totalPosted = allPosts.filter(p => p.status === 'posted').length;

    res.json({ queued, scheduled, postedToday, totalPosted, total: allPosts.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/social-posts ─────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { status, platform, businessTag } = req.query as Record<string, string>;
    let q = db.select().from(socialPostsTable).orderBy(desc(socialPostsTable.createdAt));

    const conditions = [];
    if (status) conditions.push(eq(socialPostsTable.status, status));
    if (platform) conditions.push(eq(socialPostsTable.platform, platform));
    if (businessTag) conditions.push(eq(socialPostsTable.businessTag, businessTag));

    const posts = conditions.length
      ? await db.select().from(socialPostsTable).where(and(...conditions)).orderBy(desc(socialPostsTable.createdAt))
      : await db.select().from(socialPostsTable).orderBy(desc(socialPostsTable.createdAt));

    res.json(posts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/social-posts ─────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { platform, content, connectionId, businessTag, topic, status, aiGenerated } = req.body;
    if (!platform) return res.status(400).json({ error: "platform is required" });

    const [post] = await db.insert(socialPostsTable).values({
      platform,
      content: content ?? "",
      connectionId: connectionId ?? null,
      businessTag: businessTag ?? "general",
      topic: topic ?? null,
      status: status ?? "draft",
      aiGenerated: aiGenerated ?? false,
      agentSlug: aiGenerated ? "soshi" : null,
    }).returning();

    res.status(201).json(post);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/social-posts/:id ─────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { content, status, connectionId, scheduledAt } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (content !== undefined) updates.content = content;
    if (status !== undefined) updates.status = status;
    if (connectionId !== undefined) updates.connectionId = connectionId;
    if (scheduledAt !== undefined) updates.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;

    const [post] = await db.update(socialPostsTable).set(updates).where(eq(socialPostsTable.id, id)).returning();
    if (!post) return res.status(404).json({ error: "Post not found" });

    res.json(post);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/social-posts/:id/generate-image ─────────────────────────────
// Generates a real image from the post's imagePrompt using OpenAI gpt-image-1,
// saves it to disk, and stores the URL on the post record.
router.post("/:id/generate-image", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [post] = await db.select().from(socialPostsTable).where(eq(socialPostsTable.id, id));
    if (!post) return res.status(404).json({ error: "Post not found" });

    const imagePrompt = req.body.imagePrompt ?? post.imagePrompt;
    if (!imagePrompt) return res.status(400).json({ error: "No image prompt available — PIXEL must provide one first" });

    // Ensure images directory exists
    if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

    // Determine aspect ratio from platform
    const size = post.platform === "meta" || post.platform === "instagram"
      ? "1024x1024"
      : "1024x1024";

    const buffer = await generateImageBuffer(imagePrompt, size);

    const filename = `social-${id}-${Date.now()}.png`;
    const filepath = path.join(IMAGES_DIR, filename);
    fs.writeFileSync(filepath, buffer);

    const imageUrl = `/api/generated-images/${filename}`;

    const [updated] = await db.update(socialPostsTable)
      .set({ imageUrl, imagePrompt, updatedAt: new Date() })
      .where(eq(socialPostsTable.id, id))
      .returning();

    res.json({ success: true, imageUrl, post: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/social-posts/:id ──────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(socialPostsTable).where(eq(socialPostsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/social-posts/ai-draft ───────────────────────────────────────
// Use SOSHI agent to generate a post draft
router.post("/ai-draft", async (req, res) => {
  try {
    const { platform, topic, businessTag, tone } = req.body;
    if (!platform || !topic) return res.status(400).json({ error: "platform and topic are required" });

    // Get business context
    let businessContext = "";
    if (businessTag) {
      const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.slug, businessTag));
      businessContext = ws?.businessContext ?? "";
    }

    // Get SOSHI agent system prompt
    const [soshi] = await db.select().from(agentsTable).where(eq(agentsTable.slug, "soshi"));
    const systemPrompt = soshi?.systemPrompt ?? "You are SOSHI, a social media expert. Write engaging posts.";

    const platformRules: Record<string, string> = {
      linkedin: "LinkedIn post: Professional tone, 150-300 words, 3-5 relevant hashtags at the end. No excessive emoji. Add line breaks for readability. End with a clear insight or question to drive engagement.",
      twitter: "Twitter/X post: Max 280 characters. Punchy, direct, one powerful idea. 1-3 hashtags max. Optional emoji for personality.",
      meta: "Facebook/Instagram post: Conversational, 100-200 words. 5-10 hashtags (for Instagram). Warm and relatable tone. Use emoji to break up text.",
    };

    const platformRule = platformRules[platform] ?? "Write an engaging social media post.";
    const toneNote = tone ? `Tone: ${tone}.` : "";

    const prompt = `${businessContext ? `Business context: ${businessContext}\n\n` : ""}Topic to post about: "${topic}"

Platform requirements: ${platformRule}
${toneNote}

Write ONLY the post content — no intro, no explanation, no quotes around it. Just the ready-to-publish post text.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const content = (response.content[0] as any).text?.trim() ?? "";

    // Save as a draft
    const [post] = await db.insert(socialPostsTable).values({
      platform,
      content,
      businessTag: businessTag ?? "general",
      topic,
      status: "pending_approval",
      aiGenerated: true,
      agentSlug: "soshi",
    }).returning();

    res.json(post);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/social-posts/:id/approve ────────────────────────────────────
router.post("/:id/approve", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [post] = await db.update(socialPostsTable)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(socialPostsTable.id, id))
      .returning();
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/social-posts/:id/post-now ───────────────────────────────────
// Publish a post to the connected platform
router.post("/:id/post-now", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [post] = await db.select().from(socialPostsTable).where(eq(socialPostsTable.id, id));
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (!post.connectionId) return res.status(400).json({ error: "No connection selected for this post" });

    const [conn] = await db.select().from(connectionsTable).where(eq(connectionsTable.id, post.connectionId));
    if (!conn) return res.status(400).json({ error: "Connection not found" });
    if (!conn.accessToken && !conn.apiKey) return res.status(400).json({ error: "Connection has no credentials" });

    let success = false;
    let platformPostId: string | undefined;
    let errorMessage: string | undefined;

    try {
      if (conn.platform === "linkedin") {
        const meResp = await fetch("https://api.linkedin.com/v2/me", {
          headers: { Authorization: `Bearer ${conn.accessToken}` },
        });
        const me = await meResp.json() as { id: string };

        const postResp = await fetch("https://api.linkedin.com/v2/ugcPosts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${conn.accessToken}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: JSON.stringify({
            author: `urn:li:person:${me.id}`,
            lifecycleState: "PUBLISHED",
            specificContent: {
              "com.linkedin.ugc.ShareContent": {
                shareCommentary: { text: post.content },
                shareMediaCategory: "NONE",
              },
            },
            visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
          }),
        });
        success = postResp.ok;
        const data = await postResp.json() as any;
        platformPostId = data.id;

      } else if (conn.platform === "twitter") {
        const tweetResp = await fetch("https://api.twitter.com/2/tweets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${conn.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: post.content.slice(0, 280) }),
        });
        const data = await tweetResp.json() as any;
        success = !data.errors;
        platformPostId = data?.data?.id;

      } else if (conn.platform === "meta") {
        const userToken = conn.accessToken || conn.apiKey || "";
        const meta = conn.metadata as any;

        // Prefer the stored Page Access Token (set when user connected the page)
        let postToken: string = meta?.pageAccessToken || "";
        let pageId: string = meta?.pageId || "";

        if (!postToken || !pageId) {
          // Fallback: re-fetch from /me/accounts using the user token
          if (!userToken) throw new Error("No Meta access token — reconnect via Integrations → Meta");
          const pagesResp = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${userToken}`);
          const pagesData = await pagesResp.json() as any;
          if (pagesData.error) {
            const code = pagesData.error.code;
            if (code === 190) throw new Error("Meta token expired — go to Connections → Meta and reconnect with a fresh token.");
            if (code === 10 || code === 200 || code === 230) throw new Error("Token missing pages_manage_posts permission. In Graph API Explorer add pages_show_list, pages_read_engagement and pages_manage_posts, then reconnect.");
            throw new Error(`Meta error: ${pagesData.error.message}`);
          }
          if (!pagesData.data?.length) throw new Error("No Facebook Pages found on this account. Make sure the token has pages_show_list and pages_manage_posts permissions.");
          const page = pagesData.data.find((p: any) => p.id === meta?.pageId) ?? pagesData.data[0];
          postToken = page.access_token;
          pageId = page.id;
          // Cache for next time
          await db.update(connectionsTable)
            .set({ metadata: { ...(meta ?? {}), pageId: page.id, pageName: page.name, pageAccessToken: page.access_token } })
            .where(eq(connectionsTable.id, conn.id));
        }

        if (!pageId) throw new Error("Could not determine Facebook Page ID — please reconnect your Meta account.");

        // If the post has a generated image, use the /photos endpoint (text + image)
        // otherwise use /feed (text only)
        let postResp: Response;
        if (post.imageUrl) {
          // Construct public image URL using Replit dev domain
          const host = process.env.REPLIT_DEV_DOMAIN
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : `http://localhost:${process.env.PORT || 8080}`;
          const fullImageUrl = `${host}${post.imageUrl}`;
          postResp = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: fullImageUrl, caption: post.content, access_token: postToken }),
          });
        } else {
          postResp = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: post.content, access_token: postToken }),
          });
        }
        const data = await postResp.json() as any;
        if (data.error) {
          const code = data.error.code;
          if (code === 200 || code === 230) {
            throw new Error("Posting failed: the Page Access Token is missing pages_manage_posts permission. Go to Connections → Meta, delete this connection, then reconnect — in Graph API Explorer make sure to add pages_show_list, pages_read_engagement AND pages_manage_posts before generating your token.");
          }
          throw new Error(data.error.message);
        }
        success = !!(data.id || data.post_id);
        platformPostId = data.id ?? data.post_id;
      }
    } catch (postErr: any) {
      errorMessage = postErr.message;
    }

    const [updated] = await db.update(socialPostsTable)
      .set({
        status: success ? "posted" : "failed",
        postedAt: success ? new Date() : null,
        errorMessage: errorMessage ?? null,
        updatedAt: new Date(),
      })
      .where(eq(socialPostsTable.id, id))
      .returning();

    res.json({ success, post: updated, platformPostId, errorMessage: errorMessage ?? null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
