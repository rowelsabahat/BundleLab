# BundleLab pre-launch QA

Audit date: 2026-10-30. Scope: the implemented Catalog → Generator → Editor → Listing Studio portfolio MVP. This is a local release check, not a production certification or completed WCAG audit.

## Environment and isolation

- macOS, Node 24, npm, production Next.js Webpack build.
- Desktop Chromium and mobile Chromium emulation at 375 × 812. Browser tests start a dedicated production server at http://127.0.0.1:3100 with `BUNDLELAB_MODE=demo` and an empty `OPENAI_API_KEY`.
- Each browser test gets an isolated context. Multi-tab regressions share only their own test context. Storage-failure/corruption fixtures affect test data only. The user's development browser, local data and `.env.local` were not modified.
- Local configuration was inspected without printing credentials: Demo Mode is selected and a server key is present. No live paid OpenAI request was made during this audit. AI behavior below was verified using mocked native Fetch responses.

## Defects fixed

1. Deleting an unrelated saved bundle cleared incomplete active price/discount/quantity inputs, potentially making the old valid model appear current again. Clear raw inputs only when the active bundle itself is deleted. A browser regression verifies an empty price remains empty and saving stays disabled.
2. Catalog imports could overwrite newer imports from another tab; clearing could remove unseen updates. Compare the last-read raw envelope before writes/clears, refuse stale operations and request reload. Unit and two-tab browser regressions verify newer imports survive.
3. The Generator recomputed returned totals but could display its constraint-pass label for a schema-valid response with altered constraints or invalid selections. Independently verify submitted constraints, status/count consistency, distinct one-unit sets, canonical IDs/stock/category and exact cap/margin. Ignore supplied totals. Unit and browser regressions reject tampered successful responses.
4. The recommendation route accepted media types beginning with `application/json`, including `application/jsonp`. Require the exact media type while allowing charset parameters, consistent with Listing Studio. Route regression covers both cases.
5. An abort while reading a provider error body could be swallowed and classified as an HTTP rate-limit failure. Check cancellation before HTTP classification; return the existing timeout/cancellation error. A mocked stream regression covers this, plus oversized provider-body cancellation.
6. Several essential supporting labels had insufficient contrast: catalog result counts measured about 2.98:1, unit costs 3.19:1, margin captions 3.16:1 and descriptions 4.06:1. Use the darker semantic muted foreground for supporting catalog, constraint, editor and listing text. Targeted browser checks now require at least 4.5:1 against the rendered opaque surface in both layouts.

Documentation also removes stale “listing generation planned” text and clarifies imported-product and proposed-discount acceptance criteria.

## Executed checks and results

Final local verification:

- `npm run lint`: passed, zero warnings.
- `npm run typecheck`: passed, including Next route type generation and strict TypeScript.
- `npm test`: passed, 123 tests across 10 files.
- `npm run build`: passed, all workspace pages and both server routes built.
- `npm run format:check`: passed.
- `npm run test:e2e`: passed, 40 tests (20 scenarios in each of desktop and mobile Chromium), against a real production server. No skipped browser tests or paid API calls.
- `git diff --check`: passed.
- Credential review: `.env.local` is ignored; no local-secret environment files are tracked. Filename-only Git history inspection found only `.env.example` under `.env*`. A read-only scan of 85 tracked files and 33 built client assets found neither the configured key nor a key-shaped credential. No key values were printed. Server-only modules hold credential access; no `NEXT_PUBLIC_` credential or raw provider-error logging was found. This is a scoped scan, not a full historical secret-scanner certification.

Initial runs were not all green: lint caught an obsolete suppression after refactoring, two new response tests matched Next's route announcer as well as the app alert, and contrast tests reproduced the faint text above. The suppression and selector were corrected; text was darkened and the targeted contrast tests rerun successfully before the final full suite. Earlier failures are not counted as passes.

## Coverage actually exercised

- Catalog: 24 canonical products; overview/navigation; case-insensitive search, category filters, empty state, grid/list, product details with known $24.00 retail / $8.20 cost / 65.8% displayed margin; Escape dismissal and restored focus.
- CSV: malformed/negative rows rejected atomically; valid import, duplicate-ID rejection, reload persistence, confirmed clear, corrupt-storage recovery, blocked writes and stale-tab preservation. Unit tests also cover quotes, BOM/CRLF, multiline records, numeric/schema bounds and cumulative limits.
- Generation: real Demo route with three distinct valid results, explicit simulated labels, cap/margin/category checks and infeasible state; error injection without results substituted; tampered successful response rejected. Unit/API tests mock real AI success, malformed/unsupported/duplicate IDs, injected financial fields, exact-margin failures, refusal/incomplete responses, upstream failures, missing key and timeout.
- Pricing: integer-cent rounding, direct $60.01 preservation, discount changes, adding/removing products, quantities, zero revenue/retail, empty bundles, stock validation, invalid input suppression and original target warnings.
- Library: named save, reload, reopen, rename, independent duplication, confirmed deletion, unsaved replacement protection, blocked/corrupt storage and stale-envelope unit coverage.
- Listing: complete handoff, deterministic copy, all editable fields, live preview/thumbnails/expanded detail, explicit tone changes and regeneration confirmation, preserved edits on errors, refresh persistence, changed-bundle review before export, actual clipboard write/read, downloaded JSON inspection, denied clipboard and storage failures. Unit/API tests cover grounded facts, full product coverage, imported records/seed-override rejection, approved-price mismatch and source-data boundaries.
- Accessibility/responsiveness: real keyboard traversal into catalog details, dialog focus containment/Escape/restoration; labeled semantic controls used throughout browser tests; desktop/mobile screenshots and page-overflow assertions. Selected essential supporting text contrast is measured across Catalog, Generator, Editor and Studio. This is targeted coverage, not every color, state, zoom level or assistive technology.
- API protection: exact JSON media type, same-origin rejection, streamed body bounds/read deadline, invalid numeric grammar, per-key limiter expiry/key count, route-level seventh-request 429 plus Retry-After/no-store, provider byte limits and sanitized errors. Concurrency/hourly limits remain best-effort per server instance.

## CI configuration

`.github/workflows/ci.yml` uses Node 24, `npm ci`, formatting, `npm run check` (lint/typecheck/unit/build), Chromium installation with OS dependencies, and the full Playwright suite. Demo Mode and an empty key are explicit. Playwright limits CI workers to two, forbids focused tests, retries failures twice and produces a GitHub reporter plus HTML report. The job has a 20-minute timeout and uploads traces/screenshots/reports on failure for seven days.

The GitHub-hosted workflow itself was not dispatched or observed in this local audit. Local checks validate the application and test commands, not remote CI service availability or a deployed Vercel environment.

## Reproduce automated checks

With Node 24 and the repository dependencies installed:

```bash
npm ci
npx playwright install chromium
npm run format:check
npm run check
npm run test:e2e
```

On Linux/CI use `npx playwright install --with-deps chromium`. Browser tests always build/start their own Demo server; do not run two production builds or two browser suites concurrently in this checkout. A local development server on port 3000 may remain open. Playwright screenshots/traces and downloads live under ignored test-results; CI reports are also ignored. Do not commit secrets or test artifacts.

## Reproducible manual checklist

Use a separate browser profile/private window for destructive recovery tests. Keep source CSV/export copies; do not clear your real working data just to run this checklist.

1. Start `npm run dev`; open http://localhost:3000. Confirm product catalog/USD labels, 24 sample products and working links to every tool. Repeat at 375px width; check scrolling and reachable actions.
2. In Catalog, search `BL-001`, filter Wellness then reset, sort by price/name and switch list/grid. Open Dewdrop Gel Cleanser: $24.00 retail, $8.20 unit cost, 65.8% estimated margin. Use Tab/Shift+Tab inside the dialog, Escape, and verify focus returns to the product.
3. Download the CSV template and import it in the disposable profile. Expect two imports after reload. Try a duplicate ID, negative price, fractional stock and missing column: row errors and no partial additions. Open a second tab, import another unique product there, then attempt an import in the stale first tab: expect a reload warning and retain the second tab's data.
4. Confirm **Demo Mode · Simulated** in Generator. Submit “Create a skincare starter kit under $80 with at least a 35% gross margin.” Results must have canonical products, sale price no more than $79.99 and margin at least 35%. A $0.01 maximum must give truthful infeasibility. Change controls: previous results should clear.
5. Customize a result and confirm lineup, quantities, source, rationale and original guardrails. Change discount to 0%, 10%, 50%; try 51% and a negative/empty price. Invalid fields must hide stale totals and disable saving. Change products/quantities; target misses must remain visible.
6. For a known calculation, start a manual bundle with `BL-001` and `BL-004`, one unit each. Retail $66.00, cost $22.00; at 10%: sale $59.40, profit $37.40, displayed margin 63.0%. Enter $60.01 directly; add a product and verify that exact price is held. Re-enter discount to switch pricing mode. Remove products and verify recalculation/empty states.
7. Name/save, duplicate, rename, reopen and reload. Delete only the duplicate with confirmation; keep the original. Empty the active price then delete an unrelated saved bundle: the empty input must stay empty. In another tab edit the library; stale writes in the original tab must fail rather than overwrite it.
8. Proceed to Listing Studio. Check exact lineup/price against Editor. Choose a tone, generate simulated copy, edit every field and watch the preview. Switch thumbnail and collapse/expand About. Change tone: no automatic request or replacement. Regenerate, first keep edits, then confirm replacement. Reload and verify retained copy/tone.
9. Copy formatted text and paste into a text editor. Export JSON: exact cent price/product IDs/quantities and visible edited text, no unit costs/profits/secrets. Empty a required field: exports disabled. Change/save the bundle in Editor and return: old copy remains, export requires explicit review or regeneration.
10. In a disposable profile, deny clipboard and browser storage or use the automated failure tests. Errors must explain whether edits remain only in the tab; no false saved/copied success. Corrupt-data reset must require confirmation and must not affect unrelated catalog/bundle data.
11. Optional paid AI check: set `BUNDLELAB_MODE=ai` and a funded server-only `OPENAI_API_KEY` in local environment settings, restart, and confirm **AI Mode · OpenAI** in both tools. Use the sample prompt, customize/save, and generate listing copy. Inspect the network response for AI mode and canonical products, correct recalculated figures and grounded copy. An exhausted allowance or invalid key must show an explicit error and never Demo results. Restore your preferred environment afterward; never share the key or commit local environment files.
12. Before public release, run the same workflow on the deployed URL. Inspect browser console/network errors, mobile Safari/Firefox, keyboard focus, 200% zoom and a screen reader. Review all AI rationales and merchant-edited claims before presenting/publishing them.

## Remaining limitations and unresolved verification

- No known failing functional path remains in the executed suite. This does not establish absence of defects outside its coverage.
- Live OpenAI generation/account allowance was not exercised in this audit because the selected local mode is Demo; mocked AI tests do not establish model quality, account access or production latency. Advisory recommendation prose still needs merchant review; listing AI is deliberately constrained to fact curation.
- Remote GitHub Actions, Vercel deployment, Safari/Firefox, real touch hardware, full WCAG/contrast coverage, screen readers and load testing remain unverified. Targeted contrast checks do not evaluate complex composited artwork, all interactive states or all page text.
- localStorage is browser-local and not a backup. Other tabs refresh on reload; guards prevent ordinary stale writes but are not transactional compare-and-swap across truly simultaneous browser operations. No merge/sync or cross-device durability is claimed.
- Instance-local request/concurrency/hourly limits are not distributed abuse prevention or a global spending cap. A public paid AI deployment still needs hosting controls and provider project budgets.
- Imports are merchant-provided source data, not independently verified claims. No Shopify publishing, checkout, authentication, payments or database is included.

## Portfolio visual refinement follow-up — 2026-10-30

This section records the later visual milestone; the 40-test results above belong to the preceding functional audit.

Before editing, eight existing desktop/mobile workflow tests were executed against a production Demo build and their screenshots inspected. The review identified small working text, excessive green text shades, off-screen mobile navigation, narrow phone catalog cards and inconsistent control proportions. After refinement, screenshots at 1440, 1024, 820 and 375px were captured and inspected across the workspace. A final phone Overview review exposed cropped decorative products; their positions were corrected and a rendered-bounds regression added.

Current checks after visual changes:

- `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`: passed; 123 unit/API tests across 10 files.
- `npm run format:check` and `git diff --check`: passed.
- `npm run test:e2e`: 48 passed, including the existing merchant workflow and four added viewport scenarios in each Chromium project. The targeted contrast suite remains green.
- New layout checks exercise five visible navigation destinations below 1024px, 44px main button height, page/drawer overflow, focus restoration, the Catalog → Generator → Editor → Studio handoff and phone pending/cancel/retry. At 375px, decorative Overview products must fit inside their artwork surface.
- No paid AI request, new external image/font dependency, calculation change or persistence migration was introduced. All new browser data stays in isolated test contexts.

Implementation files: `src/app/globals.css`; shared `components/workspace-heading.tsx`; `app-shell.tsx`; Dashboard, Catalog, Generator, Editor and Listing Studio view components; `tests/e2e/design.spec.ts` and the Generator screenshot setup in `recommendations.spec.ts`. Design, architecture, decisions and README documentation describe the actual shared presentation layer.

Manual visual review still required: real iOS Safari and Android touch behavior, browser text enlargement/200% zoom, screen readers, all hover/disabled/error color combinations and deployed asset rendering. The tests measure selected contrast/text surfaces and layout bounds; screenshots are review artifacts, not a universal pixel-diff baseline or proof of complete WCAG conformance. Confirm the one-column phone catalog, mobile navigation labels, Editor control grouping and chosen type scale suit your portfolio presentation.
