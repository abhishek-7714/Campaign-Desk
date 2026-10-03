# Campaign Desk

A creator-campaign operations prototype for explicit agreements, shared task ownership and deadlines, and publication/payment closeout.

## Run & Operate

- Run the managed `artifacts/campaign-desk: web` workflow for the app preview.
- `pnpm --filter @workspace/campaign-desk run typecheck` — check the app's TypeScript
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- App: React, Vite, Tailwind CSS, Lucide icons
- Persistence: browser local storage; no app backend is required for this prototype

## Where things live

- `artifacts/campaign-desk/` — working web app
- Shared API/database packages are scaffold infrastructure, not dependencies of this product's persistence.

## Architecture decisions

- Keep this prototype client-only with local seeded data and browser persistence.
  **Why:** The user explicitly requested no authentication, database, API keys, or third-party services for the first prototype.
- Publication, invoice, and payment fields are team-entered status tracking, not externally verified facts or payment processing.
  **Why:** The prototype tests end-to-end coordination, not financial infrastructure.
- Operational summaries must be derived from saved campaigns and tasks. Engagement and historical trend measurements are explicitly labeled fictional demo data.
  **Why:** The requested visual reporting has no connected analytics source; presentation must not imply live or externally measured results.

## Product

The user is validating three hypotheses:
1. Explicit campaign terms reduce scope ambiguity.
2. Clear owners and deadlines reduce coordination effort.
3. One campaign workspace makes publication and payment status easier to manage.

Core surfaces are a Home command center, campaign gallery and detail workspace, agreement-health cards, task board, personal work queue, visual reports, activity history, and closeout tracking.

## User preferences

- Open directly into Home, not Campaigns. The user explicitly requested a fundamental redesign, not decorated tables.
- No table-first Campaigns, My Work, Board, Agreements, or Reports pages. Use cards, visual summaries, charts, progress indicators, and timelines.
- Use the supplied reference for hierarchy and visual rhythm, not its branding or exact layout.
- Use a warm light base, light navigation, and semantic indigo/blue, lavender, yellow, coral, green, and mint accents.
- Keep all existing editing, workflow validation, closeout, search, task movement, and local persistence functional.
- Do not add AI chat, creator discovery/recommendations, messaging integrations, or payment processing.

## Gotchas

- Local data is specific to a browser; this is not shared team storage.
- Never imply notifications, payments, invoices, or external verification actually occur.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
