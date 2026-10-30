import { money } from "@/lib/catalog";
import { marginLabel } from "@/lib/calculations";
import type { Recommendation } from "@/lib/recommendations/schemas";
export function BundleFinances({
  totals,
  discountBps,
}: Pick<Recommendation, "totals" | "discountBps">) {
  return (
    <dl className="bundle-finances">
      <div className="bundle-total">
        <dt>
          Bundle price <span>USD</span>
        </dt>
        <dd>{money(totals.revenueCents)}</dd>
      </div>
      <div>
        <dt>Retail total</dt>
        <dd>{money(totals.retailCents)}</dd>
      </div>
      <div>
        <dt>
          Proposed discount ·{" "}
          {(discountBps / 100).toFixed(2).replace(/\.00$/, "")}%
        </dt>
        <dd>−{money(totals.discountCents)}</dd>
      </div>
      <div>
        <dt>Product cost</dt>
        <dd>{money(totals.costCents)}</dd>
      </div>
      <div className={totals.grossProfitCents < 0 ? "loss" : "profit-line"}>
        <dt>Estimated gross profit</dt>
        <dd>{money(totals.grossProfitCents)}</dd>
      </div>
      <div
        className={totals.grossProfitCents < 0 ? "loss" : "margin-highlight"}
      >
        <dt>Estimated gross margin</dt>
        <dd>{marginLabel(totals.grossMarginBps)}</dd>
      </div>
    </dl>
  );
}
