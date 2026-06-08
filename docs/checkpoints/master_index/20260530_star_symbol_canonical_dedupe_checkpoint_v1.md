# Star Symbol Canonical Dedupe Checkpoint V1

Generated: 2026-05-30

## Purpose

This checkpoint records the controlled normalization of Pokemon Star card names in the English Master Index.

Before this pass, the index could preserve duplicate card identities such as:

```text
Flareon Star
Flareon ★
```

These represent the same card identity. The normalized key now maps `★` and `☆` to the word `star`.

## Safety

```text
audit_only: true
db_writes_performed: false
migrations_created: false
cleanup_performed: false
quarantine_performed: false
```

## Guard Behavior

The normal raw-count guard correctly blocked the first staging build because raw master rows decreased.

The decrease was then proven to be canonical duplicate collapse:

| metric | baseline | staged |
| --- | ---: | ---: |
| raw master_verified_cards | 21547 | 21521 |
| canonical master_verified_cards | 21521 | 21521 |
| raw master_verified_printings | 38399 | 38378 |
| canonical master_verified_printings | 38378 | 38378 |
| candidate_printings | 34 | 32 |
| conflicts | 0 | 0 |
| evidence_rows | 232100 | 232119 |

The guard now supports:

```text
--allow-canonical-dedupe
```

This option is only valid when canonical master facts do not decrease. Candidate, conflict, and evidence-row guards still apply.

## Result

The promoted build removed two TCGdex-only candidate normal printings that were unsupported after canonical Star identity merge:

```text
ex16 100 Flareon Star normal
ex16 102 Vaporeon Star normal
```

The canonical holo printings remain represented by source-backed evidence.

## Current Promoted Baseline

| metric | value |
| --- | ---: |
| master_verified_printings | 38378 |
| canonical_master_verified_printings | 38378 |
| master_verified_cards | 21521 |
| canonical_master_verified_cards | 21521 |
| candidate_printings | 32 |
| finish_human_checklist_evidence_needed | 32 |
| remaining_gap_facts | 2078 |
| complete_master_index_sets | 102 |
| publishable_complete_sets | 102 |
| write_ready_now | 0 |

## Verification

Promotion command:

```powershell
node scripts\audits\english_master_index_guarded_rebuild_v1.mjs --staging-dir docs\audits\verified_master_set_index_v1\english_master_index_v1_guarded_staging\2026-05-30T00-16-49-392Z-star-symbol-normalization-v1 --min-master-verified-printings 38399 --min-master-verified-cards 21547 --min-evidence-rows 232100 --max-candidate-printings 34 --max-conflicts 0 --allow-canonical-dedupe --promote
```

Result:

```text
passed: true
final_reports_promoted: true
canonical_dedupe_allowed: true
```
