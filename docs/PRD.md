# BundleLab product requirements

Status: end-to-end portfolio MVP implemented; pre-launch QA is recorded in QA.md. Overview, catalog browsing/details, and validated browser-local CSV import are shipped. AI/Demo recommendations, deterministic bundle calculations, and a browser-local chosen-bundle editor are implemented. The full editor and saved-bundle library are implemented. Listing Studio generates grounded editable copy in AI or explicit Demo Mode, previews it and exports JSON/formatted text.

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

## MVP acceptance criteria

- A validated seed contains exactly 24 unique product IDs; every recommendation references the seed; local editor and listing lines may also reference validated imports.
- Manual creation, calculation, editing, saving, reload, deletion, and copy workflows work without OpenAI access.
- Calculation unit tests cover rounding, zero discount, discount bounds, quantities, zero revenue, loss, unknown IDs, duplicate lines, and stock limits.
- No model output is trusted as an authoritative price, cost, stock, or computed profit. Proposed discounts are bounded, validated inputs to deterministic calculations. Invalid model responses fail safely and leave the manual draft intact.
- Browser tests cover the core journey, persistence, API failures, and a narrow viewport. Keyboard operation, visible focus, labeled controls, and accessible errors are reviewed.
- Lint, strict typecheck, unit tests, browser tests, and production build pass; no secrets ship to the browser.

## Evaluation plan

Use scenario-based task walkthroughs and deterministic test fixtures first. Later, with real participants and consent, evaluate task completion and clarity of margin explanations. No measured outcomes exist yet.

## Recommendation milestone boundaries

Both modes generate one unit each of 2–5 sample products. Demo is deterministic and visibly simulated; AI Mode calls OpenAI and never falls back. Price, exact margin, category, stock, IDs, and 0–50% discount boundaries are hard checks; theme is advisory. Prompt numeric constraints use a disclosed bounded grammar and unsupported numeric wording asks for clarification. Imported products can be selected in the local editor, but are excluded from server recommendations until a server catalog authority exists. No-results distinguishes mathematically infeasible requests from feasible requests whose AI suggestions did not pass validation. A chosen recommendation can be edited and saved to a browser-local named library; its working draft also autosaves. No-key reviewers use Demo; testing AI requires an explicitly configured key/mode.

## Full editor milestone acceptance (implemented)

- A recommendation preserves products, title, rationale, source, pricing and original constraints in the editor.
- Manual/edited bundles use the current catalog, including local imports, and allow 0–5 products while working; named saves require 2–5 distinct products and valid stock-bounded quantities.
- The last-edited pricing field controls the draft: discount percentage follows retail changes, while direct price remains fixed to cents. Invalid fields hide totals and disable saves. No price is silently clamped.
- Named bundles can be saved, reopened, renamed, duplicated and deleted; working autosave is separate from named saves. Stale-tab updates and storage failures do not fabricate save success.
- Zero revenue/retail have undefined ratios. Original target misses and negative profit are disclosed. Direct prices must respect the cent-rounded 0–50% discount range before saving.
- A searchable/filterable drawer works on desktop/mobile with keyboard focus management. Listing Studio restores the saved bundle and preserves its lineup/pricing while composing editable copy.

## Listing Studio milestone acceptance (implemented)

- Restore the currently selected named bundle; show canonical products, quantities and recalculated exact sale price. Require a valid saved handoff.
- Provide explicit Professional, Playful and Minimal tones. AI curates a bounded plan referencing catalog facts and approved style options; a deterministic compiler creates a title, short/detailed descriptions, three selling points and short promotional copy. This conservative approach limits creative prose to prevent invented product claims. Demo uses the same fact/compiler boundary with an explicitly simulated deterministic plan.
- Generate only on request. Tone changes never silently overwrite copy. Confirm regeneration, preserve old edits on error/cancel, and never fall back from AI to Demo.
- All fields edit inline, update a realistic non-commerce storefront preview, and autosave per bundle with honest storage failures. Restored copy needs explicit review after bundle context changes.
- Copy formatted text and download a JSON artifact with exact price and lineup, excluding internal costs and secrets. Empty required fields or unreviewed context changes block export. Merchant edits require human review; they are not presented as automatically verified claims.
- Imported selected product records are schema-validated merchant catalog input and cannot override canonical seed records. No images are generated, no checkout exists, and no listing is published automatically.
