# BundleLab design system

## Direction

Premium, calm commerce software with an original identity. Warm off-white canvas, white cards, muted forest green actions, charcoal text, subtle warm borders, restrained shadows, and generous whitespace. Do not copy Shopify logos, assets, or product branding.

## Foundation implemented

Semantic CSS variables in `src/app/globals.css` drive Tailwind tokens and shadcn primitives. Use system sans-serif fonts for fast, network-independent rendering; use tabular numerals for financial data. A responsive merchant shell, overview, product catalog, accessible dialogs, and functional Generator, Editor and Listing Studio destinations establish the workspace. Local CSS product studies create cohesive decorative artwork without external assets. Light theme only for this MVP.

## Layout and typography

Use a 4px spacing rhythm, 24–32px panel padding, 8–12px corner radii, and a maximum content width around 1200px. Body text 14–16px with comfortable line height; headings use restrained weight and tight tracking. Desktop editor: product canvas beside the economics summary. Below 1024px, the shell becomes a compact top navigation and the editor stacks in task order. Below 480px, catalog cards use one full-width column. Avoid horizontal page overflow at 375px.

## Components and interaction

Use shadcn primitives for buttons, form controls, dialogs, cards, alerts, and tabs as needed. Primary forest buttons commit a meaningful action; secondary outlined buttons support review/editing. Destructive actions use explicit labels and red accents. Lucide icons accompany labels; decorative icons are hidden from assistive technology. No dead controls or sample dashboard metrics.

Use visible hover, active, disabled, and keyboard-focus states. Loading text explains the operation; AI requests allow retry and preserve the current draft. Empty states describe the next real action. Inline errors connect to controls using accessible descriptions. Storage failures must say whether changes were saved.

## Data and accessibility

Financial values use tabular numerals, explicit currency, clear labels and assumptions; profit, margin, and discount remain distinct. Future charts must clarify an actual calculation, carry text equivalents, and use no invented sales trends. Positive/negative states always include text or icons, never color alone. Target WCAG 2.2 AA: verify contrast, semantic landmarks, one main heading, labeled inputs, logical tab order, focus trapping/restoration in dialogs, reduced-motion support, and comfortable touch targets. This is a target, not a completed accessibility audit.

## Recommendation workspace

The composer pairs a generous prompt field with optional numeric/category/theme controls and a preview of effective hard constraints. An always-visible mode badge distinguishes simulated Demo from real AI, including failure states. Actual pending requests show skeletons and can be cancelled; no artificial waiting. Cards lead with advisory rationale, canonical products and a transparent financial breakdown, with a clear Customize action. Show exact constraint validation separately from advisory theme matching. The editor keeps products alongside a summary on desktop and stacks on mobile. Never hide failed constraints or configuration/storage errors behind a success state.

## Full editor and notebook

Use a generous product canvas alongside a sticky financial summary on desktop; stack them in task order on mobile. Editable discount and exact price sit together with an explicit pricing-mode explanation. Original guardrails and target warnings remain separate from estimates. A right-side product drawer uses searchable/filterable current catalog rows with thumbnail, price, cost, stock and selected state. Trap/restore focus and keep Done reachable. Show working-draft autosave separately from explicit named-library save. Saved cards support reopen/rename/duplicate/delete without nested controls; destructive operations and replacing unsaved edits require clear dialogs. The Listing Studio handoff saves the selected bundle before opening the functional copy workspace.

## Listing Studio

Use an editorial two-column workspace: editable copy on the left, a restrained storefront proof on the right; stack them on mobile. Keep the approved bundle strip (lineup, name, quantity and price) separate from copy controls. Three tone buttons have explicit pressed states; generation is an intentional action with a clear mode label and real pending/cancel states. Draft autosave, regeneration confirmation and context-review warnings protect edits. The storefront uses the existing botanical artwork, functional image thumbnails and expandable details without fake commerce promises. Copy/JSON export actions are real, require complete fields and report success/error honestly. Merchant edits are visibly distinct from generated facts.

## QA readability guardrail

Supporting catalog, constraint, editor and listing text uses the muted foreground token instead of pale decorative greens. Browser regressions measure selected essential supporting text against its opaque surface at a minimum 4.5:1 contrast in desktop and mobile Chromium. Decorative artwork remains separate; this limited check is not a complete WCAG conformance audit.

## Portfolio refinement pass — 2026-10-30

The before screenshots showed overly small text, too many green text shades, narrow phone catalog cards, clipped off-screen navigation destinations and inconsistent control proportions. The refinement keeps the original botanical artwork and commerce workflow while improving legibility and hierarchy.

- `WorkspaceHeading` provides one title/eyebrow/description/action composition across all five screens. `GenerationModeBadge` consistently labels server-selected Demo/AI modes in Generator and Studio. These are presentation components; they do not own request or financial state.
- Shared CSS tokens define captions (12px), labels (13px), body (14px), base text (15px), raised/subtle/input surfaces, panel/control radii, restrained shadows and 160ms control transitions. Overlines and decorative packaging remain smaller. Charcoal carries product information; forest green identifies primary actions, selection and sale price. Metadata uses the muted foreground.
- Cards share borders, radii and elevation. Product art remains locally rendered and decorative. Catalog cards have more readable names/descriptions, considered image proportions and consistent retail/cost/margin hierarchy. Phone cards use one column; compact list view remains available.
- Generator uses a focused brief panel, clear optional guardrails, understated mode chips and comparable recommendation cards. Selected products stay canonical; price is the principal economic value, with profit and margin distinct beneath it.
- Editor rows separate product information from quantity/removal controls on phones. Pricing inputs align, exact sale price is prominent, guardrails stay separate, and the primary Save action centers its icon and label. Listing authoring inherits the same field/control system.
- Primary/secondary buttons have at least 44px height. Tablet/mobile navigation presents all five destinations without horizontal scrolling, with compact visible labels and full accessible names. Mobile text-entry fields use 16px text to avoid focus zoom on iOS; real-device verification remains required.
- Empty states use quiet inset surfaces, feedback uses consistent corner/line-height treatment, focus rings remain explicit, and reduced-motion preferences remove the small hover transitions. No artificial generation delay, new imagery service, charts or invented product evidence were added.

Repeated exact-selector declarations superseded by the final rules were removed during stylesheet consolidation. Existing quantity, pricing, API, validation and localStorage logic is unchanged. Browser layout checks cover 1440, 1024, 820 and 375px widths, including navigation reachability, primary control size, drawer focus/overflow, workflow continuity and the mobile pending/cancel state. See QA.md for executed results and manual limits.

## Reversible editorial experiment — 2026-10-31

User-directed experiment inspired by the supplied fashion-commerce reference: oversized sans-serif wordmark, product objects layered over a bold field, thin grid divisions, asymmetrical editorial placement, compact top navigation and sharp corners. Keep BundleLab's existing forest green, warm off-white, charcoal and local product-art palettes. The reference's orange, model portrait, jewelry, awards and commercial claims are not reproduced.

The Overview leads with a large forest-green composition and a canonical product spotlight that opens the existing detail dialog. Catalog, Generator, Editor and Listing Studio share top navigation, oversized headings, framed panels and consistent square controls. The Generator's brief uses the same forest field; economics and working forms keep readable information hierarchy. Mobile rearranges the composition vertically and keeps all five destinations visible. Dialogs inherit the treatment without changing their focus behavior.

This is a comparison, not an irreversible replacement. **Design preview → Original** restores the previous workspace layout immediately; **Editorial** returns to the experiment. The comparison control remains in either layout. Only the preference at `bundlelab:design-preview:v1` is written; product imports, bundle inputs, pricing, copy and saved libraries are untouched. An absent/invalid preference defaults to Editorial. Browser storage denial leaves the switch usable for this tab. Restoring a preference happens after client hydration, so a brief default-layout paint is possible on a fresh page load.

Original styles remain in globals.css. The experiment is isolated in editorial.css and scoped under design-editorial (plus body :has selectors for portalled dialogs and shared radius variables). The comparison toolbar has its own independent styles. The full pre-experiment source, including removal of visible “fictional” wording, is preserved at Git checkpoint `3b6d2f0`. Switching back never requires a Git operation or clearing browser data.
