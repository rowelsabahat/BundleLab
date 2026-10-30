import type { Product } from "../schemas";
import { totalsFromAmounts } from "../calculations";
import {
  bundleDraftSchema,
  generatedBundleSchema,
  recommendationResponseSchema,
  constraintsSchema,
  type BundleDraft,
  type Constraints,
  type GeneratedBundle,
  type Recommendation,
} from "./schemas";

/** Recheck the response against the submitted guardrails before showing a pass label. */
export function verifyRecommendationResponse(
  raw: unknown,
  catalog: Product[],
  expected: Constraints,
) {
  const response = recommendationResponseSchema.parse(raw);
  if (
    JSON.stringify(response.constraints) !==
      JSON.stringify(constraintsSchema.parse(expected)) ||
    (response.status === "ok") !== response.recommendations.length > 0 ||
    (response.mode === "demo" && response.status === "no_valid_ai_results")
  )
    throw new Error("The response does not match the requested constraints.");
  const seen = new Set<string>();
  const eligible = eligibleProducts(catalog, expected);
  const recommendations = response.recommendations.map((recommendation) => {
    const key = recommendation.lines
      .map((line) => line.productId)
      .sort()
      .join("|");
    if (
      seen.has(key) ||
      recommendation.lines.some((line) => line.quantity !== 1)
    )
      throw new Error(
        "The response contains repeated sets or unsupported quantities.",
      );
    seen.add(key);
    const totals = calculateBundle(recommendation, eligible);
    if (!satisfies(totals, expected))
      throw new Error(
        "The response failed the requested price or margin constraints.",
      );
    return { ...recommendation, totals };
  });
  return { ...response, recommendations };
}

export function calculateBundle(raw: BundleDraft, catalog: Product[]) {
  // Derived fields on a recommendation are deliberately discarded before calculation.
  const draft = bundleDraftSchema.parse({
    title: raw.title,
    lines: raw.lines,
    discountBps: raw.discountBps,
  });
  const seen = new Set<string>();
  let retail = 0;
  let cost = 0;
  for (const line of draft.lines) {
    if (seen.has(line.productId))
      throw new Error("Duplicate product selection.");
    seen.add(line.productId);
    const product = catalog.find((p) => p.id === line.productId);
    if (!product) throw new Error("Unknown product ID.");
    if (line.quantity > product.stock)
      throw new Error("Insufficient product stock.");
    retail += product.priceCents * line.quantity;
    cost += product.costCents * line.quantity;
  }
  return totalsFromAmounts(retail, cost, draft.discountBps);
}
export function eligibleProducts(catalog: Product[], constraints: Constraints) {
  return catalog.filter(
    (p) =>
      p.stock > 0 &&
      (constraints.category === "all" || p.category === constraints.category),
  );
}
export function satisfies(
  totals: ReturnType<typeof totalsFromAmounts>,
  constraints: Constraints,
) {
  // Cross multiplication tests the exact margin, never its rounded display value.
  return (
    totals.revenueCents > 0 &&
    (constraints.maxPriceCents === null ||
      totals.revenueCents <= constraints.maxPriceCents) &&
    totals.grossProfitCents * 10000 >=
      (constraints.minMarginBps ?? 0) * totals.revenueCents
  );
}
export function validateRecommendation(
  raw: GeneratedBundle,
  catalog: Product[],
  constraints: Constraints,
): Recommendation {
  const candidate = generatedBundleSchema.parse(raw);
  const eligible = eligibleProducts(catalog, constraints);
  const draft = {
    title: candidate.title,
    lines: candidate.productIds.map((productId) => ({
      productId,
      quantity: 1,
    })),
    discountBps: candidate.discountBps,
  };
  const totals = calculateBundle(draft, eligible);
  if (!satisfies(totals, constraints))
    throw new Error("Recommendation violates hard constraints.");
  return { ...draft, rationale: candidate.rationale, totals };
}
export function validateDistinctRecommendations(
  candidates: GeneratedBundle[],
  catalog: Product[],
  constraints: Constraints,
) {
  const seen = new Set<string>();
  const valid: Recommendation[] = [];
  for (const candidate of candidates) {
    try {
      const recommendation = validateRecommendation(
        candidate,
        catalog,
        constraints,
      );
      const key = recommendation.lines
        .map((l) => l.productId)
        .sort()
        .join("|");
      if (!seen.has(key)) {
        seen.add(key);
        valid.push(recommendation);
      }
    } catch {
      /* Invalid suggestions never reach the merchant as valid recommendations. */
    }
  }
  return valid.slice(0, 3);
}
function chooseDiscount(
  retail: number,
  cost: number,
  constraints: Constraints,
) {
  // Find the smallest discount meeting the cap; a higher discount cannot improve margin.
  let low = 0;
  let high = 5000;
  if (constraints.maxPriceCents !== null) {
    if (
      totalsFromAmounts(retail, cost, high).revenueCents >
      constraints.maxPriceCents
    )
      return null;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (
        totalsFromAmounts(retail, cost, mid).revenueCents <=
        constraints.maxPriceCents
      )
        high = mid;
      else low = mid + 1;
    }
  }
  const minimum = low;
  if (!satisfies(totalsFromAmounts(retail, cost, minimum), constraints))
    return null;
  low = minimum;
  high = Math.max(minimum, 1000);
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (satisfies(totalsFromAmounts(retail, cost, mid), constraints)) low = mid;
    else high = mid - 1;
  }
  return low;
}
/** Exhaustive feasibility for one unit of 2–5 distinct products, discounts 0–50% in basis points. */
export function demoRecommendations(
  catalog: Product[],
  constraints: Constraints,
  prompt: string,
): Recommendation[] {
  if (catalog.length > 24)
    throw new Error(
      "Recommendation catalog exceeds the supported search bound.",
    );
  const eligible = eligibleProducts(catalog, constraints);
  const words = `${constraints.theme} ${prompt}`
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);
  const top: { draft: GeneratedBundle; score: number; key: string }[] = [];
  function visit(
    start: number,
    chosen: Product[],
    retail: number,
    cost: number,
  ) {
    if (chosen.length >= 2) {
      const discountBps = chooseDiscount(retail, cost, constraints);
      if (discountBps !== null) {
        const matches = chosen.reduce(
          (sum, p) =>
            sum +
            words.filter((w) =>
              `${p.name} ${p.tags.join(" ")}`.toLowerCase().includes(w),
            ).length,
          0,
        );
        const diversity = new Set(chosen.flatMap((p) => p.tags.slice(0, 1)))
          .size;
        const score =
          matches * 10 + diversity * 3 - Math.abs(chosen.length - 3) * 4;
        const key = chosen.map((p) => p.id).join("|");
        const tags = [...new Set(chosen.flatMap((p) => p.tags))].slice(0, 3);
        top.push({
          score,
          key,
          draft: {
            title:
              constraints.category === "wellness"
                ? "A considered wellness ritual"
                : constraints.category === "skincare"
                  ? "Your everyday skin ritual"
                  : "The daily ritual collection",
            productIds: chosen.map((p) => p.id),
            discountBps,
            rationale: `A simulated pairing drawn from catalog tags: ${tags.join(", ")}. Review the products to decide whether this combination fits your merchandising story.`,
          },
        });
        top.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
        if (top.length > 12) top.pop();
      }
    }
    if (chosen.length === 5) return;
    for (let i = start; i < eligible.length; i++)
      visit(
        i + 1,
        [...chosen, eligible[i]],
        retail + eligible[i].priceCents,
        cost + eligible[i].costCents,
      );
  }
  visit(0, [], 0, 0);
  return validateDistinctRecommendations(
    top.slice(0, 3).map((c) => c.draft),
    catalog,
    constraints,
  );
}
