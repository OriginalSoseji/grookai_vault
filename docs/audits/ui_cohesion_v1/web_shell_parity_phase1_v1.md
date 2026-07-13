# Web Shell Parity Phase 1 V1

Date: 2026-06-17

Status: implemented

## Objective

Begin aligning the web app shell with the actual Grookai app shell.

The app source-of-truth primary navigation is:

```text
Search, Pulse, Scan, Wall, Vault
```

## Changes

Updated:

- `apps/web/src/components/layout/MobileBottomNav.tsx`
- `apps/web/src/components/layout/SiteHeader.tsx`
- `apps/web/src/app/globals.css`

Implemented:

- Mobile bottom navigation now uses `Search, Pulse, Scan, Wall, Vault`.
- Profile was removed from the primary mobile dock.
- Scan is the center dock action.
- Scan currently routes to `/vault/import`, the closest existing web scan/import entry point.
- Desktop header now prioritizes behavior-first app navigation:
  - Search
  - Pulse
  - Scan
  - Wall
  - Vault
- Desktop utility navigation keeps:
  - Sets
  - Dex
  - Compare
- Added `gv-nav-link-secondary` for quieter secondary nav treatment.

## Deferred

- A true `/scan` web route does not currently exist.
- Dex landing redesign is still pending.
- Sets landing redesign is still pending.
- Search card hierarchy polish is still pending.
- Vault visual alignment is still pending.

## Verification

Passed:

```text
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
npm run web:build:strict
git diff --check
```

Known warning:

```text
apps/web/src/components/warehouse/WarehouseSubmissionForm.tsx uses <img>.
```

This warning existed outside the shell parity change and was not modified.
