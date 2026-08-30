# Production Release And Automation Status - August 29, 2026

## Decision

`CONTROLLED_BETA_READY / FULL_PUBLIC_RELEASE_NOT_YET_PROVEN`

Grookai has a broad functional product, healthy production services, working
signed Android builds, governed search, proven pricing canary behavior, and
substantial no-write catalog automation. It is not yet correct to claim final
public-release completion because the pricing full-scope gate, synchronized
cross-platform candidate, remaining release journeys, and final 72-hour soak
are not all proven.

## Authoritative Source State

- Pricing repair source SHA:
  `8457d8281fb7465b496837831b30adfd45fa69cd`
- Operations automation source SHA:
  `3edc990157a5b454f26868226e08790d478c55c0`
- Branch used for isolated work: `fix/mee-health-bounded-current-run`
- Signed APK workflow: `33280377639`, success
- Signed APK artifact ID: `9722900305`
- Signed artifact archive digest:
  `sha256:595afb6fa0a56076aa2b92817a4250756241a39736683eb5ccb1ecb1a63511de`
- CodeQL workflow: `33280377281`, success
- Runtime contracts: `33280377757`, success
- Legacy-key guard: `33280377681`, success
- Production web deployment source:
  `d3e6a861371522e47f0526302294e62b6a13199b`
- Production signed-out web journey: `22/22` routes and `2/2` login
  continuations passed with zero visible broken images.

The web, Android, and iOS artifacts are not yet frozen to one final source SHA.
Any later code commit creates a new candidate for the soak contract.

## Product Readiness

The eight-week release verifier currently reports:

- `14` total gates;
- `8` proven;
- `6` partial or open;
- zero missing evidence files;
- completion prohibited.

Proven product work includes:

- P0 Search, Card Detail, Vault, Wall, Pulse, profile, and desktop-shell
  convergence;
- exact printing and variant visibility contracts;
- signed Android builds and extensive Samsung journey proof;
- iPhone functional Want Match proof on historical TestFlight build `288`;
- public/private Memory behavior, linking, print, and share work;
- Vendor Mode and GVVI QR/customer landing flows;
- production search performance repair and signed-in search proof;
- security, privacy, account-deletion, operations, and App Link foundations;
- One Piece OP16/OP17 production closure and MTG signed-in catalog completion.

The six release gates that remain are:

1. Journey A: fresh-user comprehension and final-candidate iPhone continuation.
2. Journey C: repeat Want-to-match-to-message-to-opt-out on the synchronized
   final candidate.
3. Journey F: final-candidate iPhone signed-out locked-feature continuation.
4. Cross-platform state matrix on the final web, Android, and iOS candidate.
5. Store and distribution readback, including the current Google Play state.
6. A fresh, non-backdated 72-hour soak after all five prerequisites pass.

## Pricing / MEE

The governed TCGPlayer canary is formally complete:

- 72-hour observation passed;
- 3/3 scheduled cycles passed;
- 98/98 exact prices remained current;
- zero stale rows, broken traces, missing provenance, or terminal alerts;
- authenticated reads passed and anonymous reads remained denied.

The repaired full-scope shadow run `33279087655` passed on exact SHA
`8457d8281fb7465b496837831b30adfd45fa69cd` in one attempt:

- runtime: `1h19m14s`;
- source requests: `9,320`;
- products: `502,549`;
- source price rows: `547,735`;
- qualification decisions: `206,345`;
- eligible traced snapshots: `164,135`;
- quarantined: `30,550`;
- excluded: `11,660`;
- reconciliation mismatches: `0`;
- failed phases: `0`;
- publication activation by this shadow run: `false`.

All nine governed file hashes matched ZIP-stream readback, including the
`767,285,756` byte qualification decision ledger. The GitHub artifact is ID
`9723305223`, archive digest
`sha256:267468120af048bdf1032ce58c5186b5521f6ef008de808b092d3dc38c8f8068`.

Full signed-in production pricing was already activated by reconciled run
`TCGPLAYER-MARKET-SCHEDULE-PRODUCTION-2026-08-29-publication`:

- run state: `verified`;
- exact-printing current prices: `164,134`;
- parent `From` prices: `105,026`;
- broken source-to-price traces: `0`;
- current coverage: `95.293%`;
- read-performance worst p95 across six cases: `168.242 ms` against a `500 ms`
  target;
- authenticated execution/read: proven;
- anonymous pricing access: remains denied by policy.

Pricing is therefore functional and broadly published for signed-in users. Its
remaining release proof is:

1. capture and reconcile all 17 required deployed product surfaces against the
   shared pricing read model;
2. complete the frozen seven-cycle observation contract. Four scheduled
   production publications from August 26-29 share commit
   `4b6064a5fb7eeacb7887c240735fc6dd8ffec06f` and are verified, but the formal
   seven-cycle gate is not yet closed;
3. preserve rollback and alert evidence through that observation window.

## Search

- Production migration `20260829203000` is applied.
- `search_game_card_prints_v4` performance and signed-in visibility are repaired.
- Signed Android search returns live card images, variants, and prices.
- Production signed-out web search and detail routes pass.
- Unified visual/collector search remains a signed-in beta project and is not a
  blocker for canonical name, set, number, language, or printing search.

## Catalog Automation

See
`../catalog_discovery/2026-08-29_COLLECTIBLE_SHADOW_AUTOMATION_STATUS_V2.md`.

Launch-critical catalog truth:

- Pokemon: daily 18-language candidate index, 141,326 candidate cards, three
  Japanese Master Index update candidates, no automatic writes.
- MTG: 945/945 eligible released sets complete for signed-in use; seven future
  sets deferred; supervisor active every 15 minutes.
- One Piece: 61 source sets tracked; OP16 and OP17 production closure proven;
  source-behind and ambiguous states remain explicit.
- Expanded collectibles: 20 adapters registered, 16 probed daily, 11 currently
  healthy, 2 typed parsers, no automatic writers.

The expanded background system is an evidence and candidate factory, not a
completed cross-collectible canonical catalog. That distinction is intentional.

## Supabase

See `../infrastructure/2026-08-29_SUPABASE_PRODUCTION_CAPACITY_READBACK_V2.md`.

Current production capacity:

- project `ACTIVE_HEALTHY`;
- Medium compute;
- 320 GB gp3 disk;
- 72.47% utilization after the full-source MEE shadow;
- 93.06 GB available;
- 600 GB autoscale ceiling;
- effective paid-plan autoscale growth 50%;
- all five monitored services healthy.

Post-MEE read-only run `33282501714` passed all `8/8` capacity assertions at
`72.47%` utilization.

The immediate infrastructure is adequate for a controlled launch. Fast evidence
growth still requires a no-delete retention and partitioning design. Spend Cap
state is not exposed by the supported project API and is not inferred here.

## What Is Complete

- Core product implementation and major collector journeys exist.
- Production search is functional after the v4 repair.
- One Piece and MTG signed-in catalog foundations are functional.
- TCGPlayer canary behavior is proven.
- Production Supabase is healthy with materially improved capacity.
- Core catalog discovery, reconciliation, Pokemon indexing, MTG supervision,
  expanded adapter probes, and Wave 1 parsing are unattended and fail closed.
- Current CI on operations SHA `3edc990157` is green, and the terminal pricing
  shadow is pinned to repaired pricing SHA `8457d8281f`.

## What Is Not Complete

- All 17 deployed pricing-surface captures.
- One synchronized final web/Android/iOS candidate.
- Five non-soak release prerequisites and the final 72-hour soak.
- Typed parsing for most newly registered collectible adapters.
- Three anti-bot official-source probes and a licensed comics source.
- A no-delete high-volume price-evidence retention implementation.
- Final reconciliation of the current Google Play and TestFlight release state
  into the completion manifest.

## Ordered Completion Plan

1. Preserve MEE run `33279087655` as the terminal repaired full-scope shadow
   proof; do not rerun it without a new failure class.
2. Keep the live-proven no-write parser, adapter probes, and capacity audit
   monitored; current proofs are runs `33280394160`, `33280393291`, and
   `33280395126`.
3. Capture all 17 pricing surfaces against the already active signed-in
   full-eligible publication.
4. Finish the frozen seven-cycle pricing observation.
5. Freeze one final source SHA after launch-blocking repairs stop.
6. Deploy that SHA to production web, signed Android, and TestFlight; record
   immutable deployment/build identifiers and hashes.
7. Execute Journeys A, C, F, the state matrix, and current store readback on that
   exact candidate.
8. Start the 72-hour soak only when those prerequisites are proven.
9. Issue the final production report and launch decision after the soak passes.

## Invariants

- No release gate is completed by elapsed calendar time.
- No stale device or build proof closes a different candidate.
- No candidate-only catalog row becomes canonical automatically.
- No database, Storage, pricing, or publication write is implied by shadow
  automation.
- No historical price evidence is deleted to reduce capacity pressure.
- Canonical identity, exact printing, authentication, and RLS boundaries remain
  fail closed.

## Exact Next Gate

Use the active full-scope pricing publication to capture the 17 deployed pricing
surfaces, while the fixed-code production-cycle observation continues. In
parallel, freeze one synchronized app release candidate and close Journeys A, C,
F, the cross-platform matrix, and store readback. Do not start the final 72-hour
app soak until those prerequisites are proven.
