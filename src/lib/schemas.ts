import { z } from "zod";

export const MAX_IMPORTED_PRODUCTS = 500;
export const productSchema = z.strictObject({
  id: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, hyphens or underscores"),
  name: z.string().trim().min(1).max(100),
  category: z.enum(["skincare", "wellness"]),
  description: z.string().trim().min(1).max(1000),
  priceCents: z.number().int().min(0).max(100_000_000),
  costCents: z.number().int().min(0).max(100_000_000),
  stock: z.number().int().min(0).max(1_000_000),
  tags: z.array(z.string().trim().min(1).max(40)).min(1).max(10),
  currency: z.literal("USD"),
  artwork: z
    .enum([
      "bottle",
      "dropper",
      "jar",
      "tube",
      "candle",
      "tin",
      "tool",
      "cloth",
    ])
    .default("bottle"),
});
export type Product = z.infer<typeof productSchema>;
export const productListSchema = z
  .array(productSchema)
  .max(MAX_IMPORTED_PRODUCTS + 24)
  .superRefine((products, ctx) => {
    const ids = new Set<string>();
    products.forEach((p, i) => {
      if (ids.has(p.id))
        ctx.addIssue({
          code: "custom",
          message: `Duplicate product ID: ${p.id}`,
          path: [i, "id"],
        });
      ids.add(p.id);
    });
  });
