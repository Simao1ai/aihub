import { db, agentsTable, automationsTable, workspacesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

const WORKSPACES = [
  {
    name: "General",
    slug: "general",
    description: "Full access across all businesses and agents",
    emoji: "⚡",
    color: "#6366f1",
    password: process.env.GENERAL_PASSWORD || "aihub2024",
    businessContext: "You have full access to all of Simao's businesses: LES A Inspections (home inspection, B2B with realtors), CarrierDeskHQ (trucking consulting SaaS), SalonSync Hub (salon management SaaS), Sweepello (cleaning marketplace SaaS), and Real Estate Investments. Provide cross-business strategic guidance as needed.",
    sortOrder: 0,
    isActive: true,
  },
  {
    name: "LES A Inspections",
    slug: "les_a_inspections",
    description: "Home inspection B2B business with realtor network",
    emoji: "🏠",
    color: "#10b981",
    password: process.env.LES_A_PASSWORD || "aihub2024",
    businessContext: "LES A Inspections is Simao's home inspection business. It operates B2B, partnering with real estate agents and realtors to provide home inspection services. Key goals: grow the realtor referral network, increase inspection volume, build a strong reputation in the local market. Revenue model: per-inspection fees paid by home buyers, referred by realtor partners.",
    sortOrder: 1,
    isActive: true,
  },
  {
    name: "CarrierDeskHQ",
    slug: "carrierdeskh_q",
    description: "Trucking consulting and dispatch SaaS platform",
    emoji: "🚛",
    color: "#f59e0b",
    password: process.env.CARRIERDESKH_PASSWORD || "aihub2024",
    businessContext: "CarrierDeskHQ is Simao's trucking consulting and dispatch SaaS. It helps owner-operators and small trucking companies manage dispatch, load finding, and compliance. Key goals: acquire trucking clients, reduce churn, build SaaS features that solve real carrier pain points. Revenue model: monthly SaaS subscriptions from trucking companies.",
    sortOrder: 2,
    isActive: true,
  },
  {
    name: "SalonSync Hub",
    slug: "salonsync_hub",
    description: "Salon management SaaS platform",
    emoji: "💇",
    color: "#ec4899",
    password: process.env.SALONSYNC_PASSWORD || "aihub2024",
    businessContext: "SalonSync Hub is a salon management SaaS built by Simao. It helps salons manage appointments, staff, clients, and payments. Key goals: grow salon subscriber base, reduce booking no-shows, help salon owners increase revenue per chair. Revenue model: monthly SaaS subscriptions from salon owners.",
    sortOrder: 3,
    isActive: true,
  },
  {
    name: "Sweepello",
    slug: "sweepello",
    description: "Cleaning services marketplace platform",
    emoji: "🧹",
    color: "#3b82f6",
    password: process.env.SWEEPELLO_PASSWORD || "aihub2024",
    businessContext: "Sweepello is Simao's cleaning marketplace SaaS. It connects homeowners and businesses with vetted cleaning professionals. Key goals: grow cleaner supply side, grow demand side (client bookings), ensure quality control, and build trust through ratings. Revenue model: marketplace commission on bookings.",
    sortOrder: 4,
    isActive: true,
  },
  {
    name: "Real Estate",
    slug: "real_estate",
    description: "Real estate investment portfolio and acquisitions",
    emoji: "🏢",
    color: "#8b5cf6",
    password: process.env.REAL_ESTATE_PASSWORD || "aihub2024",
    businessContext: "Simao's real estate investment business focuses on acquiring, holding, and potentially flipping properties. Key goals: identify undervalued properties, analyze deals, manage portfolio performance, and track equity growth. Strategy may include tax deed auctions, MLS deals, and off-market acquisitions.",
    sortOrder: 5,
    isActive: true,
  },
];

const AGENTS = [
  {
    name: "COMPASS",
    slug: "compass",
    roleDescription: "Senior business strategist across all ventures.",
    systemPrompt: `You are COMPASS, a senior business strategist. You help with strategic decisions, prioritization, opportunity analysis, and competitive strategy. Be direct, insightful, and action-oriented. Think big picture but also help break things down into executable steps.`,
    icon: "🧭",
    color: "#6366f1",
    isActive: true,
  },
  {
    name: "OUTREACH",
    slug: "outreach",
    roleDescription: "Expert at writing cold outreach, follow-up sequences, and persuasive email copy.",
    systemPrompt: `You are OUTREACH, an expert cold outreach and email copywriter. You craft compelling cold outreach sequences, follow-up emails, and persuasive copy. Your emails feel human, not robotic. You understand B2B sales cycles and how to get responses from busy professionals.`,
    icon: "📬",
    color: "#f59e0b",
    isActive: true,
  },
  {
    name: "INKWELL",
    slug: "inkwell",
    roleDescription: "Professional copywriter for proposals, contracts, marketing, and website copy.",
    systemPrompt: `You are INKWELL, a professional copywriter. You create proposals, contracts, marketing materials, and website copy. Your writing is clear, persuasive, and professional. You adapt your tone to match the business context — whether it's a home inspection company, a SaaS product, or a marketplace.`,
    icon: "✍️",
    color: "#10b981",
    isActive: true,
  },
  {
    name: "SCOUT",
    slug: "scout",
    roleDescription: "Data analyst and researcher for market research, competitor analysis, and opportunity scouting.",
    systemPrompt: `You are SCOUT, a data analyst and researcher. You analyze market data, research competitors, identify opportunities, and provide clear analytical insights. You identify patterns and rank opportunities by potential impact. You can research any industry or market relevant to the businesses.`,
    icon: "🔍",
    color: "#3b82f6",
    isActive: true,
  },
  {
    name: "OPS",
    slug: "ops",
    roleDescription: "Operations assistant for SOPs, scheduling, task management, and cross-venture coordination.",
    systemPrompt: `You are OPS, an operations and administrative assistant. You help with task management, scheduling prep, meeting agendas, standard operating procedures (SOPs), and cross-venture coordination. You keep things organized, efficient, and running smoothly. You can help draft SOPs, checklists, and operational frameworks.`,
    icon: "⚙️",
    color: "#8b5cf6",
    isActive: true,
  },
  {
    name: "DESK",
    slug: "desk",
    roleDescription: "Client communication specialist for onboarding, support, and professional correspondence.",
    systemPrompt: `You are DESK, a client communication specialist. You handle client onboarding emails, support responses, and professional client correspondence. Your tone is warm but professional. You ensure clients feel supported and informed. You can adapt your communication style to match different business contexts.`,
    icon: "💬",
    color: "#ef4444",
    isActive: true,
  },
];

export async function seedDatabase() {
  try {
    logger.info("Checking database seed state...");

    // Seed workspaces (upsert by slug — insert or update businessContext/emoji/color)
    for (const ws of WORKSPACES) {
      await db
        .insert(workspacesTable)
        .values(ws)
        .onConflictDoUpdate({
          target: workspacesTable.slug,
          set: {
            businessContext: sql`excluded.business_context`,
            emoji: sql`excluded.emoji`,
            color: sql`excluded.color`,
            description: sql`excluded.description`,
          },
        });
    }
    logger.info("Workspaces seeded");

    // Check if agents already seeded
    const existingAgents = await db.select().from(agentsTable).limit(1);
    if (existingAgents.length > 0) {
      logger.info("Agents already seeded, skipping");
      return;
    }

    logger.info("Seeding agents and automations...");

    const insertedAgents = await db.insert(agentsTable).values(AGENTS).returning();
    const agentMap = Object.fromEntries(insertedAgents.map((a) => [a.slug, a.id]));

    await db.insert(automationsTable).values([
      {
        name: "Weekly Realtor Outreach Draft",
        agentId: agentMap.outreach,
        scheduleCron: "0 8 * * 1",
        promptTemplate: `Draft 3 personalized cold outreach emails to realtors for home inspection partnerships. Include a subject line, opening hook, value proposition, and CTA. Make them feel human and conversational, not corporate. Each email should be for a different realtor persona (e.g., new agent, top producer, team leader).`,
        isActive: true,
        status: "idle",
      },
      {
        name: "Weekly Strategy Brief",
        agentId: agentMap.compass,
        scheduleCron: "0 16 * * 5",
        promptTemplate: `Generate a weekly strategic review for all active businesses. Cover: what to prioritize next week, any risks to watch, one growth action item per business, and any cross-business synergies. Be specific and actionable.`,
        isActive: true,
        status: "idle",
      },
      {
        name: "Market Research Summary",
        agentId: agentMap.scout,
        scheduleCron: null,
        promptTemplate: `Research and summarize current market conditions relevant to the active business. Identify competitor moves, market trends, and opportunities. Highlight any patterns worth acting on this week.`,
        isActive: true,
        status: "idle",
      },
    ]);

    logger.info("Database seeded successfully");
  } catch (err) {
    logger.error(err, "Failed to seed database");
  }
}
