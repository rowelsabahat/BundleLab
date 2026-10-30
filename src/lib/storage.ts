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
