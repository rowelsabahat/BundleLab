"use client";
import type { Product } from "@/lib/schemas";
import { money } from "@/lib/catalog";
import { marginLabel, productMarginBps } from "@/lib/calculations";
import { Modal } from "../ui/modal";
import { ProductArt } from "./product-art";
export function ProductDetail({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={!!product}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={product?.name ?? "Product details"}
      description="Product details · USD"
      wide
    >
      {product && (
        <div className="detail-layout">
          <ProductArt product={product} />
          <div className="detail-copy">
            <div className="flex items-center gap-2">
              <span className="eyebrow">{product.category}</span>
              <span className="mono-id">{product.id}</span>
            </div>
            <p className="my-5 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
            <dl className="detail-prices">
              <div>
                <dt>Retail price</dt>
                <dd>{money(product.priceCents)}</dd>
              </div>
              <div>
                <dt>Unit cost</dt>
                <dd>{money(product.costCents)}</dd>
              </div>
              <div
                className={
                  product.costCents > product.priceCents ? "loss" : "margin-row"
                }
              >
                <dt>Est. gross margin</dt>
                <dd>
                  {marginLabel(
                    productMarginBps(product.priceCents, product.costCents),
                  )}
                </dd>
              </div>
              <div>
                <dt>Available units</dt>
                <dd>{product.stock}</dd>
              </div>
            </dl>
            {product.priceCents === 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Margin is undefined when retail price is zero.
              </p>
            )}
            {product.costCents > product.priceCents && (
              <p className="mt-3 text-xs loss">
                Unit cost exceeds retail price. This item has negative gross
                profit.
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            <p className="assumption">
              Estimated gross margin = (retail price − unit cost) ÷ retail
              price. Excludes shipping, tax, payment fees, overhead, and
              returns.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
