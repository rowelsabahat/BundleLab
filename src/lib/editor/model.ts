import { z } from "zod";
import {
  bundleLineSchema,
  constraintsSchema,
} from "../recommendations/schemas";
import type { SavedDraft } from "../recommendations/saved-draft";
import type { Product } from "../schemas";
import { totalsFromAmounts } from "../calculations";
const cents = z.number().int().min(0).max(50_000_000_000);
export const pricingSchema = z.discriminatedUnion("mode", [
  z.strictObject({
    mode: z.literal("discount"),
    discountBps: z.number().int().min(0).max(5000),
  }),
  z.strictObject({ mode: z.literal("price"), priceCents: cents }),
]);
const linesSchema = z
  .array(bundleLineSchema)
  .max(5)
  .refine(
    (lines) => new Set(lines.map((l) => l.productId)).size === lines.length,
    "Products must be unique.",
  );
export const editorDraftSchema = z.strictObject({
  title: z.string().max(80),
  lines: linesSchema,
  pricing: pricingSchema,
});
export type EditorDraft = z.infer<typeof editorDraftSchema>;
export const workingBundleSchema = z.strictObject({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  draft: editorDraftSchema,
  constraints: constraintsSchema,
  source: z.enum(["demo", "ai", "manual"]),
  rationale: z.string().max(350),
});
export type WorkingBundle = z.infer<typeof workingBundleSchema>;
export const namedBundleSchema = workingBundleSchema.extend({
  draft: editorDraftSchema.extend({
    title: z.string().trim().min(1).max(80),
    lines: linesSchema.min(2),
  }),
});
export type NamedBundle = z.infer<typeof namedBundleSchema>;
export const noConstraints = {
  maxPriceCents: null,
  minMarginBps: null,
  category: "all" as const,
  theme: "",
};
export function newWorkingBundle(id: string, now: string): WorkingBundle {
  return {
    id,
    createdAt: now,
    updatedAt: now,
    source: "manual",
    rationale: "",
    constraints: noConstraints,
    draft: {
      title: "Untitled bundle",
      lines: [],
      pricing: { mode: "discount", discountBps: 1000 },
    },
  };
}
export function fromRecommendation(
  chosen: SavedDraft,
  id: string,
): WorkingBundle {
  return workingBundleSchema.parse({
    ...newWorkingBundle(id, chosen.savedAt),
    source: chosen.source,
    constraints: chosen.constraints,
    rationale: chosen.rationale ?? "",
    draft: {
      title: chosen.draft.title,
      lines: chosen.draft.lines,
      pricing: { mode: "discount", discountBps: chosen.draft.discountBps },
    },
  });
}
export function calculateEditorBundle(raw: EditorDraft, catalog: Product[]) {
  const draft = editorDraftSchema.parse(raw);
  let retail = 0;
  let cost = 0;
  for (const line of draft.lines) {
    const product = catalog.find((p) => p.id === line.productId);
    if (!product)
      throw new Error(
        `Product ${line.productId} is no longer in this catalog. Remove it or restore the original CSV.`,
      );
    if (line.quantity > product.stock)
      throw new Error(
        `${product.name}: quantity exceeds the ${product.stock} available units.`,
      );
    retail += product.priceCents * line.quantity;
    cost += product.costCents * line.quantity;
  }
  const discounted = totalsFromAmounts(
    retail,
    cost,
    draft.pricing.mode === "discount" ? draft.pricing.discountBps : 0,
  );
  const revenue =
    draft.pricing.mode === "price"
      ? draft.pricing.priceCents
      : discounted.revenueCents;
  const profit = revenue - cost;
  return {
    retailCents: retail,
    costCents: cost,
    revenueCents: revenue,
    discountCents: retail - revenue,
    grossProfitCents: profit,
    grossMarginBps: revenue > 0 ? Math.round((profit * 10000) / revenue) : null,
    effectiveDiscountBps:
      retail > 0 ? Math.round(((retail - revenue) * 10000) / retail) : null,
    minimumPriceCents: Math.floor(retail / 2),
  };
}
export type EditorTotals = ReturnType<typeof calculateEditorBundle>;
export function pricingIssue(totals: EditorTotals) {
  if (totals.revenueCents > totals.retailCents)
    return "The sale price exceeds combined retail. Lower the price or switch to discount pricing.";
  if (totals.revenueCents < totals.minimumPriceCents)
    return "The sale price is below the 50% discount boundary. Raise the price or switch to discount pricing.";
  return "";
}
export function bundleWarnings(
  bundle: WorkingBundle,
  totals: EditorTotals,
  catalog: Product[],
) {
  const warnings: string[] = [];
  if (
    bundle.constraints.maxPriceCents !== null &&
    totals.revenueCents > bundle.constraints.maxPriceCents
  )
    warnings.push("Sale price exceeds the original requested price cap.");
  if (
    bundle.constraints.minMarginBps !== null &&
    (totals.revenueCents === 0 ||
      totals.grossProfitCents * 10000 <
        bundle.constraints.minMarginBps * totals.revenueCents)
  )
    warnings.push(
      totals.revenueCents === 0
        ? "Target margin cannot be assessed at a zero sale price."
        : "Estimated gross margin is below the original target.",
    );
  if (totals.grossProfitCents < 0)
    warnings.push(
      "Product cost exceeds sale price. This bundle has negative estimated gross profit.",
    );
  if (
    bundle.constraints.category !== "all" &&
    bundle.draft.lines.some(
      (l) =>
        catalog.find((p) => p.id === l.productId)?.category !==
        bundle.constraints.category,
    )
  )
    warnings.push("Some products are outside the original requested category.");
  return warnings;
}
export function savedBundleFor(bundle: WorkingBundle, catalog: Product[]) {
  const named = namedBundleSchema.parse(bundle);
  const totals = calculateEditorBundle(named.draft, catalog);
  if (pricingIssue(totals)) throw new Error(pricingIssue(totals));
  return named;
}
