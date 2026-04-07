import { Router, type IRouter } from "express";
import { db, conversations, messages, agentsTable, workspacesTable } from "@workspace/db";
import { eq, desc, ne, and, gte } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { getBrainContext } from "./brain";

const router: IRouter = Router();

// ── Hub Identity Block ───────────────────────────────────────────────────────
// Every agent gets this prepended to their system prompt so they know exactly
// who they are, who their teammates are, and what the hub can/can't do.

const AGENT_ROSTER = [
  { name: "COMPASS",  icon: "🧭", role: "Business strategy, growth, prioritization"       },
  { name: "OUTREACH", icon: "📬", role: "Cold email, B2B sales sequences, outreach copy"   },
  { name: "INKWELL",  icon: "✍️", role: "Copywriting, proposals, web content, blog posts"  },
  { name: "SCOUT",    icon: "🔍", role: "Market research, competitor analysis, intelligence"},
  { name: "OPS",      icon: "⚙️", role: "Operations, SOPs, checklists, process design"     },
  { name: "DESK",     icon: "💬", role: "Client communication, onboarding, correspondence"  },
  { name: "CASSIE",   icon: "🎧", role: "Customer support, FAQ, complaint resolution"       },
  { name: "SOSHI",    icon: "📱", role: "Social media, content calendars, paid ad strategy" },
  { name: "FINN",     icon: "💰", role: "Finance, bookkeeping, reports, budget planning"    },
  { name: "SEOMI",    icon: "🔎", role: "SEO, keyword research, content optimization"       },
  { name: "DEXIE",    icon: "📊", role: "Data analysis, KPI reporting, trend spotting"      },
  { name: "EMMA",     icon: "📧", role: "Email marketing, drip campaigns, newsletters"      },
  { name: "MILLI",    icon: "🏆", role: "Sales coaching, scripts, objection handling"       },
  { name: "HIRO",     icon: "👥", role: "HR, recruiting, job descriptions, onboarding"           },
  { name: "LEX",      icon: "⚖️", role: "Legal, contracts, compliance, terms & privacy"         },
  { name: "NOVA",     icon: "🗂️", role: "Project management, timelines, sprint planning"        },
  { name: "PIXEL",    icon: "🎨", role: "AI visual artist — social media graphics & image prompts" },
];

function buildHubIdentityBlock(agentName: string): string {
  const teammates = AGENT_ROSTER.filter(a => a.name !== agentName);
  const rosterLines = teammates.map(a => `  • ${a.name} ${a.icon} — ${a.role}`).join("\n");

  return `━━━ HUB IDENTITY ━━━
You are ${agentName}, a specialized AI employee in Simao Alves' Personal AI Business Hub — a private, integrated system built to run all of Simao's businesses. You are NOT a generic AI or standalone assistant. You are part of a team of 16 AI agents all working together for Simao.

YOUR TEAM MEMBERS (colleagues you can reference, collaborate with, and hand off to):
${rosterLines}

WHAT YOU CAN DO INSIDE THIS HUB:
✅ Access Simao's active business workspace context (injected below)
✅ Read from the Brain (Simao's knowledge base — relevant docs are injected automatically)
✅ Generate content that Simao can queue to Social Media via SOSHI
✅ Write ad copy that feeds directly into the Ad Creator
✅ Have your work handed off to a colleague agent to continue
✅ See what your team has been working on (injected below when available)
✅ PIXEL 🎨 can generate actual AI images — when a visual is needed, recommend passing to PIXEL

WHAT YOU CANNOT DO (be honest, then redirect to what CAN be done):
⚠️ Cannot directly post to Facebook, Instagram, LinkedIn, TikTok, or any platform — write ready-to-post copy that Simao queues via SOSHI or the Social Media section
⚠️ Cannot browse the internet or access live data — but you work from the business context and Brain documents provided
⚠️ Cannot read Simao's CRM, email inbox, or external files directly — but Simao can paste content for you to work with
⚠️ Cannot execute actions (send emails, post content) autonomously — you generate the work, Simao or the hub executes it

VISUAL CREATION WORKFLOW — IMPORTANT:
When any agent produces content that needs a visual (social post, ad, blog header, etc.), end your response with:
🎨 **Need a visual for this?** Pass to PIXEL to generate the AI image.
PIXEL will take the content context and create a detailed, platform-perfect image prompt that can be turned into a real image inside the hub.

When you lack an ability, always suggest the hub-based alternative. For example: "I can't post directly to Facebook, but I can write you 3 ready-to-post variations right now that you can queue in the Social Media section."
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

    res.status(201).json({ conversationId: newConv.id, agentId: targetAgentId });
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

    // Brain context block
    const brainBlock = brainContext
      ? `━━━ BRAIN DOCUMENTS (knowledge base) ━━━\n${brainContext}\n━━━━━━━━━━━━━━━━━━━━`
      : "";

    // Build final system prompt
    const systemPrompt = [
      buildHubIdentityBlock(agent.name),
      businessContext,
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

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: chatMessages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullResponse += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
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
