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

## Product

The user is validating three hypotheses:
1. Explicit campaign terms reduce scope ambiguity.
2. Clear owners and deadlines reduce coordination effort.
3. One campaign workspace makes publication and payment status easier to manage.

Core surfaces are a campaign issue list, campaign detail, agreements, task board, personal work queue, activity history, and closeout tracking. Reports may remain a clearly labeled placeholder.

## User preferences

- Use Jira-inspired density and interaction patterns without copying Jira branding.
- Open directly into the campaign list; use fictional, interconnected demo records.
- Do not add AI chat, creator discovery/recommendations, performance analytics, messaging integrations, or payment processing.
- Prefer functional behaviors and explicit missing-term indicators over decorative dashboards.

## Gotchas

- Local data is specific to a browser; this is not shared team storage.
- Never imply notifications, payments, invoices, or external verification actually occur.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
