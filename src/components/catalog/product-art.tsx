import type { Product } from "@/lib/schemas";
const palettes = ["sage", "sand", "rose", "olive", "lavender", "cream"];
export function ProductArt({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  let hash = 0;
  for (const char of product.id)
    hash = (hash + char.charCodeAt(0)) % palettes.length;
  return (
    <div
      aria-hidden="true"
      className={`product-art art-${palettes[hash]} ${compact ? "art-compact" : ""}`}
    >
      <div className="art-orbit" />
      <div className={`product-object object-${product.artwork}`}>
        <div className="object-cap" />
        <div className="object-body">
          <div className="object-label">
            <span className="object-brand">
              BOTANICAL
              <br />& CO.
            </span>
            <span className="object-rule" />
            <span className="object-name">
              {product.name.split(" ").slice(0, 2).join(" ")}
            </span>
            <span className="object-volume">DAILY RITUALS</span>
          </div>
        </div>
      </div>
      <div className="art-ground" />
    </div>
  );
}
