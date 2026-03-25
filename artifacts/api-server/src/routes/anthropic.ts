import { Router, type IRouter } from "express";
import { db, conversations, messages, agentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { getBrainContext } from "./brain";

const router: IRouter = Router();

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

// Send message with streaming response
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

    // Get prior messages for context
    const priorMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt)
      .limit(20);

    // Get brain context
    const brainContext = await getBrainContext(content);

    // Build system prompt
    const systemPrompt = [
      agent.systemPrompt,
      `You are working for Simao, an entrepreneur running Equifind Recovery (Florida tax deed surplus fund recovery SaaS) and a home inspection business with realtor network.`,
      `Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`,
      brainContext,
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
