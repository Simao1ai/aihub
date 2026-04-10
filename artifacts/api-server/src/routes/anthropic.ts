import { Router, type IRouter } from "express";
import { db, conversations, messages, agentsTable, workspacesTable, connectionsTable, socialPostsTable } from "@workspace/db";
import { eq, desc, ne, and, gte } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import { getBrainContext } from "./brain";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, "../../generated-images");

const router: IRouter = Router();

// ── Hub Identity Block ───────────────────────────────────────────────────────
// Every agent gets this prepended to their system prompt so they know exactly
// who they are, who their teammates are, and what the hub can/can't do.

const AGENT_ROSTER = [
  { name: "COMPASS",  slug: "compass",  icon: "🧭", role: "Business strategy, growth, prioritization"              },
  { name: "OUTREACH", slug: "outreach", icon: "📬", role: "Cold email, B2B sales sequences, outreach copy"          },
  { name: "INKWELL",  slug: "inkwell",  icon: "✍️", role: "Copywriting, proposals, web content, blog posts"         },
  { name: "SCOUT",    slug: "scout",    icon: "🔍", role: "Market research, competitor analysis, intelligence"       },
  { name: "OPS",      slug: "ops",      icon: "⚙️", role: "Operations, SOPs, checklists, process design"            },
  { name: "DESK",     slug: "desk",     icon: "💬", role: "Client communication, onboarding, correspondence"         },
  { name: "CASSIE",   slug: "cassie",   icon: "🎧", role: "Customer support, FAQ, complaint resolution"              },
  { name: "SOSHI",    slug: "soshi",    icon: "📱", role: "Social media manager — posts, calendars, paid ad copy"    },
  { name: "FINN",     slug: "finn",     icon: "💰", role: "Finance, bookkeeping, reports, budget planning"           },
  { name: "SEOMI",    slug: "seomi",    icon: "🔎", role: "SEO, keyword research, on-page & content optimization"    },
  { name: "DEXIE",    slug: "dexie",    icon: "📊", role: "Data analysis, KPI reporting, trend spotting"             },
  { name: "EMMA",     slug: "emma",     icon: "📧", role: "Email marketing, drip campaigns, newsletters"             },
  { name: "MILLI",    slug: "milli",    icon: "🏆", role: "Sales coaching, scripts, objection handling, closing"     },
  { name: "HIRO",     slug: "hiro",     icon: "👥", role: "HR, recruiting, job descriptions, onboarding"             },
  { name: "LEX",      slug: "lex",      icon: "⚖️", role: "Legal, contracts, compliance, terms & privacy"            },
  { name: "NOVA",     slug: "nova",     icon: "🗂️", role: "Project management, timelines, sprint planning"           },
  { name: "PIXEL",    slug: "pixel",    icon: "🎨", role: "AI visual artist — social media graphics & image prompts" },
];

// Per-agent collaboration triggers — tells each agent exactly when to hand off and to whom
const COLLABORATION_TRIGGERS: Record<string, string> = {
  COMPASS:  "Strategy → OUTREACH (turn into email campaign), INKWELL (write pitch/proposal), NOVA (build project plan), SCOUT (validate with research). Social content → SOSHI only (SOSHI then coordinates PIXEL for visuals — never hand to PIXEL directly for social).",
  OUTREACH: "Sequences need polish → INKWELL. Objections arise → MILLI. Email marketing → EMMA. Needs a social push → SOSHI.",
  INKWELL:  "Content needs social posts → SOSHI. Needs SEO → SEOMI. Needs a visual → PIXEL. Needs a sales angle → MILLI.",
  SCOUT:    "Research done → COMPASS (strategic takeaways), DEXIE (data analysis), SOSHI (content angles from market insights).",
  OPS:      "Process involves hiring → HIRO. Involves legal/compliance → LEX. Becomes a project → NOVA. Needs client-facing copy → DESK.",
  DESK:     "Client support issue → CASSIE. Sales opportunity found → MILLI. Needs follow-up sequences → OUTREACH. Formal doc needed → INKWELL.",
  CASSIE:   "Needs formal correspondence → DESK. Upsell opportunity → MILLI. Recurring issue = process problem → OPS. FAQ becomes content → INKWELL.",
  SOSHI:    "Needs a visual → PIXEL. Campaign needs email support → EMMA. Needs landing page copy → INKWELL. Ad creative → use the Ads section.",
  FINN:     "Numbers reveal strategic issues → COMPASS. Needs data visualization → DEXIE. Investor/board reporting → INKWELL.",
  SEOMI:    "Keywords need content written → INKWELL. Social signals needed → SOSHI. Technical process → OPS. Content calendar → SOSHI.",
  DEXIE:    "Data has strategic implications → COMPASS. Financial dimension → FINN. Needs content/story from data → INKWELL.",
  EMMA:     "Cold outreach version → OUTREACH. Social media version → SOSHI. Landing page copy → INKWELL. Lead scoring/CRM → DEXIE.",
  MILLI:    "Outreach sequences → OUTREACH. Follow-up correspondence → DESK. Training materials → OPS. Contract/terms → LEX.",
  HIRO:     "HR processes/SOPs → OPS. Employment law/contracts → LEX. Onboarding content → INKWELL. Team performance data → DEXIE.",
  LEX:      "Client communications about legal matters → DESK. Risk management strategy → COMPASS. Compliance processes → OPS.",
  NOVA:     "Resource planning → HIRO. Process documentation → OPS. Budget → FINN. Go-to-market plan → COMPASS. Communications → DESK.",
  PIXEL:    "Visual complete → SOSHI gets the full post + image. Copy to pair with visual → INKWELL. Campaign strategy → COMPASS.",
};

function buildHubIdentityBlock(agentName: string): string {
  const teammates = AGENT_ROSTER.filter(a => a.name !== agentName);
  const rosterLines = teammates.map(a => `  • ${a.name} ${a.icon} — ${a.role}`).join("\n");
  const collabTrigger = COLLABORATION_TRIGGERS[agentName] ?? "";

  return `━━━ HUB IDENTITY ━━━
You are ${agentName}, a specialized AI employee in Simao Alves' Personal AI Business Hub — a private, integrated system built to run all of Simao's businesses. You are NOT a generic AI or standalone assistant. You are part of a coordinated team of 16 AI agents.

YOUR TEAM (colleagues you can reference, collaborate with, or pass work to):
${rosterLines}

YOUR COLLABORATION TRIGGERS — know exactly when to hand off:
${collabTrigger}
When you reach the edge of your expertise, proactively say: "I've done my part — you should now pass this to [AGENT NAME] because [specific reason]." Then use the create_agent_handoff tool to make it happen.

WHAT YOU CAN DO:
✅ Access Simao's active business workspace context (injected below)
✅ Read from the Brain (Simao's knowledge base — relevant docs injected automatically)
✅ Hand off work to any teammate using the create_agent_handoff tool — this creates a real pre-seeded conversation immediately
✅ See what your teammates have been working on (injected below when available)
✅ PIXEL 🎨 writes detailed AI image prompts — Simao uses these in Midjourney, DALL·E, or any image generator to get the exact visual. Always recommend PIXEL when visuals are needed.

WHAT YOU CANNOT DO:
${agentName === "SOSHI"
  ? `⚠️ Cannot post autonomously — posts go to the Social Queue for Simao's one-click approval
⚠️ Cannot browse the internet — work from business context and Brain documents`
  : `⚠️ Cannot directly post to social media — route content through SOSHI or the Social Media section
⚠️ Cannot browse the internet — work from business context and Brain documents
⚠️ Cannot execute actions autonomously — generate the work, Simao executes it`}
━━━━━━━━━━━━━━━━━━━━`;
}

// ── Cross-Agent Team Activity ────────────────────────────────────────────────
// Queries what other agents have been working on in the same workspace,
// so every agent has team-wide context.

async function getCrossAgentContext(businessTag: string, currentAgentId: number): Promise<string> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get recent conversations from OTHER agents in the same workspace
    const recentConvs = await db
      .select({
        convId: conversations.id,
        convTitle: conversations.title,
        agentId: conversations.agentId,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.businessTag, businessTag),
          ne(conversations.agentId, currentAgentId),
          gte(conversations.updatedAt, sevenDaysAgo)
        )
      )
      .orderBy(desc(conversations.updatedAt))
      .limit(6);

    if (recentConvs.length === 0) return "";

    // For each conversation, get the last assistant message and the agent name
    const teamActivity: string[] = [];

    for (const conv of recentConvs) {
      const [lastMsg] = await db
        .select({ content: messages.content })
        .from(messages)
        .where(and(eq(messages.conversationId, conv.convId), eq(messages.role, "assistant")))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      if (!lastMsg?.content) continue;

      const [agent] = await db
        .select({ name: agentsTable.name, icon: agentsTable.icon })
        .from(agentsTable)
        .where(eq(agentsTable.id, conv.agentId));

      if (!agent) continue;

      // Truncate the message to a useful summary length
      const preview = lastMsg.content.length > 300
        ? lastMsg.content.slice(0, 300).replace(/\n+/g, " ").trim() + "…"
        : lastMsg.content.replace(/\n+/g, " ").trim();

      const timeAgo = formatTimeAgo(conv.updatedAt);
      teamActivity.push(`  • ${agent.icon} ${agent.name} (${timeAgo}): ${preview}`);
    }

    if (teamActivity.length === 0) return "";

    return `━━━ TEAM ACTIVITY (what your colleagues are working on) ━━━
The following is recent work your AI colleagues have completed in this workspace. Use this for context — if a colleague has already done relevant work, build on it rather than starting from scratch.

${teamActivity.join("\n\n")}
━━━━━━━━━━━━━━━━━━━━`;
  } catch {
    return "";
  }
}

// ── SOSHI Social Connections Context ─────────────────────────────────────────
// When SOSHI is the agent, inject info about connected platforms so she knows
// she CAN queue posts and which platforms are ready.

async function getSoshiConnectionsContext(): Promise<string> {
  try {
    const conns = await db.select().from(connectionsTable);
    // Include any connection marked isConnected — token presence checked separately at publish time
    const connected = conns.filter(c => c.isConnected);
    const platformNames = connected.map(c => c.accountLabel || c.platform).join(", ");

    return `━━━ SOCIAL QUEUE TOOL ━━━
You have a REAL tool called save_posts_to_queue. When Simao asks you to create, schedule, or queue social media posts, you MUST call this tool — it actually saves the posts to the hub's Social Queue database so Simao can review and publish with one click.

${connected.length > 0
  ? `Connected platforms: ${platformNames}. These are ready for publishing after Simao approves.`
  : `No platforms are connected yet — but you can still save drafts to the queue for when they get connected.`}

YOUR ACTION TOOLS:
• save_posts_to_queue — saves posts directly to the Social Queue (Simao reviews + publishes with one click)
• create_agent_handoff — passes work to any teammate agent — creates a real pre-seeded conversation in their sidebar instantly

MANDATORY WORKFLOWS:
When asked to create/schedule posts → write them → call save_posts_to_queue → THEN call create_agent_handoff to PIXEL → confirm to Simao

PIXEL HANDOFF — CRITICAL INSTRUCTIONS:
After calling save_posts_to_queue, ALWAYS call create_agent_handoff with:
  target_agent_slug: "pixel"
  task_for_target: "SOSHI has already written and saved the following posts to the queue. Your ONLY job is to write ONE image prompt per post in your PIXEL PROMPT format. Do NOT write new post copy. Do NOT write captions or hashtags. ONLY the image prompt for each post.\n\n[list each post content here]"

PIXEL writes image prompts ONLY — you write the copy. Never ask PIXEL to write post text.
NEVER say you cannot post, cannot connect to Facebook, or need OAuth. You queue — Simao publishes.
━━━━━━━━━━━━━━━━━━━━`;
  } catch {
    return "";
  }
}

// ── Build tool definitions for a given agent slug ────────────────────────────
function buildAgentTools(agentSlug: string, excludeSlug?: string): any[] {
  const otherSlugs = AGENT_ROSTER
    .filter(a => a.slug !== (excludeSlug ?? agentSlug))
    .map(a => a.slug);

  const universal = [
    {
      name: "create_agent_handoff",
      description: "Pass work to a specialist colleague agent. This ACTUALLY creates a new conversation for the target agent, pre-loaded with context, so they can immediately pick up where you left off.",
      input_schema: {
        type: "object",
        properties: {
          target_agent_slug: { type: "string", enum: otherSlugs },
          context_summary: { type: "string" },
          task_for_target: { type: "string" },
        },
        required: ["target_agent_slug", "context_summary", "task_for_target"],
      },
    },
  ];

  const soshi = agentSlug === "soshi" ? [
    {
      name: "save_posts_to_queue",
      description: "Save drafted social media posts to the Social Queue for Simao's one-click review and publishing. Call this EVERY time you create posts.",
      input_schema: {
        type: "object",
        properties: {
          posts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                platform: { type: "string", enum: ["meta", "linkedin", "twitter", "tiktok"] },
                content:  { type: "string" },
                topic:    { type: "string" },
              },
              required: ["platform", "content"],
            },
          },
        },
        required: ["posts"],
      },
    },
  ] : [];

  const pixel = agentSlug === "pixel" ? [
    {
      name: "generate_image_for_post",
      description: "Generate a real AI image for a social media post and attach it to that post in the queue. Call this once per post after writing your image prompt.",
      input_schema: {
        type: "object",
        properties: {
          post_id:      { type: "number", description: "The social post ID (provided in the handoff)" },
          image_prompt: { type: "string", description: "The detailed AI image prompt you crafted" },
        },
        required: ["post_id", "image_prompt"],
      },
    },
  ] : [];

  return [...universal, ...soshi, ...pixel];
}

// ── Execute a single tool call — used in both the main handler and auto-respond
async function executeToolCall(
  toolUse: any,
  ctx: { convId: number; agentName: string; agentSlug: string; businessTag: string },
  sseWrite?: (data: object) => void,
): Promise<{ tool_use_id: string; content: string; is_error?: boolean }> {
  const { convId, agentName, businessTag } = ctx;
  const write = sseWrite ?? (() => {});

  if (toolUse.name === "create_agent_handoff") {
    const input = toolUse.input as { target_agent_slug: string; context_summary: string; task_for_target: string };
    try {
      const [targetAgent] = await db.select().from(agentsTable).where(eq(agentsTable.slug, input.target_agent_slug));
      if (!targetAgent) throw new Error(`Agent "${input.target_agent_slug}" not found`);

      const targetInfo = AGENT_ROSTER.find(a => a.slug === input.target_agent_slug);
      const seedMessage = [
        `${agentName} is handing this work to you.`,
        `\n**What was worked on:**\n${input.context_summary}`,
        `\n**Your task:**\n${input.task_for_target}`,
        `\nPlease pick up immediately and deliver your best work.`,
      ].join("\n");

      const [newConv] = await db.insert(conversations).values({
        title: `From ${agentName} — ${new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`,
        agentId: targetAgent.id,
        businessTag,
      }).returning();

      await db.insert(messages).values({ conversationId: newConv.id, role: "user", content: seedMessage });

      write({ agentHandoff: {
        conversationId: newConv.id, agentId: targetAgent.id,
        agentSlug: input.target_agent_slug, agentName: targetAgent.name,
        agentIcon: targetInfo?.icon ?? "🤖",
      }});

      // Auto-respond in target agent's conversation (fire-and-forget)
      autoRespondAfterHandoff(targetAgent, newConv.id, businessTag, seedMessage)
        .catch(e => console.error("Auto-respond error:", e));

      return {
        tool_use_id: toolUse.id,
        content: `Handed off to ${targetAgent.name}. New conversation ID: ${newConv.id}. ${targetAgent.name} is generating their response now.`,
      };
    } catch (err: any) {
      return { tool_use_id: toolUse.id, content: err.message ?? "Handoff failed", is_error: true };
    }
  }

  if (toolUse.name === "save_posts_to_queue") {
    const input = toolUse.input as { posts: { platform: string; content: string; topic?: string }[] };
    const savedPosts: any[] = [];
    for (const post of input.posts) {
      const [saved] = await db.insert(socialPostsTable).values({
        platform: post.platform, content: post.content, topic: post.topic ?? null,
        businessTag, status: "pending_approval", aiGenerated: true, agentSlug: "soshi",
      }).returning();
      savedPosts.push(saved);
      write({ socialPostSaved: { id: saved.id, platform: saved.platform, topic: saved.topic } });
    }
    const postSummary = savedPosts.map(p => `- Post ID ${p.id} (${p.platform}): "${p.content.slice(0, 100)}..."`).join("\n");
    return {
      tool_use_id: toolUse.id,
      content: `Saved ${savedPosts.length} post(s) to the Social Queue.\n\nPOST IDs for PIXEL:\n${postSummary}\n\nNow call create_agent_handoff with target "pixel". Include ALL Post IDs and the full post content in task_for_target so PIXEL can generate one image per post.`,
    };
  }

  if (toolUse.name === "generate_image_for_post") {
    const input = toolUse.input as { post_id: number; image_prompt: string };
    try {
      if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
      const buffer = await generateImageBuffer(input.image_prompt, "1024x1024");
      const filename = `social-${input.post_id}-${Date.now()}.png`;
      const filepath = path.join(IMAGES_DIR, filename);
      fs.writeFileSync(filepath, buffer);
      const imageUrl = `/api/generated-images/${filename}`;
      await db.update(socialPostsTable)
        .set({ imageUrl, imagePrompt: input.image_prompt, updatedAt: new Date() })
        .where(eq(socialPostsTable.id, input.post_id));
      write({ imageGenerated: { postId: input.post_id, imageUrl } });
      return { tool_use_id: toolUse.id, content: `Image generated and attached to Post #${input.post_id} at ${imageUrl}.` };
    } catch (imgErr: any) {
      await db.update(socialPostsTable)
        .set({ imagePrompt: input.image_prompt, updatedAt: new Date() })
        .where(eq(socialPostsTable.id, input.post_id));
      return { tool_use_id: toolUse.id, content: `Image generation failed: ${imgErr.message}. Prompt saved for manual generation.`, is_error: true };
    }
  }

  return { tool_use_id: toolUse.id, content: "Unknown tool", is_error: true };
}

// ── Auto-respond on behalf of a target agent after handoff ───────────────────
// Runs a full tool-use loop so PIXEL can actually generate images, not just describe them.
async function autoRespondAfterHandoff(
  targetAgent: { id: number; name: string; slug: string; systemPrompt: string | null },
  newConvId: number,
  businessTag: string,
  seedMessage: string,
): Promise<void> {
  try {
    let businessContext = "";
    try {
      const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.slug, businessTag));
      businessContext = ws?.businessContext
        ? `━━━ BUSINESS CONTEXT ━━━\n${ws.businessContext}\n━━━━━━━━━━━━━━━━━━━━`
        : ws?.name
          ? `━━━ BUSINESS CONTEXT ━━━\nYou are working in the "${ws.name}" workspace for Simao Alves.\n━━━━━━━━━━━━━━━━━━━━`
          : `━━━ BUSINESS CONTEXT ━━━\nYou are working for Simao Alves, a serial entrepreneur with 5 active businesses.\n━━━━━━━━━━━━━━━━━━━━`;
    } catch { /* default */ }

    const soshiContext = targetAgent.slug === "soshi" ? await getSoshiConnectionsContext() : "";
    const brainContext = await getBrainContext(seedMessage);
    const brainBlock = brainContext ? `━━━ BRAIN DOCUMENTS ━━━\n${brainContext}\n━━━━━━━━━━━━━━━━━━━━` : "";

    const systemPrompt = [
      buildHubIdentityBlock(targetAgent.name),
      businessContext,
      soshiContext,
      targetAgent.systemPrompt,
      `Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`,
      brainBlock,
    ].filter(Boolean).join("\n\n");

    const tools = buildAgentTools(targetAgent.slug);
    let loopMessages: any[] = [{ role: "user", content: seedMessage }];
    let finalText = "";

    for (let round = 0; round < 5; round++) {
      const resp = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        messages: loopMessages,
        tools,
        tool_choice: { type: "auto" },
      });

      if (resp.stop_reason !== "tool_use") {
        const textBlock = resp.content.find((b: any) => b.type === "text");
        if (textBlock?.type === "text") finalText = textBlock.text;
        break;
      }

      // Collect text generated before tool calls (if any)
      const partialText = resp.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
      if (partialText) finalText += partialText;

      const toolUseBlocks = resp.content.filter((b: any) => b.type === "tool_use");
      const toolResults: any[] = [];
      for (const toolUse of toolUseBlocks) {
        const result = await executeToolCall(
          toolUse,
          { convId: newConvId, agentName: targetAgent.name, agentSlug: targetAgent.slug, businessTag },
        );
        toolResults.push({ type: "tool_result", ...result });
      }

      loopMessages = [
        ...loopMessages,
        { role: "assistant", content: resp.content },
        { role: "user", content: toolResults },
      ];
    }

    if (finalText) {
      await db.insert(messages).values({ conversationId: newConvId, role: "assistant", content: finalText });
    }
  } catch (err) {
    console.error("autoRespondAfterHandoff error:", err);
  }
}

function formatTimeAgo(date: Date | string): string {
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffD = Math.floor(diffH / 24);
  if (diffH < 1) return "just now";
  if (diffH < 24) return `${diffH}h ago`;
  return `${diffD}d ago`;
}

// ── Routes ───────────────────────────────────────────────────────────────────

// List conversations, optionally filtered by agentId
router.get("/conversations", async (req, res) => {
  try {
    const { agentId } = req.query;
    let query = db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.updatedAt))
      .limit(50);

    if (agentId) {
      query = query.where(eq(conversations.agentId, parseInt(agentId as string))) as typeof query;
    }

    const convs = await query;
    res.json(convs);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Create a conversation
router.post("/conversations", async (req, res) => {
  try {
    const { title, agentId, businessTag } = req.body;
    const [conv] = await db.insert(conversations).values({
      title,
      agentId,
      businessTag: businessTag || "general",
    }).returning();
    res.status(201).json(conv);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// Get conversation with messages
router.get("/conversations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    res.json({ ...conv, messages: msgs });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

// Delete a conversation
router.delete("/conversations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deleted] = await db.delete(conversations).where(eq(conversations.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Conversation not found" });
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

// List messages in a conversation
router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);
    res.json(msgs);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ── Hand off a conversation to another agent ─────────────────────────────────
// Creates a new conversation with the target agent, pre-seeded with a
// summary of what was discussed in the source conversation.
router.post("/conversations/:id/handoff", async (req, res) => {
  try {
    const sourceConvId = parseInt(req.params.id);
    const { targetAgentId, note } = req.body;

    const [sourceConv] = await db.select().from(conversations).where(eq(conversations.id, sourceConvId));
    if (!sourceConv) return res.status(404).json({ error: "Source conversation not found" });

    const [targetAgent] = await db.select().from(agentsTable).where(eq(agentsTable.id, targetAgentId));
    if (!targetAgent) return res.status(404).json({ error: "Target agent not found" });

    const [sourceAgent] = await db.select().from(agentsTable).where(eq(agentsTable.id, sourceConv.agentId));

    // Get the last 6 messages from the source conversation for context
    const sourceMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, sourceConvId))
      .orderBy(desc(messages.createdAt))
      .limit(6);

    const contextLines = sourceMessages
      .reverse()
      .map(m => `${m.role === "user" ? "Simao" : (sourceAgent?.name ?? "AI")}: ${m.content.slice(0, 400)}${m.content.length > 400 ? "…" : ""}`)
      .join("\n\n");

    // Create the new conversation
    const [newConv] = await db.insert(conversations).values({
      title: `From ${sourceAgent?.name ?? "team"} — ${new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`,
      agentId: targetAgentId,
      businessTag: sourceConv.businessTag,
    }).returning();

    // Inject the handoff context as the first user message
    const handoffMsg = [
      `${targetAgent.name}, I'm handing this work over from ${sourceAgent?.name ?? "another agent"}.`,
      note ? `Additional instructions: ${note}` : "",
      `Here's the conversation context:\n\n${contextLines}`,
      `\nPlease review this context and continue from where we left off, applying your expertise.`,
    ].filter(Boolean).join("\n\n");

    await db.insert(messages).values({
      conversationId: newConv.id,
      role: "user",
      content: handoffMsg,
    });

    // Respond to the client immediately, then auto-generate the target agent's reply
    res.status(201).json({ conversationId: newConv.id, agentId: targetAgentId });

    // Fire-and-forget: target agent responds to the handoff context automatically
    autoRespondAfterHandoff(
      { id: targetAgent.id, name: targetAgent.name, slug: targetAgent.slug, systemPrompt: targetAgent.systemPrompt },
      newConv.id,
      sourceConv.businessTag,
      handoffMsg,
    ).catch(e => console.error("Manual handoff auto-respond error:", e));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create handoff" });
  }
});

// ── Send message with streaming response ─────────────────────────────────────
router.post("/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  const { content } = req.body;

  try {
    // Verify conversation exists and get agent
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, conv.agentId));
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    // Save user message
    await db.insert(messages).values({ conversationId: id, role: "user", content });

    // Get prior messages for context (last 20)
    const priorMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt)
      .limit(20);

    // Get brain context
    const brainContext = await getBrainContext(content);

    // Get workspace business context
    let businessContext = "";
    try {
      const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.slug, conv.businessTag));
      if (ws?.businessContext) {
        businessContext = `━━━ BUSINESS CONTEXT ━━━\n${ws.businessContext}\n━━━━━━━━━━━━━━━━━━━━`;
      } else if (ws?.name) {
        businessContext = `━━━ BUSINESS CONTEXT ━━━\nYou are working in the "${ws.name}" workspace for Simao Alves.\n━━━━━━━━━━━━━━━━━━━━`;
      } else {
        businessContext = `━━━ BUSINESS CONTEXT ━━━\nYou are working for Simao Alves, a serial entrepreneur with 5 active businesses: LES A Inspections (home inspection, B2B with realtors), CarrierDeskHQ (trucking consulting SaaS), SalonSync Hub (salon management SaaS), Sweepello (cleaning marketplace SaaS), and Real Estate Investments.\n━━━━━━━━━━━━━━━━━━━━`;
      }
    } catch {
      businessContext = `━━━ BUSINESS CONTEXT ━━━\nYou are working for Simao Alves, a serial entrepreneur.\n━━━━━━━━━━━━━━━━━━━━`;
    }

    // Get cross-agent team activity (what other agents have been doing)
    const teamContext = await getCrossAgentContext(conv.businessTag, conv.agentId);

    // SOSHI-specific: inject connected platforms so she knows she can queue posts
    const soshiContext = agent.slug === "soshi" ? await getSoshiConnectionsContext() : "";

    // Brain context block
    const brainBlock = brainContext
      ? `━━━ BRAIN DOCUMENTS (knowledge base) ━━━\n${brainContext}\n━━━━━━━━━━━━━━━━━━━━`
      : "";

    // Build final system prompt
    const systemPrompt = [
      buildHubIdentityBlock(agent.name),
      businessContext,
      soshiContext,
      teamContext,
      agent.systemPrompt,
      `Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`,
      brainBlock,
    ]
      .filter(Boolean)
      .join("\n\n");

    // Build message history
    const chatMessages = priorMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let fullResponse = "";

    // ── Multi-turn tool loop ───────────────────────────────────────────────────
    // Runs up to 6 non-streaming rounds of tool calls (so SOSHI can call
    // save_posts_to_queue in round 1, then create_agent_handoff in round 2, etc.)
    // then streams the final text to the client.
    const agentTools = buildAgentTools(agent.slug);
    const sseWrite = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    let loopMessages: any[] = [...chatMessages];
    let finalBlocks: any[] = [];

    for (let round = 0; round < 6; round++) {
      const loopResp = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: systemPrompt,
        messages: loopMessages,
        tools: agentTools,
        tool_choice: { type: "auto" },
      });

      if (loopResp.stop_reason !== "tool_use") {
        finalBlocks = loopResp.content;
        break;
      }

      const toolUseBlocks = loopResp.content.filter((b: any) => b.type === "tool_use");
      const toolResults: any[] = [];
      for (const toolUse of toolUseBlocks) {
        if (toolUse.type !== "tool_use") continue;
        const result = await executeToolCall(
          toolUse,
          { convId: id, agentName: agent.name, agentSlug: agent.slug, businessTag: conv.businessTag },
          sseWrite,
        );
        toolResults.push({ type: "tool_result", ...result });
      }

      loopMessages = [
        ...loopMessages,
        { role: "assistant", content: loopResp.content },
        { role: "user", content: toolResults },
      ];

      // Safety: if we hit the last round and still in tool_use, get a final response
      if (round === 5) {
        const finalResp = await anthropic.messages.create({
          model: "claude-sonnet-4-6", max_tokens: 2048, system: systemPrompt, messages: loopMessages,
        });
        finalBlocks = finalResp.content;
      }
    }

    // ── Stream final text to client ────────────────────────────────────────────
    for (const block of finalBlocks) {
      if (block.type === "text") {
        fullResponse += block.text;
        const chunks = block.text.match(/.{1,120}/g) ?? [block.text];
        for (const chunk of chunks) {
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }
      }
    }

    // Save assistant message
    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    // Update conversation updatedAt
    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, id));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to process message" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
