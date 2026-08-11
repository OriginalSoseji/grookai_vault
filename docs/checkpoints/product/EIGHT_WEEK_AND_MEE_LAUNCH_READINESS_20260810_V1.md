# Eight-Week and MEE Launch Readiness - 2026-08-10 V1

## Status

`CONTROLLED_BETA_READY / PUBLIC_LAUNCH_NOT_YET_AUTHORIZED`

## Decision

Grookai may continue and expand its controlled signed-in beta on production web
and TestFlight. It is not yet authorized for a full public App Store and Google
Play launch under the frozen eight-week completion contract.

The formal release manifest is now `11/14` proven. MEE operational recovery
is complete, but it does not promote any remaining application release gate
and does not complete Production V1 pricing.

## Frozen Candidate

- Application source: `a8ec3d27808fd100cbb8e544032ee479e9632f24`
- Production web deployment: `5816529955`
- Signed Android: `1.0.0 (23)`
- Android APK SHA-256:
  `deda3271c92258870a8abbeffce163ba39fb9a5e6d3142aca8907ff969ddb7f6`
- TestFlight: `1.0.0 (289)`
- iOS build ID: `dc5801e6-e1fd-42ef-b476-768e5ff5d411`
- iOS IPA SHA-256:
  `27619987ad4121347dbbfa2ef68a840d4ccc5139757f6f14d28a31a3660a09e1`
- `origin/main` has advanced from the candidate only through founder-operations
  snapshot commits; no deployable application source drift was found.

## Application Truth

### Proven

- Weeks 1-7 inventory, design, convergence, repository, and security gates.
- Production signed-out and signed-in web journeys.
- Android build 23 installation, exact artifact identity, and state matrix.
- TestFlight build 289 installation, launch, high-risk mutation journeys, Want
  Match, messaging, opt-out, and signed-out continuation.
- Journeys B, C, D, E, and F.
- Journey A device path.
- The authorized exact-source iOS simulator matrix for signed-out, loading,
  empty, deterministic offline/error, recovery, private, accessibility-medium
  text, and sign-out restoration states.
- Exact printing, Vault ownership, intent, collector context, app links, and
  card-centered messaging behavior.
- Security, RLS, privacy, account deletion, production monitoring, and iOS
  Crashlytics symbol delivery.

### Remaining Formal Gates

1. `journey_a_first_time_visitor`: genuine fresh-human ten-second
   comprehension evidence.
2. `store_and_distribution_readiness`: establish the intended Google Play
   developer account and verify the listing, assets, package ownership, and
   release track. A fresh authenticated readback still presents account
   creation at `/console/signup`; App Store Connect/TestFlight evidence is
   proven.
3. `final_72_hour_release_candidate_soak`: begin only after the first two
   gates are proven, then preserve 72 continuous hours and issue the final
   production report.

The completed TCGPlayer pricing canary is not the app-wide final-candidate
soak. Neither elapsed production time nor unrelated operational evidence may be
used to backdate the application soak.

## MEE and Pricing Truth

### Operationally Proven

- Active MEE release:
  `573dd8fc80e441c163c2f9f862289d73efd9a108`
- Immediate rollback: `ab07d3505c`
- TCGPlayer 100-printing canary completed `127.902` hours with zero missing,
  unhealthy, duplicate, or alerting closed-window runs.
- Passing GitHub canary observation: `31405863278`.
- Reference recovery inserted `37,016` missing warehouse rows; its subsequent
  dry-run found zero missing candidate or normalized rows.
- The eBay frozen acquisition cycle completed `8,400/8,400` requests with zero
  provider errors and exact warehouse readback.
- A fresh English-only eBay plan contains 6,000 targets and 7,302 requests,
  with zero Japanese canonical identity targets.
- TCGPlayer, MEE reference, and MEE nightly timers are enabled and active.
- MEE evidence, candidates, and rollups remain internal and review-only.
- No MEE run crossed canonical identity, Vault, image, modeled-value, or public
  pricing boundaries.

### Production V1 Pricing Still Open

- The active authenticated publication remains the bounded 100-printing
  canary, not full eligible publication.
- Anonymous pricing remains correctly denied pending licensing and display
  authority.
- The frozen post-canary sequence remains required:
  1. apply and read back migrations `20260728130000` and `20260728133000`;
  2. deploy the same exact clean pricing commit to all supported runtimes;
  3. run a fresh full-scope V1.2 shadow publication;
  4. prove at least 95 percent fixed-denominator exact coverage and zero
     unclassified gaps;
  5. verify all 17 web and Flutter pricing surfaces;
  6. atomically activate full eligible signed-in publication;
  7. complete seven consecutive unattended daily production cycles;
  8. publish the final Production V1 pricing report.

Operational MEE health does not authorize public MEE prices. Slabs, sealed,
Japanese pricing, Grookai Value, and modeled or blended values remain outside
Production V1 publication.

## Launch Interpretation

- **Production web:** already live.
- **Controlled signed-in beta:** ready to expand.
- **TestFlight beta:** ready and already distributed.
- **Public iOS App Store:** not authorized until the remaining release gates
  and final report pass.
- **Public Android/Google Play:** blocked by developer-account and listing
  authority in addition to the remaining release gates.
- **Full Production V1 signed-in pricing:** not yet activated.
- **Anonymous pricing:** intentionally closed.

The app may launch without full MEE pricing only if incomplete pricing remains
truthfully limited or hidden and the application release manifest independently
reaches `14/14`. It may not imply catalog-wide price coverage from the current
100-printing canary.

## Binder Classification

The exact frozen application candidate passes
`test/binders/binder_release_feature_flags_test.dart`. The failure seen in the
MEE recovery worktree comes from that worktree's stale application-base
feature defaults and is not a frozen-candidate release defect. No product
behavior was changed on the pricing branch to mask it.

## Exact Next Work

1. Stop at the genuine fresh-user and Google Play account gates if they remain
   unavailable; do not manufacture either proof.
2. When both non-soak gates are proven, begin the new non-backdated 72-hour
   application soak and preserve its final report.
3. In parallel, execute the frozen post-canary Production V1 pricing rollout.

## Authority

- `docs/audits/release_completion_v1/completion_manifest_v1.json`
- `docs/audits/release_completion_v1/RELEASE_COMPLETION_LEDGER_V1.md`
- `docs/checkpoints/product/FINAL_CANDIDATE_RELEASE_HANDOFF_20260810_V1.md`
- `docs/audits/release_completion_v1/google_play_account_readback_v2/2026-08-10T23-32-00Z/REPORT.md`
- `docs/runbooks/FRESH_USER_TEN_SECOND_COMPREHENSION_V1.md`
- `docs/contracts/MEE_PRICING_PLATFORM_PRODUCTION_V1_DEFINITION_OF_DONE.md`
- `docs/checkpoints/market_evidence_engine/MEE_AND_TCG_CANARY_OPERATIONAL_CLOSEOUT_20260810_V1.md`
