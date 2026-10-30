import {
  constraintsSchema,
  recommendationInputSchema,
  type Constraints,
  type RecommendationInput,
} from "./schemas";

export function decimalToInteger(value: string): number {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value))
    throw new Error(
      "Use a nonnegative number with at most two decimal places.",
    );
  const [whole, fraction = ""] = value.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(result))
    throw new Error("That number is too large.");
  return result;
}
/** Deliberately bounded grammar; unknown numeric requirements require explicit clarification. */
export function resolveConstraints(raw: RecommendationInput): Constraints {
  const input = recommendationInputSchema.parse(raw);
  let remaining = input.prompt;
  let cap = input.maxPriceCents;
  let margin = input.minMarginBps;
  const pricePattern =
    /\b(under|below|less than|up to|at most|max(?:imum)?(?: bundle)? price(?: of)?|budget(?: of)?)\s*\$?(\d+(?:\.\d{1,2})?)(?:\s*(?:USD|dollars))?/gi;
  remaining = remaining.replace(
    pricePattern,
    (_match, phrase: string, amount: string) => {
      const cents =
        decimalToInteger(amount) -
        (/^(under|below|less than)$/i.test(phrase) ? 1 : 0);
      if (cents < 0)
        throw new Error(
          "A price below zero is infeasible. Use a nonnegative maximum price.",
        );
      cap = cap === null ? cents : Math.min(cap, cents);
      return " ";
    },
  );
  const marginPatterns = [
    /\b(?:at least|min(?:imum)?)\s*(?:a\s+)?(\d+(?:\.\d{1,2})?)\s*%\s*(?:gross\s*)?margin\b/gi,
    /\b(?:min(?:imum)?\s*)?(?:gross\s*)?margin\s*(?:of\s*|at least\s*|>=\s*)?(\d+(?:\.\d{1,2})?)\s*%/gi,
  ];
  for (const pattern of marginPatterns)
    remaining = remaining.replace(pattern, (_match, amount: string) => {
      const bps = decimalToInteger(amount);
      margin = margin === null ? bps : Math.max(margin, bps);
      return " ";
    });
  if (/\d|[$%]/.test(remaining))
    throw new Error(
      "That numeric requirement is not supported yet. Use ‘under $80’ and ‘at least 35% gross margin’, or move those limits into the controls. Recommendations contain one unit of 2–5 products.",
    );
  const skincare = /\bskincare\b/i.test(input.prompt);
  const wellness = /\bwellness\b/i.test(input.prompt);
  const inferred =
    skincare !== wellness ? (skincare ? "skincare" : "wellness") : "all";
  if (
    inferred !== "all" &&
    input.category !== "all" &&
    input.category !== inferred
  )
    throw new Error(
      "The prompt and category control disagree. Choose the same category or select all categories.",
    );
  return constraintsSchema.parse({
    maxPriceCents: cap,
    minMarginBps: margin,
    category: input.category === "all" ? inferred : input.category,
    theme: input.theme,
  });
}
