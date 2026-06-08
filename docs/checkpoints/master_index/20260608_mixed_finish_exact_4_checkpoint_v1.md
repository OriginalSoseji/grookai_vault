# Mixed Finish Exact Evidence Checkpoint 4 V1

Date: 2026-06-08

This checkpoint records a fourth audit-only guarded promotion of exact finish-second-source evidence after the mixed finish exact batch 3 checkpoint.

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
docs/audits/verified_master_set_index_v1/source_fixtures/generated_manual_web_exact_finish_v1/mixed_finish_exact_evidence_4_20260608.json
```

Accepted source-delta records:

- `pokescope_variant_exact`: 9

Accepted rows:

| set | number | card | finish | accepted source |
| --- | --- | --- | --- | --- |
| sm3 | 28 | Alolan Ninetales | holo | pokescope.app |
| sv03.5 | 7 | Squirtle | stamped | pokescope.app |
| sv03.5 | 45 | Vileplume | normal | pokescope.app |
| swsh1 | 178 | Professor's Research (Professor Magnolia) | stamped | pokescope.app |
| swsh10 | 156 | Trekking Shoes | stamped | pokescope.app |
| swsh11 | 162 | Lost Vacuum | stamped | pokescope.app |
| swsh7 | 80 | Marshadow | stamped | pokescope.app |
| xy4 | 93 | Dimension Valley | stamped | pokescope.app |
| xy9 | 113 | Splash Energy | stamped | pokescope.app |

## Excluded Rows

The fixture explicitly excluded five remaining rows because the available evidence did not prove the exact current gap fact:

| set | number | card | gap finish | reason excluded |
| --- | --- | --- | --- | --- |
| bw8 | 94 | Druddigon | holo | Available evidence distinguishes non-holo, reverse holo, and cracked ice holo; cracked ice was not collapsed into holo. |
| ex9 | 107 | Farfetch'd | normal | Available evidence identifies a secret rare holo context, not exact normal finish. |
| sm8 | 187 | Net Ball | stamped | Available league evidence points to 187a/214, not exact card number 187/214. |
| sv03.5 | 146 | Moltres | normal | Available evidence lists reverse holofoil and holofoil, not normal. |
| swsh3.5 | 62 | Professor's Research (Professor Magnolia) | normal | Available evidence lists holofoil and reverse holofoil, not normal. |

## Guarded Promotion

Staging directory:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1_guarded_staging/2026-06-08T18-24-41-148Z-mixed-finish-exact-4-v1
```

Guard command:

```powershell
node scripts/audits/english_master_index_guarded_rebuild_v1.mjs --staging-dir docs\audits\verified_master_set_index_v1\english_master_index_v1_guarded_staging\2026-06-08T18-24-41-148Z-mixed-finish-exact-4-v1 --min-master-verified-printings 38832 --min-master-verified-cards 21511 --min-evidence-rows 232640 --max-candidate-printings 0 --max-conflicts 0 --allow-canonical-dedupe --promote
```

Guard result:

- passed: true
- final_reports_promoted: true
- conflicts: 0
- candidate_printings: 0
- master_verified_printing_regressions: 0

## Baseline Delta

| metric | before | after |
| --- | ---: | ---: |
| master_verified_cards | 21,511 | 21,511 |
| master_verified_printings | 38,832 | 38,841 |
| evidence_rows | 232,640 | 232,649 |
| human_source_verified_printings | 14 | 5 |
| candidate_printings | 0 | 0 |
| conflicts | 0 | 0 |
| write_ready_now | 0 | 0 |

## Current Completion State

- complete_master_index_sets: 194
- incomplete_sets: 8
- working_card_identity_facts: 21,520
- master_admissible_card_identity_facts: 21,520
- working_printing_facts: 38,846
- master_admissible_printing_facts: 38,841
- finish_second_source_needed: 5
- suppressed_structured_claim_reviewed: 1,619

Remaining finish-second-source queue:

- normal: 3
- holo: 1
- stamped: 1

Remaining exact rows:

- `bw8` Plasma Storm #94 Druddigon `holo`
- `ex9` Emerald #107 Farfetch'd `normal`
- `sm8` Lost Thunder #187 Net Ball `stamped`
- `sv03.5` 151 #146 Moltres `normal`
- `swsh3.5` Champion's Path #62 Professor's Research (Professor Magnolia) `normal`

## Source Delta After Promotion

The `manual_web_exact_finish_mixed_batch_4_20260608` lane now has:

- useful_candidate_matches: 0
- already_in_current_index: 49

The only useful unabsorbed source-delta lane remains a `suppressed_structured_claim_reviewed` review signal. It was not accepted because suppressed structured claims are review context only and are not truth authority.

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

The remaining five rows should be treated as potential overgeneration, numbering, or finish-label conflicts unless exact independent evidence proves otherwise. Do not promote them from near matches.
