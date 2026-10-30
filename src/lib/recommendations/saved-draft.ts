import { z } from "zod";
import { seedProducts } from "../catalog";
import {
  bundleDraftSchema,
  constraintsSchema,
  type BundleDraft,
} from "./schemas";
import { calculateBundle } from "./engine";
export const CHOSEN_BUNDLE_KEY = "bundlelab:chosen-bundle:v1";
export const savedDraftSchema = z.strictObject({
  version: z.literal(1),
  draft: bundleDraftSchema,
  constraints: constraintsSchema,
  source: z.enum(["demo", "ai"]),
  savedAt: z.iso.datetime(),
  rationale: z.string().max(350).optional(),
});
export type SavedDraft = z.infer<typeof savedDraftSchema>;
export function decodeChosenBundle(raw: string | null): SavedDraft | null {
  if (raw === null) return null;
  if (raw.length > 10_000) throw new Error("Saved bundle is too large.");
  const saved = savedDraftSchema.parse(JSON.parse(raw));
  calculateBundle(saved.draft, seedProducts);
  return saved;
}
export function encodeChosenBundle(saved: SavedDraft) {
  const value = savedDraftSchema.parse(saved);
  calculateBundle(value.draft, seedProducts);
  return JSON.stringify(value);
}
export function draftFromRecommendation(
  recommendation: BundleDraft,
): BundleDraft {
  return bundleDraftSchema.parse({
    title: recommendation.title,
    lines: recommendation.lines,
    discountBps: recommendation.discountBps,
  });
}
