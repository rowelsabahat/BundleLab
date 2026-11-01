# Changelog

## 1.0.0 — 2026-11-01

Initial end-to-end portfolio MVP release.

- Permanent Editorial interface across Overview, Catalog, Generator, Editor and Listing Studio; removed the design comparison UI without clearing merchant data.
- Validated 24-product sample catalog, search/category/grid/list views, product details and atomic browser-local CSV imports.
- Explicit deterministic Demo Mode and real server-side OpenAI recommendations with validated IDs, feasibility checks and independent financial calculations.
- Bundle editing with products, quantities, discount/direct pricing, target warnings and a named local library.
- Grounded listing generation, three tones, editable copy, live preview, clipboard and JSON export.
- Versioned local persistence, error/recovery states, accessible dialogs and responsive layouts.
- Unit/API and desktop/mobile Chromium workflow coverage, CI, MIT license and documented Vercel setup.

### Limits

No Shopify integration, authentication, payments, external database, multi-currency or cloud sync. Imports remain category-limited and recommendations use the seed catalog. No validated business-impact metrics are claimed. AI request limits are instance-local; public paid AI operation requires additional hosting/budget controls. See docs/QA.md for actual verification and remaining manual checks. Release preparation does not imply an executed deployment.
