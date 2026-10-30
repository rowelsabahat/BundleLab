# BundleLab

A portfolio concept for a Shopify Associate Product Manager application: AI-assisted product bundling for small skincare and wellness merchants. Independent project; no Shopify affiliation.

## Current status

First functional milestone implemented:

- Shared responsive merchant shell with Overview, Catalog, and clearly labeled planned destinations for Bundle Generator, Bundle Editor, and Listing Studio.
- Overview counts products, categories, and inventory from the active catalog; category mix and quick actions contain no sales or usage metrics.
- Catalog contains 24 validated fictional skincare/wellness products, original CSS product artwork, search, category filters, sorting, grid/list layouts, and accessible product-detail dialogs.
- Unit price, cost, stock, tags, USD currency, and deterministic estimated gross margin are available for each product. Zero prices show undefined margin; negative margins remain visible.
- CSV import validates every row before saving, rejects duplicate IDs, and appends valid new products. Imports persist in versioned localStorage and can be cleared with confirmation. Failed reads/writes are disclosed.
- No AI integration, simulated AI, bundle creation, saved bundles, or listing generation exists. Future destinations are informational pages, not working tools. No customer research, usage metrics, or business outcomes are claimed.

## Local setup

Requires Node 24.x and npm (see `.nvmrc`).

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The API key may remain empty; no feature currently uses it. Never use a `NEXT_PUBLIC_` prefix for `OPENAI_API_KEY` or commit `.env.local`.

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

Import `rowelsabahat/BundleLab` into Vercel, use the Next.js preset and Node 24, keep the repository root as the project root, and use `npm run build`. No database or secret is required for this foundation. Add `OPENAI_API_KEY` as a server-only Vercel environment variable when AI routes are implemented later. No deployment is created by this setup step.

## CSV import contract

Download the sample inside **Import products** on the Overview or Catalog screen. Headers (order may vary):

```csv
id,name,category,description,retail_price,cost,stock,tags,currency
MY-001,Meadow Balm,skincare,A soft shea balm.,18.00,5.50,40,shea|hands,USD
```

Use unique case-sensitive IDs containing letters, numbers, hyphens or underscores. Categories are `skincare` or `wellness`; currency is `USD`. Prices/costs are nonnegative dollar amounts with at most two decimal places, converted to integer cents without floating-point multiplication. Stock is a nonnegative integer; tags are separated with `|`. All fields are required. Artwork is a deterministic local fallback and is not imported. Quoted commas, escaped quotes, multiline fields, UTF-8 BOM, and CRLF are supported.

Limits: 1 MB per file, 500 imported products total, $1,000,000 per price/cost field, 1,000,000 units per stock field. Any row error rejects the entire file; row numbers count CSV records (a quoted multiline field is one record). Imports append only, never replace existing products. Keep your source CSV: browser data is local, not a backup. Clearing imports affects all local additions, not the 24 seed products. Other open tabs refresh their catalog on reload.

## Verification and manual review

`npm run check` verifies lint, generated route types/strict TypeScript, unit tests, and production build. `npm run test:e2e` checks desktop and mobile Chromium against a production server. Paid services are not called. Inspect the Overview and Catalog at desktop and 375px widths; search/filter, switch views, open/close details using the keyboard, download/import a sample, reload, and clear imports. Test invalid files and inspect the row errors. This is not a completed WCAG audit.

## Next step

Build the manual bundle editor with 2–5 selected products and tested deterministic bundle-level totals, discount rounding, and inventory validation. Add saved bundles next; integrate AI only after that workflow works without an API key.

The npm dev/build scripts explicitly use Next.js Webpack and Tailwind PostCSS for portability; see decision 009. No deployment is created by this implementation step.
