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

/** Integer-cent bundle totals; round the discount half up once for the bundle. */
export function totalsFromAmounts(
  retailCents: number,
  costCents: number,
  discountBps: number,
) {
  for (const value of [retailCents, costCents]) {
    if (!Number.isSafeInteger(value) || value < 0 || value > 50_000_000_000)
      throw new Error("Invalid bundle monetary amount.");
  }
  if (!Number.isInteger(discountBps) || discountBps < 0 || discountBps > 5000)
    throw new Error("Discount must be between 0% and 50%.");
  const discountCents = Math.floor((retailCents * discountBps + 5000) / 10000);
  const revenueCents = retailCents - discountCents;
  const grossProfitCents = revenueCents - costCents;
  return {
    retailCents,
    costCents,
    discountCents,
    revenueCents,
    grossProfitCents,
    grossMarginBps:
      revenueCents === 0
        ? null
        : Math.round((grossProfitCents * 10000) / revenueCents),
  };
}
