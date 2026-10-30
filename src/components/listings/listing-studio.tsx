"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  FileText,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useCatalog } from "../catalog-provider";
import { BUNDLE_LIBRARY_KEY, decodeLibrary } from "@/lib/editor/library";
import { bundleWarnings, type NamedBundle } from "@/lib/editor/model";
import {
  completeCopy,
  emptyCopy,
  formattedListing,
  listingContext,
  listingExport,
  listingResponseSchema,
  type ListingCopy,
  type ListingTone,
} from "@/lib/listings/model";
import {
  copyHasContent,
  decodeListings,
  emptyListingStore,
  LISTINGS_KEY,
  persistListings,
  saveListing,
  type ListingDocument,
  type ListingStore,
} from "@/lib/listings/storage";
import { seedProducts, money } from "@/lib/catalog";
import type { RecommendationMode } from "@/lib/recommendations/schemas";
import { ProductArt } from "../catalog/product-art";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { StorefrontPreview } from "./storefront-preview";
const tones: { value: ListingTone; label: string; hint: string }[] = [
  { value: "professional", label: "Professional", hint: "Considered & clear" },
  { value: "playful", label: "Playful", hint: "Warm & inviting" },
  { value: "minimal", label: "Minimal", hint: "Quiet & concise" },
];
export function ListingStudio({
  mode,
  configured,
}: {
  mode: RecommendationMode;
  configured: boolean;
}) {
  const {
    products,
    ready: catalogReady,
    storageError: catalogError,
  } = useCatalog();
  const [bundle, setBundle] = useState<NamedBundle | null>(null);
  const [ready, setReady] = useState(false);
  const [handoffError, setHandoffError] = useState("");
  const [document, setDocument] = useState<ListingDocument | null>(null);
  const [store, setStore] = useState<ListingStore>(emptyListingStore);
  const [tone, setTone] = useState<ListingTone>("professional");
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [blockedStorage, setBlockedStorage] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [resetStorage, setResetStorage] = useState(false);
  const expectedRaw = useRef<string | null>(null);
  const requestId = useRef(0);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!catalogReady) return;
    let selected: NamedBundle | null = null;
    try {
      const library = decodeLibrary(localStorage.getItem(BUNDLE_LIBRARY_KEY));
      const named = library.bundles.find((b) => b.id === library.active?.id);
      if (
        named &&
        JSON.stringify(named.draft) === JSON.stringify(library.active?.draft)
      )
        selected = named;
      else if (library.active) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore browser-local handoff and listing drafts after hydration.
        setHandoffError(
          "Your working draft has not been saved to the named library. Save it in the editor and proceed here again.",
        );
      }
    } catch {
      setHandoffError(
        "The saved bundle could not be read. Return to the editor to repair it; no existing copy was changed.",
      );
    }
    setBundle(selected);
    try {
      expectedRaw.current = localStorage.getItem(LISTINGS_KEY);
      const restored = decodeListings(expectedRaw.current);
      setStore(restored);
      const saved = restored.documents.find((d) => d.bundleId === selected?.id);
      if (saved) {
        setDocument(saved);
        setTone(saved.requestedTone ?? saved.tone);
      }
    } catch {
      setBlockedStorage(true);
      setStorageError(
        "Saved listing drafts could not be read. Existing data has not been overwritten. You may edit/export in this tab or explicitly reset listing storage.",
      );
    }
    setReady(true);
  }, [catalogReady]);
  useEffect(
    () => () => {
      requestId.current++;
      abort.current?.abort();
    },
    [],
  );
  let context: ReturnType<typeof listingContext> | null = null;
  let contextError = "";
  if (bundle) {
    try {
      context = listingContext(bundle, products);
    } catch (failure) {
      contextError =
        failure instanceof Error && failure.name !== "ZodError"
          ? failure.message
          : "The saved bundle is invalid. Repair it in the editor.";
    }
  }
  const stale = !!(document && context && document.contextKey !== context.key);
  const copy = document?.copy ?? emptyCopy();
  const hasCopy = copyHasContent(copy);
  const canExport = !!(
    bundle &&
    context &&
    document &&
    completeCopy(copy) &&
    !stale &&
    !busy
  );
  const modeBlocked = mode === "invalid" || (mode === "ai" && !configured);
  function write(next: ListingDocument) {
    setDocument(next);
    setNotice("");
    if (blockedStorage) return;
    try {
      const updated = saveListing(store, next);
      expectedRaw.current = persistListings(
        localStorage,
        updated,
        expectedRaw.current,
      );
      setStore(updated);
      setStorageError("");
    } catch (failure) {
      setStorageError(
        failure instanceof Error && failure.name !== "ZodError"
          ? failure.message
          : "Saved listing storage is full or invalid. Your edits remain in this tab; export them before leaving.",
      );
    }
  }
  function currentDocument(): ListingDocument | null {
    if (!bundle || !context) return null;
    return (
      document ?? {
        bundleId: bundle.id,
        contextKey: context.key,
        tone,
        requestedTone: tone,
        source: "manual",
        merchantEdited: false,
        updatedAt: new Date().toISOString(),
        copy: emptyCopy(),
      }
    );
  }
  function editCopy(next: ListingCopy) {
    const current = currentDocument();
    if (!current) return;
    setError("");
    write({
      ...current,
      merchantEdited: true,
      tone: current.source === "manual" ? tone : current.tone,
      updatedAt: new Date().toISOString(),
      copy: next,
    });
  }
  function verifyHandoff() {
    if (!bundle || !context) throw new Error("A saved bundle is required.");
    const library = decodeLibrary(localStorage.getItem(BUNDLE_LIBRARY_KEY));
    const latest = library.bundles.find((b) => b.id === bundle.id);
    if (
      !latest ||
      library.active?.id !== bundle.id ||
      JSON.stringify(latest.draft) !== JSON.stringify(library.active.draft) ||
      listingContext(latest, products).key !== context.key
    )
      throw new Error(
        "The selected bundle changed in another view. Reload Listing Studio to use its current products and price. Your copy is preserved.",
      );
    return latest;
  }
  async function generate() {
    setConfirmGenerate(false);
    if (!bundle || !context || busy || modeBlocked) return;
    setError("");
    setNotice("");
    try {
      verifyHandoff();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not verify the selected bundle.",
      );
      return;
    }
    const controller = new AbortController();
    abort.current = controller;
    const id = ++requestId.current;
    setBusy(true);
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          draft: bundle.draft,
          tone,
          expectedPriceCents: context.totals.revenueCents,
          importedProducts: context.lineup
            .filter(
              ({ product }) => !seedProducts.some((p) => p.id === product.id),
            )
            .map(({ product }) => product),
        }),
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
            : "Listing generation failed. Your existing copy is preserved.";
        throw new Error(message);
      }
      const parsed = listingResponseSchema.parse(body);
      if (
        parsed.mode !== mode ||
        parsed.tone !== tone ||
        parsed.priceCents !== context.totals.revenueCents ||
        JSON.stringify(parsed.productIds) !==
          JSON.stringify(bundle.draft.lines.map((l) => l.productId))
      )
        throw new Error(
          "The response does not match this bundle, price, or mode. No copy was replaced; reload before trying again.",
        );
      verifyHandoff();
      if (id === requestId.current) {
        write({
          bundleId: bundle.id,
          contextKey: context.key,
          tone,
          requestedTone: tone,
          source: parsed.mode,
          merchantEdited: false,
          updatedAt: new Date().toISOString(),
          copy: parsed.listing,
        });
        setNotice(
          mode === "demo"
            ? "Simulated demo template created. Review and edit it before use."
            : "AI-assisted copy assembled from verified catalog facts. Review it before use.",
        );
      }
    } catch (failure) {
      if (id === requestId.current)
        setError(
          controller.signal.aborted
            ? "Generation was cancelled or timed out. Your existing copy is preserved."
            : failure instanceof Error && failure.name !== "ZodError"
              ? failure.message
              : "The generated response failed validation. Your existing copy is preserved.",
        );
    } finally {
      clearTimeout(timeout);
      if (id === requestId.current) {
        setBusy(false);
        abort.current = null;
      }
    }
  }
  function exportData() {
    if (!bundle || !document || !context || stale || !canExport)
      throw new Error(
        "Complete all fields and review any bundle changes before exporting.",
      );
    verifyHandoff();
    return listingExport(
      bundle,
      products,
      document.copy,
      document.tone,
      document.source,
      document.merchantEdited,
    );
  }
  async function copyText() {
    setNotice("");
    setError("");
    try {
      const data = exportData();
      if (!navigator.clipboard?.writeText)
        throw new Error(
          "Clipboard access is unavailable. Export JSON or select and copy the text fields manually.",
        );
      await navigator.clipboard.writeText(formattedListing(data));
      setNotice("Formatted listing copied to clipboard.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Clipboard access was denied. Export JSON or copy the fields manually.",
      );
    }
  }
  function download() {
    setNotice("");
    setError("");
    try {
      const data = exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `bundlelab-listing-${bundle?.id}.json`;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Listing JSON download started.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The JSON export could not be created. Your edits are preserved.",
      );
    }
  }
  const updateField = (
    field:
      "title" | "shortDescription" | "detailedDescription" | "promotionalCopy",
    value: string,
  ) => editCopy({ ...copy, [field]: value });
  return (
    <>
      <div className="page-title-row">
        <div>
          <p className="eyebrow">FROM COMBINATION TO COLLECTION</p>
          <h1>
            Listing Studio<span className="heading-dot">.</span>
          </h1>
          <p className="page-subtitle">
            Give your bundle a story, with its facts and price intact.
          </p>
        </div>
        <span className={`mode-badge ${mode === "ai" ? "mode-ai" : ""}`}>
          <span className="status-dot" />
          {mode === "ai"
            ? "AI Mode · OpenAI"
            : mode === "demo"
              ? "Demo Mode · Simulated"
              : "Mode not configured"}
        </span>
      </div>
      {!ready ? (
        <div className="route-loading" role="status">
          Restoring your selected bundle and copy…
        </div>
      ) : !bundle || !context ? (
        <div className="empty-state">
          <FileText size={37} strokeWidth={1.2} />
          <h2>A finalized bundle comes first.</h2>
          <p>
            {handoffError ||
              contextError ||
              "Save a bundle in the editor, then use Proceed to Listing Studio to bring its products and approved price here."}
          </p>
          <Button asChild className="action-button">
            <Link href="/bundle-editor">
              <ArrowLeft size={15} />
              Back to Bundle Editor
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <section
            className="listing-bundle-strip"
            aria-label="Selected bundle"
          >
            <div className="listing-lineup-thumbs">
              {context.lineup.map(({ product }) => (
                <ProductArt key={product.id} product={product} compact />
              ))}
            </div>
            <div className="listing-strip-name">
              <p className="eyebrow">SELECTED FROM YOUR EDITOR</p>
              <h2>{bundle.draft.title}</h2>
              <span>
                {context.lineup.length} products ·{" "}
                {context.lineup.reduce((sum, l) => sum + l.quantity, 0)} units
              </span>
            </div>
            <div className="listing-approved-price">
              <span>Approved bundle price</span>
              <strong>
                {money(context.totals.revenueCents)} <small>USD</small>
              </strong>
            </div>
            <Button asChild variant="outline">
              <Link href="/bundle-editor">
                <ArrowLeft size={14} />
                Back to Bundle Editor
              </Link>
            </Button>
          </section>
          {bundleWarnings(bundle, context.totals, products).map((warning) => (
            <p key={warning} className="feedback error">
              {warning}
            </p>
          ))}
          <div className="listing-workflow-note">
            <Check size={17} />
            <p>
              {mode === "demo"
                ? "Demo copy is a deterministic, simulated template. No AI call is made. "
                : "AI curates catalog facts and tone-specific phrasing. Copy is assembled from those facts; new product claims and financial figures are never invented. "}
              Imported descriptions are merchant-provided facts. Review all copy
              before use.
            </p>
          </div>
          {(catalogError || storageError) && (
            <div role="alert" className="banner-error">
              {catalogError || storageError}
              {storageError && (
                <div className="listing-storage-actions">
                  {document && !blockedStorage && (
                    <button
                      className="text-link"
                      disabled={busy}
                      onClick={() => write(document)}
                    >
                      Retry saving copy
                    </button>
                  )}
                  <button
                    className="text-link"
                    disabled={busy}
                    onClick={() => setResetStorage(true)}
                  >
                    <RotateCcw size={13} />
                    Reset listing storage
                  </button>
                </div>
              )}
            </div>
          )}
          <details className="listing-source-facts">
            <summary>Review selected catalog facts</summary>
            {context.lineup.map(({ product, quantity }) => (
              <div key={product.id}>
                <strong>
                  {quantity} × {product.name}
                </strong>
                <p>{product.description}</p>
              </div>
            ))}
          </details>
          {modeBlocked && (
            <p role="alert" className="banner-error">
              AI generation needs a valid server mode and API key. Configure the
              environment and restart. You can still edit, preview, copy, and
              export manually.
            </p>
          )}
          {stale && (
            <div className="listing-stale" role="status">
              <strong>Your bundle changed since this copy was written.</strong>
              <p>
                Your edits are preserved. Review them against the current
                products and price, then acknowledge the update or regenerate.
                Copy/export stays disabled until reviewed.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  if (document)
                    write({
                      ...document,
                      contextKey: context.key,
                      merchantEdited: true,
                      updatedAt: new Date().toISOString(),
                    });
                }}
              >
                I reviewed this copy for the updated bundle
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="banner-error">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="feedback success listing-notice">
              {notice}
            </p>
          )}
          <div className="listing-studio-layout">
            <section
              className="panel listing-copy-panel"
              aria-label="Listing copy editor"
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">THE WORDS ARE YOURS</p>
                  <h2>Craft your listing</h2>
                </div>
                <span className="tag">
                  {document?.source === "demo"
                    ? "Simulated template"
                    : document?.source === "ai"
                      ? "AI-assisted"
                      : "Manual draft"}
                  {document?.merchantEdited ? " · Edited" : ""}
                </span>
              </div>
              <fieldset className="listing-tone" disabled={busy}>
                <legend>Writing tone</legend>
                <div role="group" aria-label="Writing tone">
                  {tones.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={tone === option.value}
                      onClick={() => {
                        setTone(option.value);
                        const current = currentDocument();
                        if (current)
                          write({
                            ...current,
                            requestedTone: option.value,
                            updatedAt: new Date().toISOString(),
                          });
                      }}
                    >
                      <strong>{option.label}</strong>
                      <span>{option.hint}</span>
                    </button>
                  ))}
                </div>
                <p>
                  {hasCopy && document?.tone !== tone
                    ? `Selected tone: ${tone}. Current copy: ${document?.tone}. Generate to apply; edits stay unchanged until you confirm.`
                    : "Tone selection never triggers a call or overwrites your edits automatically."}
                </p>
              </fieldset>
              <div className="listing-generate-row">
                <Button
                  className="action-button"
                  disabled={busy || modeBlocked || blockedStorage}
                  onClick={() => {
                    if (hasCopy) setConfirmGenerate(true);
                    else void generate();
                  }}
                >
                  {busy ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  {busy
                    ? "Preparing your copy…"
                    : mode === "demo"
                      ? hasCopy
                        ? "Regenerate demo copy"
                        : "Generate demo copy"
                      : hasCopy
                        ? "Regenerate with AI"
                        : "Generate with AI"}
                </Button>
                {busy && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      requestId.current++;
                      abort.current?.abort();
                      setBusy(false);
                      setError(
                        "Generation cancelled. Your previous copy is preserved.",
                      );
                    }}
                  >
                    <X size={15} />
                    Cancel
                  </Button>
                )}
                <span>
                  {storageError
                    ? "Edits only in this tab"
                    : document
                      ? "Copy autosaved locally"
                      : "Start with generation or write your own"}
                </span>
              </div>
              {busy && (
                <div
                  role="status"
                  aria-label="Generating listing copy"
                  className="listing-skeleton"
                >
                  <div />
                  <div />
                  <div />
                  <p>
                    {mode === "demo"
                      ? "Assembling a simulated catalog template…"
                      : "Selecting and validating catalog facts…"}
                  </p>
                </div>
              )}
              <fieldset className="listing-fields" disabled={busy}>
                <label>
                  Product title <span>{copy.title.length}/120</span>
                  <input
                    aria-label="Listing product title"
                    maxLength={120}
                    value={copy.title}
                    placeholder="Name your collection"
                    onChange={(e) => updateField("title", e.target.value)}
                  />
                </label>
                <label>
                  Short description{" "}
                  <span>{copy.shortDescription.length}/400</span>
                  <textarea
                    aria-label="Listing short description"
                    maxLength={400}
                    rows={3}
                    value={copy.shortDescription}
                    placeholder="A clear introduction to the collection"
                    onChange={(e) =>
                      updateField("shortDescription", e.target.value)
                    }
                  />
                </label>
                <label>
                  Detailed description{" "}
                  <span>{copy.detailedDescription.length}/6500</span>
                  <textarea
                    aria-label="Listing detailed description"
                    maxLength={6500}
                    rows={7}
                    value={copy.detailedDescription}
                    placeholder="Tell the story using the selected catalog facts"
                    onChange={(e) =>
                      updateField("detailedDescription", e.target.value)
                    }
                  />
                </label>
                <div className="selling-points-fields">
                  <p>Three selling points</p>
                  {copy.sellingPoints.map((point, index) => (
                    <label key={index}>
                      <span className="selling-point-number">0{index + 1}</span>
                      <span className="sr-only">Selling point {index + 1}</span>
                      <textarea
                        aria-label={`Selling point ${index + 1}`}
                        rows={2}
                        maxLength={1200}
                        value={point}
                        placeholder="A specific catalog-grounded detail"
                        onChange={(e) => {
                          const next: ListingCopy["sellingPoints"] = [
                            ...copy.sellingPoints,
                          ];
                          next[index] = e.target.value;
                          editCopy({ ...copy, sellingPoints: next });
                        }}
                      />
                    </label>
                  ))}
                </div>
                <label>
                  Short promotional copy{" "}
                  <span>{copy.promotionalCopy.length}/350</span>
                  <textarea
                    aria-label="Listing promotional copy"
                    maxLength={350}
                    rows={2}
                    value={copy.promotionalCopy}
                    placeholder="A short invitation to explore"
                    onChange={(e) =>
                      updateField("promotionalCopy", e.target.value)
                    }
                  />
                </label>
              </fieldset>
              <p className="listing-review-note">
                Generated factual text comes from catalog descriptions. Merchant
                edits are not automatically fact-checked. Review benefits,
                ingredients, certifications and pricing claims before publishing
                anywhere.
              </p>
              <div className="listing-export-actions">
                <Button
                  variant="outline"
                  disabled={!canExport}
                  onClick={() => void copyText()}
                >
                  <Copy size={15} />
                  Copy formatted text
                </Button>
                <Button
                  className="action-button"
                  disabled={!canExport}
                  onClick={download}
                >
                  <Download size={15} />
                  Export JSON
                </Button>
              </div>
              {!completeCopy(copy) && (
                <p className="assumption">
                  Complete every field, including all three selling points, to
                  copy or export.
                </p>
              )}
            </section>
            <div className="listing-preview-column" id="listing-live-preview">
              <div className="section-heading preview-heading">
                <span className="eyebrow">LIVE STOREFRONT PREVIEW</span>
                <span>Updates as you edit</span>
              </div>
              <StorefrontPreview
                key={bundle.id}
                copy={copy}
                lineup={context.lineup}
                priceCents={context.totals.revenueCents}
              />
            </div>
          </div>
          <p className="assumption">
            Exports include your edited copy, exact approved price, and product
            lineup. No internal product costs, API keys, checkout, or publishing
            integration are included. Saved copies are local to this browser.
          </p>
          <Modal
            open={confirmGenerate}
            onOpenChange={setConfirmGenerate}
            title="Replace your current listing copy?"
            description="Generation replaces every text field for this bundle. Your current edits stay in place if generation fails or is cancelled. Export first if you want to keep a separate version."
          >
            <div className="modal-actions">
              <Button
                variant="outline"
                onClick={() => setConfirmGenerate(false)}
              >
                Keep my edits
              </Button>
              <Button onClick={() => void generate()}>
                Replace with new copy
                <ArrowRight size={15} />
              </Button>
            </div>
          </Modal>
          <Modal
            open={resetStorage}
            onOpenChange={setResetStorage}
            title="Reset saved listing drafts?"
            description="This permanently removes other saved listing copies in this browser. Your current on-screen copy will be retained and saved if storage is available. Bundles and catalog products are not changed."
          >
            <div className="modal-actions">
              <Button variant="outline" onClick={() => setResetStorage(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  try {
                    const next = document
                      ? saveListing(emptyListingStore(), document)
                      : emptyListingStore();
                    const raw = JSON.stringify(next);
                    localStorage.setItem(LISTINGS_KEY, raw);
                    expectedRaw.current = raw;
                    setStore(next);
                    setBlockedStorage(false);
                    setStorageError("");
                    setResetStorage(false);
                    setNotice(
                      "Listing storage reset. The current on-screen copy was retained.",
                    );
                  } catch {
                    setStorageError(
                      "Storage is still unavailable. Your on-screen copy remains in this tab; export it before leaving.",
                    );
                  }
                }}
              >
                Reset listing storage
              </Button>
            </div>
          </Modal>
        </>
      )}
    </>
  );
}
