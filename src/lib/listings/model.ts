import { z } from "zod";
import { productListSchema, type Product } from "../schemas";
import {
  namedBundleSchema,
  savedBundleFor,
  calculateEditorBundle,
  type NamedBundle,
} from "../editor/model";
import { money } from "../catalog";
export const toneSchema = z.enum(["professional", "playful", "minimal"]);
export type ListingTone = z.infer<typeof toneSchema>;
export const editableCopySchema = z.strictObject({
  title: z.string().max(120),
  shortDescription: z.string().max(400),
  detailedDescription: z.string().max(6500),
  sellingPoints: z.tuple([
    z.string().max(1200),
    z.string().max(1200),
    z.string().max(1200),
  ]),
  promotionalCopy: z.string().max(350),
});
export type ListingCopy = z.infer<typeof editableCopySchema>;
export const generatedCopySchema = editableCopySchema.extend({
  title: z.string().min(1).max(120),
  shortDescription: z.string().min(1).max(400),
  detailedDescription: z.string().min(1).max(6500),
  sellingPoints: z.tuple([
    z.string().min(1).max(1200),
    z.string().min(1).max(1200),
    z.string().min(1).max(1200),
  ]),
  promotionalCopy: z.string().min(1).max(350),
});
export const listingInputSchema = z.strictObject({
  draft: namedBundleSchema.shape.draft,
  tone: toneSchema,
  importedProducts: productListSchema.max(5),
  expectedPriceCents: z.number().int().min(0).max(50_000_000_000),
});
export const listingResponseSchema = z.strictObject({
  mode: z.enum(["demo", "ai"]),
  tone: toneSchema,
  listing: generatedCopySchema,
  priceCents: z.number().int().nonnegative(),
  productIds: z.array(z.string()).min(2).max(5),
  factsUsed: z.array(z.string()).max(20),
});
export function emptyCopy(): ListingCopy {
  return {
    title: "",
    shortDescription: "",
    detailedDescription: "",
    sellingPoints: ["", "", ""],
    promotionalCopy: "",
  };
}
export function selectedProducts(bundle: NamedBundle, catalog: Product[]) {
  savedBundleFor(bundle, catalog);
  return bundle.draft.lines.map((line) => {
    const product = catalog.find((p) => p.id === line.productId);
    if (!product)
      throw new Error("A selected product is missing from the catalog.");
    return { product, quantity: line.quantity };
  });
}
export function listingContext(bundle: NamedBundle, catalog: Product[]) {
  const lineup = selectedProducts(bundle, catalog);
  const totals = calculateEditorBundle(bundle.draft, catalog);
  // Fingerprint input facts and approved financial inputs, not timestamps or editable copy.
  const key = JSON.stringify({
    id: bundle.id,
    draft: bundle.draft,
    products: lineup,
    priceCents: totals.revenueCents,
  });
  return { key, lineup, totals };
}
export function completeCopy(copy: ListingCopy) {
  return (
    generatedCopySchema.safeParse(copy).success &&
    [
      copy.title,
      copy.shortDescription,
      copy.detailedDescription,
      copy.promotionalCopy,
      ...copy.sellingPoints,
    ].every((s) => s.trim().length > 0)
  );
}
export function listingExport(
  bundle: NamedBundle,
  catalog: Product[],
  copy: ListingCopy,
  tone: ListingTone,
  source: "demo" | "ai" | "manual",
  merchantEdited: boolean,
) {
  const listing = generatedCopySchema.parse(copy);
  const context = listingContext(bundle, catalog);
  if (!completeCopy(listing))
    throw new Error("Complete every listing field before export.");
  return {
    schemaVersion: 1,
    bundleId: bundle.id,
    currency: "USD",
    priceCents: context.totals.revenueCents,
    products: context.lineup.map(({ product, quantity }) => ({
      id: product.id,
      name: product.name,
      quantity,
      unitRetailPriceCents: product.priceCents,
    })),
    tone,
    source,
    merchantEdited,
    reviewRequired: true,
    listing,
  };
}
export function formattedListing(exported: ReturnType<typeof listingExport>) {
  const { listing } = exported;
  return [
    listing.title,
    `Price: ${money(exported.priceCents)} USD`,
    listing.shortDescription,
    listing.detailedDescription,
    "Selling points",
    ...listing.sellingPoints.map((point) => `• ${point}`),
    "Included products",
    ...exported.products.map((p) => `• ${p.quantity} × ${p.name}`),
    "Promotional copy",
    listing.promotionalCopy,
  ].join("\n\n");
}
