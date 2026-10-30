import { z } from "zod";

export const constraintsSchema = z.strictObject({
  maxPriceCents: z.number().int().min(0).max(100_000_000).nullable(),
  minMarginBps: z.number().int().min(0).max(10_000).nullable(),
  category: z.enum(["all", "skincare", "wellness"]),
  theme: z.string().trim().max(100),
});
export type Constraints = z.infer<typeof constraintsSchema>;
export const recommendationInputSchema = constraintsSchema.extend({
  prompt: z
    .string()
    .trim()
    .min(10, "Describe your bundle in at least 10 characters.")
    .max(500),
});
export type RecommendationInput = z.infer<typeof recommendationInputSchema>;
export const bundleLineSchema = z.strictObject({
  productId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(99),
});
export const bundleDraftSchema = z.strictObject({
  title: z.string().trim().min(1).max(80),
  lines: z.array(bundleLineSchema).min(2).max(5),
  discountBps: z.number().int().min(0).max(5000),
});
export type BundleDraft = z.infer<typeof bundleDraftSchema>;
// Copy is advisory. Do not allow model-supplied numerical/financial claims beside authoritative totals.
const explanation = z
  .string()
  .trim()
  .min(10)
  .max(350)
  .refine(
    (s) => !/[\d$%€£]|\b(price|cost|profit|margin|discount|budget)\b/i.test(s),
    "Explain complementarity without numbers or financial claims.",
  );
export const generatedBundleSchema = z.strictObject({
  title: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .refine((s) => !/[\d$%€£]/.test(s)),
  productIds: z.array(z.string().min(1).max(64)).min(2).max(5),
  rationale: explanation,
  discountBps: z.number().int().min(0).max(5000),
});
export const generatedOutputSchema = z.strictObject({
  recommendations: z.array(generatedBundleSchema).max(3),
});
export type GeneratedBundle = z.infer<typeof generatedBundleSchema>;
export const totalsSchema = z.strictObject({
  retailCents: z.number().int().nonnegative(),
  costCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative(),
  revenueCents: z.number().int().nonnegative(),
  grossProfitCents: z.number().int(),
  grossMarginBps: z.number().int().nullable(),
});
export const recommendationSchema = bundleDraftSchema.extend({
  rationale: z.string().max(350),
  totals: totalsSchema,
});
export type Recommendation = z.infer<typeof recommendationSchema>;
export const recommendationResponseSchema = z.strictObject({
  mode: z.enum(["demo", "ai"]),
  status: z.enum(["ok", "infeasible", "no_valid_ai_results"]),
  constraints: constraintsSchema,
  recommendations: z.array(recommendationSchema).max(3),
});
export type RecommendationResponse = z.infer<
  typeof recommendationResponseSchema
>;
export type RecommendationMode = "demo" | "ai" | "invalid";
