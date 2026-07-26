# Japanese Master Index V4 - Live Baseline

Generated: 2026-07-26T16:13:34.989Z

## No-Write Proof

- Guard: `JPN-MASTER-INDEX-READ-ONLY-GUARD-V1`
- Transaction read-only: `on`
- Session default read-only: `on`
- Environment key: `61d459daf5f223a85616f5fd30307724e62e19ba1e987225bb7d759f39ea9226`
- Database writes: **false**
- Storage writes: **false**

## Current Japanese Graph

| Measure | Count |
|---|---:|
| Japanese parent rows | 26047 |
| Public Japanese GV IDs | 25985 |
| Active Japanese identities | 25953 |
| Japanese child printings | 25953 |
| Raw set codes | 504 |
| Case-folded set codes | 388 |
| Case-only alias groups | 116 |
| Source-placeholder sets | 45 |
| Cards under source-placeholder sets | 1297 |
| No public GV ID or image | 62 |
| No active identity or evidence lane | 94 |

## Plan Baseline Drift

| Measure | Expected | Actual | Delta |
|---|---:|---:|---:|
| jpn_parent_rows | 26047 | 26047 | 0 |
| public_jpn_gv_ids | 25985 | 25985 | 0 |
| active_jpn_identities | 25953 | 25953 | 0 |
| jpn_child_printings | 25953 | 25953 | 0 |
| raw_set_codes | 504 | 504 | 0 |
| case_folded_set_codes | 388 | 388 | 0 |
| case_only_alias_groups | 116 | 116 | 0 |
| source_placeholder_sets | 45 | 45 | 0 |
| cards_in_source_placeholder_sets | 1297 | 1297 | 0 |
| no_public_gv_or_image_rows | 62 | 62 | 0 |
| no_active_identity_or_evidence_rows | 94 | 94 | 0 |

Drift is evidence, not an automatic error. Every delta remains in the baseline
and must be reconciled by the index build.

## Stored Evidence Lanes

| Source | Evidence rows | Parent cards |
|---|---:|---:|
| artofpkm_jp | 23868 | 23868 |
| bulbapedia_jp_card_list | 3977 | 3977 |
| bulbapedia_pikachu_tcg | 134 | 134 |
| limitless_tcg_jp | 18462 | 18462 |
| pokellector_jp | 17734 | 17734 |
| pokemon_card_official_jp | 21294 | 21235 |
| tcgcollector_jp | 25059 | 25059 |
| tcgdex_ja | 6061 | 6061 |

## Gap Classification

- Identity/evidence gap rows: 94
- Private or no-image rows: 62
- Classifications: `{"superseded_duplicate_shell":62,"new_set_release_identity_or_evidence_pending":32}`

## Set Inventory

- Exact source set codes: 504
- Case-folded set codes: 388
- Case-only alias groups: 116
- Source-placeholder set codes: 45

## English Reference Freeze

- Active species rows: 1025
- Active English species links: 19346
- Combined fingerprint: `7aaa2d3c4d14e379515a33a60bc19444b4333c4ba6ecc1c0a2a8c2eea52669db`

## Artifacts

- `docs/audits/japanese_master_index_v4/baseline/live_jpn_parent_summary_v1.json` - `a7e5f32dfe25635e40263f6f86d8252e90813e3f7dd4453af479c11311a51062`
- `docs/audits/japanese_master_index_v4/baseline/live_jpn_source_coverage_v1.json` - `2b7a7fe48c13943ba321ed20142252c08946e18a16d89ff2ec4442e2ddc4aa74`
- `docs/audits/japanese_master_index_v4/baseline/live_jpn_set_code_inventory_v1.json` - `51cdd2c4e113cec615a0f08fe945c180953aa6a8c09febc19f6491ca7bce60e8`
- `docs/audits/japanese_master_index_v4/baseline/live_jpn_identity_gap_queue_v1.json` - `6f8223ed1a436de2a553376ffeb459a4989402c652ea041357d1af4921a546f8`
- `docs/audits/japanese_master_index_v4/baseline/english_family_reference_fingerprint_v1.json` - `5945d4b353fa93def41927d5ab6a9b9345642296ff1f8a579494b75bd9ad9482`
- `docs/audits/japanese_master_index_v4/baseline/live_jpn_source_manifest_v1.json` - `311e2cad80f80f32dbeb2c05ebdd72fd8a131d9f37d418f1517274b6e369195c`
