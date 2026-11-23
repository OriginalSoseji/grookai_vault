# Retained-price compatibility with catalog 522 — November 23, 2026

This separate preview integrates pricing commit
`918e6cad0eca93487f440fb5ec6516bec72bbc1a` with catalog candidate
`4b5489e4dd4bc43d7f12933f63783c63e9a73dd6`. The catalog candidate is committed
but remains unapproved and unaccepted. Production was observed at ledger 521;
its three failed loaded SDK samples and shared main pause remain preserved.
This is local compatibility evidence, not a pricing or catalog release decision.

The owner's rule is unchanged: retain the last qualified exact published price
regardless of age and disclose the original source update date. Publication
freshness qualification and the Japanese 0.1% coverage guard remain unchanged.
No replacement publication, production SQL, main merge or deployment occurred.

The unchanged V16 `AuditLinkedSchema` gate passed before local schema work:
canonical 521, four governed schemas exact, security exact, zero production
writes. Its new proof is `release-gate-v16-pricing-compat-r1` under the existing
V16 operator root; this preview binds that result's exact SHA256.

The three source conflicts are resolved without changing operational V14/V15/V16
verifiers or the V15/V16 routing blocks. Test-only inventory assertions admit
exactly the 522 catalog-source migrations plus the original pricing SQL hash.
Extra, missing or altered SQL is rejected. The unchanged V16 operational gate
still rejects pending pricing source before database or private-artifact access.
All 25 protected pricing implementation/proof-source files match their original
qualified Git objects. Existing full normal checks belong to commit 918e6cad;
they are not transferred to this preview. The original pricing PR head and the
prior staged 521 preview remain preserved.

A new unlinked, internal-network owned lab uses project
`price-retain-combo-523-20261123`, database port 55560 and loopback-only relay
ports. Workers are disabled; no Auth users, Vault copies or production owner data
were seeded. It completed a genuine prefix reset, explicit 647 alias-pair and
22-parent catalog prerequisites, unchanged 521 replay and no-op. The official
CLI then dry-ran, applied and no-op verified the exact catalog 522 candidate.
Only its three intended function bodies changed; all 426 governed table
fingerprints and existing security metadata were preserved. No new empty 522
or 523 reset is claimed, and no populated lab was reset.

A durable synthetic accepted $31 quote with source date January 1, 2020 and a
newer accepted publication missing that quote was seeded locally. The old reader
withheld it on catalog 522. The official CLI pricing dry-run, 522-to523 apply and
no-op passed. Service SDK and authenticated database-role reads restored both
exact/parent values as available/stale with that original date; anonymous SDK
access remained denied. All 426 table fingerprints and existing security were
preserved. The pricing schema comparison permits only its four intended display
functions, with zero differences in the other three governed schemas.

Actual rollback-only RPC cases passed all four Gym Challenge editions, both
Jungle editions, Japanese Pokemon, MTG foil and One Piece. Missing successor
quotes retained amounts, dates and lineage. Retired bindings and invalidated
mappings still withheld only affected values. Normal constraints and triggers
stayed enabled, and every governed table's contents were preserved.

The dense synthetic model passed 207,246 snapshots and 101 accepted publications,
including 101 quotes per requested target. Three 400-row reads took
1.54–1.92 seconds locally. All fixture writes rolled back and all 426 table
fingerprints matched. This is not real production data, cold OS-cache timing,
worker/publication qualification or deployed API acceptance.

Private evidence root:
`C:/grookai_vault_operator_artifacts/pricing_visibility_schema_20261123/catalog522-compat-v1`.
Key receipts: `baseline-gate-binding.json`, `lab/replay-proof.json`,
`catalog-upgrade/result.json`, `retained-upgrade/result.json`,
`price-schema/result.json`, the three edition/cross-game reader results,
`dense-history-scale-reader-v1/result.json` and `source-preservation.json`.
The complete contract suite passed 9,103 cases with 11 existing declared skips
and zero failures. Final read-only verification passed exact installed pricing
and catalog definitions, all 426 table fingerprints, security equality and the
retained original source date after owned-lab vacuum/analyze maintenance.

At source freeze, this 41-file integration is entering the unchanged managed
commit and push hooks on its separate feature branch. Each hook must run the
complete shipcheck. Normal/hosted outcomes are recorded separately under
`normal-catalog522-v1`; they are not claimed by this preparation snapshot.
The earlier `catalog522-compat-v1` staged tree and local evidence remain immutable;
only the two handoff documents change for this commit preparation. The original
pricing PR head remains preserved. Full normal qualification does not lift the
shared pause, approve either SQL candidate, or establish release readiness.

After the catalog release is accepted and original controls are restored,
reconcile its final exact source/schema, complete retained-price release-gate
and normal/hosted qualification, prepare the bounded SQL release decision,
and verify actual deployed signed-in card and Vault prices and source dates.
