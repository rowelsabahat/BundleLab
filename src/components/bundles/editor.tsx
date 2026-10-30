"use client";
import { WorkspaceHeading } from "../workspace-heading";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Plus,
  Trash2,
  PackageOpen,
  RotateCcw,
  Layers3,
} from "lucide-react";
import { useCatalog } from "../catalog-provider";
import { money } from "@/lib/catalog";
import { decimalToInteger } from "@/lib/recommendations/constraints";
import {
  CHOSEN_BUNDLE_KEY,
  decodeChosenBundle,
} from "@/lib/recommendations/saved-draft";
import {
  calculateEditorBundle,
  fromRecommendation,
  newWorkingBundle,
  savedBundleFor,
  type EditorDraft,
  type NamedBundle,
  type EditorTotals,
} from "@/lib/editor/model";
import {
  BUNDLE_LIBRARY_KEY,
  decodeLibrary,
  deleteBundle,
  duplicateBundle,
  emptyLibrary,
  isUnsaved,
  persistLibrary,
  renameBundle,
  saveNamedBundle,
  type BundleLibrary,
} from "@/lib/editor/library";
import { ProductArt } from "../catalog/product-art";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { EditorSummary } from "./editor-summary";
import { ProductPicker } from "./product-picker";
import { SavedBundles } from "./saved-bundles";

type Replacement = { kind: "new" } | { kind: "open"; id: string };
export function BundleEditor() {
  const router = useRouter();
  const {
    products,
    ready: catalogReady,
    storageError: catalogError,
  } = useCatalog();
  const [library, setLibrary] = useState<BundleLibrary>(emptyLibrary);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [picker, setPicker] = useState(false);
  const [replacement, setReplacement] = useState<Replacement | null>(null);
  const [rename, setRename] = useState<NamedBundle | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [deleting, setDeleting] = useState<NamedBundle | null>(null);
  const [reset, setReset] = useState(false);
  const [priceInput, setPriceInput] = useState<string | null>(null);
  const [discountInput, setDiscountInput] = useState<string | null>(null);
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>(
    {},
  );
  const expectedRaw = useRef<string | null>(null);
  useEffect(() => {
    if (!catalogReady) return;
    let restored: BundleLibrary;
    try {
      expectedRaw.current = localStorage.getItem(BUNDLE_LIBRARY_KEY);
      restored = decodeLibrary(expectedRaw.current);
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrating external browser storage after catalog restoration.
      setBlocked(true);
      setError(
        "Your bundle library could not be read. Existing saved data has not been overwritten. Allow browser storage or clear the damaged library below.",
      );
      setReady(true);
      return;
    }
    try {
      const chosen = decodeChosenBundle(
        localStorage.getItem(CHOSEN_BUNDLE_KEY),
      );
      if (chosen && chosen.savedAt !== restored.recommendationAt) {
        restored = {
          ...restored,
          active: fromRecommendation(chosen, crypto.randomUUID()),
          recommendationAt: chosen.savedAt,
        };
        try {
          expectedRaw.current = persistLibrary(
            localStorage,
            restored,
            expectedRaw.current,
          );
        } catch {
          setError(
            "The recommendation is open in this tab, but could not be saved locally. Allow browser storage and save it before leaving.",
          );
        }
      }
    } catch {
      setError(
        "The recommendation handoff could not be restored. Saved bundles are still available; choose another recommendation or start a new bundle.",
      );
    }
    setLibrary(restored);
    setReady(true);
  }, [catalogReady]);
  const active = library.active;
  const named = library.bundles.find((b) => b.id === active?.id);
  const dirty = isUnsaved(active, library.bundles);
  function clearInputs() {
    setPriceInput(null);
    setDiscountInput(null);
    setQuantityInputs({});
  }
  function commit(next: BundleLibrary, keepWorkingOnFailure = false) {
    if (blocked) return false;
    try {
      expectedRaw.current = persistLibrary(
        localStorage,
        next,
        expectedRaw.current,
      );
      setLibrary(next);
      setError("");
      return true;
    } catch (failure) {
      if (keepWorkingOnFailure) setLibrary(next);
      setError(
        failure instanceof Error
          ? failure.message
          : "Changes could not be saved in this browser.",
      );
      return false;
    }
  }
  function updateDraft(draft: EditorDraft) {
    if (!active) return;
    setNotice("");
    commit(
      {
        ...library,
        active: { ...active, updatedAt: new Date().toISOString(), draft },
      },
      true,
    );
  }
  let totals: EditorTotals | null = null;
  let inputError = "";
  if (active) {
    try {
      for (const line of active.draft.lines) {
        const raw = quantityInputs[line.productId];
        if (
          raw !== undefined &&
          (!/^\d+$/.test(raw) ||
            Number(raw) < 1 ||
            Number(raw) > 99 ||
            Number(raw) >
              (products.find((p) => p.id === line.productId)?.stock ?? 0))
        )
          throw new Error(
            "Enter whole-number quantities from 1–99 within available stock. Remove unavailable products to repair this bundle.",
          );
      }
      if (priceInput !== null && decimalToInteger(priceInput) > 50_000_000_000)
        throw new Error("That price exceeds the supported amount.");
      if (discountInput !== null && decimalToInteger(discountInput) > 5000)
        throw new Error("Discount must be between 0% and 50%.");
      totals = calculateEditorBundle(active.draft, products);
    } catch (failure) {
      inputError =
        failure instanceof Error && failure.name !== "ZodError"
          ? failure.message
          : "Check the bundle pricing and product quantities.";
    }
  }
  let canSave = false;
  if (active && !inputError && !blocked) {
    try {
      savedBundleFor(active, products);
      canSave = true;
    } catch {
      /* Invalid drafts remain editable but cannot be named/sent forward. */
    }
  }
  function save(proceed = false) {
    if (!active || !canSave) return;
    try {
      const saved = savedBundleFor(
        { ...active, updatedAt: new Date().toISOString() },
        products,
      );
      if (commit(saveNamedBundle(library, saved))) {
        setNotice(
          "Changes saved in this browser. Your named bundle is in the library.",
        );
        if (proceed) router.push("/listing-studio");
      }
    } catch {
      setError(
        "The library is full or this bundle is invalid. Keep at most 50 named bundles and check all inputs.",
      );
    }
  }
  function replaceWorking(action: Replacement) {
    const nextActive =
      action.kind === "new"
        ? newWorkingBundle(crypto.randomUUID(), new Date().toISOString())
        : library.bundles.find((b) => b.id === action.id);
    if (!nextActive) return;
    if (commit({ ...library, active: nextActive })) {
      clearInputs();
      setNotice("");
      setReplacement(null);
      if (action.kind === "new") setPicker(true);
    }
  }
  function requestReplacement(action: Replacement) {
    if (active && (dirty || inputError)) setReplacement(action);
    else replaceWorking(action);
  }
  function toggle(id: string) {
    if (!active) return;
    const selected = active.draft.lines.some((l) => l.productId === id);
    if (
      !selected &&
      (active.draft.lines.length >= 5 ||
        !products.find((p) => p.id === id)?.stock)
    )
      return;
    const next = { ...quantityInputs };
    delete next[id];
    setQuantityInputs(next);
    updateDraft({
      ...active.draft,
      lines: selected
        ? active.draft.lines.filter((l) => l.productId !== id)
        : [...active.draft.lines, { productId: id, quantity: 1 }],
    });
  }
  function onDiscount(value: string) {
    if (!active) return;
    setDiscountInput(value);
    setPriceInput(null);
    setNotice("");
    try {
      const discountBps = decimalToInteger(value);
      if (discountBps <= 5000)
        updateDraft({
          ...active.draft,
          pricing: { mode: "discount", discountBps },
        });
    } catch {
      /* Partial input stays visible; do not store invalid numeric data. */
    }
  }
  function onPrice(value: string) {
    if (!active) return;
    setPriceInput(value);
    setDiscountInput(null);
    setNotice("");
    try {
      const priceCents = decimalToInteger(value);
      if (priceCents <= 50_000_000_000)
        updateDraft({
          ...active.draft,
          pricing: { mode: "price", priceCents },
        });
    } catch {
      /* See input error rather than stale financial values. */
    }
  }
  const discountValue =
    discountInput ??
    (active?.draft.pricing.mode === "discount"
      ? String(active.draft.pricing.discountBps / 100)
      : totals?.effectiveDiscountBps === null || !totals
        ? ""
        : (totals.effectiveDiscountBps / 100).toFixed(2));
  const priceValue =
    priceInput ??
    (totals
      ? (totals.revenueCents / 100).toFixed(2)
      : active?.draft.pricing.mode === "price"
        ? (active.draft.pricing.priceCents / 100).toFixed(2)
        : "");
  return (
    <>
      <WorkspaceHeading
        eyebrow="MAKE THE COMBINATION YOURS"
        title="Bundle Editor"
        description="A considered combination. Every change, clearly accounted for."
        actions={
          <div className="editor-top-actions">
            <Button asChild variant="outline">
              <Link href="/bundle-generator">
                Find a pairing
                <ArrowRight size={15} />
              </Link>
            </Button>
            <Button
              className="action-button"
              disabled={!ready || blocked}
              onClick={() => requestReplacement({ kind: "new" })}
            >
              <Plus size={16} />
              New bundle
            </Button>
          </div>
        }
      />
      {catalogError && (
        <p role="alert" className="banner-error">
          {catalogError} Products from unreadable imports cannot be used until
          the catalog is restored.
        </p>
      )}
      {error && (
        <div role="alert" className="banner-error">
          {error}
          {blocked && (
            <button
              className="text-link recovery-link"
              onClick={() => {
                setDialogError("");
                setReset(true);
              }}
            >
              <RotateCcw size={14} />
              Clear damaged bundle library
            </button>
          )}
        </div>
      )}
      {notice && (
        <p role="status" className="feedback success editor-notice">
          {notice}
        </p>
      )}
      {!ready ? (
        <div className="route-loading" role="status">
          Restoring your working draft and saved bundles…
        </div>
      ) : active ? (
        <div className="editor-layout full-editor">
          <section className="panel editor-products">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  {active.source === "demo"
                    ? "FROM A SIMULATED RECOMMENDATION"
                    : active.source === "ai"
                      ? "FROM AN AI RECOMMENDATION"
                      : "FROM YOUR CATALOG"}
                </p>
                <h2>
                  Your combination{" "}
                  <span className="library-count">
                    {active.draft.lines.length}/5
                  </span>
                </h2>
              </div>
              <Button
                variant="outline"
                onClick={() => setPicker(true)}
                disabled={blocked}
              >
                <Plus size={16} />
                Choose products
              </Button>
            </div>
            <label className="editor-title">
              Bundle name
              <input
                value={active.draft.title}
                maxLength={80}
                aria-invalid={!active.draft.title.trim()}
                onChange={(e) =>
                  updateDraft({ ...active.draft, title: e.target.value })
                }
              />
            </label>
            {!active.draft.title.trim() && (
              <p className="field-error">
                Give this bundle a name before saving it.
              </p>
            )}
            <div className="draft-save-status">
              <span className={`status-dot ${error ? "status-unsaved" : ""}`} />
              <span>
                {error
                  ? "Changes may only be in this tab"
                  : "Working draft autosaved in this browser"}
              </span>
              <b>
                {dirty ? "Not yet saved to library" : "Matches saved bundle"}
              </b>
            </div>
            {!!active.rationale && (
              <details className="original-rationale">
                <summary>Original recommendation rationale</summary>
                <p>{active.rationale}</p>
                <span>
                  Advisory copy from the original selection; edits may change
                  how well it applies.
                </span>
              </details>
            )}
            {!active.draft.lines.length ? (
              <div className="editor-products-empty">
                <PackageOpen size={38} strokeWidth={1.1} />
                <h3>Room for a good combination</h3>
                <p>
                  Pick 2–5 complementary products to begin. Their prices and
                  costs come straight from your catalog.
                </p>
                <Button variant="outline" onClick={() => setPicker(true)}>
                  Browse products
                  <ArrowRight size={15} />
                </Button>
              </div>
            ) : (
              <ul className="editor-lines full-editor-lines">
                {active.draft.lines.map((line) => {
                  const product = products.find((p) => p.id === line.productId);
                  return (
                    <li key={line.productId}>
                      {product ? (
                        <ProductArt product={product} compact />
                      ) : (
                        <span className="missing-product-icon">
                          <PackageOpen size={22} />
                        </span>
                      )}
                      <div>
                        <strong>
                          {product?.name ??
                            `Unavailable product · ${line.productId}`}
                        </strong>
                        <p>
                          {product
                            ? `${money(product.priceCents)} retail / ${money(product.costCents)} unit cost`
                            : "Restore its CSV or remove this product."}
                        </p>
                        <span>
                          {product
                            ? `${product.stock} available · ${product.currency}`
                            : line.productId}
                        </span>
                      </div>
                      <div className="line-edit-controls">
                        <label>
                          <span className="sr-only">
                            Quantity for {product?.name ?? line.productId}
                          </span>
                          <input
                            aria-label={`Quantity for ${product?.name ?? line.productId}`}
                            aria-invalid={
                              quantityInputs[line.productId] !== undefined &&
                              (!/^\d+$/.test(quantityInputs[line.productId]) ||
                                Number(quantityInputs[line.productId]) < 1 ||
                                Number(quantityInputs[line.productId]) >
                                  Math.min(99, product?.stock ?? 0))
                            }
                            type="number"
                            min="1"
                            max={Math.min(99, product?.stock ?? 0)}
                            value={
                              quantityInputs[line.productId] ?? line.quantity
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              setQuantityInputs({
                                ...quantityInputs,
                                [line.productId]: value,
                              });
                              if (
                                /^\d+$/.test(value) &&
                                Number(value) >= 1 &&
                                Number(value) <=
                                  Math.min(99, product?.stock ?? 0)
                              )
                                updateDraft({
                                  ...active.draft,
                                  lines: active.draft.lines.map((l) =>
                                    l.productId === line.productId
                                      ? { ...l, quantity: Number(value) }
                                      : l,
                                  ),
                                });
                            }}
                          />
                        </label>
                        <button
                          className="icon-button"
                          aria-label={`Remove ${product?.name ?? line.productId}`}
                          onClick={() => toggle(line.productId)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="editor-products-footer">
              <span>
                {active.draft.lines.reduce(
                  (sum, line) => sum + line.quantity,
                  0,
                )}{" "}
                units in this bundle
              </span>
              <span>2–5 distinct products to save</span>
            </div>
            <p className="assumption">
              Inventory is an availability check, not a reservation. Imported
              catalog prices are merchant-provided estimates. Save to your
              library before replacing this draft.
            </p>
          </section>
          <EditorSummary
            active={active}
            totals={totals}
            error={inputError}
            products={products}
            discount={discountValue}
            price={priceValue}
            onDiscount={onDiscount}
            onPrice={onPrice}
            canSave={canSave}
            onSave={() => save()}
            onListing={() => save(true)}
            saved={!!named}
          />
        </div>
      ) : (
        !blocked && (
          <div className="empty-state editor-start">
            <Layers3 size={37} strokeWidth={1.2} />
            <h2>Every bundle starts with a little possibility.</h2>
            <p>
              Customize a recommendation, start with your catalog, or reopen a
              saved combination below.
            </p>
            <div className="empty-editor-actions">
              <Button
                className="action-button"
                onClick={() => requestReplacement({ kind: "new" })}
              >
                <Plus size={16} />
                Create a bundle
              </Button>
              <Button asChild variant="outline">
                <Link href="/bundle-generator">
                  Explore recommendations
                  <ArrowRight size={15} />
                </Link>
              </Button>
            </div>
          </div>
        )
      )}
      {ready && !blocked && (
        <SavedBundles
          bundles={library.bundles}
          activeId={active?.id}
          products={products}
          onOpen={(id) => requestReplacement({ kind: "open", id })}
          onRename={(bundle) => {
            setDialogError("");
            setRename(bundle);
            setRenameTitle(bundle.draft.title);
          }}
          onDuplicate={(id) => {
            try {
              if (
                commit(
                  duplicateBundle(
                    library,
                    id,
                    crypto.randomUUID(),
                    new Date().toISOString(),
                  ),
                )
              )
                setNotice(
                  "Bundle duplicated. Open its copy from your library.",
                );
            } catch {
              setError(
                "The library is full. Delete an unneeded bundle before duplicating.",
              );
            }
          }}
          onDelete={(bundle) => {
            setDialogError("");
            setDeleting(bundle);
          }}
        />
      )}
      {active && (
        <ProductPicker
          open={picker}
          onOpenChange={setPicker}
          products={products}
          lines={active.draft.lines}
          onToggle={toggle}
        />
      )}
      <Modal
        open={!!rename}
        onOpenChange={(open) => {
          if (!open) setRename(null);
        }}
        title="Rename saved bundle"
        description="Use a name you will recognize in your merchandising notebook."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!rename) return;
            try {
              if (
                commit(
                  renameBundle(
                    library,
                    rename.id,
                    renameTitle,
                    new Date().toISOString(),
                  ),
                )
              ) {
                setRename(null);
                setNotice("Bundle renamed.");
              } else
                setDialogError(
                  "Rename was not saved. Check the storage warning.",
                );
            } catch {
              setDialogError("Use a name between 1 and 80 characters.");
            }
          }}
        >
          <label className="editor-title">
            Saved bundle name
            <input
              required
              maxLength={80}
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
            />
          </label>
          {dialogError && (
            <p role="alert" className="feedback error">
              {dialogError}
            </p>
          )}
          <div className="modal-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRename(null)}
            >
              Cancel
            </Button>
            <Button type="submit">Rename bundle</Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete saved bundle?"
        description={`“${deleting?.draft.title ?? "This bundle"}” will be removed from this browser. This cannot be undone. Other saved bundles and catalog products stay in place.`}
      >
        <div className="modal-actions">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Keep bundle
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (deleting && commit(deleteBundle(library, deleting.id))) {
                if (deleting.id === active?.id) clearInputs();
                setDeleting(null);
                setNotice("Bundle deleted.");
              } else
                setDialogError(
                  "Delete was not saved. Check the storage warning.",
                );
            }}
          >
            Delete bundle
          </Button>
        </div>
        {dialogError && (
          <p role="alert" className="feedback error">
            {dialogError}
          </p>
        )}
      </Modal>
      <Modal
        open={!!replacement}
        onOpenChange={(open) => {
          if (!open) setReplacement(null);
        }}
        title="Replace your working draft?"
        description="This draft has changes not saved to your named library, or incomplete inputs. Save them first to keep them. Continuing replaces this working copy only."
      >
        <div className="modal-actions">
          <Button variant="outline" onClick={() => setReplacement(null)}>
            Keep editing
          </Button>
          <Button
            onClick={() => {
              if (replacement) replaceWorking(replacement);
            }}
          >
            Discard & continue
          </Button>
        </div>
      </Modal>
      <Modal
        open={reset}
        onOpenChange={setReset}
        title="Clear damaged bundle library?"
        description="This permanently removes all saved bundles and the working draft in this browser. Your catalog and recommendation handoff are not removed."
      >
        <div className="modal-actions">
          <Button variant="outline" onClick={() => setReset(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              try {
                localStorage.removeItem(BUNDLE_LIBRARY_KEY);
                expectedRaw.current = null;
                setLibrary(emptyLibrary());
                setBlocked(false);
                setError("");
                setReset(false);
                clearInputs();
              } catch {
                setDialogError(
                  "Browser storage is blocked. Allow it and try again.",
                );
              }
            }}
          >
            Clear library
          </Button>
        </div>
        {dialogError && (
          <p role="alert" className="feedback error">
            {dialogError}
          </p>
        )}
      </Modal>
    </>
  );
}
