# WOTC Single Card Errors Guarded Dry Run V1

Rollback-only dry-run for source-ready WOTC single-card recognized error/correction lanes.

## Safety

- db_writes_performed: false
- durable_db_writes_performed: false
- transaction_writes_rolled_back: true
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- rollback_verified: true

## Scope

- parent_inserts: 8
- identity_inserts: 8
- child_inserts: 8
- deletes: 0
- merges: 0
- source_unique_finish_rows: 1

## Targets

| set | number | name | variant | modifier | finish | base_finishes |
| --- | --- | --- | --- | --- | --- | --- |
| base1 | 2 | Blastoise | stage_error | recognized_error:missing_stage_text | holo | holo |
| base1 | 12 | Ninetales | no_damage_error | recognized_error:no_damage | holo | holo |
| base1 | 42 | Wartortle | evolution_box_error | recognized_error:evolution_box_wartortle | normal | normal |
| base5 | 5 | Dark Dragonite | nonholo_error | recognized_error:nonholo_holo_number | normal | holo |
| basep | 17 | Dark Persian | no_hp_error | recognized_error:missing_hp | holo | holo |
| basep | 21 | Moltres | incorrect_artist_variant | text_variant:incorrect_artist_toshinao_aoki | normal | normal |
| basep | 22 | Articuno | incorrect_artist_variant | text_variant:incorrect_artist_toshinao_aoki | normal | normal |
| basep | 23 | Zapdos | incorrect_artist_variant | text_variant:incorrect_artist_toshinao_aoki | normal | normal |

## Result

- dry_run_status: wotc_single_card_errors_parent_insert_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `e86d05bb30c630306e57cc4bdab5ab53f6b101d050c0e395913a2e99798d6c61`
- sql_hash_sha256: `5ca77d000f034f205e014d638bed8a2ad163bf7b499d5dd752721f2245873347`
- dry_run_proof_sha256: `d8549f3b59828daf4894ab8dddf5ec7d95af102029506f51e7f0681fee1ce3f2`
- stop_findings: 0

## Approval Text

```text
Approve real SPECIAL-VAR-03-WOTC-SINGLE-CARD-ERROR-PARENT-INSERTS apply only. Fingerprint: e86d05bb30c630306e57cc4bdab5ab53f6b101d050c0e395913a2e99798d6c61. SQL hash: 5ca77d000f034f205e014d638bed8a2ad163bf7b499d5dd752721f2245873347. Scope: 8 WOTC single-card special-case parent inserts, 8 active identity inserts, 8 child printing inserts; source_unique_finish_rows=1; sets base1=3, base5=1, basep=4. Dry-run proof: 2b49d3651a487f226efde4207a41711e345e66e0960627ed45f7eb6016138abf == 2b49d3651a487f226efde4207a41711e345e66e0960627ed45f7eb6016138abf. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.
```
