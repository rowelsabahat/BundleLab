# BundleLab product requirements

Status: catalog milestone implemented. Overview, catalog browsing/details, and validated browser-local CSV import are shipped. Bundle workflows and AI capabilities remain planned.

## Problem and hypothesis

Small merchants may struggle to choose complementary products and understand the economics of a discount before writing a bundle listing. BundleLab explores whether a compact workflow combining product context, transparent calculations, and editable AI drafts can help. This is a product hypothesis, not validated customer research. No usage, conversion, or revenue claims are made.

## Target merchant persona

An assumed owner-operator of a small skincare and wellness shop, maintaining a modest catalog and handling merchandising and marketing themselves. They need a clear view of cost and margin, with little setup time. This persona is fictional and has not been interviewed.

## Journeys

1. Browse a fictional catalog, inspect price, cost, stock, and descriptive tags, then select complementary products.
2. Request suggestions for a merchandising goal; inspect rationale and selected products, then accept or modify a suggestion.
3. Adjust quantities and discount; immediately see deterministic revenue, cost, gross profit, margin, and savings, with warnings for losses and insufficient stock.
4. Generate and edit a title, description, and promotional copy using the selected products as context.
5. Save a bundle locally, reload, reopen, edit, or delete it; copy listing text for manual use elsewhere.

## MVP requirements

Milestone addition: browser-local CSV import with a downloadable sample, atomic row validation, unique IDs, local persistence, and clear recovery/error messages. This supersedes the initial exclusion of catalog import.

- Exactly 24 distinct, realistic fictional skincare and wellness products in local JSON; stable IDs, integer cent prices and costs, stock counts, tags, and descriptive content. Clearly mark sample data.
- Catalog browsing and filtering, manual builder with 2–5 distinct products, positive integer quantities, and inventory validation.
- Percentage discounts from 0 to 50%, represented as integer basis points. One currency (USD), explicit rounding and gross-profit assumptions.
- AI suggestions contain only known product IDs and pass schema and domain validation before display. Explain complementarity without medical claims or invented evidence.
- Editable marketing drafts, with no financial values entrusted to AI. Manual workflow remains usable without an API key.
- Save, edit, delete, and reopen versioned bundles in localStorage. Explain browser-local persistence and handle invalid or unavailable storage gracefully.
- Responsive, keyboard-accessible UI with loading, empty, success, validation, and failure states.

## Out of scope

Shopify APIs or publishing, authentication, payments, external databases, multi-user sync, real sales analytics, medical advice, tax/shipping/payment-fee estimates, multi-currency, automated store/catalog synchronization, background jobs, and production-scale abuse prevention infrastructure.

## MVP acceptance criteria (future delivery)

- A validated seed contains exactly 24 unique product IDs; every suggestion and saved line references that catalog.
- Manual creation, calculation, editing, saving, reload, deletion, and copy workflows work without OpenAI access.
- Calculation unit tests cover rounding, zero discount, discount bounds, quantities, zero revenue, loss, unknown IDs, duplicate lines, and stock limits.
- No model output is used as price, cost, discount, stock, or computed profit. Invalid model responses fail safely and leave the manual draft intact.
- Browser tests cover the core journey, persistence, API failures, and a narrow viewport. Keyboard operation, visible focus, labeled controls, and accessible errors are reviewed.
- Lint, strict typecheck, unit tests, browser tests, and production build pass; no secrets ship to the browser.

## Evaluation plan

Use scenario-based task walkthroughs and deterministic test fixtures first. Later, with real participants and consent, evaluate task completion and clarity of margin explanations. No measured outcomes exist yet.
