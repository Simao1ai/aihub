import { db, agentsTable, automationsTable } from "@workspace/db";
import { logger } from "./logger";

const AGENTS = [
  {
    name: "COMPASS",
    slug: "compass",
    roleDescription: "Senior business strategist for Equifind Recovery and home inspection businesses.",
    systemPrompt: `You are COMPASS, a senior business strategist. You help with strategic decisions, prioritization, opportunity analysis, and competitive strategy for Equifind Recovery (Florida tax deed surplus fund recovery SaaS) and a home inspection business with realtor network. Be direct, insightful, and action-oriented.`,
    icon: "🧭",
    color: "#6366f1",
    isActive: true,
  },
  {
    name: "OUTREACH",
    slug: "outreach",
    roleDescription: "Expert at writing cold outreach, follow-up sequences, and persuasive email copy.",
    systemPrompt: `You are OUTREACH, an expert cold outreach and email copywriter. You craft compelling cold outreach sequences, follow-up emails, and persuasive copy for realtor partnerships and enterprise sales. Your emails feel human, not robotic. You understand B2B sales cycles and how to get responses from busy professionals.`,
    icon: "📬",
    color: "#f59e0b",
    isActive: true,
  },
  {
    name: "INKWELL",
    slug: "inkwell",
    roleDescription: "Professional copywriter for proposals, contracts, marketing materials, and website copy.",
    systemPrompt: `You are INKWELL, a professional copywriter. You create proposals, contracts, marketing materials, and website copy that matches the brand voice of Equifind Recovery and the home inspection business. Your writing is clear, persuasive, and professional.`,
    icon: "✍️",
    color: "#10b981",
    isActive: true,
  },
  {
    name: "SCOUT",
    slug: "scout",
    roleDescription: "Data analyst and researcher for case data, skip-tracing results, and market research.",
    systemPrompt: `You are SCOUT, a data analyst and researcher. You analyze surplus fund case data, skip-tracing results, market research, and recovery portfolios for Equifind Recovery. You identify patterns, rank opportunities by probability, and provide clear analytical insights. You also research the home inspection market and realtor network opportunities.`,
    icon: "🔍",
    color: "#3b82f6",
    isActive: true,
  },
  {
    name: "OPS",
    slug: "ops",
    roleDescription: "Operations assistant for task management, scheduling, SOPs, and cross-venture coordination.",
    systemPrompt: `You are OPS, an operations and administrative assistant. You help with task management, scheduling prep, meeting agendas, standard operating procedures (SOPs), and cross-venture coordination between Equifind Recovery and the home inspection business. You keep things organized, efficient, and running smoothly.`,
    icon: "⚙️",
    color: "#8b5cf6",
    isActive: true,
  },
  {
    name: "DESK",
    slug: "desk",
    roleDescription: "Client communication specialist for partner portal support, onboarding, and correspondence.",
    systemPrompt: `You are DESK, a client communication specialist. You handle Equifind partner portal support, onboarding emails, and professional client correspondence. Your tone is warm but professional. You ensure clients feel supported and informed throughout their journey.`,
    icon: "💬",
    color: "#ef4444",
    isActive: true,
  },
];

export async function seedDatabase() {
  try {
    // Check if already seeded
    const existingAgents = await db.select().from(agentsTable).limit(1);
    if (existingAgents.length > 0) {
      logger.info("Database already seeded, skipping");
      return;
    }

    logger.info("Seeding database with agents and automations...");

    // Insert agents
    const insertedAgents = await db.insert(agentsTable).values(AGENTS).returning();

    const agentMap = Object.fromEntries(insertedAgents.map((a) => [a.slug, a.id]));

    // Insert automations
    await db.insert(automationsTable).values([
      {
        name: "Weekly Realtor Outreach Draft",
        agentId: agentMap.outreach,
        scheduleCron: "0 8 * * 1", // Every Monday 8am
        promptTemplate: `Draft 3 personalized cold outreach emails to realtors for home inspection partnerships. Include a subject line, opening hook, value proposition, and CTA. Make them feel human and conversational, not corporate. Each email should be for a different realtor persona (e.g., new agent, top producer, team leader).`,
        isActive: true,
        status: "idle",
      },
      {
        name: "Equifind Weekly Strategy Brief",
        agentId: agentMap.compass,
        scheduleCron: "0 16 * * 5", // Every Friday 4pm
        promptTemplate: `Generate a weekly strategic review for Equifind Recovery. Cover: what to prioritize next week, any risks to watch, one growth action item, and any opportunities in the Florida tax deed surplus fund space. Be specific and actionable.`,
        isActive: true,
        status: "idle",
      },
      {
        name: "Case Research Summary",
        agentId: agentMap.scout,
        scheduleCron: null, // On-demand only
        promptTemplate: `Summarize the current state of the Lee County surplus fund recovery pipeline. Identify which case types have highest recovery probability and suggest next skip-tracing steps. Highlight any patterns in successful recoveries vs. stalled cases.`,
        isActive: true,
        status: "idle",
      },
    ]);

    logger.info("Database seeded successfully");
  } catch (err) {
    logger.error(err, "Failed to seed database");
  }
}
