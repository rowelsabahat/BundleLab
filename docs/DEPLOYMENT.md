# GitHub and Vercel deployment

## Release configuration

BundleLab v1.0.0 uses the standard Next.js App Router deployment path. Use Node 24.x, npm, the committed lockfile and Vercel's Next.js framework preset. Project root is the repository root, install command is `npm ci`, build command is `npm run build`, and output settings should remain automatic. Do not select static export: generation requires server routes. No database, persistent disk, custom server or `vercel.json` is required.

Production URL: **Pending deployment — add the verified URL here and in README.md.**

## Environment variables

No environment variable is required for the default Demo experience. Set `BUNDLELAB_MODE=demo` explicitly for a reproducible public portfolio build. Both tools visibly label their deterministic templates as simulated; no key or paid request is needed.

For actual AI, set server-side `BUNDLELAB_MODE=ai` and `OPENAI_API_KEY` in the intended Vercel environment. `OPENAI_MODEL` is optional and defaults to `gpt-4.1-mini`; an override must support the structured output schemas. AI Mode never silently falls back to Demo. Missing/invalid keys, quota and service failures produce explicit errors. Never use a `NEXT_PUBLIC_` prefix, embed credentials in code or screenshots, or commit `.env.local`. Changes to environment settings require a new deployment to take effect.

Recommendation requests send eligible seed metadata and merchant prompts to OpenAI. Listing requests send selected catalog facts and tone. API response storage is disabled by the application; review provider and hosting policies before using sensitive merchant data. In-memory limits are best-effort per instance, not distributed protection or a spending guarantee. A public paid AI deployment needs hosting access/abuse controls and provider budget management. Demo is the recommended portfolio default.

## Connect the repository

1. Review the release commit and successful local checks. Confirm the repository contains no local secrets or generated artifacts. Publish/push to the intended GitHub repository with normal Git operations; never force-push over remote work.
2. In GitHub repository settings, confirm the intended visibility and MIT license. A successful push alone does not establish public visibility.
3. After the owner's explicit deployment approval, sign into Vercel and choose Add New → Project. Connect the GitHub account and import BundleLab with the settings above. Select the intended production branch (`main`).
4. Add environment values to the intended Production/Preview environments. Do not place a paid key in untrusted preview environments. Review plan limits and request protection.
5. Review settings and deploy only after approval. Record the actual successful deployment URL; do not invent one from the project name.
6. On that URL, complete the QA checklist: Catalog → Demo Generator → save/edit bundle → Listing Studio → clipboard/JSON → refresh. Verify mode labels, prices, responsive navigation and safe API errors. Check that no browser request or static asset contains a key.
7. Update README.md and this document with the verified URL and deployed commit. Treat future production pushes as deployment actions when Git integration is connected.

[Vercel Git integration](https://vercel.com/docs/git) automatically creates deployments from connected repository pushes. Check existing integrations before pushing when deployment approval has not been given. [Environment settings](https://vercel.com/docs/environment-variables) and [supported Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) are documented by Vercel.

## Verification boundaries

The local production build and browser suite establish local compatibility, not an executed Vercel deployment. This release task found no installed Vercel CLI or local project link. No remote Vercel setting is changed by these instructions. Deployment and any connection/settings changes require the owner's explicit confirmation. Remote CI, project visibility, deployment URL and hosting behavior must be verified separately and recorded honestly in QA.md.
