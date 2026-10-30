import "server-only";
import type { RecommendationMode } from "../recommendations/schemas";
export function recommendationMode(): RecommendationMode {
  const mode = process.env.BUNDLELAB_MODE ?? "demo";
  return mode === "demo" || mode === "ai" ? mode : "invalid";
}
export function aiConfigured() {
  return !!process.env.OPENAI_API_KEY?.trim();
}
