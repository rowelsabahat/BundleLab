import { seedProducts } from "@/lib/catalog";
import { listingInputSchema } from "@/lib/listings/model";
import {
  catalogFacts,
  compileCopy,
  demoCopyPlan,
} from "@/lib/listings/grounding";
import { calculateEditorBundle, pricingIssue } from "@/lib/editor/model";
import { aiConfigured, recommendationMode } from "@/lib/server/config";
import {
  acquireAiSlot,
  consumeAiBudget,
  consumeRequest,
  readLimitedBody,
  RequestError,
} from "@/lib/server/limits";
import { generateListingPlan } from "@/lib/server/listing-generation";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const url = new URL(request.url);
    const host = request.headers.get("host") ?? url.host;
    const protocol =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
      url.protocol.replace(":", "");
    if (
      request.headers.get("origin") &&
      request.headers.get("origin") !== `${protocol}://${host}`
    )
      throw new RequestError(
        "INVALID_ORIGIN",
        "Use the BundleLab workspace to generate copy.",
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
        "Send a JSON listing request.",
        415,
      );
    const ip = (
      request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local"
    ).slice(0, 100);
    if (!consumeRequest(ip))
      throw new RequestError(
        "RATE_LIMIT",
        "Too many generation requests. Wait a minute before retrying.",
        429,
      );
    const mode = recommendationMode();
    if (mode === "invalid" || (mode === "ai" && !aiConfigured()))
      throw new RequestError(
        "NOT_CONFIGURED",
        "Listing Studio needs a valid BUNDLELAB_MODE and, in AI Mode, a server API key. Your existing copy is preserved.",
        503,
      );
    const parsed = listingInputSchema.safeParse(
      await readLimitedBody(request, 20_000),
    );
    if (!parsed.success)
      throw new RequestError(
        "INVALID_INPUT",
        "Check the saved bundle, selected catalog data, pricing, and tone. No listing was changed.",
        400,
      );
    const { draft, tone, importedProducts, expectedPriceCents } = parsed.data;
    const selectedIds = draft.lines.map((l) => l.productId);
    if (new Set(selectedIds).size !== selectedIds.length)
      throw new RequestError(
        "INVALID_INPUT",
        "Selected products must be unique.",
        400,
      );
    if (
      importedProducts.some(
        (p) =>
          seedProducts.some((seed) => seed.id === p.id) ||
          !selectedIds.includes(p.id),
      )
    )
      throw new RequestError(
        "INVALID_CATALOG",
        "Imported records cannot override sample products or include unrelated products.",
        400,
      );
    const catalog = [...seedProducts, ...importedProducts];
    let totals;
    try {
      totals = calculateEditorBundle(draft, catalog);
      if (pricingIssue(totals)) throw new Error("Invalid pricing");
    } catch {
      throw new RequestError(
        "INVALID_BUNDLE",
        "Selected products, stock, or pricing are invalid. Repair the bundle in the editor before generating.",
        422,
      );
    }
    if (totals.revenueCents !== expectedPriceCents)
      throw new RequestError(
        "BUNDLE_CHANGED",
        "The calculated price no longer matches the approved bundle. Return to the editor, review it, and save again.",
        409,
      );
    const lineup = draft.lines.map((line) => {
      const product = catalog.find((p) => p.id === line.productId);
      if (!product)
        throw new RequestError(
          "INVALID_BUNDLE",
          "A selected product is unavailable.",
          422,
        );
      return { product, quantity: line.quantity };
    });
    const facts = catalogFacts(lineup);
    let plan;
    if (mode === "demo") plan = demoCopyPlan(facts, tone);
    else {
      const release = acquireAiSlot();
      if (!release)
        throw new RequestError(
          "AI_BUSY",
          "Two AI requests are running. Wait before retrying; your copy is preserved.",
          429,
        );
      try {
        if (!consumeAiBudget("ai"))
          throw new RequestError(
            "AI_BUDGET_LIMIT",
            "This server instance reached its hourly AI allowance. Try later; your copy is preserved.",
            429,
          );
        plan = await generateListingPlan(
          facts,
          tone,
          AbortSignal.any([request.signal, AbortSignal.timeout(20_000)]),
        );
      } finally {
        release();
      }
    }
    const categories = new Set(lineup.map(({ product }) => product.category));
    let compiled;
    try {
      compiled = compileCopy(
        plan,
        facts,
        tone,
        categories.size === 1 ? lineup[0].product.category : "all",
      );
    } catch {
      throw new RequestError(
        "UNGROUNDED_AI_RESPONSE",
        "The generated plan referenced unsupported or incomplete catalog facts. Your existing copy is preserved; nothing was substituted.",
        502,
      );
    }
    return Response.json(
      {
        mode,
        tone,
        ...compiled,
        priceCents: totals.revenueCents,
        productIds: selectedIds,
      },
      { headers },
    );
  } catch (error) {
    const failure =
      error instanceof RequestError
        ? error
        : new RequestError(
            "UNAVAILABLE",
            "Listing generation is temporarily unavailable. Your copy is preserved.",
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
