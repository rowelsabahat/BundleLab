# BundleLab architecture

## Implemented milestone

Next.js App Router serves `/` (Overview), `/catalog`, and three informational planned pages at `/bundle-generator`, `/bundle-editor`, and `/listing-studio`. The root layout renders `AppShell`, with a persistent `CatalogProvider`. Server route components delegate interactive views to client components. Navigation uses Next Link and pathname-based active states. Mobile navigation becomes a horizontally scrollable bar.

The 24-product JSON seed is parsed with Zod at module load. `schemas.ts` owns the strict Product schema and unique-ID list validator; the client provider restores separately stored imported products after mount. Product fields are integer cents, bounded stock, USD, tags, and a local artwork variant. Zero prices are allowed by the milestone request (overriding the initial proposed positive-price rule). Cost may exceed price; show the loss rather than reject valid merchant data. `calculations.ts` currently implements only estimated item gross margin, with null for zero revenue.

`csv.ts` implements a bounded, dependency-free quoted CSV reader and row validation. Dollar strings convert to cents by splitting whole/fraction parts. Exact required headers may be reordered. Import is append-only and atomic: invalid rows, IDs colliding with current catalog or file, or cumulative limits reject the full file. No server upload occurs.

`storage.ts` validates `{version: 1, products: [...]}` under `bundlelab:imported-products:v1`, rejects corrupt/unsupported data and seed collisions. Persist before updating in-memory products; failed writes leave the catalog unchanged. Invalid stored data is retained until explicit clear, with a recovery warning and import disabled. Clear requires confirmation. Separate tabs observe updates on reload, not via live synchronization. Saved bundles are not implemented.

Radix Dialog provides trapping, Escape dismissal, semantics, and explicit focus restoration for product details, import, and clear confirmation. Artwork is decorative CSS with deterministic palettes/silhouettes; product names remain textual and no remote images are fetched. Route boundaries and catalog restoration have loading/error states. No API routes, model client, bundling engine, or generated content exists.

## Proposed module boundaries

- `src/data/products.json`: immutable fictional catalog; validate on load with Zod and assert 24 unique IDs.
- `src/lib/schemas.ts`: runtime schemas and inferred domain types; no separate competing interfaces.
- `src/lib/catalog.ts`: validated catalog lookup and filtering.
- `src/lib/calculations.ts`: pure synchronous TypeScript functions; independent of React, storage, and OpenAI.
- `src/lib/storage.ts`: versioned localStorage adapter, parsing, migrations only as needed, and friendly recovery.
- `src/lib/ai/`: server-only provider adapter, prompt construction, and response validation, added later.
- `src/components/catalog`, `bundle-builder`, `profitability`, `saved-bundles`, and `listing-editor`: feature components added when needed. Keep shared primitives in `components/ui`.

Server components render static structure and catalog context. Small client components own interactive drafts, storage, and copy actions. Use React state or a reducer for the active draft; derive financial results from inputs. Avoid Redux, global stores, and a generic repository layer. Read localStorage after mount to avoid hydration mismatch; never access it at module scope. Surface quota/security errors and do not imply cross-device storage.

## Schema boundaries (Product implemented; bundle and AI schemas planned)

All objects are Zod-validated at trust boundaries; reject unknown properties for API inputs/outputs.

- Product: `id`, `name`, `category` (skincare/wellness), `description`, `tags`, `priceCents`, `costCents`, `stock`, `currency: USD`. Amounts and stock are nonnegative bounded integers; zero prices are supported, and imported costs can exceed prices. Seed costs do not exceed prices. Artwork is a local enum with a bottle default. No external images required.
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

Vitest tests catalog validation/search, item margin, CSV ingestion, and storage codecs; Playwright exercises a production server in desktop and mobile Chromium. Future AI tests mock the provider and never require paid calls. Deploy using Vercel's standard Next.js preset, Node 24, npm install/build, and optional server environment variables. No filesystem writes or persistent server process assumptions. No custom Vercel config is currently necessary.

The npm dev/build scripts explicitly use Next.js Webpack and Tailwind PostCSS for portability; see decision 009.
