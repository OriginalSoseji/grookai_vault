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
- Branch used for isolated work: `fix/mee-health-bounded-current-run`
- Signed APK workflow: `33279077708`, success
- Signed APK artifact ID: `9722522874`
- Signed artifact archive digest:
  `sha256:a3d97950b05395a8cf000597512d30f4113fac89282b6092d3438714b76b2d5d`
- CodeQL workflow: `33279077479`, success
- Runtime contracts: `33279077700`, success
- Legacy-key guard: `33279077697`, success
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

The fresh full-scope shadow is run `33279087655` on exact SHA `8457d828`.
At checkpoint drafting time it is still in progress and remains shadow-only.
The lock-loss repair now aborts a child when the advisory-lock connection drops,
reacquires the lock, and permits one bounded retry without changing the durable
run key.

Pricing is not fully released until all of the following occur:

1. the full-scope shadow passes and artifacts reconcile;
2. all 17 required product surfaces are captured and reconciled against the
   shared pricing read model;
3. signed-in full-eligible publication is activated through the governed gate;
4. seven unattended full-production cycles pass.

No full-scope publication activation is authorized by this checkpoint.

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
- Expanded collectibles: 20 adapters registered, 16 probed daily, 2 typed
  parsers, no automatic writers.

The expanded background system is an evidence and candidate factory, not a
completed cross-collectible canonical catalog. That distinction is intentional.

## Supabase

See `../infrastructure/2026-08-29_SUPABASE_PRODUCTION_CAPACITY_READBACK_V2.md`.

Current production capacity:

- project `ACTIVE_HEALTHY`;
- Medium compute;
- 320 GB gp3 disk;
- 71.68% utilization;
- 95.75 GB available;
- 600 GB autoscale ceiling;
- effective paid-plan autoscale growth 50%;
- all five monitored services healthy.

The immediate infrastructure is adequate for a controlled launch. Fast evidence
growth still requires a no-delete retention and partitioning design. Spend Cap
state is not exposed by the supported project API and is not inferred here.

## What Is Complete

- Core product implementation and major collector journeys exist.
- Production search is functional after the v4 repair.
- One Piece and MTG signed-in catalog foundations are functional.
- TCGPlayer canary behavior is proven.
- Production Supabase is healthy with materially improved capacity.
- Core catalog discovery, reconciliation, Pokemon indexing, and MTG supervision
  are unattended and fail closed.
- Current CI on the repaired pricing SHA is green.

## What Is Not Complete

- Full-scope MEE publication and seven-cycle proof.
- All 17 deployed pricing-surface captures.
- One synchronized final web/Android/iOS candidate.
- Five non-soak release prerequisites and the final 72-hour soak.
- Typed parsing for most newly registered collectible adapters.
- Three anti-bot official-source probes and a licensed comics source.
- A no-delete high-volume price-evidence retention implementation.
- Final reconciliation of the current Google Play and TestFlight release state
  into the completion manifest.

## Ordered Completion Plan

1. Finish and reconcile MEE run `33279087655`.
2. Commit and live-prove the no-write parser schedule, source URL repairs, and
   capacity audit correction.
3. If the MEE shadow passes, capture all 17 pricing surfaces and activate the
   bounded signed-in full-eligible pricing publication.
4. Observe seven unattended pricing cycles.
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

Wait for full-scope MEE run `33279087655` to reach a terminal state, preserve and
hash its artifacts, and classify its result. In parallel, commit and run the
no-write catalog and capacity monitors. Do not freeze the final release candidate
or start the soak until the pricing result is known.

