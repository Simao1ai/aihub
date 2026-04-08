import { Router, type IRouter } from "express";
import { db, conversations, messages, agentsTable, workspacesTable, connectionsTable, socialPostsTable } from "@workspace/db";
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
${agentName === "SOSHI"
  ? `⚠️ Cannot post autonomously without Simao's approval — posts go to the Social Queue first for Simao to review and publish with one click
⚠️ Cannot browse the internet or access live data — work from the business context and Brain documents provided
⚠️ Cannot read Simao's CRM or email inbox — but Simao can paste content for you to work with`
  : `⚠️ Cannot directly post to Facebook, Instagram, LinkedIn, TikTok, or any platform — write ready-to-post copy that Simao queues via SOSHI or the Social Media section
⚠️ Cannot browse the internet or access live data — but you work from the business context and Brain documents provided
⚠️ Cannot read Simao's CRM, email inbox, or external files directly — but Simao can paste content for you to work with
⚠️ Cannot execute actions (send emails, post content) autonomously — you generate the work, Simao or the hub executes it`}

VISUAL CREATION WORKFLOW — IMPORTANT:
When any agent produces content that needs a visual (social post, ad, blog header, etc.), end your response with:
🎨 **Need a visual for this?** Pass to PIXEL to generate the AI image.
PIXEL will take the content context and create a detailed, platform-perfect image prompt that can be turned into a real image inside the hub.

${agentName === "SOSHI"
  ? `When Simao asks you to schedule or post content: write the posts, then tell him clearly: "Your posts are ready — go to the Social Media section in the hub to review and publish them to your connected [platform name] with one click. No external tools needed."`
  : `When you lack an ability, always suggest the hub-based alternative. For example: "I can't post directly to Facebook, but I can write you 3 ready-to-post variations right now that you can queue in the Social Media section."`}
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

MANDATORY WORKFLOW when asked to create social posts:
1. Write excellent, ready-to-publish post copy for each platform requested
2. Call save_posts_to_queue with ALL the posts — do not skip this step
3. After the tool confirms they are saved, tell Simao: "I've just saved [X] posts to your Social Queue — go to the Social Media section to review and publish them with one click."
4. NEVER say you cannot post, cannot connect to Facebook, or need OAuth. You queue the posts — Simao publishes them.
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

    // ── SOSHI: tool calling for real social post queuing ─────────────────────
    if (agent.slug === "soshi") {
      const soshiTools: any[] = [
        {
          name: "save_posts_to_queue",
          description: "Save drafted social media posts to the Social Queue for Simao's review and one-click publishing. Call this EVERY time you create posts that Simao wants scheduled or published. Do not ask the user to go find a section — just call this tool and the posts will be there.",
          input_schema: {
            type: "object",
            properties: {
              posts: {
                type: "array",
                description: "Array of posts to save",
                items: {
                  type: "object",
                  properties: {
                    platform: {
                      type: "string",
                      enum: ["meta", "linkedin", "twitter", "tiktok"],
                      description: "Social platform slug: meta (Facebook/Instagram), linkedin, twitter, tiktok",
                    },
                    content: {
                      type: "string",
                      description: "The complete, ready-to-publish post text including hashtags",
                    },
                    topic: {
                      type: "string",
                      description: "Brief topic/label for this post",
                    },
                  },
                  required: ["platform", "content"],
                },
              },
            },
            required: ["posts"],
          },
        },
      ];

      // Phase 1: non-streaming call to detect tool use
      const phase1 = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: systemPrompt,
        messages: chatMessages,
        tools: soshiTools,
        tool_choice: { type: "auto" },
      });

      if (phase1.stop_reason === "tool_use") {
        // Execute every tool call
        const toolUseBlocks = phase1.content.filter((b: any) => b.type === "tool_use");
        const toolResults: any[] = [];
        const savedPosts: any[] = [];

        for (const toolUse of toolUseBlocks) {
          if (toolUse.type !== "tool_use") continue;
          if (toolUse.name === "save_posts_to_queue") {
            const input = toolUse.input as { posts: { platform: string; content: string; topic?: string }[] };
            for (const post of input.posts) {
              const [saved] = await db.insert(socialPostsTable).values({
                platform: post.platform,
                content: post.content,
                topic: post.topic ?? null,
                businessTag: conv.businessTag,
                status: "pending_approval",
                aiGenerated: true,
                agentSlug: "soshi",
              }).returning();
              savedPosts.push(saved);
              // Notify the frontend in real time
              res.write(`data: ${JSON.stringify({ socialPostSaved: { id: saved.id, platform: saved.platform, topic: saved.topic } })}\n\n`);
            }
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: `Successfully saved ${savedPosts.length} post(s) to the Social Queue. Posts are now in the Social Media section awaiting Simao's review and one-click publishing.`,
            });
          }
        }

        // Phase 2: stream the final response after tool results
        const phase2Messages: any[] = [
          ...chatMessages,
          { role: "assistant", content: phase1.content },
          { role: "user", content: toolResults },
        ];

        const stream2 = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          system: systemPrompt,
          messages: phase2Messages,
          tools: soshiTools,
        });

        for await (const event of stream2) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            fullResponse += event.delta.text;
            res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
          }
        }
      } else {
        // No tool use — stream the text content from phase1 response
        for (const block of phase1.content) {
          if (block.type === "text") {
            fullResponse += block.text;
            // Stream in ~100-char chunks so it feels live
            const chunks = block.text.match(/.{1,100}/g) ?? [block.text];
            for (const chunk of chunks) {
              res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
            }
          }
        }
      }
    } else {
      // ── All other agents: standard streaming ─────────────────────────────
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
