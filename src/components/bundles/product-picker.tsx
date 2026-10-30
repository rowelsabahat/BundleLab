"use client";
import { useState } from "react";
import { Check, Plus, Search, PackageSearch } from "lucide-react";
import { filterProducts, money } from "@/lib/catalog";
import type { Product } from "@/lib/schemas";
import type { EditorDraft } from "@/lib/editor/model";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { ProductArt } from "../catalog/product-art";
export function ProductPicker({
  open,
  onOpenChange,
  products,
  lines,
  onToggle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  lines: EditorDraft["lines"];
  onToggle: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const filtered = filterProducts(products, query, category);
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      drawer
      title="Build your combination"
      description="Choose up to five distinct products from your sample and imported catalog. Each addition starts with one unit."
    >
      <div className="picker-controls">
        <label className="search-field">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Search catalog products</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, tag, or product ID"
          />
        </label>
        <label className="sr-only" htmlFor="picker-category">
          Filter product category
        </label>
        <select
          id="picker-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          <option value="skincare">Skincare</option>
          <option value="wellness">Wellness</option>
        </select>
      </div>
      <div className="picker-status">
        <span role="status">{lines.length} of 5 selected</span>
        <span>{filtered.length} products</span>
      </div>
      {lines.length === 5 && (
        <p className="picker-limit">
          Your combination is full. Remove a product to make room for another.
        </p>
      )}
      <ul className="picker-results">
        {filtered.map((product) => {
          const selected = lines.some((l) => l.productId === product.id);
          return (
            <li key={product.id}>
              <ProductArt product={product} compact />
              <div>
                <span className="eyebrow">{product.category}</span>
                <h3>{product.name}</h3>
                <p>
                  {product.id} · {product.stock} available
                </p>
                <span>
                  {money(product.priceCents)} retail{" "}
                  <span className="picker-cost">
                    / {money(product.costCents)} cost
                  </span>
                </span>
              </div>
              <Button
                className={selected ? "picker-selected" : ""}
                variant="outline"
                aria-label={`${selected ? "Remove" : "Add"} ${product.name}`}
                aria-pressed={selected}
                disabled={
                  !selected && (lines.length >= 5 || product.stock === 0)
                }
                onClick={() => onToggle(product.id)}
              >
                {selected ? <Check size={15} /> : <Plus size={15} />}
                {selected ? "Added" : product.stock === 0 ? "No stock" : "Add"}
              </Button>
            </li>
          );
        })}
      </ul>
      {!filtered.length && (
        <div className="picker-empty">
          <PackageSearch size={30} />
          <h3>No products found</h3>
          <p>Try a different search or category.</p>
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setCategory("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
      <div className="picker-footer">
        <p>Selections update your working draft immediately.</p>
        <Button className="action-button" onClick={() => onOpenChange(false)}>
          Done selecting
        </Button>
      </div>
    </Modal>
  );
}
