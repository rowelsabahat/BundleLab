"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, FileText, Check } from "lucide-react";
import { useCatalog } from "../catalog-provider";
import { BUNDLE_LIBRARY_KEY, decodeLibrary } from "@/lib/editor/library";
import {
  calculateEditorBundle,
  bundleWarnings,
  type NamedBundle,
} from "@/lib/editor/model";
import { money } from "@/lib/catalog";
import { marginLabel } from "@/lib/calculations";
import { ProductArt } from "../catalog/product-art";
import { Button } from "../ui/button";
export function ListingHandoff() {
  const { products, ready: catalogReady } = useCatalog();
  const [bundle, setBundle] = useState<NamedBundle | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!catalogReady) return;
    try {
      const library = decodeLibrary(localStorage.getItem(BUNDLE_LIBRARY_KEY));
      const saved = library.bundles.find((b) => b.id === library.active?.id);
      if (
        saved &&
        JSON.stringify(saved.draft) === JSON.stringify(library.active?.draft)
      ) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore the saved editor handoff after hydration.
        setBundle(saved);
      }
    } catch {
      setError(
        "The saved bundle could not be read. Return to the editor to repair or save your draft.",
      );
    }
    setReady(true);
  }, [catalogReady]);
  let totals = null;
  let calculationError = "";
  if (bundle) {
    try {
      totals = calculateEditorBundle(bundle.draft, products);
    } catch {
      calculationError =
        "Some products are missing or unavailable. Repair this bundle in the editor first.";
    }
  }
  return (
    <>
      <div className="page-title-row">
        <div>
          <p className="eyebrow">THE NEXT CHAPTER</p>
          <h1>
            Listing Studio<span className="heading-dot">.</span>
          </h1>
          <p className="page-subtitle">
            Your selected combination, ready for its product story.
          </p>
        </div>
        <span className="workspace-pill planned-pill">Planned milestone</span>
      </div>
      {!ready ? (
        <p role="status">Loading your saved bundle…</p>
      ) : bundle && totals ? (
        <section className="panel listing-handoff">
          <div className="section-heading">
            <div>
              <p className="eyebrow">SAVED BUNDLE HANDOFF</p>
              <h2>{bundle.draft.title}</h2>
            </div>
            <span className="constraint-pass">
              <Check size={14} />
              Saved in this browser
            </span>
          </div>
          <ul className="bundle-products">
            {bundle.draft.lines.map((line) => {
              const p = products.find((p) => p.id === line.productId);
              return (
                p && (
                  <li key={p.id}>
                    <ProductArt product={p} compact />
                    <div>
                      <strong>{p.name}</strong>
                      <span>
                        {p.id} · Quantity {line.quantity}
                      </span>
                    </div>
                    <span>{money(p.priceCents * line.quantity)}</span>
                  </li>
                )
              );
            })}
          </ul>
          <div className="handoff-stats">
            <div>
              <span>Bundle sale price</span>
              <strong>{money(totals.revenueCents)}</strong>
            </div>
            <div>
              <span>Estimated gross profit</span>
              <strong>{money(totals.grossProfitCents)}</strong>
            </div>
            <div>
              <span>Estimated gross margin</span>
              <strong>{marginLabel(totals.grossMarginBps)}</strong>
            </div>
          </div>
          {bundleWarnings(bundle, totals, products).map((warning) => (
            <p key={warning} className="feedback error">
              {warning}
            </p>
          ))}
          <p className="assumption">
            Recalculated from the current catalog. Estimates exclude taxes,
            shipping, transaction fees, and other operating costs.
          </p>
        </section>
      ) : (
        <div className="feedback error">
          {error ||
            calculationError ||
            "Save a bundle in the editor and use Proceed to Listing Studio to bring it here."}
        </div>
      )}
      <section className="panel listing-next">
        <FileText size={32} strokeWidth={1.2} />
        <h2>The combination is ready. The words come next.</h2>
        <p>
          Listing generation is not available in this milestone. Your saved
          bundle and pricing are preserved; no listing has been generated or
          published.
        </p>
        <Button asChild variant="outline">
          <Link href="/bundle-editor">
            <ArrowLeft size={15} />
            Back to Bundle Editor
          </Link>
        </Button>
      </section>
    </>
  );
}
