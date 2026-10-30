import { z } from "zod";
import {
  namedBundleSchema,
  workingBundleSchema,
  type WorkingBundle,
  type NamedBundle,
} from "./model";
export const BUNDLE_LIBRARY_KEY = "bundlelab:saved-bundles:v1";
export const MAX_SAVED_BUNDLES = 50;
const uniqueBundles = z
  .array(namedBundleSchema)
  .max(MAX_SAVED_BUNDLES)
  .refine(
    (bundles) => new Set(bundles.map((b) => b.id)).size === bundles.length,
    "Duplicate saved bundle IDs.",
  );
export const librarySchema = z.strictObject({
  version: z.literal(1),
  bundles: uniqueBundles,
  active: workingBundleSchema.nullable(),
  recommendationAt: z.iso.datetime().nullable(),
});
export type BundleLibrary = z.infer<typeof librarySchema>;
export function emptyLibrary(): BundleLibrary {
  return { version: 1, bundles: [], active: null, recommendationAt: null };
}
export function decodeLibrary(raw: string | null): BundleLibrary {
  if (raw === null) return emptyLibrary();
  if (raw.length > 1_000_000)
    throw new Error("Saved bundle library is too large.");
  return librarySchema.parse(JSON.parse(raw));
}
export function encodeLibrary(library: BundleLibrary) {
  return JSON.stringify(librarySchema.parse(library));
}
export function saveNamedBundle(
  library: BundleLibrary,
  bundle: NamedBundle,
): BundleLibrary {
  const named = namedBundleSchema.parse(bundle);
  const found = library.bundles.some((b) => b.id === named.id);
  return librarySchema.parse({
    ...library,
    active: named,
    bundles: found
      ? library.bundles.map((b) => (b.id === named.id ? named : b))
      : [named, ...library.bundles],
  });
}
export function renameBundle(
  library: BundleLibrary,
  id: string,
  title: string,
  now: string,
): BundleLibrary {
  const bundle = library.bundles.find((b) => b.id === id);
  if (!bundle) throw new Error("Saved bundle not found.");
  const updated = namedBundleSchema.parse({
    ...bundle,
    updatedAt: now,
    draft: { ...bundle.draft, title },
  });
  return librarySchema.parse({
    ...library,
    bundles: library.bundles.map((b) => (b.id === id ? updated : b)),
    active:
      library.active?.id === id
        ? {
            ...library.active,
            updatedAt: now,
            draft: { ...library.active.draft, title: updated.draft.title },
          }
        : library.active,
  });
}
export function duplicateBundle(
  library: BundleLibrary,
  id: string,
  newId: string,
  now: string,
): BundleLibrary {
  const bundle = library.bundles.find((b) => b.id === id);
  if (!bundle) throw new Error("Saved bundle not found.");
  const copy = namedBundleSchema.parse({
    ...bundle,
    id: newId,
    createdAt: now,
    updatedAt: now,
    draft: {
      ...bundle.draft,
      title: `${bundle.draft.title.slice(0, 75)} copy`,
    },
  });
  return librarySchema.parse({
    ...library,
    bundles: [copy, ...library.bundles],
  });
}
export function deleteBundle(
  library: BundleLibrary,
  id: string,
): BundleLibrary {
  return {
    ...library,
    bundles: library.bundles.filter((b) => b.id !== id),
    active: library.active?.id === id ? null : library.active,
  };
}
export function isUnsaved(
  active: WorkingBundle | null,
  bundles: NamedBundle[],
) {
  if (!active) return false;
  const saved = bundles.find((b) => b.id === active.id);
  return !saved || JSON.stringify(active.draft) !== JSON.stringify(saved.draft);
}
// One atomic envelope prevents half-completed library/draft writes. Reject stale-tab overwrites.
export function persistLibrary(
  storage: Pick<Storage, "getItem" | "setItem">,
  next: BundleLibrary,
  expectedRaw: string | null,
) {
  if (storage.getItem(BUNDLE_LIBRARY_KEY) !== expectedRaw)
    throw new Error(
      "Another tab changed the bundle library. Reload before saving to avoid overwriting those changes.",
    );
  const encoded = encodeLibrary(next);
  try {
    storage.setItem(BUNDLE_LIBRARY_KEY, encoded);
  } catch {
    throw new Error(
      "Browser storage is blocked or full. Changes are only in this tab; they have not been saved.",
    );
  }
  return encoded;
}
