"use client";
import { WorkspaceHeading, GenerationModeBadge } from "../workspace-heading";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Layers3,
  LoaderCircle,
  SlidersHorizontal,
  Sparkles,
  X,
  SearchX,
} from "lucide-react";
import { seedProducts, money } from "@/lib/catalog";
import {
  decimalToInteger,
  resolveConstraints,
} from "@/lib/recommendations/constraints";
import { verifyRecommendationResponse } from "@/lib/recommendations/engine";
import {
  recommendationInputSchema,
  type Recommendation,
  type RecommendationMode,
  type RecommendationResponse,
} from "@/lib/recommendations/schemas";
import {
  CHOSEN_BUNDLE_KEY,
  draftFromRecommendation,
  encodeChosenBundle,
} from "@/lib/recommendations/saved-draft";
import { ProductArt } from "../catalog/product-art";
import { Button } from "../ui/button";
import { BundleFinances } from "./bundle-finances";
const sample =
  "Create a starter kit under $80 with at least a 35% gross margin.";
export function Generator({
  mode,
  configured,
}: {
  mode: RecommendationMode;
  configured: boolean;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(sample);
  const [cap, setCap] = useState("");
  const [margin, setMargin] = useState("");
  const [category, setCategory] = useState<"all" | "skincare" | "wellness">(
    "all",
  );
  const [theme, setTheme] = useState("");
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  useEffect(
    () => () => {
      requestId.current++;
      abort.current?.abort();
    },
    [],
  );
  const blocked = mode === "invalid" || (mode === "ai" && !configured);
  function changed() {
    setResult(null);
    setError("");
  }
  function inputValue() {
    return recommendationInputSchema.parse({
      prompt,
      maxPriceCents: cap === "" ? null : decimalToInteger(cap),
      minMarginBps: margin === "" ? null : decimalToInteger(margin),
      category,
      theme,
    });
  }
  let preview;
  try {
    preview = resolveConstraints(inputValue());
  } catch {
    preview = null;
  }
  async function generate(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setResult(null);
    let input;
    try {
      input = inputValue();
      resolveConstraints(input);
    } catch (failure) {
      setError(
        failure instanceof Error && failure.name !== "ZodError"
          ? failure.message
          : "Check the prompt and controls. Use a 10–500 character prompt, a nonnegative price, and a margin from 0% to 100%.",
      );
      return;
    }
    const id = ++requestId.current;
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "object" &&
          body.error !== null &&
          "message" in body.error &&
          typeof body.error.message === "string"
            ? body.error.message
            : "Recommendations could not be loaded. Try again.";
        throw new Error(message);
      }
      const parsed = verifyRecommendationResponse(
        body,
        seedProducts,
        resolveConstraints(input),
      );
      if (parsed.mode !== mode)
        throw new Error(
          "The server mode changed. Reload the page before generating again.",
        );
      if (id === requestId.current) setResult(parsed);
    } catch (failure) {
      if (id === requestId.current)
        setError(
          controller.signal.aborted
            ? "The request was cancelled or timed out. Try again when you are ready."
            : failure instanceof Error && failure.name !== "ZodError"
              ? failure.message
              : "The response failed validation. No recommendations were accepted.",
        );
    } finally {
      clearTimeout(timeout);
      if (id === requestId.current) {
        setBusy(false);
        abort.current = null;
      }
    }
  }
  function customize(recommendation: Recommendation) {
    if (!result) return;
    try {
      localStorage.setItem(
        CHOSEN_BUNDLE_KEY,
        encodeChosenBundle({
          version: 1,
          draft: draftFromRecommendation(recommendation),
          constraints: result.constraints,
          source: result.mode,
          rationale: recommendation.rationale,
          savedAt: new Date().toISOString(),
        }),
      );
      router.push("/bundle-editor");
    } catch {
      setError(
        "This bundle could not be saved. Browser storage may be blocked or full. Allow storage before opening the editor.",
      );
    }
  }
  return (
    <>
      <WorkspaceHeading
        eyebrow="GOOD PRODUCTS. A SHARED PURPOSE."
        title="Bundle Generator"
        description="Start with an idea. Find a combination worth considering."
        actions={<GenerationModeBadge mode={mode} />}
      />
      <div className="mode-explainer">
        <Layers3 size={19} />
        <p>
          {mode === "demo"
            ? "Deterministic, simulated recommendations. No AI calls are made. "
            : mode === "ai"
              ? "Product selections and explanations come from OpenAI. Financial figures are calculated and validated by BundleLab. "
              : "Set BUNDLELAB_MODE to demo or ai in the server environment. "}
          <strong>Both modes use the same 24 sample products.</strong> Add
          imported products when you customize in the Editor.
        </p>
      </div>
      {blocked && (
        <p role="alert" className="banner-error">
          {mode === "invalid"
            ? "The server mode is invalid. Set BUNDLELAB_MODE to demo or ai and restart."
            : "AI Mode needs a server-side OPENAI_API_KEY. Add it and restart the app. We will not switch to Demo Mode automatically."}
        </p>
      )}
      <form
        className="prompt-composer"
        onSubmit={generate}
        aria-label="Bundle request"
        aria-busy={busy}
      >
        <fieldset disabled={busy || blocked}>
          <legend className="composer-label">
            <Sparkles size={17} />
            What would you like to bring together?
          </legend>
          <label className="sr-only" htmlFor="bundle-prompt">
            Bundle request
          </label>
          <textarea
            id="bundle-prompt"
            value={prompt}
            minLength={10}
            maxLength={500}
            required
            onChange={(e) => {
              changed();
              setPrompt(e.target.value);
            }}
            aria-describedby="prompt-help"
          />
          <div className="composer-footnote">
            <span id="prompt-help">
              Try “under $80” and “at least 35% gross margin”. Other numeric
              requirements need clarification.
            </span>
            <span>{prompt.length}/500</span>
          </div>
          <div className="constraint-heading">
            <SlidersHorizontal size={15} />
            <span>Fine-tune your constraints</span>
            <span>Optional</span>
          </div>
          <div className="constraint-fields">
            <label>
              Maximum bundle price <span>USD</span>
              <input
                aria-label="Maximum bundle price"
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                placeholder="No price cap"
                value={cap}
                onChange={(e) => {
                  changed();
                  setCap(e.target.value);
                }}
              />
            </label>
            <label>
              Minimum gross margin <span>%</span>
              <input
                aria-label="Minimum gross margin"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="0% minimum"
                value={margin}
                onChange={(e) => {
                  changed();
                  setMargin(e.target.value);
                }}
              />
            </label>
            <label>
              Category
              <select
                value={category}
                onChange={(e) => {
                  changed();
                  setCategory(e.target.value as typeof category);
                }}
              >
                <option value="all">All categories</option>
                <option value="skincare">Skincare</option>
                <option value="wellness">Wellness</option>
              </select>
            </label>
            <label>
              Theme <span>Preference</span>
              <input
                value={theme}
                maxLength={100}
                placeholder="e.g. gift-ready collection"
                onChange={(e) => {
                  changed();
                  setTheme(e.target.value);
                }}
              />
            </label>
          </div>
          <p className="constraint-note">
            Prompt and control limits combine using the stricter value. Category
            is enforced; theme is a merchandising preference, not a guaranteed
            match.
          </p>
        </fieldset>
        <div className="composer-actions">
          <div
            className="effective-constraints"
            aria-label="Effective constraints"
          >
            {preview && (
              <>
                <span>
                  {preview.maxPriceCents === null
                    ? "No price cap"
                    : `≤ ${money(preview.maxPriceCents)}`}
                </span>
                <span>≥ {(preview.minMarginBps ?? 0) / 100}% margin</span>
                <span>
                  {preview.category === "all"
                    ? "All categories"
                    : preview.category}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {busy && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  requestId.current++;
                  abort.current?.abort();
                  setBusy(false);
                  setError(
                    "Request cancelled. No recommendations were accepted.",
                  );
                }}
              >
                <X size={15} />
                Cancel
              </Button>
            )}
            <Button
              className="action-button"
              type="submit"
              disabled={busy || blocked}
            >
              {busy ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {busy
                ? "Finding combinations…"
                : mode === "ai"
                  ? "Generate with AI"
                  : "Explore demo bundles"}
            </Button>
          </div>
        </div>
      </form>
      {error && (
        <p role="alert" className="banner-error generator-error">
          {error}
        </p>
      )}
      {busy && (
        <section aria-label="Loading recommendations" role="status">
          <div className="section-heading recommendations-heading">
            <h2>
              {mode === "ai"
                ? "AI is selecting products. We will verify every figure."
                : "Checking sample combinations against your constraints."}
            </h2>
          </div>
          <div className="recommendation-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-card recommendation-skeleton">
                <div />
                <span />
                <span />
              </div>
            ))}
          </div>
        </section>
      )}
      {result && !result.recommendations.length && (
        <div className="empty-state generator-empty" role="status">
          <SearchX size={38} strokeWidth={1.2} />
          <h2>
            {result.status === "infeasible"
              ? "No feasible combination within these limits"
              : "The AI did not return a valid match"}
          </h2>
          <p>
            {result.status === "infeasible"
              ? "No set of one unit each of 2–5 eligible products can satisfy these price and margin limits with a 0–50% discount. Try increasing the price cap, lowering the margin, or widening the category."
              : "Feasible combinations exist, but none of the model’s suggestions passed validation. Try again or simplify the request. We did not substitute demo recommendations."}
          </p>
        </div>
      )}
      {result && !!result.recommendations.length && (
        <section aria-label="Bundle recommendations">
          <div className="section-heading recommendations-heading">
            <div>
              <p className="eyebrow">
                {result.mode === "demo"
                  ? "SIMULATED PAIRINGS, VERIFIED ECONOMICS"
                  : "AI PAIRINGS, VERIFIED ECONOMICS"}
              </p>
              <h2>
                {result.recommendations.length} combination
                {result.recommendations.length === 1 ? "" : "s"} to consider
              </h2>
            </div>
            <span className="small-muted">One unit per product · USD</span>
          </div>
          <div className="recommendation-grid">
            {result.recommendations.map((recommendation, index) => (
              <article
                className="recommendation-card"
                key={recommendation.lines
                  .map((l) => l.productId)
                  .sort()
                  .join("|")}
              >
                <div className="recommendation-number">
                  <span>PAIRING {String(index + 1).padStart(2, "0")}</span>
                  <span>
                    {result.mode === "demo" ? "Simulated" : "AI suggestion"}
                  </span>
                </div>
                <h3>{recommendation.title}</h3>
                <p className="recommendation-rationale">
                  {recommendation.rationale}
                </p>
                <ul className="bundle-products">
                  {recommendation.lines.map(({ productId }) => {
                    const product = seedProducts.find(
                      (p) => p.id === productId,
                    );
                    return (
                      product && (
                        <li key={productId}>
                          <ProductArt product={product} compact />
                          <div>
                            <strong>{product.name}</strong>
                            <span>{product.id} · Qty 1</span>
                          </div>
                          <span>{money(product.priceCents)}</span>
                        </li>
                      )
                    );
                  })}
                </ul>
                <BundleFinances
                  totals={recommendation.totals}
                  discountBps={recommendation.discountBps}
                />
                <p className="constraint-pass">
                  <Check size={14} />
                  Price, exact margin & category checked
                </p>
                <Button
                  variant="outline"
                  className="customize-button"
                  onClick={() => customize(recommendation)}
                >
                  Customize this bundle
                  <ArrowRight size={15} />
                </Button>
              </article>
            ))}
          </div>
        </section>
      )}
      {!busy && !result && !error && (
        <div className="generator-start">
          <Layers3 size={30} strokeWidth={1.1} />
          <h2>A thoughtful starting point.</h2>
          <p>
            Describe the occasion, set the guardrails, and explore up to three
            distinct product combinations.
          </p>
        </div>
      )}
      <p className="assumption">
        Gross profit = bundle price − product cost. Gross margin = gross profit
        ÷ bundle price. All figures exclude shipping, tax, fees, overhead, and
        returns. Recommendations require positive revenue and nonnegative gross
        profit. Review advisory titles and rationales before using them.
      </p>
    </>
  );
}
