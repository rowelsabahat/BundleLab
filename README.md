# BundleLab

A portfolio concept for a Shopify Associate Product Manager application: AI-assisted product bundling for small skincare and wellness merchants. Independent project; no Shopify affiliation.

## Current status

Catalog and bundle recommendation milestones implemented:

- Responsive Overview, Catalog, Bundle Generator, and a working chosen-bundle editor. Listing Studio remains a clearly labeled planned destination.
- 24 validated fictional products, original local artwork, search, filters, sorting, details, and validated browser-local CSV import.
- Explicit environment-selected Demo Mode (simulated, deterministic) or AI Mode (real server-side OpenAI Responses call). Never an automatic fallback.
- Up to three distinct product sets with canonical product names and independently calculated retail total, discount, bundle price, cost, gross profit, and margin. Exact price/margin/category constraints are enforced server-side.
- Browser-local chosen draft handoff; edit products, quantities, title, and discount and save one active draft. Totals are recalculated on restore. Edited drafts may exceed original constraints, with a clear warning.
- No Shopify connection, authentication, payments, database, saved-bundle library, or listing generation. No research, usage, conversion, or revenue claims.

## Local setup

Requires Node 24.x and npm (see `.nvmrc`).

```bash
npm ci
cp .env.example .env.local
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

`check` runs lint, typecheck, unit tests, and build. Browser tests run separately and start their own production server on port 3000; stop other servers on that port first. CI installs Chromium with OS dependencies. Typecheck generates Next route types so it also works before a first build.

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
- `docs/DECISIONS.md`: initial tradeoffs.

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

Recommendations use one unit each of 2–5 distinct, in-stock products from the **24 server-owned sample products**. Browser-imported products remain catalog-only in this milestone. Discounts are integer basis points from 0–5000 (0–50%); proposed discounts from AI are always validated. Financial figures are TypeScript calculations, never model source data. The exact minimum margin is tested before rounding; zero-revenue bundles are excluded. An omitted minimum margin means nonnegative gross profit.

The parser recognizes `under/below/less than`, `up to/at most`, `maximum price`, and `budget of` for prices, and `at least 35% gross margin` or `minimum gross margin of 35%` for margins. Unsupported numeric phrasing asks for clarification; it is not silently ignored. Prompt and control values combine using the stricter limit. A single skincare/wellness category in the prompt is enforced; conflicting controls are rejected. Theme is an advisory preference, not a hard promise of semantic matching. Demo rankings use catalog keyword overlap, tag diversity, and stable ID tie-breaking; they do not simulate model reasoning.

### API limits

`POST /api/recommendations` accepts strict JSON only: a 10–500 character prompt, optional bounded price/margin values, category, and a theme up to 100 characters. Request bodies are limited to 8 KB with a 3-second read timeout. The provider response is limited to 64 KB and 1800 output tokens; no automatic retries. Same-origin browser requests only. Per instance: six requests per IP per minute, two simultaneous AI calls, and thirty AI calls per hour. Invalid attempts count against the request limit.

These memory-only limits reset on restart/cold start and do not coordinate across Vercel instances. They are suitable for a bounded portfolio demo, not a global spending guarantee; use provider project budgets and hosting-level rate rules before exposing paid AI to a broad audience. No API key, raw upstream error, full prompt, or provider response is logged or returned in errors.

The active editor draft is versioned under `bundlelab:chosen-bundle:v1`; it stores only IDs, quantities, discount, title, source mode, original constraints, and timestamp. A new chosen recommendation replaces the active draft. No authoritative totals are persisted. Browser storage errors prevent a false successful handoff.

## Next step

Add a saved-bundle library and Listing Studio. Extend recommendations to imported catalogs only after defining a server-side source of truth. Broader natural-language constraint parsing and distributed abuse controls remain future work.

The npm dev/build scripts explicitly use Next.js Webpack and Tailwind PostCSS for portability; see decision 009. No deployment is created by this implementation step.
