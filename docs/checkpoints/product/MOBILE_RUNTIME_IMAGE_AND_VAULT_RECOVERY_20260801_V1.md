# Mobile Runtime Image and Vault Recovery 2026-08-01 V1

## Status

Local validation complete. Release and physical-device smoke test remain gated.

## Context

The first working post-Binder iOS build exposed two runtime problems:

- many card images failed to render; and
- Vault inventory remained blocked behind optional pricing and sharing reads.

This repair starts from `origin/main` commit
`a70331fae05270ec95b805545a172ba803665226` on branch
`fix/mobile-runtime-performance-images-v1`.

## Production Evidence

Read-only production probes on 2026-08-01 established:

- `53,436` canonical card-print rows;
- `53,371` rows with an identity-backed immutable `image_path`;
- `65` rows without `image_path`;
- `62` rows with no image evidence in any supported image field; and
- the three remaining pathless rows with provider URLs are `E7TEST` fixtures.

Three sampled canonical GV-ID image endpoints returned HTTP `200`. Their cold
response times were 584-850 ms and warm response times were 67-163 ms.
Equivalent immutable path endpoints returned HTTP `200`, avoided the database
identity lookup, and retained one-year immutable cache headers.

Every sampled native thumbnail URL rewritten through `/_next/image` returned:

```text
400 INVALID_IMAGE_OPTIMIZE_REQUEST
```

The same failure reproduced for canonical API images, TCGdex images, and
PokemonTCG.io images. The underlying canonical image endpoint remained healthy.

## Root Causes

1. The Flutter image normalizer treated the Next.js optimizer as a native image
   service. Width hints rewrote otherwise valid image URLs through a production
   endpoint that rejects these requests.
2. `CardPrint.hostedImageUrl` preferred the GV-ID route even when the read model
   already supplied the exact immutable warehouse path. This added a database
   lookup to every cold image request.
3. Vault waited for pricing targets, exact pricing, and sharing state before
   publishing its canonical inventory rows to the widget tree.

## Decision

- Native clients keep validated card URLs direct. Decode-size control remains
  in `CachedNetworkImage` through memory and disk cache width hints.
- Canonical `image_path` is preferred over the GV-ID lookup route.
- Known web card-image sources and canonical proxy routes bypass Next image
  optimization through `PublicCardImage`.
- Vault canonical inventory is critical data. Pricing and sharing are
  supplemental and load asynchronously after inventory becomes visible.
- A reload generation guard prevents stale supplemental responses from
  overwriting a newer Vault refresh.

No schema, RLS, storage, canonical identity, pricing authority, or publication
policy changed.

## Validation

- Flutter image contracts: `35/35` passed.
- Flutter affected-file analysis: no issues.
- Vault exact-pricing contracts: `9/9` passed.
- App production-readiness Flutter tests: `22/22` passed.
- Web image release guards: `2/2` passed.
- Web TypeScript check: passed.
- Flutter release web build: passed.
- Next.js production build: passed; 691 checked-in set counts validated.
- Local Next server smoke:
  - home route HTTP `200`;
  - six canonical images emitted directly;
  - zero canonical images nested inside `/_next/image`;
  - sampled canonical image HTTP `200`, `image/webp`, 52,536 bytes.
- `git diff --check`: passed.

The broader existing web performance contract remains `11/13`: its unrelated
route-revalidation and card-detail-streaming expectations were already failing
against the fetched `main` state. The image-specific assertions pass.

## Invariants

- Private collector uploads never become public catalog URLs.
- Warehouse catalog paths remain constrained to approved immutable prefixes.
- Provider images remain fallback evidence only when Grookai-hosted artwork is
  available.
- Pricing failures cannot hide owned cards.
- Stale refreshes cannot overwrite newer Vault state.
- No production database writes are part of this repair.

## Exact Next Gate

1. Commit and push the isolated repair branch.
2. Review and merge it into `main` without mixing unrelated work.
3. Build one controlled iOS/TestFlight candidate from the merged commit.
4. On a physical signed-in device, verify:
   - Pulse card images;
   - Search and set-grid card images;
   - Vault first-content latency;
   - Vault card images while scrolling;
   - exact pricing arriving after inventory without hiding cards; and
   - Binder entry and Binder library remain available.
5. Deploy the web change only through the normal production gate, then verify
   card grids emit direct canonical sources and no canonical image request uses
   `/_next/image`.

Do not claim production recovery until the physical-device and deployed-web
readbacks pass.
