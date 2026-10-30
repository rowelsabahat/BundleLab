import { z } from "zod";
import {
  MAX_IMPORTED_PRODUCTS,
  productListSchema,
  type Product,
} from "./schemas";
export const CATALOG_STORAGE_KEY = "bundlelab:imported-products:v1";
const storedCatalogSchema = z.strictObject({
  version: z.literal(1),
  products: productListSchema.max(MAX_IMPORTED_PRODUCTS),
});
export function decodeImportedCatalog(
  raw: string | null,
  existing: Product[],
): Product[] {
  if (raw === null) return [];
  if (raw.length > 2_000_000)
    throw new Error("Saved catalog exceeds the size limit.");
  const { products } = storedCatalogSchema.parse(JSON.parse(raw));
  productListSchema.parse([...existing, ...products]);
  return products;
}
export function encodeImportedCatalog(products: Product[]) {
  return JSON.stringify(storedCatalogSchema.parse({ version: 1, products }));
}
/** Refuse stale-tab writes, including clears, instead of losing unseen imports. */
export function persistImportedCatalog(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  products: Product[] | null,
  expectedRaw: string | null,
) {
  if (storage.getItem(CATALOG_STORAGE_KEY) !== expectedRaw)
    throw new Error(
      "Another tab changed the catalog. Reload before importing or clearing products so those changes are not overwritten.",
    );
  const raw = products === null ? null : encodeImportedCatalog(products);
  if (raw === null) storage.removeItem(CATALOG_STORAGE_KEY);
  else storage.setItem(CATALOG_STORAGE_KEY, raw);
  return raw;
}
