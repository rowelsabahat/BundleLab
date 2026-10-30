import { describe, expect, it } from "vitest";
import { seedProducts } from "../catalog";
import { totalsFromAmounts } from "../calculations";
import {
  demoRecommendations,
  calculateBundle,
  satisfies,
  validateRecommendation,
  validateDistinctRecommendations,
} from "./engine";
import { resolveConstraints } from "./constraints";
import {
  generatedOutputSchema,
  recommendationInputSchema,
  type Constraints,
  type GeneratedBundle,
} from "./schemas";
import {
  decodeChosenBundle,
  encodeChosenBundle,
  draftFromRecommendation,
} from "./saved-draft";
const constraints: Constraints = {
  maxPriceCents: 8000,
  minMarginBps: 3500,
  category: "skincare",
  theme: "",
};
const candidate: GeneratedBundle = {
  title: "A gentle daily ritual",
  productIds: ["BL-001", "BL-004", "BL-006"],
  rationale:
    "A cleanser, serum and cream bring complementary steps together in a daily routine.",
  discountBps: 2500,
};
const input = {
  prompt:
    "Create a skincare starter kit under $80 with at least a 35% gross margin.",
  ...constraints,
  maxPriceCents: null,
  minMarginBps: null,
  category: "all" as const,
};
describe("hard-constraint interpretation", () => {
  it("parses the example without relying on a model and treats under as strict", () => {
    expect(resolveConstraints(input)).toEqual({
      ...constraints,
      maxPriceCents: 7999,
    });
  });
  it("combines explicit and prompted constraints using stricter values", () => {
    expect(
      resolveConstraints({ ...input, maxPriceCents: 7000, minMarginBps: 6000 }),
    ).toMatchObject({ maxPriceCents: 7000, minMarginBps: 6000 });
  });
  it("supports inclusive caps and explicit controls", () => {
    expect(
      resolveConstraints({
        ...input,
        prompt: "A wellness ritual up to $80 with minimum gross margin of 35%.",
      }),
    ).toMatchObject({
      maxPriceCents: 8000,
      minMarginBps: 3500,
      category: "wellness",
    });
  });
  it.each([
    "Make a kit for 3 people",
    "Create a kit for $80",
    "Create a kit under $80.123",
    "Create a kit under $80 with 10% off",
  ])("does not silently ignore unsupported numeric wording: %s", (prompt) => {
    expect(() => resolveConstraints({ ...input, prompt })).toThrow();
  });
  it("rejects conflicting categories and invalid inputs", () => {
    expect(() =>
      resolveConstraints({ ...input, category: "wellness" }),
    ).toThrow(/disagree/);
    expect(
      recommendationInputSchema.safeParse({ ...input, prompt: "a".repeat(501) })
        .success,
    ).toBe(false);
    expect(
      recommendationInputSchema.safeParse({ ...input, minMarginBps: 10001 })
        .success,
    ).toBe(false);
    expect(
      recommendationInputSchema.safeParse({ ...input, products: [] }).success,
    ).toBe(false);
  });
});
describe("deterministic financial boundary", () => {
  it("recalculates totals from catalog IDs and rounds once at bundle level", () => {
    const result = validateRecommendation(candidate, seedProducts, constraints);
    expect(result.totals).toMatchObject({
      retailCents: 10400,
      discountCents: 2600,
      revenueCents: 7800,
      costCents: 3440,
      grossProfitCents: 4360,
    });
    expect(result.totals).toEqual(calculateBundle(result, seedProducts));
    const tampered = {
      ...result,
      totals: { ...result.totals, revenueCents: 1 },
    };
    expect(calculateBundle(tampered, seedProducts)).toEqual(result.totals);
    expect(totalsFromAmounts(101, 30, 5000).discountCents).toBe(51);
  });
  it("compares the exact margin, not a rounded margin that appears to pass", () => {
    const totals = totalsFromAmounts(100001, 65001, 0);
    expect(totals.grossMarginBps).toBe(3500);
    expect(satisfies(totals, { ...constraints, maxPriceCents: null })).toBe(
      false,
    );
  });
  it("handles zero revenue and losses truthfully", () => {
    expect(totalsFromAmounts(0, 0, 0).grossMarginBps).toBeNull();
    expect(
      satisfies(totalsFromAmounts(0, 0, 0), {
        ...constraints,
        minMarginBps: null,
      }),
    ).toBe(false);
    expect(totalsFromAmounts(100, 200, 0).grossProfitCents).toBe(-100);
  });
  it.each([
    [-1, 0, 0],
    [100, 50, 5001],
    [100, 50, -1],
    [100, 50, 1.5],
    [Infinity, 50, 0],
  ])("rejects invalid financial inputs", (retail, cost, discount) => {
    expect(() => totalsFromAmounts(retail, cost, discount)).toThrow();
  });
  it.each([
    { productIds: ["BL-001", "MISSING"] },
    { productIds: ["BL-001", "BL-001"] },
  ])("rejects unsupported or duplicate product IDs", ({ productIds }) => {
    expect(() =>
      validateRecommendation(
        { ...candidate, productIds },
        seedProducts,
        constraints,
      ),
    ).toThrow();
  });
  it("rejects category, stock, cap, margin and discount violations", () => {
    expect(() =>
      validateRecommendation(candidate, seedProducts, {
        ...constraints,
        category: "wellness",
      }),
    ).toThrow();
    expect(() =>
      validateRecommendation(
        candidate,
        seedProducts.map((p) => (p.id === "BL-001" ? { ...p, stock: 0 } : p)),
        constraints,
      ),
    ).toThrow();
    expect(() =>
      validateRecommendation(candidate, seedProducts, {
        ...constraints,
        maxPriceCents: 7799,
      }),
    ).toThrow();
    expect(() =>
      validateRecommendation(candidate, seedProducts, {
        ...constraints,
        minMarginBps: 9000,
      }),
    ).toThrow();
    expect(() =>
      validateRecommendation(
        { ...candidate, discountBps: 5001 },
        seedProducts,
        constraints,
      ),
    ).toThrow();
  });
  it("deduplicates product sets regardless of order or discount", () => {
    expect(
      validateDistinctRecommendations(
        [
          candidate,
          {
            ...candidate,
            productIds: [...candidate.productIds].reverse(),
            discountBps: 2600,
          },
        ],
        seedProducts,
        constraints,
      ),
    ).toHaveLength(1);
  });
  it("rejects invented product names, financial fields and financial claims in model output", () => {
    expect(
      generatedOutputSchema.safeParse({
        recommendations: [{ ...candidate, revenueCents: 1 }],
      }).success,
    ).toBe(false);
    expect(
      generatedOutputSchema.safeParse({
        recommendations: [{ ...candidate, products: [{ name: "Invented" }] }],
      }).success,
    ).toBe(false);
    expect(
      generatedOutputSchema.safeParse({
        recommendations: [
          { ...candidate, rationale: "This gives a 90% margin." },
        ],
      }).success,
    ).toBe(false);
  });
});
describe("bounded deterministic Demo Mode", () => {
  it("returns up to three reproducible, distinct, constraint-satisfying product sets", () => {
    const a = demoRecommendations(
      seedProducts,
      constraints,
      "skincare starter kit",
    );
    expect(a).toHaveLength(3);
    expect(a).toEqual(
      demoRecommendations(seedProducts, constraints, "skincare starter kit"),
    );
    expect(
      new Set(
        a.map((r) =>
          r.lines
            .map((l) => l.productId)
            .sort()
            .join("|"),
        ),
      ).size,
    ).toBe(3);
    for (const r of a) {
      expect(satisfies(r.totals, constraints)).toBe(true);
      expect(r.rationale).toContain("simulated");
      expect(r.totals).toEqual(calculateBundle(r, seedProducts));
    }
  });
  it("returns no results for infeasible caps, impossible margins and zero-price catalogs", () => {
    expect(
      demoRecommendations(
        seedProducts,
        { ...constraints, maxPriceCents: 1 },
        "starter",
      ),
    ).toEqual([]);
    expect(
      demoRecommendations(
        seedProducts,
        { ...constraints, minMarginBps: 10000 },
        "starter",
      ),
    ).toEqual([]);
    expect(
      demoRecommendations(
        seedProducts
          .slice(0, 2)
          .map((p) => ({ ...p, priceCents: 0, costCents: 0 })),
        constraints,
        "starter",
      ),
    ).toEqual([]);
  });
  it("finds a feasible discount beyond the preferred demo discount", () => {
    const catalog = seedProducts
      .slice(0, 2)
      .map((p) => ({ ...p, priceCents: 1000, costCents: 100 }));
    const results = demoRecommendations(
      catalog,
      { ...constraints, maxPriceCents: 1000 },
      "starter",
    );
    expect(results).toHaveLength(1);
    expect(results[0].discountBps).toBeGreaterThan(1000);
    expect(results[0].totals.revenueCents).toBe(1000);
  });
});
describe("chosen bundle persistence", () => {
  it("stores IDs and inputs without totals and recalculates after restoring", () => {
    const result = validateRecommendation(candidate, seedProducts, constraints);
    const saved = {
      version: 1 as const,
      draft: draftFromRecommendation(result),
      constraints,
      source: "demo" as const,
      savedAt: new Date(0).toISOString(),
    };
    const encoded = encodeChosenBundle(saved);
    expect(encoded).not.toContain("revenueCents");
    expect(decodeChosenBundle(encoded)).toEqual(saved);
    expect(decodeChosenBundle(null)).toBeNull();
    expect(() => decodeChosenBundle("{bad")).toThrow();
    expect(() =>
      decodeChosenBundle(
        JSON.stringify({
          ...saved,
          draft: {
            ...saved.draft,
            lines: [
              { productId: "MISSING", quantity: 1 },
              saved.draft.lines[0],
            ],
          },
        }),
      ),
    ).toThrow();
  });
});
