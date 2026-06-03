export interface SafetyResult {
  ok: boolean;
  reasons: string[];
}

const BANNED_CLAIMS = [
  "guaranteed pass",
  "we guarantee your home",
  "100% problem-free",
  "no issues guaranteed",
  "cheapest in nj",
  "best inspector in",
  "we beat any price",
];

const PROFANITY = [
  "damn", "hell", "crap", "ass", "shit", "fuck", "bitch",
];

const MIN_LEN = 80;
const MAX_LEN = 1800;

export function checkBrandSafety(text: string): SafetyResult {
  const reasons: string[] = [];
  const lower = text.toLowerCase();

  if (text.trim().length < MIN_LEN)
    reasons.push(`Too short (${text.trim().length} chars, min ${MIN_LEN}).`);
  if (text.length > MAX_LEN)
    reasons.push(`Too long (${text.length} chars, max ${MAX_LEN}).`);

  for (const claim of BANNED_CLAIMS)
    if (lower.includes(claim))
      reasons.push(`Contains overpromise/risky claim: "${claim}".`);

  for (const word of PROFANITY) {
    const re = new RegExp(`\\b${word}\\b`, "i");
    if (re.test(lower))
      reasons.push(`Contains profanity: "${word}".`);
  }

  if (!lower.includes("lesa") && !lower.includes("inspection"))
    reasons.push("Post does not reference LESA or inspections — likely off-topic.");

  const leakSignals = ["as an ai", "i cannot", "[insert", "lorem ipsum", "{{"];
  for (const sig of leakSignals)
    if (lower.includes(sig))
      reasons.push(`Contains generation artifact: "${sig}".`);

  return { ok: reasons.length === 0, reasons };
}
