"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  ShoppingBag,
  Minus,
  Plus,
  Layers3,
} from "lucide-react";
import type { ListingCopy } from "@/lib/listings/model";
import type { Product } from "@/lib/schemas";
import { money } from "@/lib/catalog";
import { ProductArt } from "../catalog/product-art";
export function StorefrontPreview({
  copy,
  lineup,
  priceCents,
}: {
  copy: ListingCopy;
  lineup: { product: Product; quantity: number }[];
  priceCents: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(true);
  const featured = lineup.find((l) => l.product.id === selected);
  return (
    <section className="storefront-frame" aria-label="Storefront live preview">
      <div className="preview-chrome">
        <span />
        <span />
        <span />
        <p>Storefront preview · Not a live shop</p>
        <ArrowUpRight size={13} />
      </div>
      <div className="storefront-brand">
        <span>
          <Layers3 size={17} />
          BOTANICAL & CO.
        </span>
        <ShoppingBag size={17} aria-hidden="true" />
      </div>
      <div className={`storefront-art ${featured ? "single-feature" : ""}`}>
        {featured ? (
          <ProductArt product={featured.product} />
        ) : (
          lineup.map(({ product }, index) => (
            <div
              key={product.id}
              className={`lineup-art lineup-position-${index}`}
            >
              <ProductArt product={product} />
            </div>
          ))
        )}
        <span className="preview-collection-label">
          THE CONSIDERED COLLECTION
        </span>
      </div>
      <div className="preview-thumbnails">
        <button
          className={selected === null ? "selected" : ""}
          aria-label="Preview entire bundle"
          aria-pressed={selected === null}
          onClick={() => setSelected(null)}
        >
          <Layers3 size={20} />
          <span>Bundle</span>
        </button>
        {lineup.map(({ product }) => (
          <button
            key={product.id}
            className={selected === product.id ? "selected" : ""}
            aria-label={`Preview ${product.name}`}
            aria-pressed={selected === product.id}
            onClick={() => setSelected(product.id)}
          >
            <ProductArt product={product} compact />
          </button>
        ))}
      </div>
      <div className="storefront-copy">
        <p className="eyebrow">
          {lineup.length} DISTINCT PRODUCTS · ONE COLLECTION
        </p>
        <h2>{copy.title.trim() || "Your collection title"}</h2>
        <p className="storefront-price">
          {money(priceCents)} <span>USD</span>
        </p>
        <p
          className={`preview-short ${!copy.shortDescription ? "placeholder-copy" : ""}`}
        >
          {copy.shortDescription ||
            "Your short description will appear here as you write."}
        </p>
        <ul className="storefront-points">
          {copy.sellingPoints.map((point, i) => (
            <li key={i}>
              <Check size={14} />
              <span className={!point ? "placeholder-copy" : ""}>
                {point || `Selling point ${i + 1}`}
              </span>
            </li>
          ))}
        </ul>
        <div
          className="storefront-cart"
          aria-label="Decorative storefront example"
        >
          <ShoppingBag size={15} />
          Your bundle, ready to present<span>Preview only</span>
        </div>
        <p className="preview-commerce-note">
          No cart, payment, or Shopify connection.
        </p>
        <button
          className="storefront-detail-toggle"
          onClick={() => setDetailOpen(!detailOpen)}
          aria-expanded={detailOpen}
        >
          About the collection
          {detailOpen ? <Minus size={16} /> : <Plus size={16} />}
        </button>
        {detailOpen && (
          <p
            className={`preview-detailed ${!copy.detailedDescription ? "placeholder-copy" : ""}`}
          >
            {copy.detailedDescription ||
              "Your detailed description will appear here."}
          </p>
        )}
        <div className="preview-lineup">
          <h3>Included in this bundle</h3>
          {lineup.map(({ product, quantity }) => (
            <p key={product.id}>
              <span>{product.name}</span>
              <b>×{quantity}</b>
            </p>
          ))}
        </div>
        {copy.promotionalCopy && (
          <p className="storefront-promo">{copy.promotionalCopy}</p>
        )}
      </div>
    </section>
  );
}
