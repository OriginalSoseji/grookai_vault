# MTG Sealed Signed-In Client Rollout V1

## Purpose

Expose the already activated MTG sealed catalog to authenticated collectors
through bounded web and Flutter clients without changing the catalog, price,
image, release, Storage, Vault, or anonymous-access boundaries.

## Backend Authority

- The app-facing read boundary is `get_active_sealed_product_pricing_v3`.
- Private image URLs are issued only by `mtg-sealed-sign-image-v1`.
- The active MTG sealed price and image releases remain the source authority.
- `sealed_product_game_release_controls.status` remains the server-side kill
  switch. A status other than `signed_in` must fail closed in both clients.
- Anonymous catalog and signer access remain denied.

## Client Feature Flags

- Web: `NEXT_PUBLIC_MTG_SEALED_CLIENT_V1_ENABLED=true`.
- Flutter: `--dart-define=MTG_SEALED_CLIENT_V1_ENABLED=true`.
- Both flags default to `false` when absent.
- A disabled client must make no MTG sealed auth, RPC, signer, or image request.
- Enabling one client does not authorize or imply enabling the other.

## Signed-In Product Surface

- Web route: `/sealed/mtg`.
- Flutter route: MTG Sets to MTG Sealed.
- The route is available only to authenticated users.
- The first page is bounded to 24 products.
- Search is bounded to 100 characters on web and the same 24-row result limit
  on both clients.
- Each product shows the canonical sealed name, package form, current exact
  market price, and a verified self-hosted image.
- Clients must not expose Storage object paths, service credentials, release
  internals, or governance identifiers.

## Image Safety And Performance

- A client may render only image evidence accepted by the V3 read model.
- Image access must use the trusted signer; clients must not read private
  Storage directly.
- Signed image URLs expire after exactly 3,600 seconds.
- Flutter signs at most eight image URLs concurrently and preserves catalog
  order (2026-09-07 bounded loading amendment). A rolling worker pool avoids
  a slow image holding up the next batch. A signer failure stops queued work,
  drains in-flight requests, and withholds the page. No authorization is cached
  across loads or skipped; the trusted signer remains authoritative per image.
- Flutter limits decoded and disk-cached image width and disables offscreen
  grid prefetch for this bounded canary.
- Leaving the Flutter Sets route must not retain the image-heavy route state.

## Fail-Closed States

The clients must distinguish and safely render:

- disabled
- signed out
- empty search
- stale price evidence
- missing verified image evidence
- offline transport
- invalid response or signer error

No fallback may substitute external images, stale prices, mismatched game
rows, unsupported identity, or unsigned private object paths.

## Rollback

Immediate rollback is client-only:

1. Remove or set the web feature flag to `false` and redeploy web.
2. Build Flutter without `MTG_SEALED_CLIENT_V1_ENABLED=true`.
3. If necessary, separately restore the backend game release-control status
   through its governed rollback authority.

Client rollback must not mutate catalog, pricing, image evidence, release
members, Storage, Vault, or cross-game data.

## Acceptance Proof

- Web contract tests pass.
- Web type checking and production build pass with the feature enabled.
- Signed-out web access redirects to login.
- A disposable authenticated web user reads 24 products and one exact private
  image, then leaves zero Auth residue.
- Flutter contract tests pass, including the four-call signing bound and order
  preservation.
- Flutter analysis passes.
- A physical Samsung device browses products and searches successfully with
  self-hosted images and market prices rendered.
- No client exceptions, database writes, approvals, embeddings, or anonymous
  visibility are introduced.

## Explicit Non-Scope

- Public anonymous MTG sealed browsing
- Product detail, ownership, or purchase mutations
- Sealed product publication changes
- Price or image release changes
- Additional image acquisition
- TestFlight or store rollout
- Other games
