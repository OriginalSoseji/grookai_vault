# Production-Grade App Crawl V1

## Status

`LOCAL RELEASE CANDIDATE PROVEN / ONE HOSTED-ORIGIN GATE OPEN`

- As of: `2026-08-11`
- Branch: `fix/production-grade-app-crawl-v1`
- Starting commit: `28e5f44f2e78f2c4e0039512f0e2653b93dd74e1`
- Database writes performed by this crawl: `0`
- Application mutations performed by the signed-in audit: `0`

## Context

Collectors reported that application features were not working reliably. The required response was a broad product crawl, not a single-route smoke test. The work therefore inventoried the web surface, crawled the live canonical route graph, exercised signed-out and signed-in journeys, inspected internal/founder pages, ran the mobile client on an Android emulator, and executed repository-wide contract and visual parity suites.

This checkpoint records the exact scope. It does not claim that every possible account state or all `58,507` card detail pages were individually rendered.

## Surface Inventory

- Next page modules inventoried: `55`
- Next route handlers inventoried: `22`
- Local database snapshot used by the final static crawl:
  - sets: `662`
  - cards: `58,507`
  - species: `1,025`
- Static routes visited: `3,155`
  - canonical set routes: `662/662`
  - legacy set redirects: `662/662`
  - canonical card samples: `1,745`
  - species routes: `60`
  - primary/discovered routes: `26`
- Broken routes: `0`
- Dead internal links: `0`
- Failed set/card routes: `0`

The concurrent crawl reported `24` routes over the three-second diagnostic threshold. All 24 were replayed serially: every route returned `200`, none remained over three seconds, and the slowest completed in `96 ms`. The warnings were local 12-worker contention, not intrinsic route failures.

The earlier production crawl used a time-stamped snapshot with `682` sets and visited `3,317` routes with zero broken routes or dead links. The set-count difference reflects an evolving database snapshot; neither crawl mutated the database.

## Defects Found And Repaired

### Signed-In Dex Failure

`/dex/pikachu` failed only for signed-in collectors. Pikachu resolved to `611` card-print IDs, and the ownership helper sent up to `500` UUIDs in one Supabase `.in(...)` URL. The resulting oversized request failed before the anonymous path was affected.

Repair: chunk direct ownership, slab certificate anchor, and all-owned certificate-anchor reads at `200` IDs. A regression covers each bounded filter.

### Binder Printing Ambiguity

Binder RPC data already carried canonical variant and finish fields, but the web parser discarded them. Public, private, eligible-copy, search, ordered-slot, and preview rows could therefore show only a card name, set, and number.

Repair: preserve governed variant and printing labels through Binder types and readers, then render them on every card surface. A direct rendered proof showed labels including `1st Edition Red Cheeks`, `Ghost Stamp Shadowless`, `WB Kids Stamp`, `Missing WB Kids Stamp`, and explicit `Standard print` fallbacks.

### Authenticated Rate-Limit Collision

The final signed-in matrix initially produced two empty narrow Pikachu search states and two `429` API responses. Abuse protection grouped all sessions sharing an IP address and browser user agent into one `120` request bucket. That could affect a household, office, or an active collector.

Repair: signed-in sessions receive isolated actor buckets while a separate five-times network aggregate ceiling prevents forged or rotated cookies from bypassing protection. Anonymous traffic retains the original network boundary. `/api/resolver/search` now reaches the intended search lane before the generic API classifier.

Post-repair proof: `80/80` signed-in page states and `14/14` authenticated read APIs passed with zero failures.

### Other Repairs

- Founder market-signal grammar now renders `1 collector wants`, not `1 collector want`.
- The static crawl gained bounded concurrency while preserving deterministic result order.
- Signed-in and signed-out audits now cover page errors, failed read requests, protected API boundaries, search navigation, and privacy-safe artifact generation.
- Three stale performance contract assertions were aligned to current governed behavior and now pass.

## Final Candidate Evidence

### Signed Out

- Page states: `22/22`
- Protected-action continuations: `2/2`
- API boundaries: `12/12`
- Failures: `0`

Artifact:

`artifacts/release/production_grade_app_crawl_v1/final_candidate_v2/signed_out/2026-08-11T09-27-07-416Z/`

Summary SHA-256:

`494EDB8BAC0376976FDD242837C59E6CBB0A1449D0B38CC0168F6C66C6F8045D`

### Signed In

- Page states: `80/80`
- Existing message contexts: `2/2`
- Search navigation transitions: `4/4`
- Authenticated read APIs: `14/14`
- Database assertions: `5/5`
- Non-read requests physically blocked: `20`
- Before/after database state equal: `true`
- Failures: `0`

Artifact:

`artifacts/release/production_grade_app_crawl_v1/final_candidate_v2/signed_in/2026-08-11T09-19-11-295Z/`

Summary SHA-256:

`E4CACF35B93AC2A37444548A41578A79FE7E759AFD9EA7544B8F3C323821445E`

### Static Link Graph

Artifact:

`artifacts/release/production_grade_app_crawl_v1/local_candidate_post_dex_fix/static/web_cohesion_link_integrity_v1.json`

SHA-256:

`43D545A0324BD7114D2B75123CEE8FD8F17412A20CB22F02F71A71BB64C4B2CF`

### Android Emulator

A configured public-environment debug build proved clean startup, anonymous Explore, Gengar search, exact Japanese card identity, card detail, signed-out Vault continuation, authenticated Pulse, Wall, Vault, Search, and camera permission/scanner states. No fatal Flutter errors were observed. Screenshots and UI hierarchies are under:

`artifacts/release/production_grade_app_crawl_v1/android_emulator/`

## Verification

- Contract suite: `1,618/1,618` passed.
- Web visual/accessibility/parity suite: `99/99` passed.
- Focused crawl/security/performance contracts: `41/41` passed.
- Flutter tests: `585/585` passed.
- Flutter analyzer: no issues.
- Web typecheck: passed.
- Web lint: passed with zero warnings.
- Next production build: passed; `26/26` static pages generated.
- Release secret-packaging guard: passed.
- Runtime preflight: `PASS_WITH_DEFERRED_DEBT`, zero critical failures.
- Runtime health, quarantine, and deferred reports: no new release-blocking failure.

## Current Truths And Invariants

- The candidate does not require a schema migration.
- The crawl and journey harnesses are read-only.
- Audit artifacts contain no credentials, tokens, emails, or raw user UUIDs.
- Binder card rows must always show printing/variant context; missing metadata uses an explicit `Standard print` fallback.
- Ownership reads must remain bounded below URL-size failure thresholds.
- Authenticated rate limits must isolate sessions and retain an aggregate anti-bypass ceiling.
- Search, image, and API failures must not be silently accepted by release audits.

## Known Limits

- Some canonical rows still have no governed hosted image and honestly render `Image unavailable`. This is image-coverage debt, not a broken image URL, and was not repaired by inventing or externally hotlinking an asset.
- The latest preflight recorded existing data debt: `62` card prints without GV-ID, `5` historical duplicate groups, and `2,466` non-excluded canonical cards without active identity. These were deferred by the governed preflight and were not created by this branch.
- Android toolchain upgrade notices for Gradle, Android Gradle Plugin, and Kotlin remain future maintenance, not current build failures.
- Physical iOS was not rebuilt in this branch because no Flutter production source changed; the existing synchronized TestFlight evidence remains the mobile release authority.
- The final repaired web candidate is locally proven but is not yet the deployed production version.

## Exact Next Gate

1. Freeze and commit this candidate.
2. Create one hosted preview/build only.
3. Run signed-out and bounded signed-in origin checks against that exact deployment, including Pikachu search, Binder printing labels, Dex Pikachu, and the 14 authenticated API contracts.
4. Require zero failures, zero database writes, and deployment provenance matching the frozen candidate.
5. Only then merge/deploy through the existing release process.

Do not claim the repairs are live until the hosted-origin readback passes.
