# TCGPlayer Market Shadow Gate 1

## Result

`PASS`

Three consecutive production shadow publication cycles completed from the same
frozen commit with deterministic counts, complete provenance, zero
reconciliation mismatches, and no customer activation.

## Frozen Authority

- Branch: `pricing/mee-productization-v1`
- Commit: `4f249cdb1f320cd46119a6af5302a59d0bae450b`
- Source sync run:
  `52068f31-2f07-4ad4-9000-83c4054d5b4a`
- Source observation date: `2026-07-28`
- Policy: `TCGPLAYER_MARKET_PUBLICATION_POLICY_V1`
- Worker: `TCGPLAYER_MARKET_PUBLICATION_WORKER_V1_1`
- Mode: `shadow`
- Freshness threshold: `36` hours
- Suppression threshold: `72` hours

The source run completed with:

- `9,192` provider requests
- `82` categories
- `4,554` groups
- `497,096` products
- `540,037` price rows
- `0` failures

The English Pokemon publication scope contained `45,082` source observations.

## Production Migrations

The following migrations were applied through the normal migration path:

- `20260728010000_tcgplayer_market_publication_v1.sql`
- `20260728020000_tcgplayer_market_candidate_view_performance_v1.sql`
- `20260728030000_tcgplayer_market_assignment_prepare_idempotency_v1.sql`

Schema, function, view, RLS, and grant readback proved:

- qualification decisions and publication snapshots are append-only
- internal publication ledgers are service-role-only
- ordinary clients cannot mutate publication state
- the shared product read model is authenticated-only at this gate
- the provenance trace remains service-role-only

## Shadow Cycles

| Cycle | Run ID | Selected | Mapped | Eligible | Quarantined | Excluded | Snapshots |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | `c18e5012-2531-4265-8f91-49a181e4c7cc` | 45,082 | 33,394 | 31,527 | 11,423 | 2,132 | 31,527 |
| 2 | `2cf44326-5ab5-44a7-a89c-b53eacfbf4b2` | 45,082 | 33,394 | 31,527 | 11,423 | 2,132 | 31,527 |
| 3 | `f0213faa-69e5-4d8c-bfd4-e9a9d160e763` | 45,082 | 33,394 | 31,527 | 11,423 | 2,132 | 31,527 |

All three cycles proved:

- run state `shadow_verified`
- reconciliation state `reconciled`
- `5/5` required phases succeeded on their first attempt
- no delayed or suppressed rows
- no reconciliation mismatches
- expected and actual snapshot counts matched exactly
- `0` snapshots with missing source artifact, artifact hash, source row hash, or
  qualification-decision lineage
- publication set state remained `staging`
- `published_at` remained null
- current-publication references remained `0`

Combined proof:

- `94,581` immutable staged publication snapshots
- `94,581` complete provenance chains
- `0` active customer-facing references

## Phase Reconciliation

Each cycle reported:

| Phase | Input | Output | Reconciled |
| --- | ---: | ---: | ---: |
| `prepare_variant_assignments` | 0 | 0 | 0 |
| `stage_candidates` | 45,082 | 45,082 | 45,082 |
| `qualify` | 45,082 | 45,082 | 0 |
| `build_publication` | 31,527 | 31,527 | 31,527 |
| `reconcile` | 45,082 | 31,527 | 31,527 |

The zero assignment count is expected. A measured precheck proved that all
required exact-child assignments already existed and safely skipped the
expensive no-op insertion.

## Lineage Repair

The fresh source acquisition initially proved that price observations lacked
their exact archived price artifact IDs. A guarded category-3 repair linked all
`45,082` observations to their exact immutable artifacts:

- missing before: `45,082`
- unmatched artifacts: `0`
- correctly linked after: `45,082`
- missing after: `0`

The repair changed only `source_artifact_id` and `source_archive_path`. It did
not write canonical identity, qualification decisions, publication snapshots,
activation state, or vault data.

## Local Artifact Integrity

Each cycle preserved:

- `run_plan.json`
- `pipeline_state.json`
- `publication.stdout.log`
- `publication.stderr.log`
- `health.stdout.log`
- `health.stderr.log`
- `artifact_hashes.json`

The recorded SHA-256 hashes for all three `run_plan.json` and
`pipeline_state.json` files match the files on disk.

Transient artifacts:

- `artifacts/market_pricing_product_v1/production_apply/shadow_cycles/TCGPLAYER-MARKET-SHADOW-FINALSHA-CYCLE1-20260728T0730Z/`
- `artifacts/market_pricing_product_v1/production_apply/shadow_cycles/TCGPLAYER-MARKET-SHADOW-FINALSHA-CYCLE2-20260728T0740Z/`
- `artifacts/market_pricing_product_v1/production_apply/shadow_cycles/TCGPLAYER-MARKET-SHADOW-FINALSHA-CYCLE3-20260728T0750Z/`

## Verification Notes

- Pricing, Node contract, web typecheck, web lint, web production build, and
  Flutter analyze gates passed before the frozen commit.
- The full commit hook encountered an unrelated transient Flutter test-runner
  failure. Re-running the complete Flutter suite alone completed successfully
  with exit code `0`.
- No customer publication was activated.
- No anonymous read boundary changed.

## Decision

Rollout Gate 1 is locked.

The exact next gate is the durable, stratified 100-printing canary definition
and image/data/provenance verification. It must not silently replace failed
samples. Only that verified allowlist may be activated for authenticated
collectors; anonymous reads remain gated.
