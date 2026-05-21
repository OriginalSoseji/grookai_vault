# LOCAL_COMMUNITY_FEED_V1 Phase 7 Demo Polish

Status: IMPLEMENTED

## Scope

- Demo polish only for `/network/nearby`.
- No DB writes.
- No migrations.
- No resolver, scanner, pricing, Species Dex, or public route changes.

## Changes

- Repeated rows for the same collector/card are collapsed into one display card.
- Multi-source context is preserved with surface chips such as `Wall` and `Showcase`.
- Hero copy now states: `Only public cards from opted-in collectors appear here. Exact location is never shown.`
- Nearby activity copy now repeats the public/opt-in boundary.
- Internal preview and opt-in status are visible at the top of the page.
- Missing image fallback now shows the card name plus `Image not available yet`.

## Founder Demo Checklist

### Desktop

- Open `/network/nearby` while signed in as the founder test user.
- Confirm the page shows `Internal preview`.
- Confirm the page says only public cards from opted-in collectors appear.
- Confirm repeated cards from the same collector are not duplicated.
- Confirm cards with multiple surfaces show clear chips, for example `Wall` and `Showcase`.
- Confirm missing images show a calm fallback instead of a blank or broken state.
- Confirm `View card` opens the card route.
- Confirm `View wall` opens the collector wall.
- Confirm no raw UUID, exact location, address, latitude, or longitude is visible.

### Mobile Web Viewport

- Open `/network/nearby` at a narrow viewport.
- Confirm the card image, identity, source chips, and actions stack cleanly.
- Confirm buttons remain tappable and do not overlap.
- Confirm missing-image fallback stays readable.

### App Viewport

- Open the same route from the app web context if available.
- Confirm the page remains readable in app-sized viewport.
- Confirm nearby feed copy still communicates public/opt-in boundaries.

### Safety Regression

- Confirm unauthenticated access still redirects to login.
- Confirm feature flag off still hides `/network/nearby`.
- Confirm block/mute proof remains represented by:
  - `local_community_feed_v1_phase6_block_mute_proof_20260521.md`
  - `local_community_feed_v1_phase6_block_mute_proof_20260521.json`

## Decision

The page is suitable for trusted-founder demo smoke after deployment. Broader rollout still requires production smoke on desktop, mobile viewport, and app viewport.

## Verification

- `npm --prefix apps/web run typecheck` - pass
- `npm --prefix apps/web run lint` - pass with existing WarehouseSubmissionForm `<img>` warning
- `npm --prefix apps/web run build` - pass
- `npm run preflight` - pass with known deferred debt
- `git diff --check` - pass for Phase 7 files
- Local unauthenticated smoke with flag enabled - `/network/nearby` returns `307` to `/login?next=%2Fnetwork%2Fnearby`
