import { CircleAlert, Check, ArrowRight, Save } from "lucide-react";
import { money } from "@/lib/catalog";
import { marginLabel } from "@/lib/calculations";
import {
  bundleWarnings,
  pricingIssue,
  type WorkingBundle,
  type EditorTotals,
} from "@/lib/editor/model";
import type { Product } from "@/lib/schemas";
import { Button } from "../ui/button";
export function EditorSummary({
  active,
  totals,
  error,
  products,
  discount,
  price,
  onDiscount,
  onPrice,
  canSave,
  onSave,
  onListing,
  saved,
}: {
  active: WorkingBundle;
  totals: EditorTotals | null;
  error: string;
  products: Product[];
  discount: string;
  price: string;
  onDiscount: (value: string) => void;
  onPrice: (value: string) => void;
  canSave: boolean;
  onSave: () => void;
  onListing: () => void;
  saved: boolean;
}) {
  const warnings = totals ? bundleWarnings(active, totals, products) : [];
  const issue = totals ? pricingIssue(totals) : "";
  return (
    <aside className="panel editor-summary full-summary">
      <div className="summary-heading">
        <div>
          <p className="eyebrow">SEE THE IMPACT</p>
          <h2>Bundle economics</h2>
        </div>
        <span className="tag">USD</span>
      </div>
      <div className="pricing-inputs">
        <label>
          Bundle discount <span>%</span>
          <input
            aria-label="Bundle discount"
            aria-invalid={!!error}
            type="number"
            min="0"
            max="50"
            step="0.01"
            value={discount}
            onChange={(e) => onDiscount(e.target.value)}
          />
        </label>
        <label>
          Final bundle price <span>USD</span>
          <input
            aria-label="Final bundle price"
            aria-invalid={!!error || !!issue}
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => onPrice(e.target.value)}
          />
        </label>
      </div>
      <p className="pricing-mode-note">
        {active.draft.pricing.mode === "discount"
          ? "Discount is held as products change. Sale price updates automatically."
          : "Exact sale price is held as products change. The effective discount updates."}
      </p>
      {error ? (
        <p role="alert" className="feedback error">
          {error}
        </p>
      ) : (
        totals && (
          <>
            <dl className="bundle-finances editor-finances">
              <div>
                <dt>Combined retail value</dt>
                <dd>{money(totals.retailCents)}</dd>
              </div>
              <div className="bundle-total">
                <dt>Bundle sale price</dt>
                <dd>{money(totals.revenueCents)}</dd>
              </div>
              <div>
                <dt>Effective discount</dt>
                <dd>
                  {totals.effectiveDiscountBps === null
                    ? "Not defined"
                    : `${(totals.effectiveDiscountBps / 100).toFixed(2)}%`}
                </dd>
              </div>
              <div>
                <dt>Total product cost</dt>
                <dd>{money(totals.costCents)}</dd>
              </div>
              <div
                className={
                  totals.grossProfitCents < 0
                    ? "loss profit-line"
                    : "profit-line"
                }
              >
                <dt>Estimated gross profit</dt>
                <dd>{money(totals.grossProfitCents)}</dd>
              </div>
              <div
                className={
                  totals.grossProfitCents < 0
                    ? "loss margin-highlight"
                    : "margin-highlight"
                }
              >
                <dt>Estimated gross margin</dt>
                <dd>{marginLabel(totals.grossMarginBps)}</dd>
              </div>
            </dl>
            {totals.revenueCents === 0 && (
              <p className="assumption">
                Gross margin is undefined at a zero sale price.
              </p>
            )}
            {totals.retailCents === 0 && (
              <p className="assumption">
                Discount is undefined when combined retail is zero.
              </p>
            )}
            {active.draft.pricing.mode === "discount" && (
              <p className="rounding-note">
                Discount rounds half up once to cents. The effective percentage
                may differ slightly from the entered percentage.
              </p>
            )}
          </>
        )
      )}
      {issue && (
        <p role="alert" className="feedback error">
          {issue} Allowed sale price: {money(totals?.minimumPriceCents ?? 0)}–
          {money(totals?.retailCents ?? 0)}.
        </p>
      )}
      <div className="target-limits">
        <strong>Original guardrails</strong>
        <span>
          Price cap{" "}
          <b>
            {active.constraints.maxPriceCents === null
              ? "Not set"
              : money(active.constraints.maxPriceCents)}
          </b>
        </span>
        <span>
          Target gross margin{" "}
          <b>
            {active.constraints.minMarginBps === null
              ? "Not set"
              : `${active.constraints.minMarginBps / 100}%`}
          </b>
        </span>
        <span>
          Category{" "}
          <b>
            {active.constraints.category === "all"
              ? "All categories"
              : active.constraints.category}
          </b>
        </span>
      </div>
      {!!warnings.length && (
        <div className="constraint-warnings" role="status">
          <CircleAlert size={17} />
          <div>
            <strong>Review this combination</strong>
            <ul>
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
            <p>
              These are targets, not a promise of profitability. You can save a
              valid bundle with these warnings.
            </p>
          </div>
        </div>
      )}
      {!!totals &&
        !error &&
        !issue &&
        !warnings.length &&
        active.draft.lines.length >= 2 && (
          <p className="constraint-pass">
            <Check size={14} />
            {active.constraints.maxPriceCents === null &&
            active.constraints.minMarginBps === null &&
            active.constraints.category === "all"
              ? "Pricing and product quantities are valid."
              : "Original price, margin & category limits still met."}
          </p>
        )}
      {active.draft.lines.length < 2 && (
        <p className="assumption">
          Add at least two distinct products to save a bundle.
        </p>
      )}
      <Button
        className="action-button customize-button"
        onClick={onSave}
        disabled={!canSave}
      >
        <Save size={16} />
        {saved ? "Save changes" : "Save bundle"}
      </Button>
      <Button
        className="customize-button listing-button"
        variant="outline"
        disabled={!canSave}
        onClick={onListing}
      >
        Proceed to Listing Studio
        <ArrowRight size={15} />
      </Button>
      <p className="assumption">
        Proceeding saves this named bundle. Listing generation is a future
        milestone. All estimates exclude taxes, shipping, transaction fees, and
        other operating costs.
      </p>
    </aside>
  );
}
