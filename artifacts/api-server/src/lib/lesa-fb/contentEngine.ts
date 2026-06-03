/**
 * Content engine — generates on-brand Facebook posts for LESA Inspections.
 * Uses the SynthDesk shared Anthropic client (same as all other agents).
 * Rotates through 6 post themes for feed variety.
 */
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { LESA } from "./lesaKnowledge";

export type PostTheme =
  | "educational_tip"
  | "service_spotlight"
  | "warranty_value"
  | "seasonal"
  | "realtor_partner"
  | "trust_credibility";

const THEME_ROTATION: PostTheme[] = [
  "educational_tip",
  "seasonal",
  "service_spotlight",
  "warranty_value",
  "realtor_partner",
  "trust_credibility",
];

export function nextTheme(postCount: number): PostTheme {
  return THEME_ROTATION[postCount % THEME_ROTATION.length];
}

function buildPrompt(theme: PostTheme): string {
  const month = new Date().getMonth() + 1;
  const seasonal = LESA.seasonalAngles[month] ?? [];

  return `You are the social media voice of ${LESA.name}, a New Jersey home inspection company.

Write ONE Facebook post. Output ONLY the post text — no preamble, no quotes, no markdown, no hashtag analysis.

BUSINESS FACTS (use only these — do not invent anything):
- ${LESA.yearsInBusiness}+ years in business, serving ${LESA.serviceArea}.
- Certifications: ${LESA.certifications.join(", ")}.
- Core services: ${LESA.services.core.join(", ")}.
- Specialty services: ${LESA.services.specialty.join(", ")}.
- Key differentiators: ${LESA.advantages.slice(0, 5).join("; ")}.
- Warranties: ${LESA.warranties.slice(0, 3).join("; ")}.
- Phone: ${LESA.phone}. Website: ${LESA.website}. Schedule: ${LESA.scheduleUrl}.
- Tagline: "${LESA.tagline}".

BRAND VOICE:
${LESA.brandVoice.map((v) => `- ${v}`).join("\n")}

THIS POST'S THEME: ${theme}
${seasonal.length ? `TIMELY ANGLES FOR THIS MONTH: ${seasonal.join("; ")}.` : ""}

RULES:
- 2 to 4 short paragraphs OR a tight list. Keep it scannable.
- Educational and trustworthy first; soft call-to-action last.
- Include the phone (${LESA.phone}) OR website naturally — not both stuffed in.
- Use 2-4 relevant hashtags at the very end (e.g. #HomeInspection #NewJerseyRealEstate).
- NEVER overpromise (no "guaranteed pass", no "best in NJ", no "we guarantee your home").
- Use "we/our", never "I/my".
- Length between 80 and 1500 characters.`;
}

export interface GeneratedPost {
  theme: PostTheme;
  text: string;
}

export async function generatePost(theme: PostTheme): Promise<GeneratedPost> {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: buildPrompt(theme) }],
  });

  const text = msg.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return { theme, text };
}
