# Local Community Feed V1 - Phase 4 Internal UI

Date: 2026-05-21

## Scope

Phase 4 adds the first authenticated internal UI surface for the Local Community Feed.

Implemented surface:

- `/network/nearby`
- `Nearby` section link in the Network section navigation
- server-side feed fetch through `local_community_feed_v1`
- feature-flag guard through `LOCAL_COMMUNITY_FEED_V1_ENABLED` / `NEXT_PUBLIC_LOCAL_COMMUNITY_FEED_V1_ENABLED`

This phase does not change the RPC, schema, ranking logic, public identity rules, pricing, scanner, Species Dex, or mobile app.

## Feature Flag Behavior

The Nearby UI is hidden unless the local community flag is enabled.

Enabled when one of these is true:

- `LOCAL_COMMUNITY_FEED_V1_ENABLED=true`
- `NEXT_PUBLIC_LOCAL_COMMUNITY_FEED_V1_ENABLED=true`
- `VERCEL_ENV=preview`
- `APP_ENV=staging`

Explicit `false` in either flag disables the route.

When disabled, `/network/nearby` returns `notFound()`.

## Authentication Boundary

The page requires a signed-in user through `requireServerUser("/network/nearby")`.

The UI does not expose:

- raw user IDs
- exact latitude or longitude
- exact postal code
- internal local-grid identifiers
- raw vault item instance IDs
- signed storage URLs

## Display Contract

Feed rows display:

- card image or safe fallback
- card name
- set name/code and card number
- owner display name and public wall link
- locality label
- source label: Wall, Trade, Sell, Showcase, or Network
- following context when applicable
- parent card route target

Route targets remain parent card routes. Public child printing routes are not introduced.

## Empty and Error States

The UI has explicit states for:

- local discovery off
- feed unavailable
- no nearby cards yet

The local discovery off state sends the collector to account settings without exposing any location details.

## Verification

Web checks:

- `npm --prefix apps/web run typecheck` - pass
- `npm --prefix apps/web run lint` - pass, existing warehouse `<img>` warning only
- `npm --prefix apps/web run build` - pass, existing warehouse `<img>` warning only
- `npm run contracts:test` - pass
- `npm run contracts:runtime-health` - pass
- local production route smoke with `LOCAL_COMMUNITY_FEED_V1_ENABLED=true` - pass, unauthenticated `/network/nearby` redirects to `/login?next=%2Fnetwork%2Fnearby`
- `git diff --check` for Phase 4 files - pass

## No-Change Confirmations

- No DB writes.
- No migrations.
- No scanner changes.
- No pricing changes.
- No Species Dex denominator changes.
- No public child route enablement.
- No mobile app changes.
