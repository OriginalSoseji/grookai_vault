# Mixed Finish Exact Evidence Checkpoint 3 V1

Date: 2026-06-08

This checkpoint records a third audit-only guarded promotion of exact finish-second-source evidence after the mixed finish exact batch 2 checkpoint.

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
docs/audits/verified_master_set_index_v1/source_fixtures/generated_manual_web_exact_finish_v1/mixed_finish_exact_evidence_3_20260608.json
```

Accepted source-delta records:

- `pokescope_variant_exact`: 4
- `bulbapedia_sm_black_star_promos`: 3
- `tcgplayer_price_guide`: 1
- `pricecharting_product_page`: 1

Accepted rows:

| set | number | card | finish | accepted source |
| --- | --- | --- | --- | --- |
| ex14 | 42 | Wartortle | stamped | pokescope.app |
| sm2 | 126 | Hala | stamped | pokescope.app |
| xy3 | 102 | Training Center | stamped | pokescope.app |
| xy8 | 103 | Florges | stamped | pokescope.app |
| xy2 | 31 | Avalugg | stamped | tcgplayer.com |
| smp | SM198 | Bulbasaur | cosmos | bulbapedia.bulbagarden.net |
| smp | SM199 | Psyduck | cosmos | bulbapedia.bulbagarden.net |
| smp | SM200 | Snubbull | cosmos | bulbapedia.bulbagarden.net |
| sm10 | 60 | Zeraora | holo | pricecharting.com |

## Guarded Promotion

Staging directory:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1_guarded_staging/2026-06-08T17-53-18-365Z-mixed-finish-exact-3-v1
```

Guard command:

```powershell
node scripts/audits/english_master_index_guarded_rebuild_v1.mjs --staging-dir docs\audits\verified_master_set_index_v1\english_master_index_v1_guarded_staging\2026-06-08T17-53-18-365Z-mixed-finish-exact-3-v1 --min-master-verified-printings 38823 --min-master-verified-cards 21511 --min-evidence-rows 232631 --max-candidate-printings 0 --max-conflicts 0 --allow-canonical-dedupe --promote
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
| master_verified_printings | 38,823 | 38,832 |
| evidence_rows | 232,631 | 232,640 |
| human_source_verified_printings | 23 | 14 |
| candidate_printings | 0 | 0 |
| conflicts | 0 | 0 |
| write_ready_now | 0 | 0 |

## Current Completion State

- complete_master_index_sets: 187
- incomplete_sets: 15
- working_card_identity_facts: 21,520
- master_admissible_card_identity_facts: 21,520
- working_printing_facts: 38,846
- master_admissible_printing_facts: 38,832
- finish_second_source_needed: 14
- suppressed_structured_claim_reviewed: 1,619

Remaining finish-second-source queue:

- stamped: 8
- normal: 4
- holo: 2

## Source Delta After Promotion

The `manual_web_exact_finish_mixed_batch_3_20260608` lane now has:

- useful_candidate_matches: 0
- already_in_current_index: 40

The only useful unabsorbed source-delta lane is `tcgcollector_card_variants`, but its useful row is a `suppressed_structured_claim_reviewed` review signal for `me01` Lunatone normal. It was not accepted because suppressed structured claims are review context only and are not truth authority.

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

Continue exact source acquisition for the remaining 14 finish-second-source rows. Do not promote suppressed structured claims. The next likely target group is the remaining stamped rows, followed by the two holo rows and four normal rows, but only exact set/card/finish evidence with source URL and evidence label may be accepted.
