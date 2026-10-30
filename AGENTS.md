# BundleLab engineering instructions

## Product and scope

Read README.md and docs/PRD.md, ARCHITECTURE.md, DESIGN.md, and DECISIONS.md before changing behavior. This is a polished portfolio MVP, not a production Shopify integration. Never fabricate customer research, production usage, sales metrics, or validated business impact. Persona and value statements are hypotheses. Current implementation includes the dashboard/catalog, local CSV import, explicit AI/Demo recommendations, and full Bundle Editor/named library with a Listing Studio handoff; update docs as capabilities ship.

## Hard boundaries

- No Shopify APIs, authentication, payments, or external database.
- Seed catalog: exactly 24 fictional skincare/wellness products, stable unique IDs, local JSON, explicit sample labels.
- All financial calculations must be pure deterministic TypeScript using integer cents and validated inputs. Follow documented rounding and gross-profit assumptions; test edge cases. No money arithmetic in model responses.
- All recommendations must reference canonical existing product IDs; validate schemas and domain constraints before accepting AI output.
- OpenAI calls belong only in server-side routes/server-only modules. Never expose secrets, log keys, or use NEXT_PUBLIC_ for credentials. Keep recommendation Demo Mode explicit and simulated; AI Mode must call OpenAI and never silently fall back. Recommendations currently use only the server-owned seed catalog.
- Persist saved bundles only through versioned, validated localStorage; handle hydration, invalid data, and storage failure. Never trust stored totals. Preserve explicit discount/direct-price modes, working-draft autosave versus named saves, and stale-tab write protection. AI recommendations remain seed-only; the local editor may use validated imports.

## Implementation style

Use npm and commit package-lock.json. Target Node 24 and strict TypeScript; avoid any and unexplained assertions. Prefer Zod-inferred types at trust boundaries. Keep server components by default; add client boundaries only for interaction/browser APIs. Use local React state/reducers before adding state libraries. Add components/modules when needed, not speculative layers. Follow semantic theme tokens and accessible shadcn primitives. Preserve original branding, responsive layouts, keyboard access, focus states, and honest error/empty states.

## Workflow and verification

Inspect the working tree and preserve user changes. Keep implementation and documentation consistent. Use current compatible stable releases; resolve peer conflicts rather than forcing installs. Run npm run lint, npm run typecheck, npm test, and npm run build for relevant changes. Run npm run test:e2e for UI/workflow changes (install Chromium first) and npm run format:check. Add meaningful tests for financial rules, validation, storage, and AI boundary failures as implemented; mock paid services. Never mark an unrun check as passing. Do not expand feature scope or add placeholder success paths. Keep Vercel compatibility and no server filesystem persistence. Report changes, verification, limitations, and the next step.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
