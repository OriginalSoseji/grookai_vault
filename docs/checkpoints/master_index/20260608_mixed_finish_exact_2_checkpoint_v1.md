# Mixed Finish Exact Evidence Checkpoint 2 V1

Date: 2026-06-08

This checkpoint records a second audit-only guarded promotion of exact finish-second-source evidence after the mixed finish exact batch.

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
docs/audits/verified_master_set_index_v1/source_fixtures/generated_manual_web_exact_finish_v1/mixed_finish_exact_evidence_2_20260608.json
```

Accepted source-delta records:

- `pokescope_variant_exact`: 3
- `scrydex_variant_exact`: 1
- `bulbapedia_card_release_info`: 2
- `tcdb_checklist`: 1
- `pokellector_set_checklist`: 1

Accepted rows:

| set | number | card | finish | accepted source |
| --- | --- | --- | --- | --- |
| bw2 | 40 | Scolipede | holo | pokescope.app |
| bw6 | 98 | Hydreigon | holo | scrydex.com |
| neo1 | 105 | Recycle Energy | holo | bulbapedia.bulbagarden.net |
| ecard2 | 103 | Porygon | normal | pokescope.app |
| ecard2 | 103 | Porygon | reverse | pokescope.app |
| ex1 | 93 | Darkness Energy | cosmos | tcdb.com |
| sm4 | 75 | Jangmo-o | cosmos | bulbapedia.bulbagarden.net |
| swsh1 | 31 | Scorbunny | holo | pokellector.com |

## Guarded Promotion

Staging directory:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1_guarded_staging/2026-06-08T16-25-22-682Z-mixed-finish-exact-2-v1
```

Guard command:

```powershell
node scripts/audits/english_master_index_guarded_rebuild_v1.mjs --staging-dir docs\audits\verified_master_set_index_v1\english_master_index_v1_guarded_staging\2026-06-08T16-25-22-682Z-mixed-finish-exact-2-v1 --min-master-verified-printings 38815 --min-master-verified-cards 21511 --min-evidence-rows 232623 --max-candidate-printings 0 --max-conflicts 0 --allow-canonical-dedupe --promote
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
| master_verified_printings | 38,815 | 38,823 |
| evidence_rows | 232,623 | 232,631 |
| human_source_verified_printings | 31 | 23 |
| candidate_printings | 0 | 0 |
| conflicts | 0 | 0 |
| write_ready_now | 0 | 0 |

## Current Completion State

- complete_master_index_sets: 180
- incomplete_sets: 22
- working_card_identity_facts: 21,520
- master_admissible_card_identity_facts: 21,520
- working_printing_facts: 38,846
- master_admissible_printing_facts: 38,823
- finish_second_source_needed: 23
- suppressed_structured_claim_reviewed: 1,619

Remaining finish-second-source queue:

- stamped: 13
- holo: 3
- cosmos: 3
- normal: 4

## Source Delta After Promotion

The `manual_web_exact_finish_mixed_batch_2_20260608` lane now has:

- useful_candidate_matches: 0
- already_in_current_index: 31

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

Continue exact source acquisition for the remaining 23 finish-second-source rows. The next likely high-value targets are the remaining stamped rows and the SM/SV promo-style cosmos/normal rows, but only exact set/card/finish evidence may be accepted.
