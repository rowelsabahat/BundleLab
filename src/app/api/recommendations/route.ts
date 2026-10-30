import { seedProducts } from "@/lib/catalog";
import {
  recommendationInputSchema,
  type RecommendationResponse,
} from "@/lib/recommendations/schemas";
import { resolveConstraints } from "@/lib/recommendations/constraints";
import {
  demoRecommendations,
  eligibleProducts,
  validateDistinctRecommendations,
} from "@/lib/recommendations/engine";
import { aiConfigured, recommendationMode } from "@/lib/server/config";
import {
  acquireAiSlot,
  consumeAiBudget,
  consumeRequest,
  readLimitedBody,
  RequestError,
} from "@/lib/server/limits";
import { generateWithOpenAI } from "@/lib/server/openai";
export const runtime = "nodejs";
export const maxDuration = 30;
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    // Next can construct request.url with an internal localhost hostname. Compare
    // the browser origin to the incoming Host and reverse-proxy protocol instead.
    const url = new URL(request.url);
    const host = request.headers.get("host") ?? url.host;
    const protocol =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
      url.protocol.replace(":", "");
    if (origin && origin !== `${protocol}://${host}`)
      throw new RequestError(
        "INVALID_ORIGIN",
        "Use the BundleLab workspace to submit requests.",
        403,
      );
    if (
      request.headers
        .get("content-type")
        ?.split(";")[0]
        .trim()
        .toLowerCase() !== "application/json"
    )
      throw new RequestError(
        "INVALID_INPUT",
        "Send a JSON bundle request.",
        415,
      );
    const ip = (
      request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local"
    ).slice(0, 100);
    if (!consumeRequest(ip))
      throw new RequestError(
        "RATE_LIMIT",
        "Too many requests. Wait a minute before trying again.",
        429,
      );
    const mode = recommendationMode();
    if (mode === "invalid")
      throw new RequestError(
        "NOT_CONFIGURED",
        "The server recommendation mode is invalid. Set BUNDLELAB_MODE to demo or ai.",
        503,
      );
    if (mode === "ai" && !aiConfigured())
      throw new RequestError(
        "NOT_CONFIGURED",
        "AI Mode is selected, but its server API key is missing. Configure OPENAI_API_KEY and restart the app. Demo Mode is never substituted automatically.",
        503,
      );
    const parsed = recommendationInputSchema.safeParse(
      await readLimitedBody(request),
    );
    if (!parsed.success)
      throw new RequestError(
        "INVALID_INPUT",
        "Check your request: a 10–500 character prompt, valid USD price, margin from 0% to 100%, and theme up to 100 characters are required.",
        400,
      );
    let constraints;
    try {
      constraints = resolveConstraints(parsed.data);
    } catch (error) {
      throw new RequestError(
        "INVALID_CONSTRAINTS",
        error instanceof Error && error.name !== "ZodError"
          ? error.message
          : "Use a nonnegative price and a margin between 0% and 100%.",
        400,
      );
    }
    const feasible = demoRecommendations(
      seedProducts,
      constraints,
      parsed.data.prompt,
    );
    let result: RecommendationResponse;
    if (!feasible.length)
      result = { mode, status: "infeasible", constraints, recommendations: [] };
    else if (mode === "demo")
      result = { mode, status: "ok", constraints, recommendations: feasible };
    else {
      const release = acquireAiSlot();
      if (!release)
        throw new RequestError(
          "AI_BUSY",
          "Two AI requests are already running. Wait a moment and try again.",
          429,
        );
      try {
        if (!consumeAiBudget("ai"))
          throw new RequestError(
            "AI_BUDGET_LIMIT",
            "This server instance has reached its hourly AI request allowance. Try again later.",
            429,
          );
        const output = await generateWithOpenAI(
          parsed.data.prompt,
          eligibleProducts(seedProducts, constraints),
          constraints,
          AbortSignal.any([request.signal, AbortSignal.timeout(20_000)]),
        );
        const recommendations = validateDistinctRecommendations(
          output.recommendations,
          seedProducts,
          constraints,
        );
        result = {
          mode,
          status: recommendations.length ? "ok" : "no_valid_ai_results",
          constraints,
          recommendations,
        };
      } finally {
        release();
      }
    }
    return Response.json(result, { headers });
  } catch (error) {
    const failure =
      error instanceof RequestError
        ? error
        : new RequestError(
            "UNAVAILABLE",
            "Bundle recommendations are temporarily unavailable. Please try again.",
            500,
          );
    return Response.json(
      { error: { code: failure.code, message: failure.message } },
      {
        status: failure.status,
        headers: {
          ...headers,
          ...(failure.status === 429
            ? {
                "Retry-After":
                  failure.code === "AI_BUDGET_LIMIT" ? "3600" : "60",
              }
            : {}),
        },
      },
    );
  }
}
