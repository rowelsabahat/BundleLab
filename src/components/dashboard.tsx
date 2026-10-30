"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Package,
  Leaf,
  Boxes,
  Upload,
  Check,
  Circle,
  Layers3,
} from "lucide-react";
import { useCatalog } from "./catalog-provider";
import { money } from "@/lib/catalog";
import { Button } from "./ui/button";
import { ImportDialog } from "./catalog/import-dialog";
import { ProductArt } from "./catalog/product-art";
import { ProductDetail } from "./catalog/product-detail";
import type { Product } from "@/lib/schemas";
export function Dashboard() {
  const { products, importedCount, ready, storageError } = useCatalog();
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const skincare = products.filter((p) => p.category === "skincare").length;
  const wellness = products.length - skincare;
  const units = products.reduce((sum, p) => sum + p.stock, 0);
  const stats = [
    {
      label: "Products in your catalog",
      value: products.length,
      caption: `24 sample · ${importedCount} imported`,
      icon: Package,
    },
    {
      label: "Product categories",
      value: new Set(products.map((p) => p.category)).size,
      caption: "Skincare & wellness",
      icon: Leaf,
    },
    {
      label: "Available inventory",
      value: units.toLocaleString("en-US"),
      caption: "Units across your catalog",
      icon: Boxes,
    },
  ];
  return (
    <>
      <div className="page-title-row">
        <div>
          <p className="eyebrow">A FRESH PERSPECTIVE ON YOUR CATALOG</p>
          <h1>
            A little more possibility<span className="heading-dot">.</span>
          </h1>
          <p className="page-subtitle">
            Your products, considered together. Welcome to your workspace.
          </p>
        </div>
        <span className="workspace-pill">
          <span className="status-dot" />
          Demo workspace
        </span>
      </div>
      {storageError && (
        <div role="alert" className="banner-error">
          {storageError}{" "}
          <Link href="/catalog" className="underline">
            Manage catalog
          </Link>
        </div>
      )}
      <section className="stats-grid" aria-label="Catalog summary">
        {stats.map(({ label, value, caption, icon: Icon }) => (
          <div className="stat-card" key={label}>
            <div className="stat-top">
              <span>{label}</span>
              <Icon size={18} strokeWidth={1.5} />
            </div>
            <strong className="stat-value">{ready ? value : "—"}</strong>
            <p>{ready ? caption : "Restoring saved catalog…"}</p>
          </div>
        ))}
      </section>
      <section className="overview-feature">
        <div className="feature-copy">
          <span className="feature-kicker">THE START OF SOMETHING GOOD</span>
          <h2>
            Meet your next
            <br />
            great combination.
          </h2>
          <p>
            Explore a considered collection of skincare and wellness essentials.
            Get to know the products before building the bundles.
          </p>
          <Button asChild className="action-button">
            <Link href="/catalog">
              Explore your catalog
              <ArrowRight size={16} />
            </Link>
          </Button>
          <span className="feature-footnote">
            Fictional products. Real product economics.
          </span>
        </div>
        <div className="feature-art" aria-hidden="true">
          <span className="art-caption">THE DAILY RITUAL COLLECTION</span>
          <div className="feature-circle" />
          <div className="hero-product hero-one">
            <ProductArt product={products[3]} />
          </div>
          <div className="hero-product hero-two">
            <ProductArt product={products[5]} />
          </div>
          <div className="hero-product hero-three">
            <ProductArt product={products[0]} />
          </div>
          <span className="art-signature">
            Small rituals.
            <br />
            <i>Thoughtfully paired.</i>
          </span>
        </div>
      </section>
      <div className="overview-columns">
        <section className="panel mix-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">AT A GLANCE</span>
              <h2>Your catalog mix</h2>
            </div>
            <span className="small-muted">By product count</span>
          </div>
          <div className="mix-count">
            <strong>{ready ? products.length : "—"}</strong>
            <span>products to work with</span>
          </div>
          <div
            className="mix-bar"
            role="img"
            aria-label={`${skincare} skincare products and ${wellness} wellness products`}
          >
            <span style={{ width: `${(skincare / products.length) * 100}%` }} />
            <span />
          </div>
          <div className="mix-legend">
            <div>
              <span />
              <strong>Skincare</strong>
              <b>{ready ? skincare : "—"}</b>
            </div>
            <div>
              <span />
              <strong>Wellness</strong>
              <b>{ready ? wellness : "—"}</b>
            </div>
          </div>
          <p className="assumption">
            Calculated from the current sample and imported catalog. No sales
            data is connected.
          </p>
        </section>
        <section className="panel next-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ONE STEP AT A TIME</span>
              <h2>Make it your own</h2>
            </div>
            <Layers3 size={22} strokeWidth={1.3} />
          </div>
          <Link href="/catalog" className="journey-row">
            <span className="journey-icon">
              <Check size={16} />
            </span>
            <div>
              <strong>Explore the sample collection</strong>
              <p>24 products, with costs and margins.</p>
            </div>
            <ArrowUpRight size={17} />
          </Link>
          <button
            className="journey-row"
            disabled={!ready || !!storageError}
            onClick={() => setImportOpen(true)}
          >
            <span className="journey-icon light">
              <Upload size={16} />
            </span>
            <div>
              <strong>Bring in your own catalog</strong>
              <p>Import products from a validated CSV.</p>
            </div>
            <ArrowUpRight size={17} />
          </button>
          <div className="journey-row planned-row">
            <span className="journey-icon light">
              <Circle size={16} />
            </span>
            <div>
              <strong>Find a complementary bundle</strong>
              <p>Coming in a future milestone.</p>
            </div>
            <span className="tag">Planned</span>
          </div>
        </section>
      </div>
      <section className="collection-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A FEW GOOD PLACES TO START</span>
            <h2>From the collection</h2>
          </div>
          <Link href="/catalog" className="text-link">
            View all products
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="featured-grid">
          {[products[0], products[3], products[16]].map((product) => (
            <button
              key={product.id}
              className="featured-product"
              onClick={() => setSelected(product)}
              aria-label={`View ${product.name}`}
            >
              <ProductArt product={product} compact />
              <div>
                <span className="eyebrow">{product.category}</span>
                <h3>{product.name}</h3>
                <p>
                  {money(product.priceCents)} <span>USD</span>
                </p>
              </div>
              <ArrowUpRight size={17} />
            </button>
          ))}
        </div>
      </section>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ProductDetail product={selected} onClose={() => setSelected(null)} />
    </>
  );
}
