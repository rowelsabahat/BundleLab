"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Plus, Save, Trash2 } from "lucide-react";
import { seedProducts, money } from "@/lib/catalog";
import { calculateBundle, satisfies } from "@/lib/recommendations/engine";
import type { BundleDraft } from "@/lib/recommendations/schemas";
import { decimalToInteger } from "@/lib/recommendations/constraints";
import {
  CHOSEN_BUNDLE_KEY,
  decodeChosenBundle,
  encodeChosenBundle,
  type SavedDraft,
} from "@/lib/recommendations/saved-draft";
import { ProductArt } from "../catalog/product-art";
import { Button } from "../ui/button";
import { BundleFinances } from "./bundle-finances";
export function BundleEditor() {
  const [saved, setSaved] = useState<SavedDraft | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [discount, setDiscount] = useState("");
  const [addId, setAddId] = useState("");
  useEffect(() => {
    try {
      const restored = decodeChosenBundle(
        localStorage.getItem(CHOSEN_BUNDLE_KEY),
      );
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore an external browser-local draft after hydration.
      setSaved(restored);
      setDiscount(restored ? String(restored.draft.discountBps / 100) : "");
    } catch {
      setError(
        "The chosen bundle could not be restored. It may be invalid, out of stock, or browser storage may be blocked. Choose a new bundle in the generator; the existing saved data was not changed.",
      );
    }
    setReady(true);
  }, []);
  let totals: ReturnType<typeof calculateBundle> | undefined;
  let validDraft: BundleDraft | undefined;
  try {
    if (saved) {
      validDraft = { ...saved.draft, discountBps: decimalToInteger(discount) };
      totals = calculateBundle(validDraft, seedProducts);
    }
  } catch {
    totals = undefined;
  }
  const meets = !!(
    saved &&
    totals &&
    satisfies(totals, saved.constraints) &&
    saved.draft.lines.every(
      (l) =>
        saved.constraints.category === "all" ||
        seedProducts.find((p) => p.id === l.productId)?.category ===
          saved.constraints.category,
    )
  );
  function save() {
    if (!saved || !validDraft || !totals) return;
    try {
      const next = {
        ...saved,
        draft: validDraft,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(CHOSEN_BUNDLE_KEY, encodeChosenBundle(next));
      setSaved(next);
      setNotice("Changes saved in this browser.");
      setError("");
    } catch {
      setError(
        "Changes were not saved. Browser storage may be blocked or full.",
      );
    }
  }
  function changed() {
    setNotice("");
    setError("");
  }
  return (
    <>
      <div className="page-title-row">
        <div>
          <p className="eyebrow">SHAPE THE COMBINATION</p>
          <h1>
            Bundle Editor<span className="heading-dot">.</span>
          </h1>
          <p className="page-subtitle">
            A chosen bundle, with the economics in plain sight.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/bundle-generator">
            Back to generator
            <ArrowRight size={15} />
          </Link>
        </Button>
      </div>
      {error && (
        <p role="alert" className="banner-error">
          {error}
        </p>
      )}
      {!ready ? (
        <p role="status">Restoring your chosen bundle…</p>
      ) : !saved ? (
        <div className="empty-state">
          <h2>Your next bundle starts with an idea</h2>
          <p>
            Choose a recommendation to bring its products and constraints here.
            One active draft is saved in this browser.
          </p>
          <Button asChild className="action-button">
            <Link href="/bundle-generator">
              Find a bundle
              <ArrowRight size={15} />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="editor-layout">
          <section className="panel editor-products">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  {saved.source === "demo"
                    ? "FROM A SIMULATED RECOMMENDATION"
                    : "FROM AN AI RECOMMENDATION"}
                </p>
                <h2>Make it your own</h2>
              </div>
              <span className="tag">Browser-local draft</span>
            </div>
            <label className="editor-title">
              Bundle name
              <input
                value={saved.draft.title}
                maxLength={80}
                onChange={(e) => {
                  changed();
                  setSaved({
                    ...saved,
                    draft: { ...saved.draft, title: e.target.value },
                  });
                }}
              />
            </label>
            <ul className="editor-lines">
              {saved.draft.lines.map((line) => {
                const product = seedProducts.find(
                  (p) => p.id === line.productId,
                );
                return (
                  product && (
                    <li key={line.productId}>
                      <ProductArt product={product} compact />
                      <div>
                        <strong>{product.name}</strong>
                        <p>
                          {money(product.priceCents)} each · Cost{" "}
                          {money(product.costCents)}
                        </p>
                        <span>{product.stock} units available</span>
                      </div>
                      <label>
                        <span className="sr-only">
                          Quantity for {product.name}
                        </span>
                        <input
                          aria-label={`Quantity for ${product.name}`}
                          type="number"
                          min="1"
                          max={Math.min(99, product.stock)}
                          value={line.quantity || ""}
                          onChange={(e) => {
                            changed();
                            setSaved({
                              ...saved,
                              draft: {
                                ...saved.draft,
                                lines: saved.draft.lines.map((l) =>
                                  l.productId === line.productId
                                    ? { ...l, quantity: Number(e.target.value) }
                                    : l,
                                ),
                              },
                            });
                          }}
                        />
                      </label>
                      <button
                        className="icon-button"
                        aria-label={`Remove ${product.name}`}
                        disabled={saved.draft.lines.length <= 2}
                        onClick={() => {
                          changed();
                          setSaved({
                            ...saved,
                            draft: {
                              ...saved.draft,
                              lines: saved.draft.lines.filter(
                                (l) => l.productId !== line.productId,
                              ),
                            },
                          });
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  )
                );
              })}
            </ul>
            {saved.draft.lines.length < 5 && (
              <div className="editor-add">
                <label className="sr-only" htmlFor="add-product">
                  Product to add
                </label>
                <select
                  id="add-product"
                  value={addId}
                  onChange={(e) => setAddId(e.target.value)}
                >
                  <option value="">Choose another product</option>
                  {seedProducts
                    .filter(
                      (p) =>
                        p.stock > 0 &&
                        !saved.draft.lines.some((l) => l.productId === p.id),
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
                <Button
                  variant="outline"
                  disabled={!addId}
                  onClick={() => {
                    changed();
                    setSaved({
                      ...saved,
                      draft: {
                        ...saved.draft,
                        lines: [
                          ...saved.draft.lines,
                          { productId: addId, quantity: 1 },
                        ],
                      },
                    });
                    setAddId("");
                  }}
                >
                  <Plus size={16} />
                  Add
                </Button>
              </div>
            )}
            <p className="assumption">
              Keep 2–5 distinct products. Quantities are limited by sample
              stock. Changes stay in this tab until you save.
            </p>
          </section>
          <aside className="panel editor-summary">
            <p className="eyebrow">THE ECONOMICS</p>
            <h2>Bundle summary</h2>
            <label className="editor-title">
              Discount (%)
              <input
                aria-label="Bundle discount"
                type="number"
                min="0"
                max="50"
                step="0.01"
                value={discount}
                onChange={(e) => {
                  changed();
                  setDiscount(e.target.value);
                }}
              />
            </label>
            {totals && validDraft ? (
              <BundleFinances
                totals={totals}
                discountBps={validDraft.discountBps}
              />
            ) : (
              <p role="alert" className="banner-error">
                Enter a name, valid quantities within stock, and a discount from
                0% to 50%.
              </p>
            )}
            <p className={meets ? "constraint-pass" : "feedback error"}>
              {meets && <Check size={14} />}
              {meets
                ? "Original price, margin & category limits still met."
                : "This draft does not meet the original constraints, or contains invalid inputs. Review before saving."}
            </p>
            <p className="assumption">
              Original limits:{" "}
              {saved.constraints.maxPriceCents === null
                ? "no price cap"
                : `≤ ${money(saved.constraints.maxPriceCents)}`}
              , ≥ {(saved.constraints.minMarginBps ?? 0) / 100}% gross margin,{" "}
              {saved.constraints.category} category. Theme is a preference.
            </p>
            <Button
              className="action-button customize-button"
              onClick={save}
              disabled={!totals}
            >
              <Save size={16} />
              Save changes
            </Button>
            {notice && (
              <p role="status" className="feedback success">
                {notice}
              </p>
            )}
            <p className="assumption">
              Estimates exclude shipping, tax, fees, overhead, and returns.
              Stored totals are never trusted; figures are recomputed from
              current sample products.
            </p>
          </aside>
        </div>
      )}
    </>
  );
}
