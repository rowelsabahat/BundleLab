"use client";
import { useState } from "react";
import {
  Search,
  Upload,
  LayoutGrid,
  List,
  ArrowUpRight,
  PackageSearch,
  RotateCcw,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { filterProducts, money } from "@/lib/catalog";
import { marginLabel, productMarginBps } from "@/lib/calculations";
import type { Product } from "@/lib/schemas";
import { useCatalog } from "../catalog-provider";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { ImportDialog } from "./import-dialog";
import { ProductArt } from "./product-art";
import { ProductDetail } from "./product-detail";
export function CatalogView() {
  const { products, importedCount, ready, storageError, clearImports } =
    useCatalog();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [resetError, setResetError] = useState("");
  const [sort, setSort] = useState("catalog");
  const filtered = filterProducts(products, query, category).sort((a, b) =>
    sort === "name"
      ? a.name.localeCompare(b.name)
      : sort === "price"
        ? a.priceCents - b.priceCents
        : 0,
  );
  const resetFilters = () => {
    setQuery("");
    setCategory("all");
    setSort("catalog");
  };
  return (
    <>
      <div className="page-title-row">
        <div>
          <p className="eyebrow">YOUR MERCHANDISING FOUNDATION</p>
          <h1>
            Product catalog<span className="heading-dot">.</span>
          </h1>
          <p className="page-subtitle">
            Good bundles begin with knowing your products.
          </p>
        </div>
        <Button
          className="action-button"
          onClick={() => setImportOpen(true)}
          disabled={!ready || !!storageError}
        >
          <Upload size={16} />
          Import products
        </Button>
      </div>
      <div className="catalog-intro">
        <span className="status-dot" />
        <p>
          <strong>24 fictional products to explore.</strong> Make this workspace
          your own by importing a CSV.
        </p>
        <span className="catalog-count">
          {ready ? `${importedCount} imported` : "Restoring catalog…"}
        </span>
      </div>
      {storageError && (
        <div role="alert" className="banner-error">
          {storageError}
        </div>
      )}
      {notice && (
        <p role="status" className="feedback success">
          {notice}
        </p>
      )}
      <section aria-label="Product filters" className="catalog-toolbar">
        <div className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Search products"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, tag, or product ID…"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="icon-button"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="toolbar-right">
          <SlidersHorizontal size={16} aria-hidden="true" />
          <label className="sr-only" htmlFor="sort">
            Sort products
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="catalog">Catalog order</option>
            <option value="name">Name: A–Z</option>
            <option value="price">Price: low to high</option>
          </select>
          <div className="view-toggle" role="group" aria-label="Product layout">
            <button
              className={view === "grid" ? "selected" : ""}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <LayoutGrid size={17} />
            </button>
            <button
              className={view === "list" ? "selected" : ""}
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </section>
      <div className="filter-row">
        <div
          className="category-tabs"
          role="group"
          aria-label="Filter by category"
        >
          {["all", "skincare", "wellness"].map((c) => (
            <button
              key={c}
              aria-pressed={category === c}
              className={category === c ? "selected" : ""}
              onClick={() => setCategory(c)}
            >
              {c === "all"
                ? "All products"
                : c === "skincare"
                  ? "Skincare"
                  : "Wellness"}
              <span>
                {c === "all"
                  ? products.length
                  : products.filter((p) => p.category === c).length}
              </span>
            </button>
          ))}
        </div>
        <p role="status" className="results-count">
          {ready
            ? `${filtered.length} product${filtered.length === 1 ? "" : "s"}`
            : "Restoring saved catalog…"}
        </p>
      </div>
      {!ready ? (
        <div
          className="product-grid"
          role="status"
          aria-label="Loading saved catalog"
        >
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-card">
              <div />
              <span />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <PackageSearch size={40} strokeWidth={1.2} />
          <h2>No products match just yet</h2>
          <p>
            Try another name, a tag like “hydrate,” or a different category.
          </p>
          <Button variant="outline" onClick={resetFilters}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div
          className={view === "grid" ? "product-grid" : "product-list"}
          aria-label="Products"
        >
          {filtered.map((product) => (
            <button
              className={`product-card ${view === "list" ? "list-card" : ""}`}
              key={product.id}
              onClick={() => setSelected(product)}
              aria-label={`View ${product.name}`}
            >
              <div className="product-visual">
                <ProductArt product={product} />
                <span className="product-category">{product.category}</span>
                <span className="product-open">
                  <ArrowUpRight size={18} />
                </span>
              </div>
              <div className="product-card-copy">
                <div className="product-card-heading">
                  <h2>{product.name}</h2>
                  <span>{product.id}</span>
                </div>
                <p className="product-description">{product.description}</p>
                <div className="product-tags">
                  {product.tags.slice(0, 2).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="product-card-footer">
                  <div>
                    <span className="product-price">
                      {money(product.priceCents)}
                    </span>
                    <span className="unit-cost">
                      Cost {money(product.costCents)}
                    </span>
                  </div>
                  <div
                    className={`product-margin ${product.costCents > product.priceCents ? "loss" : ""}`}
                  >
                    <strong>
                      {marginLabel(
                        productMarginBps(product.priceCents, product.costCents),
                      )}
                    </strong>
                    <span>est. margin</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="catalog-bottom">
        <p>
          All prices in USD. Margins exclude shipping, tax, fees, overhead, and
          returns.
        </p>
        {(importedCount > 0 || storageError) && (
          <button
            className="text-link"
            onClick={() => {
              setResetError("");
              setResetOpen(true);
            }}
          >
            <RotateCcw size={14} />
            Clear saved imports
          </button>
        )}
      </div>
      <ProductDetail product={selected} onClose={() => setSelected(null)} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <Modal
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Clear saved imports?"
        description="This removes all imported products from this browser. The 24 sample products stay in place. Keep a copy of your CSV to import them again."
      >
        <div className="modal-actions">
          <Button variant="outline" onClick={() => setResetOpen(false)}>
            Keep imports
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              const failure = clearImports();
              if (failure) setResetError(failure);
              else {
                setNotice(
                  "Saved imports cleared. Your sample catalog is ready.",
                );
                setResetOpen(false);
              }
            }}
          >
            Clear imports
          </Button>
        </div>
        {resetError && (
          <p role="alert" className="feedback error">
            {resetError}
          </p>
        )}
      </Modal>
    </>
  );
}
