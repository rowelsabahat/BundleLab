# BundleLab design system

## Direction

Premium, calm commerce software with an original identity. Warm off-white canvas, white cards, muted forest green actions, charcoal text, subtle warm borders, restrained shadows, and generous whitespace. Do not copy Shopify logos, assets, or product branding.

## Foundation implemented

Semantic CSS variables in `src/app/globals.css` drive Tailwind tokens and shadcn primitives. Use system sans-serif fonts for fast, network-independent rendering; use tabular numerals for future financial data. A responsive merchant shell, overview, product catalog, accessible dialogs, and planned-feature destinations establish the workspace. Local CSS product studies create cohesive decorative artwork without external assets. Light theme only for this MVP.

## Layout and typography

Use a 4px spacing rhythm, 24–32px panel padding, 8–12px corner radii, and a maximum content width around 1200px. Body text 14–16px with comfortable line height; headings use restrained weight and tight tracking. Future desktop workspace: catalog and builder side by side with an adjacent or integrated profit summary. Below 768px stack sections in task order and keep actions reachable. Avoid horizontal page overflow at 375px.

## Components and interaction

Use shadcn primitives for buttons, form controls, dialogs, cards, alerts, and tabs as needed. Primary forest buttons commit a meaningful action; secondary outlined buttons support review/editing. Destructive actions use explicit labels and red accents. Lucide icons accompany labels; decorative icons are hidden from assistive technology. No dead controls or sample dashboard metrics.

Use visible hover, active, disabled, and keyboard-focus states. Loading text explains the operation; AI requests allow retry and preserve the current draft. Empty states describe the next real action. Inline errors connect to controls using accessible descriptions. Storage failures must say whether changes were saved.

## Data and accessibility

Financial values use tabular numerals, explicit currency, clear labels and assumptions; profit, margin, and discount remain distinct. Future charts must clarify an actual calculation, carry text equivalents, and use no invented sales trends. Positive/negative states always include text or icons, never color alone. Target WCAG 2.2 AA: verify contrast, semantic landmarks, one main heading, labeled inputs, logical tab order, focus trapping/restoration in dialogs, reduced-motion support, and comfortable touch targets. This is a target, not a completed accessibility audit.

## Recommendation workspace

The composer pairs a generous prompt field with optional numeric/category/theme controls and a preview of effective hard constraints. An always-visible mode badge distinguishes simulated Demo from real AI, including failure states. Actual pending requests show skeletons and can be cancelled; no artificial waiting. Cards lead with advisory rationale, canonical products and a transparent financial breakdown, with a clear Customize action. Show exact constraint validation separately from advisory theme matching. The editor keeps products alongside a summary on desktop and stacks on mobile. Never hide failed constraints or configuration/storage errors behind a success state.

## Full editor and notebook

Use a generous product canvas alongside a sticky financial summary on desktop; stack them in task order on mobile. Editable discount and exact price sit together with an explicit pricing-mode explanation. Original guardrails and target warnings remain separate from estimates. A right-side product drawer uses searchable/filterable current catalog rows with thumbnail, price, cost, stock and selected state. Trap/restore focus and keep Done reachable. Show working-draft autosave separately from explicit named-library save. Saved cards support reopen/rename/duplicate/delete without nested controls; destructive operations and replacing unsaved edits require clear dialogs. The Listing Studio handoff shows real selected data and clearly states that generation is planned.

## Listing Studio

Use an editorial two-column workspace: editable copy on the left, a restrained storefront proof on the right; stack them on mobile. Keep the approved bundle strip (lineup, name, quantity and price) separate from copy controls. Three tone buttons have explicit pressed states; generation is an intentional action with a clear mode label and real pending/cancel states. Draft autosave, regeneration confirmation and context-review warnings protect edits. The storefront uses the existing botanical artwork, functional image thumbnails and expandable details without fake commerce promises. Copy/JSON export actions are real, require complete fields and report success/error honestly. Merchant edits are visibly distinct from generated facts.
