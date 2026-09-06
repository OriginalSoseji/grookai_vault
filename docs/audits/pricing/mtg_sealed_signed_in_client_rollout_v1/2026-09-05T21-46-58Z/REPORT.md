# MTG Sealed Signed-In Client Canary Report

## Result

PASS for the bounded local web and physical Android client canary.

The signed-in MTG sealed backend was not mutated. The implementation remained
disabled by default and was enabled only in canary builds. No production web
deployment, TestFlight build, anonymous access, catalog mutation, price
mutation, image mutation, Storage write, Vault write, approval, or embedding
operation occurred.

## Provenance

- Branch: `agent/mtg-sealed-image-migration-promotion-v1`
- Parent SHA before implementation: `63384d87d220dd678e6444013f7cfe5c933e6740`
- Exact implementation SHA: `2ab018235`
- Production Supabase project: `ycdxbpibncqcchqiihfz`
- Backend release status: `signed_in`
- Web flag: `NEXT_PUBLIC_MTG_SEALED_CLIENT_V1_ENABLED`
- Flutter flag: `MTG_SEALED_CLIENT_V1_ENABLED`
- Default flag value: `false`

## Web Proof

- Local production build with the web flag enabled: passed.
- Protected route: `/sealed/mtg`.
- Signed-out request: redirected to login with HTTP `307`.
- Disposable real authenticated user: returned `24` products.
- First product: `10th Edition - Booster Box`.
- First market price: `$824.75`.
- First private self-hosted image: loaded with a natural width of `200`.
- Temporary Auth user deleted after proof: yes.
- Temporary Auth reference rows after deletion: `0`.
- Browser screenshot: `web_signed_in_catalog.png`.

## Samsung Proof

- Device: Samsung SM-S908U.
- Android package: `com.grookai.vault`.
- Build: arm64 debug with only public configuration and the MTG sealed flag.
- Browse: rendered canonical names, package forms, current market prices, and
  private self-hosted images in a two-column grid.
- Search: query `bundle` returned matching bundle products with images and
  prices.
- Stability: process remained alive through initial load, a 45-second hold,
  search, and a further 20-second hold.
- Logged fatal exceptions or out-of-memory exceptions during final proof: `0`.
- Browse screenshot: `samsung_signed_in_catalog.png`.
- Search screenshot: `samsung_bundle_search.png`.

## Performance Boundary

The final debug process remained alive, but Android debug memory accounting
reported approximately `3.17 GB` total PSS and `2.55 GB` graphics allocation.
This did not produce a final-run crash, and the earlier low-memory failure was
mitigated by:

- signing at most four image URLs concurrently;
- limiting image decode and disk-cache width;
- disabling offscreen grid prefetch; and
- not retaining the image-heavy Sets route.

This debug-only measurement is not accepted as production performance proof.
A release/profile build and memory/latency observation remain required before
mobile distribution. A local profile build attempt was blocked by external
Maven DNS failures for `dl.google.com` and `repo.maven.apache.org`, not by a
source or test failure.

## Verification

- Web sealed client tests: `7/7` passed.
- Web typecheck: passed.
- Web production build with canary flag: passed.
- MTG sealed historical/activation contracts: `20/20` passed.
- Flutter sealed client tests: `6/6` passed.
- Flutter analyze: passed with no issues.
- Full pre-commit shipcheck: passed.
- Full Node contract suite: `2,977/2,977` passed.
- Full Flutter suite: `659/659` passed.
- Runtime preflight: no critical failures; known deferred debt remained
  separately reported.
- Diff check: passed.

## Boundaries Preserved

- Anonymous RPC and signer access remain denied.
- Both client feature flags remain disabled when omitted.
- The server release-control row remains the backend kill switch.
- No signed URL, password, access token, service key, or temporary user ID is
  stored in this audit.
- No database or Storage write occurred during client proof.

## Exact Next Gate

Enable and deploy the web client only for signed-in collectors, verify the
production route and rollback flag, then observe it before any mobile release.
After web proof, produce a release/profile Flutter build, verify memory and
latency on a physical device, and only then prepare TestFlight. Anonymous
visibility remains a separate policy gate.
