# nano.club

A front-end prototype of nano.club: find creators, run campaigns, and see what every post delivered against what the brand paid for. All numbers are sample data.

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
  **Why:** The first prototype needs no authentication, database, API keys or third-party services.
- Publication, invoice, and payment fields are team-entered status tracking, not externally verified facts or payment processing.
  **Why:** The prototype tests end-to-end coordination, not financial infrastructure.
- Performance numbers are generated sample data (see `src/domain/performance.ts`). Metrics are always derived from posts and snapshots through that file, never computed in screens.
  **Why:** One definition of each number keeps every screen consistent, and the prototype must not imply live or externally measured results.

## Product

nano.club is a creator marketplace and campaign tracker for D2C brands in India. Brands find creators, run campaigns, and see per post what each creator delivered against the views the brand paid for. Creators have their own view (Brand / Creator switch in the sidebar). Strategy and brand notes are in PRODUCT.md.

Core surfaces: Home, Campaigns (programmes), Marketplace (directory, profiles, compare), Collaborations (one creator on one campaign, with agreement, tasks and closeout), the campaign performance grid, Reports, and the Creator view (opportunities, my work, profile).

## User preferences

- Everything is sample data. The prototype ribbon says so and the UI must never imply live collection from Instagram or Shopify.
- Reach, saves and shares are private to creators: show them as locked until a creator screenshot, a creator-connected account, or the brand's connected account (Collab posts) supplies them. Always show the source of a number.
- Connect dialogs (Instagram, Shopify) are mocks.
- UI copy is plain, with no em dashes. Prices use Indian formats (₹, K, L).
- The performance grid is a dense table by design. Other screens stay card-based.

## Gotchas

- Local data is specific to a browser; this is not shared team storage.
- Never imply notifications, payments, invoices, or external verification actually occur.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
