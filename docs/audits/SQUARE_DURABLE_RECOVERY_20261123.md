# Square durable recovery candidate — November 23, 2026

This candidate replaces time-selected merchant batches only when its new
server flag is enabled. Stored due times survive delayed clock delivery. Four
workers can admit up to 100 distinct sellers per invocation, using the existing
five-target automatic commerce service. Both cloud and scheduled CLI paths use
the same queue. Default-off paths and all business writers remain unchanged.

This is preparation for 100 vendors with 1,000 cards each. Neither synthetic
concurrency nor the larger admission ceiling proves daily pricing or actual
Square capacity. A separate pricing-drain candidate remains in PR1022; the
bounded live/sold read authority is inherited from PR1027. This branch adds no
manual-price, QR, label, onboarding or native installation changes.

## Starting state and immutable source

The fresh strict starting audit at schema 519 passed at
`hardening-v1/baseline519/gate-starting-v6`: eight complete schema comparisons,
2,629 security objects and the canonical data sanity counts. It made no writes.
The stock branch parent is `f54eb1dd77fd411888e2621b999bb4c4b9c38300`.
All 519 original migrations and both locally applied stock candidates retain
their exact bytes.

New migration `20261123011000` adds only private queue/run/attempt tables and
two functions. Its raw SHA256 is
`69c2a0e866d2b9d862f2e34f572f132c922b430540e3f91f38995006fb0e66c2`.
Its new-object metadata SHA256 is
`c09b273259e97fa327b7da7d95537e4083c6258ed5385d0f429433312e83f1e3`.
The migration became immutable at its first isolated persistent apply.

## Local evidence

Private, retained evidence lives under
`C:/grookai_vault_operator_artifacts/square_launch_readiness_20261122/hardening-v1/fair-recovery-v1`.
Early DDL/fixture-verifier failures remain failed historical evidence; no
business data, guard or applied SQL was changed to conceal them.

- The rollback-only actual-RPC preview passed 22 cases against 100 synthetic
  vendors and 100,300 exact-copy fixtures. Their source lab also contains 22
  separate earlier fixtures, retained throughout. Permission, child binding,
  expiry, replay, deadline and interrupted receipt checks passed. All fixture
  mutations rolled back and every protected fingerprint matched.
- Two independently cloned populated 521 labs upgraded to 522 through the
  official CLI and passed no-op pushes. Every 449 pre-existing table fingerprint
  and every 2,629 prior security definition remained exact. The three new tables
  were separately required to be empty. Eleven expected security objects were
  added, for 2,640 total. The first verifier stopped on the new empty tables;
  the recorded V2 comparison preserves that failure and verifies the permitted
  additions without excluding any original table.
- Complete public, Square, inventory and vendor-pricing schema/security
  comparison passed between those upgraded clones, with zero generated SQL
  differences. Generated diagnostic SQL was never executed.
- Twelve actual PostgreSQL claimants across two clock runs admitted 100 distinct
  sellers exactly once. A locked oldest queue row was skipped in 244ms. Actual
  existing child journals accepted 100 busy receipts without reporting checked
  targets. All original journal rows and business data remained exact. Populated
  exact-SQL replay was a no-op; a rolled-back unauthorized ACL change made its
  metadata guard fail closed.
- A separate empty lab completed a genuine prefix reset and all 522 source
  files through official CLI pushes/no-op. It uses the declared 647-pair
  synthetic historical prerequisite and 100 unchanged catalog-only INSERTs from
  the frozen Best of Game fixture. No owner statements were copied and no
  historical migration or guard was weakened. The source was deliberately
  staged through 512 before that known prerequisite, avoiding a repeated known
  historical guard failure.
- Complete fresh/retained four-schema comparison passed with 2,640 identical
  security objects. Two actual local Auth sessions then passed seven SDK/HTTP
  checks: owner workspace isolation; anonymous/owner/other-owner denial for
  every queue action; actual shared-client queue/child receipts; private health.
  The two-merchant business backend was explicitly journal-only and injected;
  no Square provider was contacted and no physical inventory was added.
- Official CLI experimental schema export passed with all 484 table
  fingerprints, ledger rows and security definitions unchanged. Its 1,876
  generated SQL files remain private and were never executed. The checked-in
  read-only inspection also passed on all three candidate labs.

These records qualify local boundaries. Full normal source/hosted checks must
be bound to the final candidate separately.
The ordinary historical shadow-diff path remains unqualified. An experimental
CLI export is not a waiver of the exact production PrePush/release gate.

## Verification and remaining gates

Run the unchanged `npm run square:test` selection. Its durable scheduler tests
cover 100 sellers, four-worker bounds, excess backlog, provider failure isolation,
busy/review/artwork outcomes, the deadline, receipt loss and terminal replay.
The real adapter/CLI tests verify private flag propagation, default-off behavior,
health and rejection before SDK initialization. The entry-point fixture replaces
only the SDK boundary; it cannot contact Supabase or Square.

After an authorized isolated apply, use
[the read-only verification SQL](../../scripts/schema/verify_square_durable_recovery_v1.sql)
to inspect permissions, RLS, claim/child bindings and aggregate health. It does
not seed, repair or activate anything. New local replay and failure/concurrency
proofs must use new owned labs; never reset or overwrite these retained records.

Real provider trials must measure the complete service's latency, throttling,
retry and acknowledgement at the launch target. Admission stops after 180 seconds;
existing network deadlines and platform execution limits remain, so slow work
can still produce an interrupted receipt. No daily freshness SLO follows from
theoretical target slots. Exact production schema qualification, current-main
integration, independent review, hosted checks, monitored clocks, alert delivery,
independent seller acceptance and owner reader checkout remain separate gates.

Square documents a single concurrent catalog update per seller and recommends
backoff for 429 responses. This candidate keeps seller writes serial and uses
concurrency only across sellers. See the official
[Catalog upsert reference](https://developer.squareup.com/reference/square/catalog-api/upsert-catalog-object)
and [error handling guide](https://developer.squareup.com/docs/build-basics/general-considerations/handling-errors).
These sources provide no numeric throughput guarantee for this workload.

No production apply, deployment, flag change, payment, main merge or app
installation occurred. The owner's active duplicate-set main merge pause
remains binding. Disabling this candidate restores legacy scheduling while
retaining all queue, stock, sale and request history.
