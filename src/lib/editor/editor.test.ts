import { describe, expect, it } from "vitest";
import { seedProducts } from "../catalog";
import { calculateBundle } from "../recommendations/engine";
import { decodeChosenBundle } from "../recommendations/saved-draft";
import {
  bundleWarnings,
  calculateEditorBundle,
  fromRecommendation,
  newWorkingBundle,
  pricingIssue,
  savedBundleFor,
  type EditorDraft,
} from "./model";
import {
  BUNDLE_LIBRARY_KEY,
  decodeLibrary,
  deleteBundle,
  duplicateBundle,
  emptyLibrary,
  encodeLibrary,
  isUnsaved,
  persistLibrary,
  renameBundle,
  saveNamedBundle,
} from "./library";
const id = "740b58c0-a90b-420c-b9a1-3d459ec3d0c1";
const id2 = "740b58c0-a90b-420c-b9a1-3d459ec3d0c2";
const now = "2026-10-29T12:00:00.000Z";
const draft: EditorDraft = {
  title: "Daily pair",
  lines: [
    { productId: "BL-001", quantity: 1 },
    { productId: "BL-004", quantity: 1 },
  ],
  pricing: { mode: "discount", discountBps: 1000 },
};
const bundle = { ...newWorkingBundle(id, now), draft };
describe("editor money and quantities", () => {
  it("matches recommendation calculations with unchanged quantities and discount", () => {
    expect(calculateEditorBundle(draft, seedProducts)).toMatchObject(
      calculateBundle(
        { title: draft.title, lines: draft.lines, discountBps: 1000 },
        seedProducts,
      ),
    );
  });
  it("updates retail, cost, profit and price immediately when quantities change or a product is removed", () => {
    const updated = { ...draft, lines: [{ productId: "BL-001", quantity: 2 }] };
    expect(calculateEditorBundle(updated, seedProducts)).toMatchObject({
      retailCents: 4800,
      costCents: 1640,
      revenueCents: 4320,
      grossProfitCents: 2680,
    });
    expect(
      calculateEditorBundle({ ...draft, lines: [] }, seedProducts),
    ).toMatchObject({
      retailCents: 0,
      revenueCents: 0,
      costCents: 0,
      grossProfitCents: 0,
      grossMarginBps: null,
      effectiveDiscountBps: null,
    });
  });
  it("rounds the bundle discount half up exactly once", () => {
    const catalog = seedProducts
      .slice(0, 2)
      .map((p) => ({ ...p, priceCents: 101, costCents: 10 }));
    const small = {
      ...draft,
      lines: catalog.map((p) => ({ productId: p.id, quantity: 1 })),
      pricing: { mode: "discount" as const, discountBps: 5000 },
    };
    expect(calculateEditorBundle(small, catalog)).toMatchObject({
      retailCents: 202,
      discountCents: 101,
      revenueCents: 101,
    });
    expect(
      calculateEditorBundle({ ...small, lines: [small.lines[0]] }, catalog),
    ).toMatchObject({ discountCents: 51, revenueCents: 50 });
  });
  it("preserves a direct cent price without converting a rounded percentage back into money", () => {
    const fixed = {
      ...draft,
      pricing: { mode: "price" as const, priceCents: 6001 },
    };
    const totals = calculateEditorBundle(fixed, seedProducts);
    expect(totals.revenueCents).toBe(6001);
    expect(totals.discountCents).toBe(599);
    const moreProducts = {
      ...fixed,
      lines: [...draft.lines, { productId: "BL-006", quantity: 1 }],
    };
    expect(calculateEditorBundle(moreProducts, seedProducts).revenueCents).toBe(
      6001,
    );
  });
  it("holds the discount when products change, but detects an out-of-range fixed price after removal", () => {
    expect(
      calculateEditorBundle(
        { ...draft, lines: [{ productId: "BL-001", quantity: 1 }] },
        seedProducts,
      ).revenueCents,
    ).toBe(2160);
    const outOfRange = calculateEditorBundle(
      { ...draft, lines: [], pricing: { mode: "price", priceCents: 6001 } },
      seedProducts,
    );
    expect(pricingIssue(outOfRange)).toContain("exceeds");
  });
  it("handles zero retail and zero sale without invented margins or discounts", () => {
    const free = seedProducts.map((p) => ({
      ...p,
      priceCents: 0,
      costCents: 0,
    }));
    expect(calculateEditorBundle(draft, free)).toMatchObject({
      effectiveDiscountBps: null,
      grossMarginBps: null,
    });
    const zeroSale = calculateEditorBundle(
      { ...draft, pricing: { mode: "price", priceCents: 0 } },
      seedProducts,
    );
    expect(zeroSale.grossMarginBps).toBeNull();
    expect(zeroSale.grossProfitCents).toBe(-2200);
    expect(pricingIssue(zeroSale)).toContain("50%");
  });
  it.each([-1, 5001, 1.5, Infinity])(
    "rejects invalid discount basis points %s",
    (discountBps) => {
      expect(() =>
        calculateEditorBundle(
          { ...draft, pricing: { mode: "discount", discountBps } },
          seedProducts,
        ),
      ).toThrow();
    },
  );
  it.each([-1, 1.5, NaN, Infinity])(
    "rejects invalid direct cent prices %s",
    (priceCents) => {
      expect(() =>
        calculateEditorBundle(
          { ...draft, pricing: { mode: "price", priceCents } },
          seedProducts,
        ),
      ).toThrow();
    },
  );
  it.each([0, -1, 1.5, 100])("rejects invalid quantities %s", (quantity) => {
    expect(() =>
      calculateEditorBundle(
        { ...draft, lines: [{ productId: "BL-001", quantity }] },
        seedProducts,
      ),
    ).toThrow();
  });
  it("rejects missing products, duplicate selections and stock overflow", () => {
    expect(() => calculateEditorBundle(draft, [])).toThrow(/no longer/);
    expect(() =>
      calculateEditorBundle(
        { ...draft, lines: [draft.lines[0], draft.lines[0]] },
        seedProducts,
      ),
    ).toThrow();
    expect(() =>
      calculateEditorBundle(
        { ...draft, lines: [{ productId: "BL-001", quantity: 99 }] },
        seedProducts,
      ),
    ).toThrow(/available/);
  });
  it("shows cap, exact margin, category, and negative-profit warnings separately", () => {
    const constrained = {
      ...bundle,
      constraints: {
        maxPriceCents: 100,
        minMarginBps: 9000,
        category: "wellness" as const,
        theme: "",
      },
    };
    expect(
      bundleWarnings(
        constrained,
        calculateEditorBundle(draft, seedProducts),
        seedProducts,
      ),
    ).toHaveLength(3);
    const zero = {
      ...constrained,
      draft: { ...draft, pricing: { mode: "price" as const, priceCents: 0 } },
    };
    expect(
      bundleWarnings(
        zero,
        calculateEditorBundle(zero.draft, seedProducts),
        seedProducts,
      ).join(" "),
    ).toContain("zero sale price");
    expect(
      bundleWarnings(
        zero,
        calculateEditorBundle(zero.draft, seedProducts),
        seedProducts,
      ).join(" "),
    ).toContain("negative estimated");
  });
});
describe("named bundle storage", () => {
  it("round trips multiple named bundles and the working draft without trusting stored totals", () => {
    const named = savedBundleFor(bundle, seedProducts);
    const library = saveNamedBundle(emptyLibrary(), named);
    const two = duplicateBundle(library, id, id2, now);
    const encoded = encodeLibrary(two);
    expect(encoded).not.toContain("grossProfitCents");
    expect(decodeLibrary(encoded)).toEqual(two);
    expect(decodeLibrary(null)).toEqual(emptyLibrary());
    expect(
      calculateEditorBundle(
        decodeLibrary(encoded).bundles[0].draft,
        seedProducts,
      ),
    ).toEqual(calculateEditorBundle(draft, seedProducts));
  });
  it("renames, duplicates, deletes and preserves the original copy independently", () => {
    const library = saveNamedBundle(
      emptyLibrary(),
      savedBundleFor(bundle, seedProducts),
    );
    const renamed = renameBundle(library, id, "Evening pair", now);
    expect(renamed.active?.draft.title).toBe("Evening pair");
    const duplicated = duplicateBundle(renamed, id, id2, now);
    expect(duplicated.bundles[0].draft.title).toBe("Evening pair copy");
    expect(duplicated.bundles[0].id).not.toBe(id);
    const removed = deleteBundle(duplicated, id);
    expect(removed.active).toBeNull();
    expect(removed.bundles[0].id).toBe(id2);
    expect(library.bundles[0].draft.title).toBe("Daily pair");
  });
  it("distinguishes working autosave from named save and prevents empty or invalid saves", () => {
    const named = savedBundleFor(bundle, seedProducts);
    expect(isUnsaved(named, [named])).toBe(false);
    expect(
      isUnsaved({ ...named, draft: { ...draft, title: "Edited" } }, [named]),
    ).toBe(true);
    expect(() =>
      savedBundleFor(newWorkingBundle(id, now), seedProducts),
    ).toThrow();
    expect(() =>
      savedBundleFor(
        {
          ...bundle,
          draft: { ...draft, pricing: { mode: "price", priceCents: 1 } },
        },
        seedProducts,
      ),
    ).toThrow();
  });
  it("rejects corrupt/unsupported envelopes, unexpected fields, duplicate IDs and exceeding 50 names", () => {
    expect(() => decodeLibrary("{bad")).toThrow();
    expect(() =>
      decodeLibrary(JSON.stringify({ ...emptyLibrary(), version: 2 })),
    ).toThrow();
    expect(() =>
      decodeLibrary(JSON.stringify({ ...emptyLibrary(), totals: {} })),
    ).toThrow();
    const named = savedBundleFor(bundle, seedProducts);
    expect(() =>
      encodeLibrary({ ...emptyLibrary(), bundles: [named, named] }),
    ).toThrow();
    const fifty = Array.from({ length: 50 }, (_, i) => ({
      ...named,
      id: `740b58c0-a90b-420c-b9a1-${String(i).padStart(12, "0")}`,
    }));
    const full = { ...emptyLibrary(), bundles: fifty };
    expect(decodeLibrary(encodeLibrary(full)).bundles).toHaveLength(50);
    expect(() => duplicateBundle(full, fifty[0].id, id2, now)).toThrow();
  });
  it("keeps missing catalog references recoverable but does not fabricate financial values", () => {
    const saved = saveNamedBundle(
      emptyLibrary(),
      savedBundleFor(bundle, seedProducts),
    );
    const restored = decodeLibrary(encodeLibrary(saved));
    expect(restored.bundles).toHaveLength(1);
    expect(() =>
      calculateEditorBundle(restored.bundles[0].draft, []),
    ).toThrow();
  });
  it("refuses stale tab writes and reports quota failures without claiming success", () => {
    let raw: string | null = null;
    const storage = {
      getItem: (key: string) => {
        expect(key).toBe(BUNDLE_LIBRARY_KEY);
        return raw;
      },
      setItem: (_key: string, value: string) => {
        raw = value;
      },
    };
    const encoded = persistLibrary(storage, emptyLibrary(), null);
    expect(raw).toBe(encoded);
    expect(() => persistLibrary(storage, emptyLibrary(), null)).toThrow(
      /Another tab/,
    );
    const broken = {
      getItem: () => null,
      setItem: () => {
        throw new Error("Quota exceeded");
      },
    };
    expect(() => persistLibrary(broken, emptyLibrary(), null)).toThrow(
      /only in this tab/,
    );
  });
  it("migrates older recommendation handoffs and preserves rationale, constraints and discount", () => {
    const chosen = decodeChosenBundle(
      JSON.stringify({
        version: 1,
        source: "ai",
        savedAt: now,
        constraints: bundle.constraints,
        draft: { title: draft.title, lines: draft.lines, discountBps: 1234 },
      }),
    );
    expect(chosen).not.toBeNull();
    if (!chosen) throw new Error("Missing fixture");
    const migrated = fromRecommendation(
      { ...chosen, rationale: "The original complementary pairing." },
      id,
    );
    expect(migrated.rationale).toBe("The original complementary pairing.");
    expect(migrated.draft.pricing).toEqual({
      mode: "discount",
      discountBps: 1234,
    });
    expect(migrated.constraints).toEqual(chosen.constraints);
  });
});
