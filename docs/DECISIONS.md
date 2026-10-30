# Decision log

Date: 2026-10-29. These are initial decisions; revisit with evidence.

## 001 — Foundation before features

Accepted. This step ships tooling, documentation, UI primitives, and a static status page. The 24-product seed and all workflows are deferred to the next implementation steps. This avoids partially working features and keeps status honest.

## 002 — Next.js App Router and npm

Accepted. Use current stable compatible packages and commit the npm lockfile. The scaffold resolves Next.js 16.4.3 and React 19.3.0. Node 24 is the project baseline; align Node types with the runtime and Vitest peer requirements. Prefer standard Vercel deployment over custom infrastructure.

## 003 — Local data and browser persistence

Accepted. JSON is the catalog source of truth; localStorage holds user bundles. No auth/database reduces setup and demo friction but sacrifices account identity, sync, durability, and shared inventory. Make those limits visible.

## 004 — Deterministic money, constrained AI

Accepted. TypeScript owns all financial results; AI helps with complementarity explanations and editable copy. Resolve product data on the server and reject unknown IDs. No model-selected prices or invented outcomes. Routes and SDK are deferred.

## 005 — Single currency and explicit rounding

Accepted. USD integer cents and integer discount basis points; round discount half up once per bundle. Margin is gross profit divided by revenue. Exclude fees, tax, shipping, returns, and overhead and disclose this. Simplifies testing and avoids implying net profitability.

## 006 — Small state model

Accepted. React local state/reducer plus derived calculations; no global state library. Add abstractions only when a demonstrated use requires them.

## 007 — Original light theme and shadcn primitives

Accepted. Tailwind semantic tokens, Radix-backed shadcn components, Lucide, and system fonts. Light-only keeps polish achievable. System fonts avoid build-time font downloads and an unnecessary external dependency.

## 008 — Test boundaries and claims

Accepted. Vitest for domain/helper boundaries and Playwright for real browser journeys. Current tests only verify setup. CI runs checks and smoke tests without an API key. Future financial and AI validation tests must precede exposing those capabilities. Persona and product value remain hypotheses, with no fabricated research or production metrics.

## 009 — Portable CSS build

Accepted. Use standard Tailwind PostCSS integration and Next.js Webpack for development and production. The scaffold's Turbopack CSS worker could not bind its internal port in this local execution environment, including an elevated retry. Webpack keeps the same App Router architecture and Vercel compatibility while allowing local verification. Revisit Turbopack when this environment supports it.

## 010 — Keep shadcn as a generator

Accepted. Commit generated components and use the CLI through npx when adding components. The current Button uses standard Tailwind utilities and needs no shadcn package CSS. Remove the unused runtime CLI dependency, which also removes three low-severity transitive npm advisories. Future components needing custom variants must add those explicitly.

## 011 — Catalog milestone and honest navigation

Accepted. Replace the setup page with an Overview and routed Catalog. Preserve the three later tools as explicit planned destinations, with no simulated AI or fake actions. Overview statistics derive from actual catalog records and stock, not assumed sales. Keep a persistent lightweight React provider across routes.

## 012 — Browser-local CSV import is now in scope

Accepted by the milestone request, superseding the original PRD import exclusion. Keep the fictional seed at 24 records and append imported products separately. Require every row to validate before saving, never overwrite IDs, cap files at 1 MB and imports at 500 products, and preserve imported data across reloads. Provide explicit clear confirmation and corrupt-storage recovery. No upload, remote parsing, database, or new dependency is required. CSV record numbers include the header; quoted multiline records count once. Tabs refresh on reload; concurrent-tab editing and merge reconciliation are outside this milestone.

## 013 — Numeric input, zero prices, and loss visibility

Accepted. Store money as integer cents; parse USD CSV decimals by string splitting. Reusable strict Zod schemas reject negative, non-finite, fractional-cent, or oversized amounts and duplicate IDs. The milestone permits nonnegative retail prices, overriding the initial positive-price proposal. Zero revenue returns an undefined gross margin; costs above price produce a visible negative margin. Do not silently clamp or make financial judgments using AI. Bundle-level discount calculations remain planned.

## 014 — Original product fallback artwork

Accepted. Local CSS silhouettes and muted palettes establish a cohesive fictional botanical collection without image dependencies, licensing ambiguity, network requests, or AI generation. Art is decorative; text contains product identity and details. Imported products receive a deterministic bottle fallback. Radix primitives supply dialogs; explicit opener focus restoration covers cards and buttons outside Dialog.Trigger.

## 015 — Explicit AI and deterministic Demo modes

Accepted. Server-only BUNDLELAB_MODE chooses demo (default) or ai; a key alone never switches modes. Invalid configuration blocks generation. Demo is visibly simulated and deterministic. AI calls OpenAI Responses with strict structured output; every error stays in AI Mode. Use native Fetch and one small server-only guard dependency. Model defaults to gpt-4.1-mini and is configurable on the server. Automated verification mocks the external transport; no live paid request is claimed.

## 016 — Bounded feasibility, exact constraints, advisory prose

Accepted. Search every one-unit combination of 2–5 eligible products from the canonical 24-record seed. This bounded scope permits a truthful infeasibility proof across all allowed discounts. Both modes share integer calculations and exact margin comparisons before rounding. Model candidates select IDs and propose discounts; arbitrary fields, duplicate/unknown IDs, repeated sets and failed constraints never become accepted recommendations. Advisory titles/rationales cannot supply financial claims. Distinguish “no feasible combination” from “AI returned no valid result”. The deterministic preflight is not used as an AI fallback.

## 017 — Server catalog authority and disclosed prompt grammar

Accepted. Local CSV imports remain browsable but are excluded from recommendations in both modes, clearly disclosed in the UI. Sending client-owned financial records as server-authoritative catalog data would blur trust boundaries. Parse supported numeric prompt patterns deterministically, merge stricter controls, and reject unsupported numeric requirements instead of silently ignoring them. Category is hard, theme is soft; broader semantic understanding does not imply verified constraints.

## 018 — Bounded API usage without new infrastructure

Accepted. JSON/body size/read limits, provider response/token/time limits, cancellation, per-IP windows, concurrency limits and a per-instance hourly AI cap bound individual work. These memory-only controls reset on cold starts and are not distributed spending guarantees. Keep Demo as the default; broad public AI exposure needs provider budgets and hosting-level rules. Never log prompts/keys or return upstream error bodies. Structured-output reference: https://developers.openai.com/api/docs/guides/structured-outputs.

## 019 — One chosen draft before a library

Accepted. Persist the selected bundle’s IDs, quantities, proposed discount, advisory title, original constraints, source mode and timestamp before navigating. Store no authoritative totals. Revalidate and recalculate in the editor; show constraint failures after edits and explicit storage errors. A new selection replaces the one active draft. Save a draft that misses the original limits only with its visible warning; a multi-bundle library and listing generation remain separate milestones.

## 020 — Last-edited pricing field wins

Accepted. Keep discount input and direct cent price as two explicit pricing modes. Product edits retain the percentage in discount mode and retain exact cents in price mode. Compute effective discount from actual retail/sale, never reconstruct a direct price from a rounded ratio. Bound discount input to 0–50%. A direct saved price must fit the same cent-rounded interval; invalid working pricing is visible and never silently clamped. Zero-denominator ratios are undefined. This preserves the existing half-up-once convention, including odd-cent rounding at the 50% boundary.

## 021 — One atomic local notebook

Accepted. Use `bundlelab:saved-bundles:v1` for the working draft, up to 50 named records, and a consumed recommendation timestamp. Working edits autosave independently from explicit named saves. Library changes are atomic, have UUID identity, and refuse stale-tab overwrites. A failed working write keeps edits in memory with an error; a failed named save does not invent success. Corrupt storage is retained until explicit reset. Keep IDs/inputs/source/constraints/rationale, no derived financial totals. Existing v1 recommendation handoffs migrate on opening and are consumed once; deleting a bundle does not resurrect the handoff.

## 022 — Imported products in the local editor

Accepted. The manual editor and picker resolve the current sample plus imported catalog, while AI/Demo server recommendations remain seed-only. Local merchant catalog input is distinct from AI-generated financial source data. Missing imports are repairable references with errors, not reasons to fabricate prices or erase saved bundles. Working drafts can be empty; named bundles still require 2–5 unique products, positive stock-bounded integer quantities, and a name.

## 023 — Studio handoff before listing generation

Accepted. Proceed saves the named bundle before navigating to a recalculated preview in Listing Studio. Retain explicit “generation planned” copy, no artificial AI behavior or invented listing. Preserve target warnings and a return path. The actual listing authoring workflow remains a later milestone.
