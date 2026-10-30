import { z } from "zod";
import { editableCopySchema, toneSchema, type ListingCopy } from "./model";
export const LISTINGS_KEY = "bundlelab:listings:v1";
export const listingDocumentSchema = z.strictObject({
  bundleId: z.uuid(),
  contextKey: z.string().max(20_000),
  tone: toneSchema,
  requestedTone: toneSchema.optional(),
  source: z.enum(["demo", "ai", "manual"]),
  merchantEdited: z.boolean(),
  updatedAt: z.iso.datetime(),
  copy: editableCopySchema,
});
export type ListingDocument = z.infer<typeof listingDocumentSchema>;
const storeSchema = z.strictObject({
  version: z.literal(1),
  documents: z
    .array(listingDocumentSchema)
    .max(50)
    .refine(
      (docs) => new Set(docs.map((d) => d.bundleId)).size === docs.length,
      "Duplicate listing bundle IDs.",
    ),
});
export type ListingStore = z.infer<typeof storeSchema>;
export function emptyListingStore(): ListingStore {
  return { version: 1, documents: [] };
}
export function decodeListings(raw: string | null): ListingStore {
  if (raw === null) return emptyListingStore();
  if (raw.length > 2_000_000)
    throw new Error("Saved listing store exceeds the size limit.");
  return storeSchema.parse(JSON.parse(raw));
}
export function saveListing(store: ListingStore, document: ListingDocument) {
  const value = listingDocumentSchema.parse(document);
  const next = storeSchema.parse({
    version: 1,
    documents: [
      value,
      ...store.documents.filter((d) => d.bundleId !== value.bundleId),
    ],
  });
  return next;
}
export function persistListings(
  storage: Pick<Storage, "getItem" | "setItem">,
  store: ListingStore,
  expected: string | null,
) {
  if (storage.getItem(LISTINGS_KEY) !== expected)
    throw new Error(
      "Another tab changed the listing drafts. Reload before saving so those edits are not overwritten.",
    );
  const raw = JSON.stringify(storeSchema.parse(store));
  if (raw.length > 2_000_000)
    throw new Error(
      "Listing storage is full. Export your copy before leaving this tab.",
    );
  try {
    storage.setItem(LISTINGS_KEY, raw);
  } catch {
    throw new Error(
      "Listing edits are only in this tab. Browser storage is blocked or full; export a copy before leaving.",
    );
  }
  return raw;
}
export function copyHasContent(copy: ListingCopy) {
  return [
    copy.title,
    copy.shortDescription,
    copy.detailedDescription,
    copy.promotionalCopy,
    ...copy.sellingPoints,
  ].some((s) => s.trim());
}
