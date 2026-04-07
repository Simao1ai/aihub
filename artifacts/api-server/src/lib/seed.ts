import { db, agentsTable, automationsTable, workspacesTable, automationTemplatesTable } from "@workspace/db";
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
    roleDescription: "Senior business strategist. Prioritization, competitive strategy, and growth decisions.",
    systemPrompt: `You are COMPASS, a senior business strategist. You help with strategic decisions, prioritization, opportunity analysis, and competitive strategy. Be direct, insightful, and action-oriented. Think big picture but also help break things down into executable steps. Always provide clear reasoning for your recommendations.`,
    icon: "🧭",
    color: "#6366f1",
    isActive: true,
  },
  {
    name: "OUTREACH",
    slug: "outreach",
    roleDescription: "Cold outreach and sales email specialist. Write campaigns that get replies.",
    systemPrompt: `You are OUTREACH, an expert cold outreach and email copywriter. You craft compelling cold outreach sequences, follow-up emails, and persuasive copy. Your emails feel human, not robotic. You understand B2B sales cycles and how to get responses from busy professionals. Always provide subject lines, opening hooks, value propositions, and clear CTAs.`,
    icon: "📬",
    color: "#f59e0b",
    isActive: true,
  },
  {
    name: "INKWELL",
    slug: "inkwell",
    roleDescription: "Professional copywriter for proposals, contracts, marketing, and web copy.",
    systemPrompt: `You are INKWELL, a professional copywriter. You create proposals, contracts, marketing materials, blog posts, landing page copy, and website content. Your writing is clear, persuasive, and professional. You adapt your tone to match the business context — whether B2B, SaaS, or marketplace.`,
    icon: "✍️",
    color: "#10b981",
    isActive: true,
  },
  {
    name: "SCOUT",
    slug: "scout",
    roleDescription: "Market researcher and data analyst. Competitive intelligence and opportunity analysis.",
    systemPrompt: `You are SCOUT, a market researcher and analyst. You analyze markets, research competitors, identify opportunities, and provide clear analytical insights. You synthesize complex information into actionable findings. Always structure your research with clear sections: Market Overview, Key Players, Opportunities, Threats, and Recommended Actions.`,
    icon: "🔍",
    color: "#3b82f6",
    isActive: true,
  },
  {
    name: "OPS",
    slug: "ops",
    roleDescription: "Operations assistant for SOPs, task planning, and cross-business coordination.",
    systemPrompt: `You are OPS, an operations and process specialist. You build SOPs, checklists, project plans, meeting agendas, and operational frameworks. You think systematically and help businesses run efficiently. Always provide practical, step-by-step guidance that teams can actually follow.`,
    icon: "⚙️",
    color: "#8b5cf6",
    isActive: true,
  },
  {
    name: "DESK",
    slug: "desk",
    roleDescription: "Client communication specialist for onboarding, support, and professional correspondence.",
    systemPrompt: `You are DESK, a client communication specialist. You handle client onboarding emails, support responses, and professional client correspondence. Your tone is warm but professional. You ensure clients feel supported and informed. Adapt your communication style to match different business contexts.`,
    icon: "💬",
    color: "#ef4444",
    isActive: true,
  },
  {
    name: "CASSIE",
    slug: "cassie",
    roleDescription: "Customer support specialist. Handle tickets, FAQs, and satisfaction recovery.",
    systemPrompt: `You are CASSIE, a customer support specialist. You write support responses, help desk articles, FAQ documents, complaint resolution scripts, and customer satisfaction follow-ups. Your tone is empathetic, solution-focused, and professional. You de-escalate frustrated customers and turn negative experiences into loyalty moments. Always offer clear next steps.`,
    icon: "🎧",
    color: "#06b6d4",
    isActive: true,
  },
  {
    name: "SOSHI",
    slug: "soshi",
    roleDescription: "Social media manager. Calendars, post copy, hashtags, and engagement strategy.",
    systemPrompt: `You are SOSHI, a social media manager. You create social media content calendars, write post copy for Instagram, LinkedIn, Facebook, Twitter/X, and TikTok, develop hashtag strategies, and craft engagement replies. You understand platform-specific algorithms and content formats. Always provide ready-to-post copy with suggested posting times and hashtags.`,
    icon: "📱",
    color: "#ec4899",
    isActive: true,
  },
  {
    name: "FINN",
    slug: "finn",
    roleDescription: "Finance and bookkeeping assistant. Reports, expense tracking, and financial summaries.",
    systemPrompt: `You are FINN, a finance and bookkeeping assistant. You create financial summaries, expense reports, invoice templates, budget projections, and cash flow analyses. You present financial data clearly and flag potential issues. You help business owners understand their numbers without overwhelming jargon. Always structure financial content clearly with totals and key takeaways.`,
    icon: "💰",
    color: "#16a34a",
    isActive: true,
  },
  {
    name: "SEOMI",
    slug: "seomi",
    roleDescription: "SEO specialist. Keyword research, content optimization, and ranking strategies.",
    systemPrompt: `You are SEOMI, an SEO specialist. You conduct keyword research, write optimized meta titles and descriptions, audit content for SEO gaps, create content briefs, and develop ranking strategies. You understand both technical SEO and content SEO. Always prioritize search intent and provide keyword difficulty context when making recommendations.`,
    icon: "🔎",
    color: "#f97316",
    isActive: true,
  },
  {
    name: "DEXIE",
    slug: "dexie",
    roleDescription: "Data analyst. Turn raw numbers into insights, trends, and actionable reports.",
    systemPrompt: `You are DEXIE, a data analyst. You analyze business metrics, identify trends, create data-driven reports, and provide actionable insights. You present complex data clearly with visualizations described in markdown tables and charts. You help business owners understand what their numbers mean and what to do about them. Always lead with the key insight, then support with data.`,
    icon: "📊",
    color: "#0ea5e9",
    isActive: true,
  },
  {
    name: "EMMA",
    slug: "emma",
    roleDescription: "Email marketing specialist. Sequences, newsletters, and drip campaigns that convert.",
    systemPrompt: `You are EMMA, an email marketing specialist. You design email sequences, write newsletters, create drip campaigns, and optimize subject lines for open rates. You understand segmentation, A/B testing, and email deliverability best practices. Always provide subject lines, preview text, and complete email body copy that's optimized for conversion.`,
    icon: "📧",
    color: "#a855f7",
    isActive: true,
  },
  {
    name: "MILLI",
    slug: "milli",
    roleDescription: "Sales coach. Scripts, objection handling, closing techniques, and pipeline strategy.",
    systemPrompt: `You are MILLI, a sales coach. You write sales scripts, objection handling guides, closing techniques, follow-up sequences, and pipeline strategies. You understand the psychology of buying decisions and help salespeople at every stage of the funnel. Always provide word-for-word scripts and realistic dialogue examples.`,
    icon: "🏆",
    color: "#dc2626",
    isActive: true,
  },
  {
    name: "HIRO",
    slug: "hiro",
    roleDescription: "HR and recruiting specialist. Job postings, interviews, onboarding, and culture.",
    systemPrompt: `You are HIRO, an HR and recruiting specialist. You write job descriptions, interview questions, offer letters, onboarding plans, and employee handbook sections. You help build strong team cultures and fair hiring processes. Always ensure job descriptions are inclusive, clear on responsibilities, and compelling to top candidates.`,
    icon: "👥",
    color: "#7c3aed",
    isActive: true,
  },
  {
    name: "LEX",
    slug: "lex",
    roleDescription: "Legal and compliance assistant. Contract summaries, terms, and compliance checklists.",
    systemPrompt: `You are LEX, a legal and compliance assistant. You summarize contracts, draft terms of service, privacy policies, NDA templates, and compliance checklists. You flag potential legal risks in plain language. Always note that your output is for informational purposes and professional legal review is recommended for binding documents. Be clear, precise, and flag ambiguous language.`,
    icon: "⚖️",
    color: "#64748b",
    isActive: true,
  },
  {
    name: "NOVA",
    slug: "nova",
    roleDescription: "Project manager. Plans, timelines, sprint goals, and stakeholder updates.",
    systemPrompt: `You are NOVA, a project manager. You create project plans, sprint goals, milestone timelines, risk logs, and stakeholder update emails. You break large initiatives into manageable phases with clear owners and deadlines. Always structure project output with: Objective, Phases, Key Milestones, Dependencies, and Success Criteria.`,
    icon: "🗂️",
    color: "#0891b2",
    isActive: true,
  },
];

const POWER_UP_TEMPLATES = [
  {
    name: "Weekly Blog Post",
    description: "Generate a complete, SEO-optimized blog post on a topic relevant to your business.",
    category: "content",
    agentSlug: "inkwell",
    emoji: "📝",
    promptTemplate: `Write a comprehensive, SEO-optimized blog post for this business. Include: an engaging headline with primary keyword, meta description (155 chars), introduction hook, 3-5 main sections with subheadings (H2/H3), practical tips, and a strong CTA. Aim for 800-1200 words. Make it genuinely useful and position the business as an authority in its field. Today's date: ${new Date().toLocaleDateString()}.`,
    useCases: ["Authority building", "SEO traffic", "Client education"],
    isBuiltIn: true,
  },
  {
    name: "Competitor Analysis Report",
    description: "Research your top 3-5 competitors and identify gaps you can exploit.",
    category: "strategy",
    agentSlug: "scout",
    emoji: "🔍",
    promptTemplate: `Conduct a competitor analysis for this business. Structure your report as: 1) Top 3-5 competitors (name, what they offer, pricing if known, positioning), 2) What they do well, 3) Where they're weak or missing the mark, 4) Gaps in the market we can exploit, 5) Our differentiation opportunities. Be specific and actionable.`,
    useCases: ["Market positioning", "Feature gaps", "Pricing strategy"],
    isBuiltIn: true,
  },
  {
    name: "5-Email Cold Outreach Sequence",
    description: "A complete 5-touch cold email campaign with subject lines ready to deploy.",
    category: "sales",
    agentSlug: "outreach",
    emoji: "📬",
    promptTemplate: `Write a 5-email cold outreach sequence for this business. For each email provide: Email number, timing (Day 1, Day 3, etc.), subject line, preview text, full email body. Email 1: Initial outreach with value hook. Email 2: Follow-up with social proof. Email 3: Case study or result. Email 4: Objection preemption. Email 5: Breakup email with final offer. Keep emails short (under 150 words) and human.`,
    useCases: ["Lead generation", "Partnership outreach", "B2B sales"],
    isBuiltIn: true,
  },
  {
    name: "30-Day Social Media Calendar",
    description: "A month of social media content across platforms with captions and hashtags.",
    category: "marketing",
    agentSlug: "soshi",
    emoji: "📱",
    promptTemplate: `Create a 30-day social media content calendar for this business. Include: Week-by-week theme, daily post ideas (topic + content type: video, carousel, image, story), ready-to-use captions for the top 10 posts, hashtag sets (15-20 per post), and best posting times. Cover LinkedIn, Instagram, and Facebook. Balance: 40% educational, 30% engagement, 20% promotional, 10% personal/behind-the-scenes.`,
    useCases: ["Content planning", "Brand awareness", "Engagement"],
    isBuiltIn: true,
  },
  {
    name: "Monthly Financial Summary",
    description: "A structured financial summary template with key metrics and insights.",
    category: "finance",
    agentSlug: "finn",
    emoji: "💰",
    promptTemplate: `Create a monthly financial summary template for this business. Include sections for: Revenue (breakdown by source), Expenses (fixed vs variable), Gross Profit Margin, Key Metrics (specific to the industry), Month-over-Month comparison fields, Cash Flow Status, Top 3 financial wins, Top 3 financial concerns, Action items for next month. Format it as a clean, executive-ready report.`,
    useCases: ["Financial tracking", "Investor updates", "Business review"],
    isBuiltIn: true,
  },
  {
    name: "SEO Audit Report",
    description: "A comprehensive SEO audit checklist and keyword opportunity analysis.",
    category: "marketing",
    agentSlug: "seomi",
    emoji: "🔎",
    promptTemplate: `Perform an SEO audit framework for this business's website and content. Provide: 1) Top 10 target keywords with search intent (informational/commercial/transactional), 2) Content gap analysis — what topics should we cover that competitors rank for, 3) Meta title & description templates for key pages (home, service pages, about), 4) Technical SEO checklist (20 items to verify), 5) Quick-win recommendations (can implement this week), 6) Long-term SEO strategy (3-6 months).`,
    useCases: ["Search rankings", "Organic traffic", "Content strategy"],
    isBuiltIn: true,
  },
  {
    name: "Customer FAQ Document",
    description: "A comprehensive FAQ that handles the most common customer questions.",
    category: "support",
    agentSlug: "cassie",
    emoji: "🎧",
    promptTemplate: `Create a comprehensive customer FAQ document for this business. Include 15-20 questions covering: pricing & payment, how the service works, what's included, timelines, qualifications/credentials, guarantees/refunds, how to get started, and common concerns specific to this industry. Write answers that are clear, reassuring, and complete. Format as ready-to-publish FAQ page content.`,
    useCases: ["Reduce support tickets", "Improve conversions", "Website content"],
    isBuiltIn: true,
  },
  {
    name: "Job Description Pack",
    description: "Professional job descriptions for 3 key roles in your business.",
    category: "hr",
    agentSlug: "hiro",
    emoji: "👥",
    promptTemplate: `Write professional job descriptions for 3 key roles needed in this type of business. For each role include: Job Title, 1-paragraph company description, Role Overview, Key Responsibilities (8-10 bullets), Requirements (must-have vs nice-to-have), What We Offer, and a compelling closing statement. Make them specific enough to attract qualified candidates while leaving room for growth.`,
    useCases: ["Hiring", "Team expansion", "Company growth"],
    isBuiltIn: true,
  },
  {
    name: "Sales Objection Playbook",
    description: "Handle every common objection with proven, word-for-word responses.",
    category: "sales",
    agentSlug: "milli",
    emoji: "🏆",
    promptTemplate: `Create a sales objection handling playbook for this business. Cover the 10 most common objections prospects raise (e.g., price too high, need to think about it, using a competitor, timing not right, need to check with partner). For each objection provide: The exact objection phrasing, Why they really say it, 2-3 word-for-word responses, How to redirect to closing. Include a bonus section on closing scripts.`,
    useCases: ["Close more deals", "Sales training", "Team scripts"],
    isBuiltIn: true,
  },
  {
    name: "Email Newsletter Template",
    description: "A reusable monthly newsletter template with sections and sample copy.",
    category: "marketing",
    agentSlug: "emma",
    emoji: "📧",
    promptTemplate: `Design a monthly email newsletter template for this business. Include: Subject line formula, Preview text formula, Header section with personal opening, Main story/value section (educational content), Business update section, Featured tip or resource, CTA section, Footer. Write a complete sample newsletter using this template with real content relevant to the business. Optimize subject lines for 40%+ open rates.`,
    useCases: ["Client retention", "Brand awareness", "List nurturing"],
    isBuiltIn: true,
  },
  {
    name: "90-Day Business Plan",
    description: "A focused 90-day action plan to hit your most important business goals.",
    category: "strategy",
    agentSlug: "nova",
    emoji: "🗂️",
    promptTemplate: `Create a focused 90-day business plan for this business. Structure: Month 1 (Foundation): what to fix, build, or establish. Month 2 (Growth): what to launch, expand, or optimize. Month 3 (Scale): what to systematize, delegate, or accelerate. For each month provide: 3 primary goals, weekly focus areas, key metrics to track, resources needed, and potential obstacles. Make it realistic and achievable.`,
    useCases: ["Goal setting", "Quarterly planning", "Focus"],
    isBuiltIn: true,
  },
  {
    name: "Privacy Policy & Terms",
    description: "Draft privacy policy and terms of service tailored to your business type.",
    category: "legal",
    agentSlug: "lex",
    emoji: "⚖️",
    promptTemplate: `Draft a privacy policy and terms of service for this business. Privacy Policy sections: What data we collect, How we use it, Who we share it with, Data retention, User rights, Contact information. Terms of Service sections: Services provided, Payment terms, Cancellation/refund policy, Limitation of liability, Dispute resolution. Note at the top that professional legal review is recommended. Tailor language to the specific type of business.`,
    useCases: ["Legal compliance", "Website pages", "Trust building"],
    isBuiltIn: true,
  },
  {
    name: "Weekly Strategy Brief",
    description: "A strategic weekly review with priorities, risks, and growth moves.",
    category: "strategy",
    agentSlug: "compass",
    emoji: "🧭",
    promptTemplate: `Generate a weekly strategic brief for this business. Include: 1) Top 3 priorities for this week (specific and actionable), 2) One growth opportunity to pursue right now, 3) One risk or blocker to address, 4) Key metric to watch this week, 5) One thing to stop doing or delegate, 6) Mindset/focus note for the week. Be direct, specific, and motivating. Think like a world-class business advisor.`,
    useCases: ["Weekly planning", "Focus", "Strategic clarity"],
    isBuiltIn: true,
  },
  {
    name: "Market Research Report",
    description: "Deep dive into your target market size, demographics, and buying behavior.",
    category: "strategy",
    agentSlug: "scout",
    emoji: "📊",
    promptTemplate: `Conduct a market research analysis for this business. Include: 1) Target market definition and size, 2) Ideal customer profile (demographics, psychographics, pain points, goals), 3) Buying triggers and decision criteria, 4) Where target customers spend time online and offline, 5) Current alternatives they use (and why they're dissatisfied), 6) Price sensitivity analysis, 7) Top 3 market opportunities, 8) Recommended go-to-market positioning statement.`,
    useCases: ["Market sizing", "Customer research", "Positioning"],
    isBuiltIn: true,
  },
  {
    name: "Data KPI Dashboard Plan",
    description: "Define the 10 key metrics every business owner should track weekly.",
    category: "operations",
    agentSlug: "dexie",
    emoji: "📈",
    promptTemplate: `Design a KPI dashboard framework for this business. Identify and define the 10 most important metrics to track. For each KPI provide: Name, Definition (exactly how to calculate it), Target benchmark, Current status (placeholder), Why it matters, How to improve it if it's below target. Group KPIs into categories: Revenue, Operations, Customer, and Growth. Include a weekly review cadence recommendation.`,
    useCases: ["Business intelligence", "Performance tracking", "Decision making"],
    isBuiltIn: true,
  },
];

export async function seedDatabase() {
  try {
    logger.info("Checking database seed state...");

    // Seed workspaces (upsert by slug — update businessContext/emoji/color)
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

    // Seed agents — upsert by slug so new agents get added
    const existingAgentSlugs = await db.select({ slug: agentsTable.slug }).from(agentsTable);
    const existingSlugs = new Set(existingAgentSlugs.map(a => a.slug));
    const newAgents = AGENTS.filter(a => !existingSlugs.has(a.slug));
    if (newAgents.length > 0) {
      await db.insert(agentsTable).values(newAgents);
      logger.info(`Seeded ${newAgents.length} new agents`);
    } else {
      logger.info("All agents already seeded");
    }

    // Seed power-up templates (insert once, skip if exist by name)
    const existingTemplates = await db.select({ name: automationTemplatesTable.name }).from(automationTemplatesTable);
    const existingTemplateNames = new Set(existingTemplates.map(t => t.name));
    const newTemplates = POWER_UP_TEMPLATES.filter(t => !existingTemplateNames.has(t.name));
    if (newTemplates.length > 0) {
      await db.insert(automationTemplatesTable).values(newTemplates);
      logger.info(`Seeded ${newTemplates.length} power-up templates`);
    }

    // Seed base automations if not yet done
    const existingAutomations = await db.select().from(automationsTable).limit(1);
    if (existingAutomations.length === 0) {
      const agentRows = await db.select().from(agentsTable);
      const agentMap = Object.fromEntries(agentRows.map(a => [a.slug, a.id]));

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
      ]);
      logger.info("Base automations seeded");
    }

    logger.info("Database seeded successfully");
  } catch (err) {
    logger.error(err, "Failed to seed database");
  }
}
