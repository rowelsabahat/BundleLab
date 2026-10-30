import { describe, expect, it } from "vitest";
import { seedProducts } from "../catalog";
import { newWorkingBundle, savedBundleFor } from "../editor/model";
import {
  catalogFacts,
  compileCopy,
  copyPlanSchema,
  demoCopyPlan,
} from "./grounding";
import {
  completeCopy,
  emptyCopy,
  formattedListing,
  listingContext,
  listingExport,
} from "./model";
import {
  decodeListings,
  emptyListingStore,
  persistListings,
  saveListing,
  type ListingDocument,
} from "./storage";
const id = "740b58c0-a90b-420c-b9a1-3d459ec3d0c1";
const id2 = "740b58c0-a90b-420c-b9a1-3d459ec3d0c2";
const bundle = savedBundleFor(
  {
    ...newWorkingBundle(id, "2026-10-29T12:00:00.000Z"),
    draft: {
      title: "A saved pair",
      lines: [
        { productId: "BL-001", quantity: 1 },
        { productId: "BL-004", quantity: 1 },
      ],
      pricing: { mode: "price", priceCents: 6001 },
    },
  },
  seedProducts,
);
const context = listingContext(bundle, seedProducts);
const facts = catalogFacts(context.lineup);
const plan = demoCopyPlan(facts, "professional");
const compiled = compileCopy(plan, facts, "professional", "skincare");
const doc: ListingDocument = {
  bundleId: id,
  contextKey: context.key,
  tone: "professional",
  source: "demo",
  merchantEdited: false,
  updatedAt: "2026-10-29T12:00:00.000Z",
  copy: compiled.listing,
};
describe("catalog-grounded listing composition", () => {
  it("produces all editable fields, exactly three points, and only exact source-backed factual text", () => {
    expect(completeCopy(compiled.listing)).toBe(true);
    expect(compiled.listing.sellingPoints).toHaveLength(3);
    for (const point of compiled.listing.sellingPoints)
      expect(facts.map((f) => f.text)).toContain(point);
    expect(compiled.listing.detailedDescription).toContain(
      seedProducts[0].description,
    );
    expect(compiled.listing.detailedDescription).toContain(
      seedProducts[3].description,
    );
    expect(JSON.stringify(compiled.listing)).not.toMatch(
      /\$|%|certified|guaranteed|clinical/i,
    );
  });
  it("makes reproducible Demo templates and distinct tone choices without any API call", () => {
    expect(demoCopyPlan(facts, "professional")).toEqual(plan);
    const tones = ["professional", "playful", "minimal"] as const;
    const titles = tones.map(
      (tone) =>
        compileCopy(demoCopyPlan(facts, tone), facts, tone, "skincare").listing
          .title,
    );
    expect(new Set(titles).size).toBe(3);
  });
  it("rejects unsupported facts, invented prose/financial fields, duplicates and omissions", () => {
    expect(() =>
      compileCopy(
        { ...plan, shortFactIds: ["MISSING:name"] },
        facts,
        "professional",
        "skincare",
      ),
    ).toThrow();
    expect(() =>
      compileCopy(
        {
          ...plan,
          detailedFactIds: [plan.detailedFactIds[0], plan.detailedFactIds[0]],
        },
        facts,
        "professional",
        "skincare",
      ),
    ).toThrow();
    expect(() =>
      compileCopy(
        {
          ...plan,
          sellingPointFactIds: [
            "bundle:contents",
            "bundle:contents",
            "bundle:contents",
          ],
        },
        facts,
        "professional",
        "skincare",
      ),
    ).toThrow();
    expect(
      copyPlanSchema.safeParse({
        ...plan,
        title: "Guaranteed acne cure",
        priceCents: 1,
      }).success,
    ).toBe(false);
    expect(() =>
      compileCopy(
        { ...plan, detailedFactIds: ["BL-001:description", "bundle:contents"] },
        facts,
        "professional",
        "skincare",
      ),
    ).toThrow();
  });
  it("keeps names/quantities grounded and never claims an invented discount", () => {
    const fact = catalogFacts([
      { product: seedProducts[0], quantity: 3 },
      { product: seedProducts[3], quantity: 1 },
    ]).find((f) => f.id === "bundle:contents");
    expect(fact?.text).toContain("3 × Dewdrop Gel Cleanser");
    expect(fact?.text).not.toContain("free");
  });
});
describe("approved bundle export and context", () => {
  it("preserves exact direct cents and lineup while excluding internal costs and secrets", () => {
    const exported = listingExport(
      bundle,
      seedProducts,
      compiled.listing,
      "professional",
      "demo",
      true,
    );
    expect(exported.priceCents).toBe(6001);
    expect(exported.products.map((p) => p.id)).toEqual(["BL-001", "BL-004"]);
    expect(JSON.stringify(exported)).not.toContain('"costCents"');
    expect(exported.reviewRequired).toBe(true);
    expect(formattedListing(exported)).toContain("Price: $60.01 USD");
    expect(formattedListing(exported)).toContain(
      compiled.listing.promotionalCopy,
    );
  });
  it("flags a context change for any price, product, quantity or catalog description change", () => {
    expect(
      listingContext(
        {
          ...bundle,
          draft: {
            ...bundle.draft,
            pricing: { mode: "price", priceCents: 6000 },
          },
        },
        seedProducts,
      ).key,
    ).not.toBe(context.key);
    expect(
      listingContext(
        {
          ...bundle,
          draft: {
            ...bundle.draft,
            lines: [
              { productId: "BL-001", quantity: 2 },
              bundle.draft.lines[1],
            ],
          },
        },
        seedProducts,
      ).key,
    ).not.toBe(context.key);
    expect(
      listingContext(
        bundle,
        seedProducts.map((p) =>
          p.id === "BL-001" ? { ...p, description: "Changed description." } : p,
        ),
      ).key,
    ).not.toBe(context.key);
  });
  it("rejects missing catalog products, incomplete copy, and invalid saved prices", () => {
    expect(() => listingContext(bundle, [])).toThrow();
    expect(completeCopy(emptyCopy())).toBe(false);
    expect(() =>
      listingExport(
        bundle,
        seedProducts,
        emptyCopy(),
        "professional",
        "manual",
        true,
      ),
    ).toThrow();
    expect(() =>
      listingContext(
        {
          ...bundle,
          draft: { ...bundle.draft, pricing: { mode: "price", priceCents: 1 } },
        },
        seedProducts,
      ),
    ).toThrow();
  });
});
describe("listing edit persistence", () => {
  it("restores edited copy, separates bundle IDs and does not mutate the named bundle", () => {
    const original = JSON.stringify(bundle);
    const one = saveListing(emptyListingStore(), {
      ...doc,
      copy: { ...doc.copy, title: "Merchant edited title" },
      merchantEdited: true,
    });
    const two = saveListing(one, { ...doc, bundleId: id2 });
    const restored = decodeListings(JSON.stringify(two));
    expect(restored.documents.find((d) => d.bundleId === id)?.copy.title).toBe(
      "Merchant edited title",
    );
    expect(restored.documents).toHaveLength(2);
    expect(JSON.stringify(bundle)).toBe(original);
  });
  it("rejects corrupt/unknown stores, duplicates, and a full store without silently dropping edits", () => {
    expect(() => decodeListings("{bad")).toThrow();
    expect(() => decodeListings('{"version":2,"documents":[]}')).toThrow();
    expect(() =>
      decodeListings(JSON.stringify({ version: 1, documents: [doc, doc] })),
    ).toThrow();
    const fifty = Array.from({ length: 50 }, (_, i) => ({
      ...doc,
      bundleId: `740b58c0-a90b-420c-b9a1-${String(i).padStart(12, "0")}`,
    }));
    expect(() => saveListing({ version: 1, documents: fifty }, doc)).toThrow();
    expect(fifty).toHaveLength(50);
  });
  it("preserves source/tone metadata and refuses stale writes or unavailable storage", () => {
    const store = saveListing(emptyListingStore(), {
      ...doc,
      requestedTone: "playful",
      merchantEdited: true,
    });
    let raw: string | null = null;
    const storage = {
      getItem: () => raw,
      setItem: (_key: string, value: string) => {
        raw = value;
      },
    };
    const saved = persistListings(storage, store, null);
    expect(decodeListings(saved).documents[0].requestedTone).toBe("playful");
    expect(() => persistListings(storage, store, null)).toThrow(/Another tab/);
    expect(() =>
      persistListings(
        {
          getItem: () => null,
          setItem: () => {
            throw new Error("Quota");
          },
        },
        store,
        null,
      ),
    ).toThrow(/only in this tab/);
  });
});
