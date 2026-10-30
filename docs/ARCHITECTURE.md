# BundleLab architecture

## Implemented foundation

Next.js App Router under `src/app`, strict TypeScript, Tailwind CSS, shadcn/ui configuration and Button, Lucide, Zod, Vitest, and Playwright. `src/lib/utils.ts` holds the UI class helper. The only page is a static setup page. No catalog, domain schemas, calculation engine, persistence, API routes, or OpenAI client exists yet.

## Proposed module boundaries

- `src/data/products.json`: immutable fictional catalog; validate on load with Zod and assert 24 unique IDs.
- `src/lib/schemas.ts`: runtime schemas and inferred domain types; no separate competing interfaces.
- `src/lib/catalog.ts`: validated catalog lookup and filtering.
- `src/lib/calculations.ts`: pure synchronous TypeScript functions; independent of React, storage, and OpenAI.
- `src/lib/storage.ts`: versioned localStorage adapter, parsing, migrations only as needed, and friendly recovery.
- `src/lib/ai/`: server-only provider adapter, prompt construction, and response validation, added later.
- `src/components/catalog`, `bundle-builder`, `profitability`, `saved-bundles`, and `listing-editor`: feature components added when needed. Keep shared primitives in `components/ui`.

Server components render static structure and catalog context. Small client components own interactive drafts, storage, and copy actions. Use React state or a reducer for the active draft; derive financial results from inputs. Avoid Redux, global stores, and a generic repository layer. Read localStorage after mount to avoid hydration mismatch; never access it at module scope. Surface quota/security errors and do not imply cross-device storage.

## Planned schemas

All objects are Zod-validated at trust boundaries; reject unknown properties for API inputs/outputs.

- Product: `id`, `name`, `category` (skincare/wellness), `description`, `tags`, `priceCents`, `costCents`, `stock`, `currency: USD`. Amounts and stock are nonnegative safe integers; price positive. Seed costs must not exceed prices. No external images required.
- BundleLine: `productId`, `quantity` (integer 1–99, limited by stock). Reject duplicates and unknown IDs. A bundle has 2–5 distinct lines.
- BundleDraft: lines, `discountBps` (integer 0–5000), editable name and listing text. Cap text sizes.
- SavedBundle: `id` (client UUID), `createdAt`, `updatedAt` (ISO strings), draft. Storage envelope `{version: 1, bundles: [...]}` under `bundlelab:saved-bundles:v1`. Revalidate catalog references and recompute derived values on load; never persist authoritative totals.
- Recommendation: title, rationale, and validated BundleLines. At most three suggestions; model does not supply prices or financial results.
- Listing: title, description, and promotional text; enforce length limits and avoid unsupported health/performance claims.

## Calculation contract (planned)

All monetary arithmetic uses integer cents, one USD currency, and safe-integer guards. Never calculate money in an LLM response or parse formatted currency back into numbers.

1. `retailCents = sum(product.priceCents * quantity)`.
2. `costCents = sum(product.costCents * quantity)`.
3. `discountCents = floor((retailCents * discountBps + 5000) / 10000)` (round half up once at the bundle level). Guard intermediate multiplication against unsafe integers.
4. `revenueCents = retailCents - discountCents`; `savingsCents = discountCents`.
5. `grossProfitCents = revenueCents - costCents`.
6. `grossMarginBps = round(grossProfitCents * 10000 / revenueCents)`; return null if revenue is zero. Negative profit remains visible. Margin uses revenue, not cost.

Format only at the UI boundary with `Intl.NumberFormat`. Label figures as estimated gross profit before shipping, tax, payment fees, overhead, and returns. Inventory availability is per bundle, not a reservation. Validate inputs before computing, with explicit errors rather than silent clamping.

## Planned server routes

- `POST /api/recommendations`: validated goal (max 500 characters), optional known selected IDs, and bounded constraints. Build context from the canonical catalog server-side. Return `{recommendations}` only after Zod and ID/quantity/stock validation.
- `POST /api/listings`: validated bundle lines and goal/tone; server resolves products. Return `{listing}`. Any displayed financial summary is calculated by TypeScript, outside model output.

Use Node runtime and server-only environment access. Add the OpenAI SDK only when implementing these routes. Request structured output, bound request size and output tokens, use a timeout, and avoid logging secrets or full prompts. Error envelope: `{error: {code, message}}`; distinguish invalid request (400), missing configuration (503), upstream failure/timeout (502/504), and invalid model response (502). No fake successful AI fallback. Preserve drafts and offer manual editing. Public unauthenticated AI endpoints need a spending/abuse decision before enabling them on a public deployment; until then keep them disabled when unconfigured.

## Validation and deployment

Vitest tests pure helpers now and domain logic later; Playwright exercises a production server in desktop and mobile Chromium. Future AI tests mock the provider and never require paid calls. Deploy using Vercel's standard Next.js preset, Node 24, npm install/build, and optional server environment variables. No filesystem writes or persistent server process assumptions. No custom Vercel config is currently necessary.

The npm dev/build scripts explicitly use Next.js Webpack and Tailwind PostCSS for portability; see decision 009.
