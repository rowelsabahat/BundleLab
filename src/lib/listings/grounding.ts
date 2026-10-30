import { z } from "zod";
import type { Product } from "../schemas";
import { generatedCopySchema, type ListingTone } from "./model";
export type CatalogFact = {
  id: string;
  text: string;
  productId: string | null;
  kind: "name" | "description" | "contents";
};
export function catalogFacts(
  lineup: { product: Product; quantity: number }[],
): CatalogFact[] {
  return [
    ...lineup.flatMap(({ product, quantity }) => [
      {
        id: `${product.id}:name`,
        text: `${quantity} × ${product.name}`,
        productId: product.id,
        kind: "name" as const,
      },
      {
        id: `${product.id}:description`,
        text: `${product.name}: ${product.description}`,
        productId: product.id,
        kind: "description" as const,
      },
    ]),
    {
      id: "bundle:contents",
      text: `Included in this bundle: ${lineup.map(({ product, quantity }) => `${quantity} × ${product.name}`).join("; ")}.`,
      productId: null,
      kind: "contents",
    },
  ];
}
export const copyPlanSchema = z.strictObject({
  titleStyle: z.enum(["collection", "ritual", "edit"]),
  leadStyle: z.enum(["together", "considered", "simple"]),
  shortFactIds: z.array(z.string().max(100)).min(1).max(2),
  detailedFactIds: z.array(z.string().max(100)).min(2).max(5),
  sellingPointFactIds: z.tuple([
    z.string().max(100),
    z.string().max(100),
    z.string().max(100),
  ]),
  promotionStyle: z.enum(["discover", "explore", "make_space"]),
});
export type CopyPlan = z.infer<typeof copyPlanSchema>;
export function compileCopy(
  raw: CopyPlan,
  facts: CatalogFact[],
  tone: ListingTone,
  category: string,
) {
  const plan = copyPlanSchema.parse(raw);
  const lookup = new Map(facts.map((fact) => [fact.id, fact]));
  function resolve(ids: string[], kinds: CatalogFact["kind"][]) {
    if (new Set(ids).size !== ids.length)
      throw new Error("Repeated catalog facts are not valid copy.");
    return ids.map((id) => {
      const fact = lookup.get(id);
      if (!fact || !kinds.includes(fact.kind))
        throw new Error("Copy referenced an unsupported catalog fact.");
      return fact;
    });
  }
  const short = resolve(plan.shortFactIds, ["name"]);
  const detailed = resolve(plan.detailedFactIds, ["description"]);
  const points = resolve(plan.sellingPointFactIds, ["description", "contents"]);
  const required = facts
    .filter((f) => f.kind === "description")
    .map((f) => f.id);
  if (required.some((id) => !plan.detailedFactIds.includes(id)))
    throw new Error("Detailed copy must cover every selected product.");
  const titles = {
    professional: {
      collection: "The considered collection",
      ritual: "The ritual collection",
      edit: "The essentials edit",
    },
    playful: {
      collection: "Meet your new lineup",
      ritual: "A little ritual, together",
      edit: "Your next collection starts here",
    },
    minimal: {
      collection: "The collection",
      ritual: "The ritual",
      edit: "The edit",
    },
  };
  const leads = {
    professional: {
      together: "A considered collection, brought together.",
      considered: "Explore the selected products in one collection.",
      simple: "A straightforward way to explore the collection.",
    },
    playful: {
      together: "Good company for your next ritual.",
      considered: "Meet the lineup, one product at a time.",
      simple: "A little collection to make your own.",
    },
    minimal: {
      together: "One collection.",
      considered: "Selected together.",
      simple: "A simple edit.",
    },
  };
  const promotions = {
    professional: {
      discover: "Discover the selected collection.",
      explore: "Explore the products, together.",
      make_space: "Make room for a considered collection.",
    },
    playful: {
      discover: "Say hello to your next lineup.",
      explore: "Meet the collection. Make it yours.",
      make_space: "A little space for something together.",
    },
    minimal: {
      discover: "Discover the collection.",
      explore: "Explore the edit.",
      make_space: "Make space for the collection.",
    },
  };
  const label =
    category === "skincare"
      ? "Skincare"
      : category === "wellness"
        ? "Wellness"
        : "Skincare & wellness";
  const listing = generatedCopySchema.parse({
    title: `${label} · ${titles[tone][plan.titleStyle]}`,
    shortDescription: `${leads[tone][plan.leadStyle]} ${short.map((f) => f.text).join("; ")}.`,
    detailedDescription: `${leads[tone][plan.leadStyle]}\n\n${detailed.map((f) => f.text).join("\n\n")}`,
    sellingPoints: points.map((f) => f.text),
    promotionalCopy: promotions[tone][plan.promotionStyle],
  });
  return {
    listing,
    factsUsed: [
      ...new Set([
        ...plan.shortFactIds,
        ...plan.detailedFactIds,
        ...plan.sellingPointFactIds,
      ]),
    ],
  };
}
export function demoCopyPlan(
  facts: CatalogFact[],
  tone: ListingTone,
): CopyPlan {
  const descriptions = facts
    .filter((f) => f.kind === "description")
    .map((f) => f.id);
  return {
    titleStyle:
      tone === "minimal"
        ? "edit"
        : tone === "playful"
          ? "ritual"
          : "collection",
    leadStyle: tone === "minimal" ? "simple" : "together",
    shortFactIds: facts
      .filter((f) => f.kind === "name")
      .slice(0, 2)
      .map((f) => f.id),
    detailedFactIds: descriptions,
    sellingPointFactIds: [descriptions[0], descriptions[1], "bundle:contents"],
    promotionStyle: tone === "playful" ? "explore" : "discover",
  };
}
