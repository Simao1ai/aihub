import { db, agentsTable, automationsTable, workspacesTable, automationTemplatesTable, pipelinesTable } from "@workspace/db";
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
    roleDescription: "Social media manager & ad strategist. Content calendars, paid ad copy, hashtags, and engagement strategy.",
    systemPrompt: `You are SOSHI, a social media manager and paid advertising strategist. You are an expert in both organic content and paid ads across Meta/Facebook, Instagram, LinkedIn, Twitter/X, TikTok, and YouTube.

ORGANIC CONTENT: You create social media content calendars, write post copy, develop hashtag strategies, and craft engagement replies. You understand platform-specific algorithms and optimal posting times.

PAID ADVERTISING: You are trained in the advertising methods of David Ogilvy, Gary Halbert, Dan Kennedy, Claude Hopkins, Eugene Schwartz, and Alex Hormozi. You know:
- AIDA (Attention, Interest, Desire, Action)
- PAS (Problem, Agitate, Solution)
- Hook-Story-Offer
- FAB (Features, Advantages, Benefits)
- Before-After-Bridge
- 4U Formula (Urgent, Unique, Useful, Ultra-specific)
- Platform-specific ad rules: Meta hooks, Google RSA structure, LinkedIn professional tone, TikTok native-first, YouTube skip-proof openers

AD STRATEGY: Given a business, you can recommend the best platform, best framework, target audience insights, and creative angles before writing. You think about: awareness stage, customer journey, and what stage of the funnel the ad is targeting.

Always provide complete, ready-to-use copy with specific recommendations. Never be generic — use the business context to write ads that speak to their exact customer.`,
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
    name: "PIXEL",
    slug: "pixel",
    roleDescription: "AI visual artist. Creates social media graphics, brand imagery, and AI image prompts for every platform.",
    systemPrompt: `You are PIXEL, the AI visual artist of Simao's Hub. You specialize in creating stunning social media graphics, brand imagery, ad creatives, and AI-generated art for all platforms.

YOUR CORE SKILLS:
- Writing highly detailed, platform-optimized AI image prompts (for Facebook, Instagram, LinkedIn, TikTok, YouTube thumbnails, and ads)
- Creating complete visual content strategies (what visuals to use, when, why)
- Designing brand-consistent imagery direction (color palette, mood, style)
- Writing prompts for: lifestyle photography, infographics, product shots, behind-the-scenes, motivational quotes, reels covers, ad creatives

HOW YOU WORK IN THIS HUB:
When Simao asks for a visual, you:
1. Ask clarifying questions if needed (platform, message, vibe, call-to-action)
2. Output a DETAILED IMAGE PROMPT using this format:
   🎨 **PIXEL PROMPT — [Platform] [Ratio]**
   [The full prompt text]
   📐 **Dimensions:** [WxH or ratio]
   🎯 **Style:** [photorealistic / illustrated / graphic / etc.]
   🚫 **Avoid:** [negative prompt items]

3. Then explain WHY you made those creative choices
4. Offer 2-3 variations with different moods/styles

PLATFORM SPECS YOU KNOW:
- Facebook Post: 1200×630 (1.91:1), square 1080×1080
- Instagram Post: 1080×1080 square, 1080×1350 portrait
- Instagram/Facebook Story: 1080×1920 (9:16)
- LinkedIn: 1200×627 or 1080×1080
- TikTok Cover: 1080×1920
- YouTube Thumbnail: 1280×720 (16:9)
- Facebook Ad: 1080×1080 or 1200×628

STYLE APPROACH:
Always tailor visuals to the business context — a home inspection company (LES A Inspections) needs professional, trust-building imagery; a cleaning marketplace (Sweepello) needs fresh, clean aesthetics; a trucking SaaS (CarrierDeskHQ) needs bold, industrial imagery; salons (SalonSync) need stylish, aspirational visuals.

When writing prompts, be hyper-specific: lighting, mood, color palette, composition, subject, background, and style. The more detail, the better the image.

COLLABORATION: SOSHI writes the caption — you create the visual. Together you make complete, post-ready content. When you work with SOSHI's copy, extract the core message and emotion, then design the perfect visual to amplify it.`,
    icon: "🎨",
    color: "#f43f5e",
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

// ── Pipeline templates (seeded once by agent slug) ───────────────────────────
interface PipelineTemplate {
  name: string;
  description: string;
  steps: { agentSlug: string; stepName: string; promptTemplate: string }[];
}

const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  {
    name: "📱 Social Media Post",
    description: "SCOUT researches trends, DEXIE optimizes timing, SOSHI drafts copy, then PIXEL designs the visual. Complete, post-ready content.",
    steps: [
      {
        agentSlug: "scout",
        stepName: "Research Trends",
        promptTemplate: "Research trending topics and conversations relevant to {{TOPIC}}. Identify: 3-5 content angles ranked by engagement potential, competitor approaches, audience pain points, and seasonal hooks. Output a structured research brief that the next agent can use to write a compelling post.",
      },
      {
        agentSlug: "dexie",
        stepName: "Optimize Strategy",
        promptTemplate: "Review the research for {{TOPIC}}. Recommend: the best content angle (with rationale), optimal posting time per platform, content format (video/carousel/image/text), and estimated engagement potential. Select the strongest angle and explain exactly why.",
      },
      {
        agentSlug: "soshi",
        stepName: "Write the Post",
        promptTemplate: "Write a complete, platform-ready social media post for {{TOPIC}} using the strategy provided. Include: hook line, main copy, call-to-action, 10-15 hashtags, and platform-specific formatting notes (Instagram, Facebook, LinkedIn). Write 2 variations — one punchy/short, one storytelling/longer.",
      },
      {
        agentSlug: "pixel",
        stepName: "Design Visual Brief",
        promptTemplate: "Based on the social media post for {{TOPIC}}, create a detailed visual direction. Provide a full AI image prompt, platform dimensions, color palette, mood, and composition notes. The visual should amplify the post's message and stop the scroll.",
      },
    ],
  },
  {
    name: "📝 Blog Post",
    description: "SEOMI researches keywords, COMPASS builds the outline, INKWELL writes the full article, SEOMI does the final SEO pass. Publish-ready.",
    steps: [
      {
        agentSlug: "seomi",
        stepName: "SEO Research",
        promptTemplate: "Research SEO keywords and content strategy for a blog post about {{TOPIC}}. Identify: primary keyword, 5-8 secondary keywords, search intent (informational/commercial/transactional), competitor content gaps, 3 compelling title options, and target word count. Output a complete keyword brief.",
      },
      {
        agentSlug: "compass",
        stepName: "Outline & Structure",
        promptTemplate: "Create a detailed blog post outline for {{TOPIC}} based on the SEO research. Include: H1 title, meta description (155 chars), H2 sections with H3 subsections, 3-5 key points per section, internal link opportunities, and a strong CTA. Structure for maximum reader value and search engine performance.",
      },
      {
        agentSlug: "inkwell",
        stepName: "Write Full Article",
        promptTemplate: "Write the complete blog post for {{TOPIC}} using the outline provided. Write in a professional but conversational tone. Include: engaging intro with a hook, well-developed sections with examples, smooth transitions, and a clear CTA. Target 900-1200 words. Make it genuinely valuable, not generic.",
      },
      {
        agentSlug: "seomi",
        stepName: "SEO Final Review",
        promptTemplate: "Review the completed blog post about {{TOPIC}}. Optimize: keyword density and placement, meta description, heading hierarchy, internal link anchor text suggestions, image alt text recommendations, and readability. Provide the final version with a checklist of all improvements made.",
      },
    ],
  },
  {
    name: "📧 Email Campaign",
    description: "SCOUT profiles the audience, EMMA writes a 3-email sequence, COMPASS refines the strategy, DEXIE adds performance optimization.",
    steps: [
      {
        agentSlug: "scout",
        stepName: "Audience Research",
        promptTemplate: "Research the target audience for an email campaign about {{TOPIC}}. Identify: key pain points, decision-making triggers, common objections, what motivates action, and successful email patterns in this space. Output a campaign brief with audience insights the copywriter can use.",
      },
      {
        agentSlug: "emma",
        stepName: "Write Email Sequence",
        promptTemplate: "Write a 3-email sequence for {{TOPIC}} based on the audience research. Email 1 (Day 1): Value/awareness — hook them with insight. Email 2 (Day 3): Social proof/education — build trust. Email 3 (Day 7): Offer/CTA — drive action. Each email needs: subject line, preview text, and full body copy. Target 40%+ open rates.",
      },
      {
        agentSlug: "compass",
        stepName: "Strategy Alignment",
        promptTemplate: "Review the email sequence for {{TOPIC}}. Strengthen: the funnel progression logic, brand positioning consistency, CTA clarity, value proposition in each email, and the overall narrative arc. Refine and provide the improved final sequence with strategic notes.",
      },
      {
        agentSlug: "dexie",
        stepName: "Performance Optimization",
        promptTemplate: "Analyze the email sequence for {{TOPIC}}. Provide: A/B test suggestions for subject lines (3 variants each), optimal send times by day/hour, predicted open and click rates, segmentation recommendations, and a tracking metrics checklist. Give specific, data-informed recommendations.",
      },
    ],
  },
  {
    name: "💼 Sales Outreach",
    description: "SCOUT researches prospects, MILLI writes the outreach sequence, COMPASS refines the pitch, EMMA builds the follow-up flow.",
    steps: [
      {
        agentSlug: "scout",
        stepName: "Prospect Research",
        promptTemplate: "Research the prospect/target for a sales outreach campaign about {{TOPIC}}. Identify: decision-maker personas, primary pain points, top objections, buying motivators, and 3 personalization angles that make outreach feel human. Output a prospect intelligence brief.",
      },
      {
        agentSlug: "milli",
        stepName: "Write Outreach Sequence",
        promptTemplate: "Write a complete sales outreach sequence for {{TOPIC}} using the research. Include: cold email (subject + body), LinkedIn connection message, LinkedIn follow-up message, and a voicemail script. Each should feel personalized and focused on their problem — not your product. No generic templates.",
      },
      {
        agentSlug: "compass",
        stepName: "Sharpen the Pitch",
        promptTemplate: "Review the sales outreach sequence for {{TOPIC}}. Sharpen: the value proposition, social proof elements, objection handling, and the CTA friction level. Make each touchpoint feel inevitable — like saying no would be leaving money on the table. Provide the refined, final sequence.",
      },
      {
        agentSlug: "emma",
        stepName: "30-Day Follow-Up Flow",
        promptTemplate: "Build a 30-day follow-up cadence for {{TOPIC}} prospects who don't respond. Include: timing and channel for each touchpoint (email/LinkedIn/phone), message templates for: no reply, opened-not-replied, partial interest, and a re-engagement script for day 14+ cold prospects. Prevent ghosting systematically.",
      },
    ],
  },
  {
    name: "📊 Weekly Business Report",
    description: "DEXIE analyzes performance, MILLI reviews sales & pipeline, COMPASS compiles the executive summary. Ready to share.",
    steps: [
      {
        agentSlug: "dexie",
        stepName: "Performance Analysis",
        promptTemplate: "Create a structured weekly performance analysis for {{TOPIC}}. Build a framework covering: key metrics to track (with definitions), trend analysis approach, benchmark comparison method, data interpretation guidelines, and an executive summary format. Include a fillable template with placeholder fields.",
      },
      {
        agentSlug: "milli",
        stepName: "Sales & Pipeline Review",
        promptTemplate: "Create a sales and pipeline review section for the weekly report on {{TOPIC}}. Include: conversion rate analysis, deal stage breakdown, win/loss patterns, revenue forecast methodology, and 3 specific actions to improve sales performance. Be direct and prescriptive.",
      },
      {
        agentSlug: "compass",
        stepName: "Executive Summary",
        promptTemplate: "Compile all analysis into a complete weekly business report for {{TOPIC}}. Format as an executive brief: Key Wins (3), Key Challenges (3), Metrics Snapshot (table), Top Priority for Next Week, and One Strategic Decision that needs to be made. Keep it scannable and under 500 words. Action-oriented, not descriptive.",
      },
    ],
  },
  {
    name: "📋 Client Proposal",
    description: "SCOUT researches the client, COMPASS builds the strategy, INKWELL writes the full proposal, LEX reviews for legal protection.",
    steps: [
      {
        agentSlug: "scout",
        stepName: "Client Research",
        promptTemplate: "Research the client/prospect context for a proposal about {{TOPIC}}. Identify: their likely goals and pain points, alternatives they're considering, market context that validates your approach, and 3 compelling differentiators to lead with. Output a pre-proposal intelligence brief.",
      },
      {
        agentSlug: "compass",
        stepName: "Proposal Strategy",
        promptTemplate: "Design the proposal strategy for {{TOPIC}}. Create: executive summary structure, scope of work breakdown, pricing rationale, success metrics, timeline phases, and the 3 strongest reasons to accept. Think like a consultant positioning for a yes — not a vendor asking for business.",
      },
      {
        agentSlug: "inkwell",
        stepName: "Write Full Proposal",
        promptTemplate: "Write the complete client proposal for {{TOPIC}} using the strategy. Include: executive summary, problem statement, proposed solution, scope of work, timeline, pricing options (good/better/best), ROI justification, and next steps. Professional, compelling, and easy to say yes to.",
      },
      {
        agentSlug: "lex",
        stepName: "Legal Review",
        promptTemplate: "Review the proposal for {{TOPIC}} from a legal and risk perspective. Flag: vague scope language, missing service provider protections, weak payment terms, liability exposure, and IP ownership gaps. Provide a revised version with risk mitigation built in. Note any clauses that need a real attorney's review.",
      },
    ],
  },
  {
    name: "🔍 SEO Audit & Strategy",
    description: "SEOMI runs the audit, DEXIE analyzes opportunities, COMPASS builds the 90-day roadmap. Actionable from day one.",
    steps: [
      {
        agentSlug: "seomi",
        stepName: "SEO Audit",
        promptTemplate: "Conduct a comprehensive SEO audit framework for {{TOPIC}}. Cover: technical SEO checklist (20 items), on-page optimization review, content gap analysis vs competitors, top 10 keyword opportunities, backlink profile assessment, and priority issues ranked by impact. Output a full audit report.",
      },
      {
        agentSlug: "dexie",
        stepName: "Opportunity Analysis",
        promptTemplate: "Analyze the SEO audit for {{TOPIC}} and identify prioritized opportunities. Categorize as: Quick Wins (1-2 weeks), Medium-term (1-3 months), Long-term (3-6 months). For each opportunity: estimated traffic impact, effort level, and expected ranking improvement. Build a prioritized opportunity matrix.",
      },
      {
        agentSlug: "compass",
        stepName: "90-Day SEO Roadmap",
        promptTemplate: "Create a 90-day SEO roadmap for {{TOPIC}} based on the audit and opportunity analysis. Month 1: Quick wins + technical foundation. Month 2: Content and on-page optimization. Month 3: Authority building and scaling. Each month: 3-5 specific actions, who does them, and the expected outcome. Realistic and executable.",
      },
    ],
  },
  {
    name: "🎯 Competitor Analysis",
    description: "SCOUT researches competitors, DEXIE benchmarks performance, COMPASS assesses strategy, MILLI builds the battle plan.",
    steps: [
      {
        agentSlug: "scout",
        stepName: "Competitor Deep Dive",
        promptTemplate: "Research the top 3-5 competitors in {{TOPIC}}. For each competitor: product/service overview, pricing, positioning, marketing channels, customer reviews and complaints, content strategy, and estimated market share. Output a structured competitor matrix with all findings side-by-side.",
      },
      {
        agentSlug: "dexie",
        stepName: "Performance Benchmarking",
        promptTemplate: "Analyze the competitor data for {{TOPIC}} and create performance benchmarks. Compare: estimated market share, growth trajectory, online presence metrics, customer sentiment, price-value positioning, and feature/service gaps. Identify where each competitor is strongest and weakest.",
      },
      {
        agentSlug: "compass",
        stepName: "Strategic Assessment",
        promptTemplate: "Provide a strategic assessment of the competitive landscape for {{TOPIC}}. Include: SWOT analysis vs the top competitor, blue ocean opportunities (underserved market segments), recommended positioning strategy, and 3 sustainable competitive advantages to build and defend.",
      },
      {
        agentSlug: "milli",
        stepName: "Competitive Battle Plan",
        promptTemplate: "Create a competitive battle card and go-to-market battle plan for {{TOPIC}}. Include: how to win vs each major competitor (specific talk tracks), what to say when prospects mention competitors, pricing counter-strategy, win-back playbook for lost deals, and the top 3 market-capture moves for the next 90 days.",
      },
    ],
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

    // ── Seed pipeline templates (skip if already exist by name) ──────────────
    const existingPipelineNames = await db.select({ name: pipelinesTable.name }).from(pipelinesTable);
    const existingPipelineSet = new Set(existingPipelineNames.map(p => p.name));
    const allAgentRows = await db.select().from(agentsTable);
    const agentBySlug = Object.fromEntries(allAgentRows.map(a => [a.slug, a]));

    let pipelinesSeeded = 0;
    for (const template of PIPELINE_TEMPLATES) {
      if (existingPipelineSet.has(template.name)) continue;

      const steps = template.steps
        .map(s => {
          const agent = agentBySlug[s.agentSlug];
          if (!agent) {
            logger.warn(`Agent slug "${s.agentSlug}" not found for pipeline "${template.name}" — skipping step`);
            return null;
          }
          return { stepName: s.stepName, agentId: agent.id, promptTemplate: s.promptTemplate };
        })
        .filter(Boolean);

      if (steps.length < 2) {
        logger.warn(`Pipeline "${template.name}" has fewer than 2 resolvable steps — skipping`);
        continue;
      }

      await db.insert(pipelinesTable).values({
        name: template.name,
        description: template.description,
        steps,
      });
      pipelinesSeeded++;
    }

    if (pipelinesSeeded > 0) {
      logger.info(`Seeded ${pipelinesSeeded} pipeline templates`);
    } else {
      logger.info("All pipeline templates already seeded");
    }

    logger.info("Database seeded successfully");
  } catch (err) {
    logger.error(err, "Failed to seed database");
  }
}
