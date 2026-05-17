# Pokemon DB Remediation V1 Checkpoint - 2026-05-17

Status: checkpoint only. This document authorizes no Supabase writes, migrations, inserts, updates, deletes, route writes, card backfills, variant writes, or production data mutation.

## Current Repository And Release State

This checkpoint captures the state before any further Pokemon DB work:

| Item | State |
| --- | --- |
| Working branch | `scanner-v4-card-present-gate` |
| Working branch HEAD | `9d32c81` |
| Verified `origin/main` | `394b39e` |
| Local `main` checkout | stale at `9b2abf4`; do not treat it as release truth without `git pull` |
| Latest release commit | `394b39e edge: preserve supabase secret compatibility` |
| Public deployment | verified through the production site after the route work |

The remaining dirty worktree items at checkpoint time are unrelated to this checkpoint and must not be swept into DB remediation commits:

- `.flutter-plugins-dependencies`
- `docs/audits/pokemon_master_set_audit_v1/`
- `scripts/audits/pokemon_master_set_audit_v1.mjs`

## Release And CI Verification

The route/classification work has been merged to `origin/main`, deployed, and checked through the production site.

| Check | Result |
| --- | --- |
| Contracts Drift Gate | passed on `main` after `SUPABASE_DB_URL` secret repair |
| Contracts Runtime Protection | passed on `main` |
| Guard: No Legacy Keys | passed on `main` at `394b39e` |
| Prod Edge Probe | passed on `main` at `394b39e` |
| `npm run preflight` | passed with deferred debt only |
| Web typecheck/lint | passed; lint retained one existing app warning unrelated to DB remediation |

Production route/search checks passed for:

- `https://grookaivault.com/search?q=shiny-vault` -> visible `sma` cards
- `https://grookaivault.com/search?q=shiny%20vault` -> visible `sma` cards
- `https://grookaivault.com/search?q=rm` -> visible `ru1` cards
- `https://grookaivault.com/search?q=sv3pt5` -> visible `sv03.5` cards
- `https://grookaivault.com/search?q=sm35` -> visible `sm3.5` cards

## Non-DB Source Changes In Release

The latest release included CI/guard and Edge source compatibility changes only. No Edge function deploy was performed as part of this checkpoint.

Touched Edge function source files and purpose:

| Function | Purpose |
| --- | --- |
| `scan-upload-plan` | Creates signed upload URLs for condition scan image slots. |
| `scan-read` | Creates signed read URLs for condition snapshot images. |
| `identity_scan_enqueue_v1` | Enqueues identity scans from condition or identity snapshots. |
| `pricing-live-request` | Checks pricing freshness and queues pricing work. |
| `ingestion-enqueue-v1` | Enqueues authenticated ingestion jobs. |
| `import-prices-v3` | Deprecated/historical import-prices pipeline. |
| `import-prices-bridge` | Deprecated/historical import-prices bridge. |
| `ebay_oauth_callback` | Disabled/fail-closed eBay account-linking callback. |

Touched shared Edge helpers:

- `_shared/auth.ts`
- `_shared/key_resolver.ts`

`wall_feed` was probed by CI but not edited.

## Complete Planning Chain

The remediation chain now has reviewable no-write artifacts for each required phase:

| Phase | Status | Primary artifacts |
| --- | --- | --- |
| Set canonicalization | Planned and dry-run audited | `set_canonicalization_plan.md`, `set_canonicalization_dry_run_20260517.md` |
| Alias dependency evidence | Planned and audited | `set_alias_dependency_audit_20260517.md`, `set_alias_prewrite_evidence_20260517.md` |
| Alias route classification | Planned, executed only for approved route fixes, verified | `set_alias_route_classification_write_plan_20260517.md`, `set_alias_route_classification_execution_20260517.md` |
| Alias metadata preservation | Planned only | `set_alias_metadata_preservation_plan_20260517.md` |
| Missing set universe | Classified only | `missing_set_universe_decision_20260517.md` |
| Number normalization | Evidence, candidate matrix, collision investigation, `me01` ownership/design pack, and dry-run plan only | `number_normalization_evidence_20260517.md`, `number_normalization_candidate_evidence_20260517.md`, `number_normalization_collision_investigation_20260517.md`, `number_normalization_me01_duplicate_ownership_20260517.md`, `number_normalization_me01_duplicate_resolution_design_20260517.md`, `number_normalization_dry_run_implementation_plan_20260517.md` |
| Missing card checklist backfill | Evidence and dry-run plan only | `missing_cards_backfill_evidence_20260517.md`, `missing_cards_backfill_dry_run_implementation_plan_20260517.md` |
| Variant authority | V2 authority plan only | `variant_authority_model_v2_plan_20260517.md` |

## Actually Written

Approved DB route-classification mutations in Pokemon DB Remediation V1:

| Scope | Rows | Result |
| --- | ---: | --- |
| `set_code_classification.sv3pt5` | 1 | routed/classified to canonical `sv03.5` |
| `set_code_classification.sm35` | 1 | inserted as alias route/classification to canonical `sm3.5` |
| `set_code_classification.shiny-vault` | 1 | inserted as source route/classification to canonical `sma` |
| `set_code_classification.rm` | 1 | inserted as source route/classification to canonical `ru1` |

Boundary of the executed write:

- no card rows moved
- no set rows deleted
- no alias rows deleted
- no metadata merged
- no external mappings moved
- no missing cards inserted
- no variants inserted
- no migrations

The executions are documented in:

- `set_alias_route_classification_execution_20260517.md`
- `source_route_classification_execution_20260517.md`

## Remains No-Write

The following remain planning/evidence only:

- all remaining alias metadata preservation decisions
- all set-row canonicalization or alias-row structural changes
- all missing-set target creation and any source-route changes beyond `shiny-vault -> sma` and `rm -> ru1`
- all number normalization writes
- all missing-card checklist backfill writes
- all secret-range card decisions
- all variant authority/schema/backfill work
- all pricing, vault, scanner, and route changes outside the two executed classifications

## Blocked Hard Stops

These canonicalization groups remain blocked and must not enter any broad write scope:

| Name key | Codes | Reason |
| --- | --- | --- |
| Paldean Fates | `sv04.5` / `sv4pt5` | both sides own unique real card identities |
| Pokemon GO | `pgo` / `swsh10.5` | both sides own unique real card identities |
| Prismatic Evolutions | `sv08.5` / `sv8pt5` | both sides own unique real card identities |
| Shrouded Fable | `sv06.5` / `sv6pt5` | both sides own unique real card identities |

Number normalization also inherits these blocks for rows in the same set groups.

## Review Stops

These canonicalization groups remain review stops because both sibling sets contain overlapping duplicate card rows:

| Name key | Codes |
| --- | --- |
| Best of Game | `bog` / `bp` |
| EX Trainer Kit 2 Minun | `tk-ex-m` / `tk2b` |
| EX Trainer Kit 2 Plusle | `tk-ex-p` / `tk2a` |
| EX Trainer Kit Latias | `tk-ex-latia` / `tk1a` |
| EX Trainer Kit Latios | `tk-ex-latio` / `tk1b` |

No write plan should include these without a dedicated source-authority decision.

## Current Evidence Totals

| Area | Result |
| --- | ---: |
| Physical Pokemon set rows audited | 239 |
| PkmnCards master set/collection pages parsed | 194 |
| Master checklist rows parsed | 20,884 |
| Missing checklist rows vs PkmnCards | 617 |
| Missing secret-range cards | 30 |
| Missing master sets with no DB match | 18 |
| Duplicate physical set-name groups | 29 |
| DB variant slots | 2,901 |
| TCGdex variant signals | 21,066 |
| PokemonTCG/TCGPlayer variant signals | 32,449 |

## Next Authorized Implementation Queue

No implementation is authorized by this checkpoint. If authorization is granted later, the queue should remain narrow and evidence-gated:

1. Route/classification follow-ups: none immediate; route review queue is currently clean after `sv3pt5`, `sm35`, `shiny-vault`, and `rm`.
2. Alias metadata: source-payload diff only before any null-only metadata copy is considered.
3. Missing set universe: target-set dry-run for TCG Classic decks and source-route proof for Shiny Vault/Rumble before card rows.
4. Number normalization: the 504 numeric non-hard-stop rows are now split into 248 clean future write-plan candidates and 256 collision-blocked rows; collision investigation classifies the blocked rows as 154 likely duplicate import rows, 27 same-card duplicate-review rows, and 75 same-number/different-card ambiguities. `me01` is now proven as 83 duplicate ownership pairs, including 2 user/market hard stops, with a no-write duplicate resolution design. Do not treat all 504 as a write scope.
5. Missing cards: no direct import; start only with established-set candidate dry-runs after set and number blockers clear.
6. Variants: freeze writes until `VARIANT_AUTHORITY_MODEL_V2` is approved and a read-only source vocabulary inventory exists.
7. Hard stops: separate evidence investigations only, one group at a time.

## Release Impact

The only production-visible DB changes are route/search classification rows for `sv3pt5`, `sm35`, `shiny-vault`, and `rm`. Those should improve alias/source routing without changing canonical cards, set rows, metadata, mappings, vault ownership, pricing, or variants.

All other remediation work is documentation, evidence, and dry-run planning. It should not change runtime behavior until a future explicitly authorized write plan is executed.

## Stop Condition

Stop before any further Supabase mutation. The next task may draft more evidence or SQL dry-run plans, but it must not execute writes unless explicitly authorized with a fresh preflight and a narrow transaction scope.
