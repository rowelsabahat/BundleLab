# BundleLab

A portfolio concept for a Shopify Associate Product Manager application: AI-assisted product bundling for small skincare and wellness merchants. Independent project; no Shopify affiliation.

## Current status

Catalog and bundle recommendation milestones implemented:

- Responsive Overview, Catalog, Bundle Generator, and a full Bundle Editor with a named bundle library. Listing Studio completes the workflow with grounded copy composition, inline editing, a live storefront preview, clipboard copy and JSON export.
- 24 validated fictional products, original local artwork, search, filters, sorting, details, and validated browser-local CSV import.
- Explicit environment-selected Demo Mode (simulated, deterministic) or AI Mode (real server-side OpenAI Responses call). Never an automatic fallback.
- Up to three distinct product sets with canonical product names and independently calculated retail total, discount, bundle price, cost, gross profit, and margin. Exact price/margin/category constraints are enforced server-side.
- Browser-local recommendation handoff with rationale/targets, searchable product drawer, instant quantity/pricing updates, direct sale-price editing, working-draft autosave, and up to 50 named bundles with reopen/rename/duplicate/delete. Totals are recalculated on restore; warnings distinguish target misses from invalid inputs.
- No Shopify connection, authentication, payments, database, checkout, or automatic publishing. No research, usage, conversion, or revenue claims.

## Local setup

Requires Node 24.x and npm (see `.nvmrc`).

```bash
npm ci
test -f .env.local || cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The default Demo Mode needs no API key. To use AI, follow the explicit mode setup below. Never use a `NEXT_PUBLIC_` prefix for `OPENAI_API_KEY` or commit `.env.local`.

## Commands

```bash
npm run lint
npm run typecheck
npm test
npm run test:watch
npx playwright install chromium
npm run test:e2e
npm run build
npm start
npm run format:check
npm run format
npm run check
```

`check` runs lint, typecheck, unit tests, and build. Browser tests run separately and start their own production server on isolated port 3100, leaving your development app on port 3000 alone. CI installs Chromium with OS dependencies. Typecheck generates Next route types so it also works before a first build.

## Structure and documentation

- `src/app/`: routed workspace pages, shared layout, metadata, loading/error boundaries, and theme.
- `src/components/`: shell, catalog state, dashboard, catalog UI, and Radix-backed UI primitives.
- `src/lib/`: reusable Zod schemas, search, item-margin calculation, CSV parsing, and storage codecs.
- `src/data/products.json`: the 24-product fictional seed catalog.
- `tests/e2e/`: desktop/mobile workflow, import/persistence, corruption recovery, and blocked-storage checks.
- `AGENTS.md`: persistent engineering instructions.
- `docs/PRD.md`: product hypothesis, journeys, scope, acceptance criteria.
- `docs/ARCHITECTURE.md`: proposed schemas, state, API, money and AI boundaries.
- `docs/DESIGN.md`: visual and interaction system.
- `docs/DECISIONS.md`: product and engineering tradeoffs.
- `docs/QA.md`: pre-launch audit, executed results, limitations and reproducible manual checks.

## Deployment

Import `rowelsabahat/BundleLab` into Vercel, use the Next.js preset and Node 24, keep the repository root as the project root, and use `npm run build`. No database or secret is required for Demo Mode. Add `OPENAI_API_KEY` as a server-only Vercel environment variable to enable AI Mode, along with BUNDLELAB_MODE=ai. No deployment is created by this setup step.

## CSV import contract

Download the sample inside **Import products** on the Overview or Catalog screen. Headers (order may vary):

```csv
id,name,category,description,retail_price,cost,stock,tags,currency
MY-001,Meadow Balm,skincare,A soft shea balm.,18.00,5.50,40,shea|hands,USD
```

Use unique case-sensitive IDs containing letters, numbers, hyphens or underscores. Categories are `skincare` or `wellness`; currency is `USD`. Prices/costs are nonnegative dollar amounts with at most two decimal places, converted to integer cents without floating-point multiplication. Stock is a nonnegative integer; tags are separated with `|`. All fields are required. Artwork is a deterministic local fallback and is not imported. Quoted commas, escaped quotes, multiline fields, UTF-8 BOM, and CRLF are supported.

Limits: 1 MB per file, 500 imported products total, $1,000,000 per price/cost field, 1,000,000 units per stock field. Any row error rejects the entire file; row numbers count CSV records (a quoted multiline field is one record). Imports append only, never replace existing products. Keep your source CSV: browser data is local, not a backup. Clearing imports affects all local additions, not the 24 seed products. Other open tabs refresh their catalog on reload.

## Verification and manual review

`npm run check` verifies lint, generated route types/strict TypeScript, unit tests, and production build. `npm run test:e2e` checks desktop and mobile Chromium against a production server. Paid services are not called: Vitest mocks the OpenAI transport and Playwright forces Demo Mode. Inspect the Overview and Catalog at desktop and 375px widths; search/filter, switch views, open/close details using the keyboard, download/import a sample, reload, and clear imports. Test invalid files and inspect the row errors. This is not a completed WCAG audit.

## Recommendation modes and manual AI verification

Set these **server-only** variables in `.env.local` (or Vercel environment settings). Restart the app after changing them:

```dotenv
BUNDLELAB_MODE=ai
OPENAI_API_KEY=your-own-api-key
OPENAI_MODEL=gpt-4.1-mini
```

`BUNDLELAB_MODE=demo` (the default if omitted) runs a deterministic, simulated search and makes no OpenAI calls. Setting a key alone does not enable AI. `ai` uses the real OpenAI Responses endpoint with strict JSON Schema output and a 20-second provider timeout. Missing keys, invalid modes, refusal, provider errors, invalid content, and empty/invalid model suggestions remain explicit; AI never falls back to Demo. `OPENAI_MODEL` is optional and must name a model available to your account that supports Responses structured output. Automated tests mock the provider; no paid live call was used to verify this milestone.

Open `/bundle-generator`, confirm **AI Mode · OpenAI**, and submit:

> Create a skincare starter kit under $80 with at least a 35% gross margin.

The effective price is at most $79.99 (`under` is strict). Review each card's canonical products and calculated figures, then customize a result and reload `/bundle-editor` to verify persistence. A real account/API allowance is required. Try a $0.01 cap to see proven infeasibility without a paid call. If the model yields no valid set even though feasible sets exist, the UI says so rather than claiming no combination exists.

### Constraint and trust boundaries

Recommendations use one unit each of 2–5 distinct, in-stock products from the **24 server-owned sample products**. Browser-imported products are available in the local manual editor but excluded from server-side AI/Demo recommendations. Discounts are integer basis points from 0–5000 (0–50%); proposed discounts from AI are always validated. Financial figures are TypeScript calculations, never model source data. The exact minimum margin is tested before rounding; zero-revenue bundles are excluded. An omitted minimum margin means nonnegative gross profit.

The parser recognizes `under/below/less than`, `up to/at most`, `maximum price`, and `budget of` for prices, and `at least 35% gross margin` or `minimum gross margin of 35%` for margins. Unsupported numeric phrasing asks for clarification; it is not silently ignored. Prompt and control values combine using the stricter limit. A single skincare/wellness category in the prompt is enforced; conflicting controls are rejected. Theme is an advisory preference, not a hard promise of semantic matching. Demo rankings use catalog keyword overlap, tag diversity, and stable ID tie-breaking; they do not simulate model reasoning.

### API limits

`POST /api/recommendations` accepts strict JSON only: a 10–500 character prompt, optional bounded price/margin values, category, and a theme up to 100 characters. Request bodies are limited to 8 KB with a 3-second read timeout. The provider response is limited to 64 KB and 1800 output tokens; no automatic retries. Same-origin browser requests only. Per instance: six requests per IP per minute, two simultaneous AI calls, and thirty AI calls per hour. Invalid attempts count against the request limit.

These memory-only limits reset on restart/cold start and do not coordinate across Vercel instances. They are suitable for a bounded portfolio demo, not a global spending guarantee; use provider project budgets and hosting-level rate rules before exposing paid AI to a broad audience. No API key, raw upstream error, full prompt, or provider response is logged or returned in errors.

## Full Bundle Editor

Open `/bundle-editor` directly to create a manual bundle, reopen a named bundle, or use **Customize this bundle** on a recommendation. AI and Demo handoffs preserve IDs, quantities, title, proposed discount, original constraints, source mode, and advisory rationale. Existing recommendation handoffs migrate without discarding named bundles. The drawer browses the current sample and imported catalog with search and category filtering. A working draft may have zero to five products; saving requires 2–5 distinct products, a nonblank name, and positive integer quantities (1–99) within stock.

### Price and discount behavior

The last pricing field edited controls the calculation:

- Editing discount holds that percentage (0–50%, at most two decimal places) as products/quantities change. Round the discount half up once at the combined bundle level, to integer cents.
- Editing final price holds that exact nonnegative USD cent amount as products/quantities change. The displayed effective discount is derived from the difference from retail, never used to reconstruct the entered price.
- Direct prices must lie between the cent-rounded 50% sale-price boundary (`floor(retailCents / 2)`) and combined retail to save. Product removal/addition can move a held price outside this range: show the actual figures and a correction warning, and disable saving until fixed. Do not silently clamp the price.
- For odd-cent retail amounts, the 50% discount can differ from its effective percentage by cent rounding. The UI explains this. Zero retail has undefined discount; zero sale price has undefined gross margin. Negative gross profit is shown truthfully.
- Invalid/partial numeric input stays in the field while financial totals are hidden and saving is disabled. Only valid numeric values enter the working model.

Product cost and retail totals multiply unit values by each quantity. Gross profit is sale price minus product cost; exact target-margin comparisons use integer cross multiplication before display rounding. Original price-cap, margin, category, and loss warnings are separate. A valid bundle may be saved with target warnings; it is never labeled as meeting failed constraints. Estimates exclude taxes, shipping, transaction fees, and other operating costs.

### Persistence and handoff

`bundlelab:saved-bundles:v1` stores one strict versioned envelope containing up to 50 named bundles, the active working draft, and a consumed-recommendation timestamp. Edits autosave the working draft; **Save bundle / Save changes** explicitly updates the named library. Library records preserve pricing mode, direct price or discount input, IDs/quantities, original targets, rationale, source and timestamps—never derived totals. Renaming, duplication, deletion, and active updates use one atomic storage write. Replacing unsaved edits and deleting a named bundle require confirmation.

Legacy `bundlelab:chosen-bundle:v1` is still the Generator’s handoff channel. It is consumed once per selection; deleting an active named bundle does not resurrect that recommendation on reload. **Proceed to Listing Studio** saves the named bundle before navigation; the Studio restores this selection and recalculates its exact price before generating or exporting copy. If storage fails, no successful save/handoff is claimed. Reads reject corrupt/unknown schemas without overwriting data. Stale-tab writes are refused; reload to pick up other-tab changes. Missing imported products retain their IDs and are repairable rather than replaced with invented prices.

Browser storage is local, not cross-device sync or a backup. A corrupted library has an explicit destructive reset; this clears bundles/working draft, not catalog imports. While a numeric input is incomplete, that raw text is tab-local; the last valid working model is what can restore after reload.

## Manual verification: editor milestone

1. Start `npm run dev` and open `/bundle-editor`. Use **New bundle / Create a bundle**; search the drawer for `BL-001` and `BL-004` and add both. Close the drawer and name the bundle.
2. At quantity one each, check combined retail **$66.00** and cost **$22.00**. At **10%** discount, sale price is **$59.40**, gross profit **$37.40**, and displayed gross margin **63.0%**.
3. Enter a direct final price of **$60.01**. Add Everyday Barrier Cream using the drawer: the price stays **$60.01** and effective discount changes. Enter **10%** again: the sale price becomes **$93.60**. Remove the cream: price returns to **$59.40**.
4. Try a negative price, 51% discount, and invalid quantity; check that errors are visible and Save is disabled. Remove all products: zero totals and undefined margin/discount appear, with a helpful empty state.
5. Save a valid pair. Duplicate it, rename the copy, reopen it, and reload. Both named bundles should remain independent. Delete one with confirmation and verify the other remains.
6. Open a recommendation with its original targets. Raise price above the cap or lower margin below target and inspect distinct warnings. **Proceed to Listing Studio** should save and show the same products and pricing, then let you generate/edit copy.
7. Repeat at 375px width and using keyboard only. The drawer supports Escape, traps focus and returns focus to its opener. Test import-backed products, browser-storage denial, and an unavailable imported product if desired.

## Listing Studio

The selected, named saved bundle is loaded from the editor; an unsaved working draft must be saved first. Product IDs, quantities, catalog facts, and TypeScript pricing remain separate from editable marketing text. The Studio includes product title, short description, detailed description, exactly three selling points, and short promotional copy. Every field edits inline and updates the storefront preview immediately. Product thumbnails switch the preview artwork and the detailed-description section expands/collapses. The preview is explicitly not a live shop: no cart, checkout, fabricated reviews, shipping promises, or publishing actions.

### Grounded AI and Demo behavior

Professional, Playful, and Minimal control the composition style. Changing tone does not make an API call or rewrite existing edits. Generate explicitly; regeneration asks before replacing all fields, and failure/cancellation leaves existing copy in place. Demo produces a clearly labeled deterministic template. AI Mode makes a real OpenAI call through `POST /api/listings`; it never substitutes Demo output on failure.

To prevent unsupported claims rather than merely prompt against them, AI returns a **composition plan**: approved style choices and references to selected catalog facts. The server compiles the plan into editable fields using exact descriptions, canonical names, quantities, and a small approved tone-specific vocabulary. AI chooses emphasis/order/style; it does not free-write unverified benefits. This intentionally limits creative phrasing. All selected products must be covered, selling-point facts must be distinct, and unsupported references, fields, or omissions are rejected. No prices, costs, discounts, certifications or guarantees can be invented as new model-supplied facts. Imported descriptions remain merchant-provided source data, not independently verified truth.

Listing generation accepts only the selected imported records (up to five), validates them with the existing Product schema, and never lets them override canonical seed IDs. This enables manual imported bundles to finish the workflow while server recommendations remain seed-only. The server recomputes final price and checks it against the expected approved price. Product facts/quantities and tone are supplied to the model; financial figures and the API key are not part of its input.

The shared server-only Responses transport handles strict JSON output, refusal/incomplete responses, timeouts, credentials, temporary rate limits, and exhausted credits/quota. Listing output is bounded to 900 tokens and 64 KB; requests to 20 KB and a 3-second body read, with the existing 20-second provider timeout. The per-IP request, concurrency and hourly AI allowances are shared with recommendations. There are no automatic retries or background generation calls. Automated AI tests mock the transport; no paid call was required for this milestone.

### Copy persistence and exports

`bundlelab:listings:v1` stores up to 50 versioned copy documents (2 MB guard), keyed by bundle UUID, independently of the bundle library. Each tracks source mode, applied/requested tone, merchant-edit flag, updated timestamp and a fingerprint of bundle inputs/catalog facts. Edits autosave; storage failures keep them in this tab with an explicit warning and export available. Corrupt records are not silently overwritten. A confirmed reset clears other saved listing drafts while retaining the current on-screen copy. A full store rejects the write rather than evicting old edits.

Reopening a bundle restores its copy. If its products, quantities, pricing or catalog facts have changed, previous copy remains visible and copy/export is blocked until you explicitly review it for the updated bundle or regenerate. Changing the selection in another tab is also checked before generation/export. Stale-tab listing writes are refused. Merchant-edited copy is not automatically fact-checked, so review all edits before use.

**Copy formatted text** writes the visible listing, deterministic price and included products, reporting success only after the clipboard write completes. A denied/unavailable clipboard shows an error and JSON remains available. **Export JSON** downloads a standalone document containing all fields, product IDs/names/quantities/unit retail, exact final price/currency, source/tone, and review metadata; it excludes internal costs, API keys and profit estimates. All required fields must be nonblank. Exports are draft artifacts, not published listings.

## Demo the complete workflow

1. Set `BUNDLELAB_MODE=demo` in `.env.local` and run/restart `npm run dev`. No API credits or key are required. Confirm the visible **Demo Mode · Simulated** labels.
2. **Catalog:** search or filter the 24 fictional products; inspect a product’s retail, cost and estimated margin.
3. **Bundle Generator:** submit “Create a skincare starter kit under $80 with at least a 35% gross margin.” Inspect the simulated pairings and calculated figures, then **Customize this bundle**.
4. **Bundle Editor:** change products or quantities, try discount/direct-price editing, name and save the bundle, then **Proceed to Listing Studio**.
5. **Listing Studio:** choose Professional, Playful or Minimal and **Generate demo copy**. Compare the read-only lineup/price to the editor. Edit every field and see the preview update. Switch product thumbnails and expand/collapse the detailed copy.
6. Switch tone: existing copy stays. Regenerate, first choose **Keep my edits**, then try confirmed replacement. Reload to verify persistence.
7. **Copy formatted text**, paste into a text editor, and **Export JSON** to inspect the downloaded exact-cent price and products. Return to Editor, change/save the price, and confirm the Studio preserves old copy but asks you to review or regenerate it.

For real AI, explicitly set `BUNDLELAB_MODE=ai` plus a funded API key and restart. Confirm **AI Mode · OpenAI** in both Generator and Studio. No mode switches silently. Future work: richer vetted editorial styles, broader source verification and stronger deployment-wide abuse controls. Shopify integration and automatic publishing remain outside this MVP.

The npm dev/build scripts explicitly use Next.js Webpack and Tailwind PostCSS for portability; see decision 009. No deployment is created by this implementation step.

## Pre-launch QA milestone

The QA pass adds regression coverage for stale-tab imports, active incomplete inputs during unrelated deletion, response constraint verification, exact JSON media types, timeout classification, keyboard focus and selected essential text contrast. Catalog imports/clears now refuse stale-tab overwrites; reload before continuing in that tab. No live cross-tab merge or synchronization is implied.

GitHub Actions uses Node 24, npm ci, formatting, lint, typecheck, unit tests, production build and the full desktop/mobile Chromium suite. It explicitly selects Demo Mode with no API key, installs Chromium system dependencies and retains browser failure diagnostics for seven days. See [docs/QA.md](docs/QA.md) for actual local results and checks still requiring manual verification. No remote CI or deployment success is implied by local checks.
