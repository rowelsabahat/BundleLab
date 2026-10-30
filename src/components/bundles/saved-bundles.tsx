"use client";
import { useState } from "react";
import {
  Copy,
  Pencil,
  Trash2,
  FolderOpen,
  ArrowUpRight,
  Search,
} from "lucide-react";
import type { NamedBundle } from "@/lib/editor/model";
import { calculateEditorBundle } from "@/lib/editor/model";
import type { Product } from "@/lib/schemas";
import { money } from "@/lib/catalog";
import { Button } from "../ui/button";
export function SavedBundles({
  bundles,
  activeId,
  products,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
}: {
  bundles: NamedBundle[];
  activeId?: string;
  products: Product[];
  onOpen: (id: string) => void;
  onRename: (bundle: NamedBundle) => void;
  onDuplicate: (id: string) => void;
  onDelete: (bundle: NamedBundle) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = bundles.filter((b) =>
    b.draft.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <section className="bundle-library" aria-label="Saved bundles">
      <div className="section-heading">
        <div>
          <p className="eyebrow">YOUR MERCHANDISING NOTEBOOK</p>
          <h2>
            Saved bundles{" "}
            <span className="library-count">{bundles.length}/50</span>
          </h2>
        </div>
        {!!bundles.length && (
          <label className="search-field library-search">
            <Search size={16} />
            <span className="sr-only">Search saved bundles</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a saved bundle…"
            />
          </label>
        )}
      </div>
      {!bundles.length ? (
        <div className="library-empty">
          <FolderOpen size={29} strokeWidth={1.2} />
          <div>
            <h3>A place for your good ideas</h3>
            <p>
              Save your first combination above. Named bundles stay in this
              browser until you delete them.
            </p>
          </div>
        </div>
      ) : !filtered.length ? (
        <p className="library-empty">No saved bundles match this name.</p>
      ) : (
        <div className="library-grid">
          {filtered.map((bundle) => {
            let total;
            try {
              total = calculateEditorBundle(bundle.draft, products);
            } catch {
              total = null;
            }
            return (
              <article
                key={bundle.id}
                className={`saved-bundle-card ${bundle.id === activeId ? "is-open" : ""}`}
              >
                <div className="saved-card-top">
                  <span className="eyebrow">
                    {bundle.source === "manual"
                      ? "MANUAL BUNDLE"
                      : bundle.source === "demo"
                        ? "DEMO ORIGIN"
                        : "AI ORIGIN"}
                  </span>
                  {bundle.id === activeId && (
                    <span className="tag">Open in editor</span>
                  )}
                </div>
                <h3>{bundle.draft.title}</h3>
                <p>
                  {bundle.draft.lines.length} distinct products ·{" "}
                  {bundle.draft.lines.reduce((sum, l) => sum + l.quantity, 0)}{" "}
                  units
                </p>
                <div className="saved-card-price">
                  {total ? (
                    <>
                      <strong>{money(total.revenueCents)}</strong>
                      <span>sale price · USD</span>
                    </>
                  ) : (
                    <span className="loss">
                      Catalog needs attention · open to repair
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="customize-button"
                  onClick={() => onOpen(bundle.id)}
                  aria-label={`Open ${bundle.draft.title}`}
                >
                  Open bundle
                  <ArrowUpRight size={15} />
                </Button>
                <div className="saved-card-actions">
                  <button
                    aria-label={`Rename ${bundle.draft.title}`}
                    onClick={() => onRename(bundle)}
                  >
                    <Pencil size={13} />
                    Rename
                  </button>
                  <button
                    disabled={bundles.length >= 50}
                    aria-label={`Duplicate ${bundle.draft.title}`}
                    onClick={() => onDuplicate(bundle.id)}
                  >
                    <Copy size={13} />
                    Duplicate
                  </button>
                  <button
                    aria-label={`Delete ${bundle.draft.title}`}
                    onClick={() => onDelete(bundle)}
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="assumption">
        Browser-local storage is not a backup or cross-device sync. Financial
        figures are recomputed from your current catalog whenever a bundle
        opens.
      </p>
    </section>
  );
}
