import { describe, expect, it } from "vitest";
import { seedProducts, filterProducts } from "./catalog";
import { productSchema, productListSchema } from "./schemas";
import { productMarginBps } from "./calculations";
import { decodeImportedCatalog, encodeImportedCatalog } from "./storage";

describe("catalog trust boundaries", () => {
  it("provides exactly 24 unique fictional products in both categories", () => {
    expect(seedProducts).toHaveLength(24);
    expect(new Set(seedProducts.map((p) => p.id)).size).toBe(24);
    expect(new Set(seedProducts.map((p) => p.category))).toEqual(
      new Set(["skincare", "wellness"]),
    );
    expect(
      seedProducts.every(
        (p) => p.priceCents >= p.costCents && p.currency === "USD",
      ),
    ).toBe(true);
  });
  it.each([-1, 0.5, NaN, Infinity, 100_000_001])(
    "rejects invalid monetary cents %s",
    (value) => {
      expect(
        productSchema.safeParse({ ...seedProducts[0], priceCents: value })
          .success,
      ).toBe(false);
      expect(
        productSchema.safeParse({ ...seedProducts[0], costCents: value })
          .success,
      ).toBe(false);
    },
  );
  it("accepts zero prices and costs without converting strings implicitly", () => {
    expect(
      productSchema.safeParse({
        ...seedProducts[0],
        priceCents: 0,
        costCents: 0,
      }).success,
    ).toBe(true);
    expect(
      productSchema.safeParse({ ...seedProducts[0], priceCents: "2400" })
        .success,
    ).toBe(false);
  });
  it("rejects duplicate IDs and unknown fields", () => {
    expect(
      productListSchema.safeParse([seedProducts[0], seedProducts[0]]).success,
    ).toBe(false);
    expect(
      productSchema.safeParse({ ...seedProducts[0], imageUrl: "untrusted" })
        .success,
    ).toBe(false);
  });
  it("combines category with trimmed case-insensitive name, description, tag and ID search", () => {
    expect(
      filterProducts(seedProducts, "  HYDRATE ", "skincare").length,
    ).toBeGreaterThan(0);
    expect(filterProducts(seedProducts, "hydrate", "wellness")).toEqual([]);
    expect(filterProducts(seedProducts, "bl-001", "all")).toEqual([
      seedProducts[0],
    ]);
    expect(filterProducts(seedProducts, "no-such-item", "all")).toEqual([]);
  });
});
describe("deterministic item margin", () => {
  it("uses revenue as the denominator and rounds to a basis point", () => {
    expect(productMarginBps(2400, 820)).toBe(6583);
  });
  it("returns null for zero revenue and preserves negative margins", () => {
    expect(productMarginBps(0, 100)).toBeNull();
    expect(productMarginBps(100, 200)).toBe(-10000);
    expect(productMarginBps(100, 0)).toBe(10000);
  });
  it("rejects invalid inputs", () => {
    expect(() => productMarginBps(-1, 0)).toThrow();
  });
});
describe("local catalog envelope", () => {
  const imported = { ...seedProducts[0], id: "CUSTOM-1" };
  it("round trips valid products and handles missing storage", () => {
    expect(
      decodeImportedCatalog(encodeImportedCatalog([imported]), seedProducts),
    ).toEqual([imported]);
    expect(decodeImportedCatalog(null, seedProducts)).toEqual([]);
  });
  it("rejects corruption, unsupported versions, invalid types and seed collisions", () => {
    for (const raw of [
      "{",
      '{"version":2,"products":[]}',
      '{"version":1,"products":[{}]}',
      encodeImportedCatalog([seedProducts[0]]),
    ]) {
      expect(() => decodeImportedCatalog(raw, seedProducts)).toThrow();
    }
  });
});
