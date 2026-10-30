import seed from "@/data/products.json";
import { productListSchema, type Product } from "./schemas";

export const seedProducts = productListSchema.length(24).parse(seed);
export function filterProducts(
  products: Product[],
  query: string,
  category: string,
) {
  const term = query.trim().toLocaleLowerCase();
  return products.filter(
    (p) =>
      (category === "all" || p.category === category) &&
      [p.name, p.id, p.description, ...p.tags]
        .join(" ")
        .toLocaleLowerCase()
        .includes(term),
  );
}
export function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
