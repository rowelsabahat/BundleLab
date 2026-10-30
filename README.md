# BundleLab

A portfolio concept for a Shopify Associate Product Manager application: AI-assisted product bundling for small skincare and wellness merchants. Independent project; no Shopify affiliation.

## Current status

Foundation only: Next.js App Router, strict TypeScript, Tailwind, shadcn/ui Button, Lucide, Zod, Vitest, Playwright, formatting, CI, design tokens, and a static setup page. No catalog, bundle builder, calculations, saved bundles, AI routes, or OpenAI SDK is implemented. No customer research, usage metrics, or business outcomes are claimed.

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

- `src/app/`: setup page, metadata, and theme.
- `src/components/ui/`: generated UI primitives; `src/lib/`: shared helpers.
- `tests/e2e/`: desktop and mobile setup smoke test.
- `AGENTS.md`: persistent engineering instructions.
- `docs/PRD.md`: product hypothesis, journeys, scope, acceptance criteria.
- `docs/ARCHITECTURE.md`: proposed schemas, state, API, money and AI boundaries.
- `docs/DESIGN.md`: visual and interaction system.
- `docs/DECISIONS.md`: initial tradeoffs.

## Deployment

Import `rowelsabahat/BundleLab` into Vercel, use the Next.js preset and Node 24, keep the repository root as the project root, and use `npm run build`. No database or secret is required for this foundation. Add `OPENAI_API_KEY` as a server-only Vercel environment variable when AI routes are implemented later. No deployment is created by this setup step.

## Next step

Implement and validate the fictional 24-product JSON catalog, Zod domain schemas, and pure integer-cent financial functions with edge-case tests; then build the manual bundle workflow. AI assistance comes after the deterministic workflow is usable.

The npm dev/build scripts explicitly use Next.js Webpack and Tailwind PostCSS for portability; see decision 009.
