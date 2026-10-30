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
