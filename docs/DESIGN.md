# BundleLab design system

## Final direction

MVP v1.0.0 ships the Editorial design exclusively. The comparison experiment is retired: there is no Design preview text or Editorial/Original switch. Previous implementations remain recoverable through Git history. General product positioning addresses merchants across categories; sample catalog content remains accurate to the products shown.

The reference inspired oversized typography, fine grid lines, layered product compositions and confident whitespace. BundleLab retains its own warm off-white, muted forest-green and charcoal palette; no reference photography, logos, orange palette, awards or unsupported metrics are copied.

## Tokens and typography

`src/app/globals.css` owns semantic theme, typography, spacing, focus and motion tokens. `src/app/editorial.css` applies the permanent composition over these shared primitives. Read the tokens in code as the source of truth for exact colors. Backgrounds are warm off-white, content is charcoal, primary actions are forest green, and metadata uses a contrast-tested muted foreground. Light green is a supporting surface, never the only indication of success or selection.

Use system sans for navigation, controls, data and body text, with restrained serif collection titles. Oversized Overview typography establishes identity; page headings and compact uppercase section labels organize working screens. Financial values use aligned numeric presentation. Keep supporting text readable on phones rather than shrinking a desktop composition.

## Surfaces and controls

Flat, square panels with fine borders define the editorial grid. Avoid decorative shadows, rounded dashboard tiles or gratuitous charts. Primary actions use forest fills; secondary actions use restrained borders or text. Reuse the shared button, dialog, field, product artwork and workspace heading primitives. Main controls have generous touch targets, visible keyboard focus and distinct disabled states. Transitions are subtle and respect reduced motion.

## Navigation and responsive layout

A full-width branded top navigation connects Overview, Catalog, Bundle Generator, Bundle Editor and Listing Studio. Below 1024px, compact visible labels preserve full accessible names and keep all five destinations discoverable. Desktop working screens use spacious columns; tablet/phone screens stack the editor, economics and listing preview. The catalog becomes one column below 480px. Drawers and dialogs must fit the viewport without page overflow and restore focus after closing.

## Page composition

- Overview: large wordmark, layered local product artwork, a canonical product spotlight, meaningful catalog totals and contextual workflow actions. No fabricated merchant metrics.
- Catalog: restrained heading, search/category/view controls and consistent product cards. Details and import flows retain clear financial/data labels and explicit validation feedback.
- Generator: forest prompt composition, optional constraints, explicit Demo/AI badge and up to three comparison cards. Separate loading, infeasible, invalid-response and service-error states.
- Editor: product lineup and pricing controls alongside a clear economics summary; named library and product drawer remain easy to reach. Target warnings accompany exact financial estimates.
- Listing Studio: editable fields and tone controls alongside a storefront-style preview. Show the approved price and lineup; avoid simulated checkout, reviews or guarantees.

## Artwork and truthfulness

ProductArt renders cohesive local CSS artwork with deterministic silhouettes and palettes; no external image service, generated photography or network font is required. Product names remain visible text and decorative artwork is hidden from assistive technology. The 24-product skincare/wellness dataset illustrates the workflow; it does not restrict the intended merchant audience. Mode labels distinguish simulated templates from real model calls. Financial figures are estimates excluding operating costs, not promised profitability.

## Interaction and accessibility

Use semantic headings, labeled inputs, visible focus, keyboard-accessible dialogs, Escape dismissal and focus restoration. Pair warnings with text/icons, not color alone. Preserve in-progress inputs on navigation and errors according to the storage contracts. Confirm destructive library/reset actions and copy regeneration. Never show a success message before persistence, clipboard or request completion.

## Verification

Playwright covers desktop/mobile merchant workflows, selected text contrast, keyboard interactions, layout widths 1440/1024/820/375 and the absence of retired appearance controls. Screenshots in `docs/screenshots/` show real Demo UI. See QA.md for executed results. Real Safari, touch hardware, screen readers, 200% zoom and complete WCAG conformance remain manual review; automated checks are not a conformance claim.
