# Mixed Finish Exact Evidence Checkpoint V1

Date: 2026-06-08

This checkpoint records an audit-only guarded promotion of exact second-source finish evidence for a mixed finish batch.

## Scope

- English Master Index only.
- Audit/report/fixture files only.
- No DB writes.
- No migrations.
- No cleanup.
- No quarantine.
- No apply runner.

## Accepted Evidence

Manual URL/evidence-label fixture:

```text
docs/audits/verified_master_set_index_v1/source_fixtures/generated_manual_web_exact_finish_v1/mixed_finish_exact_evidence_20260608.json
```

Accepted source-delta records:

- `pokescope_variant_exact`: 5
- `bulbapedia_card_release_info`: 1
- `pokumon_special_print`: 1
- `sports_card_investor_variant_exact`: 1
- `pricecharting_variant_exact`: 1
- `pokemonwizard_variant_exact`: 1

Accepted rows:

| set | number | card | finish | accepted source |
| --- | --- | --- | --- | --- |
| dp1 | 112 | Professor Rowan | stamped | pokescope.app |
| dp3 | 106 | Shellos East Sea | stamped | bulbapedia.bulbagarden.net |
| ex4 | 24 | Team Aqua's Cacnea | stamped | pokumon.com |
| ex6 | 98 | Prof. Oak's Research | stamped | sportscardinvestor.com |
| sm1 | 90 | Snubbull | stamped | pricecharting.com |
| swsh4 | 71 | Dusknoir | stamped | pokescope.app |
| swsh2 | 39 | Magikarp | cosmos | pokescope.app |
| cel25 | 24 | _____'s Pikachu | holo | pokescope.app |
| xyp | XY176 | Champions Festival | normal | pokemonwizard.com |
| xyp | XY202 | Pikachu | holo | pokescope.app |

## Guarded Promotion

Staging directory:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1_guarded_staging/2026-06-08T15-52-00-592Z-mixed-finish-exact-v1
```

Guard command:

```powershell
node scripts/audits/english_master_index_guarded_rebuild_v1.mjs --staging-dir docs\audits\verified_master_set_index_v1\english_master_index_v1_guarded_staging\2026-06-08T15-52-00-592Z-mixed-finish-exact-v1 --min-master-verified-printings 38805 --min-master-verified-cards 21511 --min-evidence-rows 232613 --max-candidate-printings 0 --max-conflicts 0 --allow-canonical-dedupe --promote
```

Guard result:

- passed: true
- final_reports_promoted: true
- conflicts: 0
- candidate_printings: 0

## Baseline Delta

| metric | before | after |
| --- | ---: | ---: |
| master_verified_cards | 21,511 | 21,511 |
| master_verified_printings | 38,805 | 38,815 |
| evidence_rows | 232,613 | 232,623 |
| human_source_verified_printings | 41 | 31 |
| candidate_printings | 0 | 0 |
| conflicts | 0 | 0 |
| write_ready_now | 0 | 0 |

## Current Completion State

- complete_master_index_sets: 174
- incomplete_sets: 28
- working_card_identity_facts: 21,520
- master_admissible_card_identity_facts: 21,520
- working_printing_facts: 38,846
- master_admissible_printing_facts: 38,815
- finish_second_source_needed: 31
- suppressed_structured_claim_reviewed: 1,619

Remaining finish-second-source queue:

- holo: 7
- normal: 5
- reverse: 1
- cosmos: 5
- stamped: 13

## Source Delta After Promotion

Manual web exact finish lanes now have no useful unabsorbed matches:

- `manual_web_exact_finish_batch_20260608`: 0 useful
- `manual_web_exact_finish_mixed_batch_20260608`: 0 useful

The only useful unabsorbed source-delta lane remains the suppressed TCGCollector review claim. It is not accepted because suppressed structured claims are review context only.

## Safety Confirmation

```json
{
  "db_writes_performed": false,
  "migrations_created": false,
  "cleanup_performed": false,
  "quarantine_performed": false,
  "write_ready_now": 0
}
```

## Next Safe Work

Continue exact source acquisition for the remaining 31 finish-second-source rows. Do not accept suppressed structured claims, broad variant assumptions, title-only near matches, or any source that fails exact set/card/finish matching.
