import { z } from "zod";
const amount = z.number().int().min(0).max(100_000_000);
/** Estimated item gross margin; excludes shipping, tax, fees, returns and overhead. */
export function productMarginBps(
  priceCents: number,
  costCents: number,
): number | null {
  amount.parse(priceCents);
  amount.parse(costCents);
  return priceCents === 0
    ? null
    : Math.round(((priceCents - costCents) * 10_000) / priceCents);
}
export function marginLabel(value: number | null) {
  return value === null ? "Not defined" : `${(value / 100).toFixed(1)}%`;
}
