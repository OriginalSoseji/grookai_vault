# Japanese Master Index V4 Candidate Union

Generated: `2026-07-27T01:00:00.000Z`
Status: `complete_primary_and_targeted_source_union`

## Boundary

- Database writes: `false`
- Storage writes: `false`
- Canonical ID allocation: `false`
- English family mutation: `false`

## Included Sources

| Tier | Lane | Containers | Assertions | Status |
|---|---|---:|---:|---|
| primary | artofpkm_jp_cards | 419 / 419 | 23015 | complete |
| primary | limitless_jp_cards | 262 / 262 | 19904 | complete |
| primary | official_jp_cards | 137 / 137 | 9843 | complete |
| primary | serebii_jp_cards | 165 / 165 | 14477 | complete |
| primary | tcgdex_ja_cards | 177 / 177 | 8159 | complete |
| targeted | bulbapedia_jp_card_lists | 152 / 152 | 18113 | complete |
| targeted | pokeguardian_release_reports | 54 / 54 | 5684 | complete |

## Candidate Summary

- Existing JPN parents: **26047**
- Fresh source assertions: **99195**
- Novel conservative candidates: **15778**
- Source-isolated review candidates: **30167**
- Unresolved source assertions: **5577**
- Conservative distinct identity lower bound: **41825**
- Source-isolated upper bound: **71992**
- Conflict rows: **50952**
- Exact novel species projections: **16455**

## Datasets

| Dataset | Rows | Fingerprint |
|---|---:|---|
| source_assertion_union_rows_v1 | 215784 | `02bc40e9d209aa0e960309eb175d1d4ac76f04d08d1b5bf67b2d97af6ae00f91` |
| assertion_resolution_rows_v1 | 99195 | `7248966ec08ad81d9124b2845183864d008d989ed5b1cf2500b91a6b00ed7094` |
| identity_candidate_rows_v1 | 71992 | `fc314a92b510a80ecf0b7dd1cc131a6d7befe8fbea80e8c91c0750a0c184ace9` |
| printing_candidate_rows_v1 | 71900 | `ddbe02bfd89c613a16cfe3cc5a2ed5bae75d66da36a085f9a35a611e73e94802` |
| master_family_card_nodes_v1 | 91186 | `11256524f62e90ab999b7b5646b2416750075a774cd0b47a1075b02e2177a37f` |
| master_family_species_links_v1 | 55479 | `d753238878b07622624e7f3291e5bfb649463f2d3b3bdc1b22908baa2aa65ab4` |
| novel_family_projection_rows_v1 | 45945 | `bd47556e4bcff6a72e2f502fe6db8f2bc1fcb7587259a3338ea307f9fc09c636` |
| candidate_conflict_rows_v1 | 50952 | `157a525d08cf72f62e4347ed63d909ba480d0c8ed4de7987e9bab34a36e9eb55` |

All novel IDs in these artifacts are logical candidate keys only. Nothing in this package is a database promotion payload.
