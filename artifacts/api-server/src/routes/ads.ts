import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, workspacesTable, agentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// ── Ad frameworks with expert methodology ───────────────────────────────────
const FRAMEWORKS: Record<string, { name: string; description: string; structure: string }> = {
  aida: {
    name: "AIDA",
    description: "Attention → Interest → Desire → Action (David Ogilvy's cornerstone)",
    structure: `
AIDA Framework — write in this exact flow:
- ATTENTION: Open with a powerful, pattern-interrupting hook (question, shocking stat, bold claim, or provocative statement).
- INTEREST: Build curiosity. Give them just enough to want more. Use specifics, not generalities.
- DESIRE: Paint a vivid picture of their transformed life/business. Use emotional language and social proof.
- ACTION: One crystal-clear CTA. Create urgency without fake pressure.`
  },
  pas: {
    name: "PAS",
    description: "Problem → Agitate → Solution (Gary Halbert's favorite)",
    structure: `
PAS Framework — write in this exact flow:
- PROBLEM: Name their exact pain point. Be specific. Use their language, not yours.
- AGITATE: Twist the knife. Make them feel the cost of inaction. What does this problem cost them daily? What future are they missing?
- SOLUTION: Present the product as the inevitable answer. Make it feel like relief.`
  },
  hook_story_offer: {
    name: "Hook-Story-Offer",
    description: "Hook → Story → Offer (Alex Hormozi & Russell Brunson method)",
    structure: `
Hook-Story-Offer Framework:
- HOOK: 3-5 words or a single sentence that stops the scroll. Pattern interrupt. Curiosity gap. Bold promise.
- STORY: A brief, relatable narrative (their struggle, an insight, a transformation). Make the reader the hero.
- OFFER: Crystal clear value proposition. What they get, why now, what to do next.`
  },
  fab: {
    name: "FAB",
    description: "Features → Advantages → Benefits (Dan Kennedy)",
    structure: `
FAB Framework:
- FEATURES: What does the product/service actually do or have?
- ADVANTAGES: Why is that better than alternatives?
- BENEFITS: What does this mean for the customer's real life — the emotional payoff?
Always end on the benefit, not the feature.`
  },
  before_after_bridge: {
    name: "Before-After-Bridge",
    description: "Before → After → Bridge (classic copywriting structure)",
    structure: `
Before-After-Bridge Framework:
- BEFORE: Describe their world as it is right now — the frustration, the gap, the problem.
- AFTER: Paint the dream — what life looks like once the problem is solved.
- BRIDGE: Position your product/service as the exact path from Before to After.`
  },
  four_u: {
    name: "4U Formula",
    description: "Urgent + Unique + Useful + Ultra-specific (Michael Masterson)",
    structure: `
4U Formula — every element of this ad must be:
- URGENT: Give them a reason to act now, not later. Time, scarcity, or consequence.
- UNIQUE: Say something only you can say. Avoid generic claims.
- USEFUL: Make clear what benefit they receive.
- ULTRA-SPECIFIC: Use numbers, dates, names, locations — specificity builds credibility.`
  },
  five_objections: {
    name: "5 Objections",
    description: "Pre-emptively address the 5 core sales objections",
    structure: `
5 Objections Framework — address each in your copy:
1. "I don't have enough money" → Show ROI, payment options, or relative cost
2. "I don't have enough time" → Show how little time it takes or time saved
3. "It won't work for ME" → Use specific social proof, testimonials, guarantees
4. "I don't believe you" → Credibility signals, data, track record
5. "It's not a priority" → Create urgency and highlight cost of delay`
  },
};

// ── Platform-specific rules ──────────────────────────────────────────────────
const PLATFORM_RULES: Record<string, string> = {
  meta: `
META / FACEBOOK ADS — Expert Rules:
- Primary text: 125 chars for above-the-fold (total up to 2,200)
- Headline: 27 chars max (displayed in feed), write for mobile-first
- Description: 27 chars shown in feed
- Hook must work WITHOUT sound (most FB video watched muted)
- Lead with emotion, follow with logic
- Social proof performs extremely well (numbers, names, results)
- "You" language outperforms brand-centric language
- Emojis can increase CTR 20-30% when used sparingly
- Mobile thumb-stop: first 3 words must earn attention
- Test benefit-led vs question-led headlines
- Avoid "click here", "buy now" in first sentence (triggers review flags)`,

  google_search: `
GOOGLE SEARCH ADS — Expert Rules:
- Responsive Search Ads: 15 headlines (30 chars each), 4 descriptions (90 chars each)
- Write at least 8-10 unique headlines that Google can mix-and-match
- Include keyword in at least one headline
- Headlines: USP | Key benefit | CTA | Price/offer | Social proof | Question | Feature
- Descriptions: Expand on headlines, include CTA, don't repeat headlines verbatim
- Use numbers and specifics (saves 3 hours, 10,000 clients, since 1995)
- Match ad copy intent to keyword intent (informational vs transactional)
- Strong CTAs: Get a Free Quote, Start Today, See Pricing, Book Now
- Avoid superlatives without proof (best, #1) unless you can back it`,

  linkedin: `
LINKEDIN ADS — Expert Rules:
- Primary text: 150 chars before "See more" cutoff — front-load the value
- Headline: 70 chars max
- Audience is professional — ROI, efficiency, career, revenue language works best
- Decision-maker targeting means you can be more direct about business outcomes
- Lead with a stat, insight, or industry pain point — not product features
- Case studies and specific results (increased revenue by 40%) outperform generic claims
- Thought leadership framing: "What [industry leaders] know that others don't"
- CTAs: Download, Learn More, Register, Get Quote (avoid "Buy Now" — too direct for LinkedIn)
- Avoid casual/slang language — professional but not boring`,

  tiktok: `
TIKTOK ADS — Expert Rules:
- Hook: First 1-3 seconds are everything. Ask a question, show a result, or use a pattern interrupt.
- Native-first: ads that look like organic TikToks outperform polished ads
- Text overlay: use captions — 69% watch with sound off
- Trending sounds and formats boost organic-style performance
- Show transformation, not features. Problem → solution in seconds.
- UGC (user-generated content) style converts better than studio-produced
- Length: 9-15 seconds for awareness, up to 60 seconds for complex offers
- CTA cards: "Shop Now", "Learn More", "Sign Up" — keep it simple
- Authenticity > polish. Raw, real, relatable wins.`,

  youtube: `
YOUTUBE ADS — Expert Rules:
- Skip-proof hook in first 5 seconds: This is ALL that matters. After 5s users can skip.
- Start with the most compelling thing — a result, a bold claim, or a question THEY have
- Don't introduce your brand in the first 5 seconds
- Seconds 5-30: deliver on your hook promise, build credibility
- Seconds 30-60: full story, social proof, offer
- End card: clear CTA with urgency
- Mid-roll: get to the point fast — viewers are interrupted
- Companion banner: reinforce CTA visually
- Storytelling beats feature lists 10:1 on YouTube`,

  instagram: `
INSTAGRAM ADS — Expert Rules:
- Visual-first platform — headline and first line must complement a strong visual
- Stories/Reels: 15-30 seconds, vertical format, immediate hook
- Feed: 125 chars above fold — lead with the hook
- Carousel: first card must earn the swipe; each card should tease the next
- Hashtag strategy: 3-5 highly relevant, not spammy
- Strong lifestyle/aspirational imagery performs well in feed
- Save-worthy content: tips, lists, before/afters get saved (free reach boost)
- Product tags in Shopping ads: show price and product name clearly`,
};

// ── Helper: load SOSHI agent + workspace context ─────────────────────────────
async function loadSoshiContext(businessTag: string) {
  let soshiPrompt = "You are SOSHI, a social media manager and paid advertising strategist with expertise in all major ad platforms and copywriting frameworks.";
  let wsContext = "";

  try {
    // Load workspace context
    const workspaces = await db.select().from(workspacesTable).where(eq(workspacesTable.businessTag, businessTag));
    if (workspaces[0]?.aiContext) wsContext = workspaces[0].aiContext;
  } catch { }

  try {
    // Load SOSHI specifically from this workspace's agents
    const agents = await db.select().from(agentsTable).where(eq(agentsTable.businessTag, businessTag));
    const soshi = agents.find(a => a.slug === 'soshi');
    if (soshi?.systemPrompt) soshiPrompt = soshi.systemPrompt;
  } catch { }

  return { soshiPrompt, wsContext };
}

// ── POST /api/ads/recommendations ────────────────────────────────────────────
router.post("/recommendations", async (req, res) => {
  try {
    const { businessTag, product } = req.body as Record<string, string>;
    if (!businessTag) return res.status(400).json({ error: "businessTag is required" });

    const { soshiPrompt, wsContext } = await loadSoshiContext(businessTag);

    const systemPrompt = `${soshiPrompt}

${wsContext ? `Business Context:\n${wsContext}` : ''}

You are giving strategic ad recommendations. Be specific, opinionated, and actionable. No generic advice.`;

    const userPrompt = `Based on this business${product ? ` and the product/service being advertised: "${product}"` : ''}, give me your expert strategic recommendations for running paid ads.

Return a JSON object with exactly these fields:
{
  "best_platform": "one of: meta, google_search, linkedin, tiktok, youtube, instagram",
  "platform_reason": "2-sentence explanation of WHY this platform for this specific business",
  "best_framework": "one of: aida, pas, hook_story_offer, fab, before_after_bridge, four_u, five_objections",
  "framework_reason": "2-sentence explanation of WHY this framework fits",
  "top_angles": [
    { "angle": "angle name", "description": "1 sentence description of this creative angle" },
    { "angle": "angle name", "description": "1 sentence" },
    { "angle": "angle name", "description": "1 sentence" }
  ],
  "audience_insight": "2-3 sentences about the target audience psychology — what they fear, desire, and what language triggers action",
  "quick_win": "One specific, actionable tip SOSHI would give right now to get results faster"
}

Return ONLY the JSON object, no markdown.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = (message.content[0] as any).text?.trim() ?? "";
    let recommendations: any = {};
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      recommendations = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      return res.status(500).json({ error: "Failed to parse SOSHI response", raw });
    }

    res.json(recommendations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ads/generate ───────────────────────────────────────────────────
router.post("/generate", async (req, res) => {
  try {
    const {
      businessTag,
      platform,
      adType,
      framework,
      product,
      targetAudience,
      usp,
      painPoint,
      callToAction,
      tone,
      variations = 3,
    } = req.body as Record<string, any>;

    if (!platform || !product || !businessTag) {
      return res.status(400).json({ error: "platform, product, and businessTag are required" });
    }

    // Load SOSHI agent + workspace context
    const { soshiPrompt, wsContext } = await loadSoshiContext(businessTag);

    const fw = FRAMEWORKS[framework] ?? FRAMEWORKS.aida;
    const platformRules = PLATFORM_RULES[platform] ?? "";
    const numVariations = Math.min(Math.max(Number(variations) || 3, 1), 5);

    const systemPrompt = `${soshiPrompt}

You have studied and internalized the methods of:
- David Ogilvy (research-driven, brand-building, consumer respect)
- Gary Halbert (urgency, specificity, emotional agitation)
- Dan Kennedy (direct response, ROI, no-BS copy)
- Claude Hopkins (scientific advertising, testing, specificity)
- Eugene Schwartz (awareness levels, desire amplification)
- Alex Hormozi (offer construction, value stacks, clarity)
- Gary Vaynerchuk (platform-native, authentic, attention economy)
- Frank Kern (story-selling, relationship, entertainment)

You write ads that:
1. Stop the scroll in the first 2 seconds
2. Speak directly to ONE specific person's pain or desire
3. Use specifics, not generalities (numbers, names, results, dates)
4. Create desire before presenting the solution
5. Remove risk with proof, guarantees, or social proof
6. Have one crystal-clear call to action

${wsContext ? `Business Context:\n${wsContext}` : ''}`;

    const userPrompt = `Create ${numVariations} high-converting ad variations for the following:

BUSINESS/PRODUCT: ${product}
PLATFORM: ${platform.toUpperCase()}
AD TYPE: ${adType || "standard"}
TARGET AUDIENCE: ${targetAudience || "business owners and decision makers"}
UNIQUE SELLING PROPOSITION: ${usp || "superior quality and results"}
${painPoint ? `MAIN PAIN POINT: ${painPoint}` : ""}
${callToAction ? `DESIRED CTA: ${callToAction}` : ""}
TONE: ${tone || "professional but direct"}

ADVERTISING FRAMEWORK TO USE:
${fw.structure}

PLATFORM-SPECIFIC RULES TO FOLLOW:
${platformRules}

OUTPUT FORMAT — Return a valid JSON array with exactly ${numVariations} objects. Each object must have:
{
  "variation": number (1, 2, 3...),
  "framework_used": "${fw.name}",
  "hook": "the thumb-stopping first line or 5-second hook",
  "headline": "main headline (follow platform character limits)",
  "body": "full ad body copy",
  "cta": "call to action",
  "description": "short ad description (where platform uses it)",
  "copywriter_notes": "1-2 sentences on WHY this version works and what element to A/B test"
}

IMPORTANT: 
- Make each variation meaningfully different (different angle, different hook style, different emotional trigger)
- Variation 1: Lead with pain/problem
- Variation 2: Lead with desired outcome/dream result
- Variation 3: Lead with social proof or credibility
- Additional variations: try curiosity gaps, contrarian angles, or story-led approaches
- Return ONLY the JSON array, no markdown, no explanation.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = (message.content[0] as any).text?.trim() ?? "";

    // Parse JSON response
    let ads: any[] = [];
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      ads = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      return res.status(500).json({ error: "Failed to parse AI response", raw });
    }

    res.json({ ads, framework: fw.name, platform });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ads/frameworks ──────────────────────────────────────────────────
router.get("/frameworks", (_req, res) => {
  const list = Object.entries(FRAMEWORKS).map(([key, val]) => ({
    key,
    name: val.name,
    description: val.description,
  }));
  res.json(list);
});

// ── GET /api/ads/platforms ───────────────────────────────────────────────────
router.get("/platforms", (_req, res) => {
  res.json([
    { key: "meta",          name: "Meta / Facebook",  icon: "📘", charLimits: { headline: 27, body: 2200, description: 27 } },
    { key: "google_search", name: "Google Search",    icon: "🔍", charLimits: { headline: 30, body: 90, description: 90 } },
    { key: "linkedin",      name: "LinkedIn",         icon: "💼", charLimits: { headline: 70, body: 600, description: 150 } },
    { key: "tiktok",        name: "TikTok",           icon: "🎵", charLimits: { headline: 100, body: 150, description: 80 } },
    { key: "youtube",       name: "YouTube",          icon: "▶️", charLimits: { headline: 100, body: 500, description: 150 } },
    { key: "instagram",     name: "Instagram",        icon: "📸", charLimits: { headline: 40, body: 2200, description: 125 } },
  ]);
});

export default router;
