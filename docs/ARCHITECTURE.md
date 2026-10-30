# BundleLab architecture

## Implemented milestone

Next.js App Router serves `/` (Overview), `/catalog`, and functional bundle pages at `/bundle-generator` and `/bundle-editor`. `/listing-studio` completes the saved-bundle handoff, copy generation/editing, storefront preview, and exports. The root layout renders `AppShell`, with a persistent `CatalogProvider`. Server route components delegate interactive views to client components. Navigation uses Next Link and pathname-based active states. Mobile navigation becomes a horizontally scrollable bar.

The 24-product JSON seed is parsed with Zod at module load. `schemas.ts` owns the strict Product schema and unique-ID list validator; the client provider restores separately stored imported products after mount. Product fields are integer cents, bounded stock, USD, tags, and a local artwork variant. Zero prices are allowed by the milestone request (overriding the initial proposed positive-price rule). Cost may exceed price; show the loss rather than reject valid merchant data. `calculations.ts` implements item gross margin and integer-cent bundle totals, with null margin for zero revenue. Recommendations require positive revenue.

`csv.ts` implements a bounded, dependency-free quoted CSV reader and row validation. Dollar strings convert to cents by splitting whole/fraction parts. Exact required headers may be reordered. Import is append-only and atomic: invalid rows, IDs colliding with current catalog or file, or cumulative limits reject the full file. No server upload occurs.

`storage.ts` validates `{version: 1, products: [...]}` under `bundlelab:imported-products:v1`, rejects corrupt/unsupported data and seed collisions. Persist before updating in-memory products; failed writes leave the catalog unchanged. Invalid stored data is retained until explicit clear, with a recovery warning and import disabled. Clear requires confirmation. Separate tabs observe updates on reload, not via live synchronization. Before imports or clears, compare the stored raw envelope with the last-read value; refuse stale-tab writes so newer imports are preserved. A separate recommendation handoff and an atomic working-draft/named-bundle envelope are implemented.

Radix Dialog provides trapping, Escape dismissal, semantics, and explicit focus restoration for product details, import, and clear confirmation. Artwork is decorative CSS with deterministic palettes/silhouettes; product names remain textual and no remote images are fetched. Route boundaries and catalog restoration have loading/error states. Server-only recommendation/listing routes share a bounded OpenAI Responses transport.

## Module boundaries

- `src/data/products.json`: immutable fictional catalog; validate on load with Zod and assert 24 unique IDs.
- `src/lib/schemas.ts`: runtime schemas and inferred domain types; no separate competing interfaces.
- `src/lib/catalog.ts`: validated catalog lookup and filtering.
- `src/lib/calculations.ts`: pure synchronous TypeScript functions; independent of React, storage, and OpenAI.
- `src/lib/storage.ts`: versioned localStorage adapter, parsing, migrations only as needed, and friendly recovery.
- `src/lib/server/`: server-only mode/configuration, body and rate limits, and native-fetch OpenAI Responses adapter.
- `src/lib/recommendations/`: shared schemas, bounded prompt constraint parser, deterministic feasibility/ranking, candidate validation, and chosen-draft codec.
- `src/lib/editor/`: editor pricing model, strict working/named schemas, migration, library operations, and optimistic stale-tab write protection.
- `src/components/bundles/`: Generator, full editor, economics summary, drawer and named library.
- `src/lib/listings/`: listing schemas, verified fact composition, context/export and copy persistence.
- `src/components/listings/`: Listing Studio editor and interactive storefront preview. Keep shared primitives in `components/ui`.

Server components render static structure and catalog context. Small client components own interactive drafts, storage, and copy actions. Use React state or a reducer for the active draft; derive financial results from inputs. Avoid Redux, global stores, and a generic repository layer. Read localStorage after mount to avoid hydration mismatch; never access it at module scope. Surface quota/security errors and do not imply cross-device storage.

## Schema boundaries

All objects are Zod-validated at trust boundaries; reject unknown properties for API inputs/outputs.

- Product: `id`, `name`, `category` (skincare/wellness), `description`, `tags`, `priceCents`, `costCents`, `stock`, `currency: USD`. Amounts and stock are nonnegative bounded integers; zero prices are supported, and imported costs can exceed prices. Seed costs do not exceed prices. Artwork is a local enum with a bottle default. No external images required.
- BundleLine: `productId`, `quantity` (integer 1–99, limited by stock). Reject duplicates and unknown IDs. A bundle has 2–5 distinct lines.
- Recommendation BundleDraft remains strict: 2–5 lines, `discountBps` (integer 0–5000), and title.
- EditorDraft: title (blank permitted only while working), 0–5 unique lines, and discriminated pricing `{mode: discount, discountBps}` or `{mode: price, priceCents}`. Named saves require nonblank title and at least two lines.
- SavedBundle: `id` (client UUID), `createdAt`, `updatedAt` (ISO strings), draft. Storage envelope `{version: 1, bundles: [...], active, recommendationAt}` under `bundlelab:saved-bundles:v1`. Records include editor draft, original constraints, source, rationale, and timestamps. Revalidate catalog references and recompute derived values on load; never persist authoritative totals.
- Recommendation: title, rationale, and validated BundleLines. At most three suggestions; model does not supply prices or financial results.
- Listing: title, description, and promotional text; enforce length limits and avoid unsupported health/performance claims.

## Calculation contract (implemented)

All monetary arithmetic uses integer cents, one USD currency, and safe-integer guards. Never calculate money in an LLM response or parse formatted currency back into numbers.

1. `retailCents = sum(product.priceCents * quantity)`.
2. `costCents = sum(product.costCents * quantity)`.
3. `discountCents = floor((retailCents * discountBps + 5000) / 10000)` (round half up once at the bundle level). Guard intermediate multiplication against unsafe integers.
4. `revenueCents = retailCents - discountCents`; `savingsCents = discountCents`.
5. `grossProfitCents = revenueCents - costCents`.
6. `grossMarginBps = round(grossProfitCents * 10000 / revenueCents)`; return null if revenue is zero. Negative profit remains visible. Margin uses revenue, not cost.

Format only at the UI boundary with `Intl.NumberFormat`. Label figures as estimated gross profit before shipping, tax, payment fees, overhead, and returns. Inventory availability is per bundle, not a reservation. Validate inputs before computing, with explicit errors rather than silent clamping.

## Server routes

- `POST /api/recommendations`: strict input `{prompt, maxPriceCents, minMarginBps, category, theme}`. Price/margin use nullable bounded integer cents/basis points. Prompt and explicit controls resolve deterministically using stricter limits. Unsupported numeric phrasing is rejected. Category is hard; theme is soft. Browser-supplied catalogs and unknown fields are rejected.
- `POST /api/listings`: strict saved draft, tone, expected price and only selected imported records; recomputes figures and returns grounded copy with provenance, not model financial data.

The dynamic generator page reads `BUNDLELAB_MODE` server-side (`demo` default, `ai` explicit; other values block generation) and passes only mode/configured booleans to the client. The route rechecks configuration for every request. `server-only` prevents provider modules from client imports. The key is never a public environment variable. Model configuration defaults to `gpt-4.1-mini`, optionally overridden with `OPENAI_MODEL`.

Both modes use exactly the same 24 server-owned seed records; local CSV additions are deliberately not accepted as authoritative server product data. Enumerate every set of one unit each of 2–5 distinct in-stock products in the requested category (at most 55,430 sets). For each, binary-search discount basis points to find whether the price cap and exact margin can both be met within 0–50%. Discounts decrease revenue and cannot improve margin for nonnegative costs. A deterministic ranking retains up to three sets using keyword overlap, primary-tag diversity, preferred size, and stable-ID tie-breaking. Demo prefers a 10% discount when feasible but adjusts within the proven feasible interval. Demo returns these explicitly simulated suggestions. Theme matching is not certified.

In AI Mode this search is only a feasibility preflight. If mathematically infeasible, return `status: infeasible` without a paid call. Otherwise make a real `POST https://api.openai.com/v1/responses` call with eligible IDs, canonical name/description/tags/category/price/cost, normalized constraints, and merchant prompt. No browser data, API secret, or derived financial output is supplied as model-selectable source data. Use strict JSON Schema with an eligible-ID enum, at most three candidates, IDs, advisory title/rationale, and proposed discountBps. Disable provider response storage (`store: false`), bound output tokens to 1800, timeout at 20 seconds, and do not retry automatically. Use the native Fetch API rather than another SDK dependency.

Parse the provider envelope and generated JSON with Zod, handle refusal/incomplete content explicitly, reject unknown output fields and numerical/financial rationale claims, and revalidate IDs, distinct selections, stock, discount, category, price cap, and exact margin. Model prices, product names as structured fields, costs, and computed profits are never accepted. Deduplicate sets independently of order/discount. Return only validated candidates with TypeScript totals. If all model suggestions fail or the model returns none, use `status: no_valid_ai_results`, explicitly distinguishing that from proven infeasibility. Never substitute deterministic candidates after an AI failure. Partial valid results can contain fewer than three cards.

Request protection: JSON only, same-origin check when Origin is present, 8 KB streamed byte limit, 3-second body timeout, 64 KB provider response limit, six attempts per IP/minute, two concurrent AI calls, thirty AI calls per instance/hour. Maps are bounded and expired entries pruned. `maxDuration: 30` on the Node route leaves room around the provider timeout. Counters are best-effort in-memory protections; cold starts, IP spoofing outside a trusted host, and multiple Vercel instances preclude a global spending guarantee. Use hosting-level protection/provider budgets for a broader public AI deployment. Error envelopes are `{error:{code,message}}` with no raw provider details or credentials; status codes distinguish 400/403/408/413/415/422/429/502/503/504. Responses are no-store. No prompt/key logging.

The client displays mode explicitly, clears stale recommendations when inputs change, provides cancel/skeleton/error/no-results states, validates response shape, verifies returned constraints against the submitted normalized constraints, checks status/count consistency and distinct one-unit sets, and recalculates/rechecks price, exact margin, stock and category from seed records before displaying a pass label. Customization persists `{version:1,draft,constraints,source,savedAt,rationale?}` at `bundlelab:chosen-bundle:v1` before navigation. Save failures keep the user on the generator. Older handoffs without rationale are supported.

## Full editor and local library

The editor waits for CatalogProvider hydration, then reads `bundlelab:saved-bundles:v1`. A newly timestamped recommendation is migrated into a working editor record once, preserving its source/rationale/constraints. The consumed timestamp prevents reimporting the old selection after deleting a saved bundle. Existing named records are retained.

`calculateEditorBundle` accepts an editable draft, resolves only current catalog IDs, validates unique lines and quantities/stock, and sums integer-cent retail/cost values. Discount-mode pricing uses the established half-up-once rule. Direct-price mode preserves the exact cent input and derives discount from `(retail - sale)/retail`. Never round a percentage and convert it back to reconstruct a direct price. Gross profit is sale minus cost, and margin is profit/revenue only if revenue is positive. Discount is null at zero retail; margin is null at zero revenue. Direct price must be within `floor(retail/2)` through retail to save; cent rounding can make effective percentages differ slightly from requested 50%. No silent adjustment after product changes. Zero/empty working totals are supported; empty drafts cannot be saved as named bundles.

The editor may use local imported products, independently of the server recommendation catalog. Product data is never supplied by model-generated names or values. Missing/deleted import IDs remain visible as unavailable, allowing removal or CSV restoration; no stale totals or invented prices substitute for them. Invalid raw numeric strings remain tab-local and hide financial totals. A fixed price outside allowed bounds shows actual numbers with an error and disabled saves. Price/margin/category target failures are separate advisory warnings and remain visible when a valid draft is saved or previewed in Studio.

The library codec uses strict Zod schemas, a 1 MB input guard, and at most 50 named bundles. The active working record allows empty selections; named records require 2–5 products and a trimmed nonblank title. Store only input values plus source metadata, never derived totals or product-price snapshots. Every read/write revalidates the envelope; totals are recalculated from current catalog records. Individual missing catalog references are retained for repair.

Working model changes autosave to `active`; explicit Save copies them to the named entry identified by UUID (or inserts a new entry). Rename, duplicate, delete, and active selection updates are pure library operations followed by one atomic `setItem`. A raw-envelope comparison rejects stale-tab writes instead of overwriting another tab. Library mutations update UI only after a successful write; a failed working autosave retains edits in this tab with a visible warning. Corrupt libraries are not overwritten; an explicit confirmed reset can clear them. Replacing unsaved named edits and deleting a record require a dialog. No distributed synchronization or browser-storage durability is claimed.

Proceed to Listing Studio performs a validated named save before navigation. The Studio restores the active record only if it matches a named saved bundle and recalculates a preview. Listing Studio retains this saved-bundle validation before any copy generation, editing, export or return to Editor.

Official implementation references: [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini). No live paid API call was made during automated verification.

## Listing Studio generation and persistence

The dynamic Studio page passes only server-selected mode/configured flags to the client. Selected bundle must match a named saved entry; current stock, references and pricing are validated using the existing editor model. Its exact price and lineup are read-only to copy generation. An expectedPriceCents mismatch returns 409. Selected imported records are accepted as bounded schema-validated merchant catalog input, not model-generated source data; reject seed overrides, unrelated records and duplicate/missing IDs. AI recommendations remain seed-only.

`catalogFacts` builds stable name/quantity, description and contents fact IDs. `generateListingPlan` sends only these facts and the requested tone to the real OpenAI Responses transport—no prices, costs or discount fields. The strict output schema allows title/lead/promotion style enums and fact-reference lists only. `compileCopy` rejects unsupported facts, duplicate points, missing product coverage and unexpected fields. It composes the required fields from exact source text and approved editorial phrases; no new product benefits, ingredients, certifications, guarantees or discount claims can enter through free-form model prose. This is deliberately conservative AI curation rather than unconstrained copywriting. Imported descriptions are merchant-provided, not independently certified facts. The user can edit all fields afterward, with an explicit review notice.

`openai-transport.ts` is the common server-only credential/Responses/JSON-envelope boundary; recommendation and listing adapters supply their schemas and task instructions. It bounds response bytes to 64 KB, handles refusal/incomplete output and sanitized authentication/quota/rate/network errors, and never logs raw prompts/keys/provider bodies. Listing requests use a 20 KB streamed body bound and the existing 3-second read timeout; the provider uses 900 output tokens and a 20-second timeout. Same-origin, six-per-IP/minute, two concurrent AI calls and thirty-per-instance/hour limits are shared across both generation routes. No automatic retry or background/tone-triggered call occurs. AI errors never substitute Demo; Demo plans compile through the same fact boundary and are clearly labeled simulated.

Copy schema: title max 120, short description 400, detailed description 6500, exactly three selling points up to 1200 each, promotional copy 350. Editing permits empty fields temporarily; generation and export require complete nonblank fields. Text renders as React text, not HTML. Financial data is outside these editable fields and never updated from model output.

`bundlelab:listings:v1` is a strict `{version:1,documents:[...]}` envelope (50 UUID-keyed documents, 2 MB guard). Each stores copy, bundle context fingerprint, original source, merchant-edit flag, applied/requested tone and timestamp. Input edits write immediately while failed writes retain current in-memory copy with a warning. A raw-envelope comparison rejects stale-tab writes; invalid storage is not overwritten. An explicit confirmed reset retains current on-screen copy while removing other saved copies. No silent eviction occurs when full.

Context fingerprint includes bundle inputs plus selected catalog facts/quantities and recalculated sale price. Changed context never silently replaces prior copy: show a review warning and disable copy/export until acknowledged or regenerated. The latest active named bundle is checked again before generation/export, preventing a stale selected bundle from being presented as current. Tone controls preserve old text until explicit confirmed generation. Errors and cancellation preserve all previous copy. Per-bundle restoration supports navigation/reloads.

The live preview uses existing local ProductArt assets, product-specific thumbnails, all text fields and exact price. It has no fake reviews, cart/checkout or shipping guarantees. Clipboard reports success only after the browser resolves the write, with a clear denied/unavailable state. JSON is generated as a client Blob from current validated copy/context and includes product IDs/names/quantities/unit retail, exact price/currency and draft-review metadata; costs/profit/secrets are excluded. These exports are not Shopify publishing.

## Validation and deployment

Vitest tests catalog validation/search, item margin, CSV ingestion, and storage codecs; Playwright exercises a production server in desktop and mobile Chromium. AI route tests mock the external Fetch transport and never require paid calls. Playwright forces Demo Mode for deterministic browser coverage. Deploy using Vercel's standard Next.js preset, Node 24, npm install/build, and optional server environment variables. No filesystem writes or persistent server process assumptions. No custom Vercel config is currently necessary.

The npm dev/build scripts explicitly use Next.js Webpack and Tailwind PostCSS for portability; see decision 009.

## Pre-launch QA

See QA.md for executed checks and limitations. CI explicitly selects Demo Mode with an empty API key, runs formatting/lint/typecheck/unit/build and the complete desktop/mobile Chromium suite, limits CI browser concurrency to two workers and retains traces/screenshots/HTML reports on failure for seven days. Local browser tests start a separate production server on port 3100 and use isolated browser contexts. No production browser storage is touched.
