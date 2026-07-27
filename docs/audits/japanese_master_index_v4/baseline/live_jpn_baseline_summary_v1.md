# Japanese Master Index V4 - Live Baseline

Generated: 2026-07-26T19:05:27.244Z

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

- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_parent_rows_v1/live_jpn_parent_rows_v1_0001_of_0006.json.gz` - `471795a70b3268469b9517663608977ea797275645b4e75e52dcfdaa5511d965`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_parent_rows_v1/live_jpn_parent_rows_v1_0002_of_0006.json.gz` - `9470e61632f627c7d2d2d179ad5d4a9b67713852fae633d1f5638e1d055f6313`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_parent_rows_v1/live_jpn_parent_rows_v1_0003_of_0006.json.gz` - `221b49aaa110f6c017767b3d6df561eef39cd1bb82e53db6dc2db8e321ac7282`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_parent_rows_v1/live_jpn_parent_rows_v1_0004_of_0006.json.gz` - `5104839109753d8626ad6a1a68a15d3c12082b44778fef90c2c5efd563b55d31`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_parent_rows_v1/live_jpn_parent_rows_v1_0005_of_0006.json.gz` - `cf237913c9e9ea0a61807990ce44ccfad75639b6a54f787c410dc9f4f5266690`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_parent_rows_v1/live_jpn_parent_rows_v1_0006_of_0006.json.gz` - `a8dd96d6d3e34a21d0513fcaadf5231e342853662dd432929711d673fe97d837`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_identity_rows_v1/live_jpn_identity_rows_v1_0001_of_0006.json.gz` - `27d0a9b294416b22ee740ce972cf7c97e9d8307ab349370344c355ffde8daad1`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_identity_rows_v1/live_jpn_identity_rows_v1_0002_of_0006.json.gz` - `0ccbe1d57df440a7e5bdd0ac532b18d65a5198ec3f1a4edf26a6cf33ed5035ac`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_identity_rows_v1/live_jpn_identity_rows_v1_0003_of_0006.json.gz` - `1bbeca8822b89bf340c99c395b6387164c13a3eaf3736902033cc5281cee02f2`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_identity_rows_v1/live_jpn_identity_rows_v1_0004_of_0006.json.gz` - `f9a10cb23042f912552553343e1314a6ebc2eabe10944762616fa21651bc3485`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_identity_rows_v1/live_jpn_identity_rows_v1_0005_of_0006.json.gz` - `02395d53c998e6c716f49e5c28d4cdbb778191ed8301ba11b862be6947214f76`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_identity_rows_v1/live_jpn_identity_rows_v1_0006_of_0006.json.gz` - `f6f6980508b396b56df95fcd0da5c59d5b5f77185a0fc60ac60e3914f8909d34`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0001_of_0024.json.gz` - `394e0dd71c8eef4ea6136614f32148298e882dfcd96ce581bacca4def850a586`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0002_of_0024.json.gz` - `098e9cf012d978256afd1fcf1d804dba448c8882b6b08be4887edc5d531edaad`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0003_of_0024.json.gz` - `5d0644a675af0faa1b5fa2cb61654eef9dc288fb11f66be544907498530ac92a`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0004_of_0024.json.gz` - `b555f8a8ea19673b1d4893fa890e582c4e722cf6fa2a817e3786f7b1ac4dd8f4`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0005_of_0024.json.gz` - `9a5b6b25c713744687cb23cacffa511428b467cc04ee8f2b2a3b34504d619fad`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0006_of_0024.json.gz` - `93c77dca8baafee2b60ee3f09d54536cf8765437c03c2d61ae0eb3ecda7ae365`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0007_of_0024.json.gz` - `e26550db5e9b0d14e5fe2dd8f2a08f92298f95ec14a4c8e894c82620ed3f8159`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0008_of_0024.json.gz` - `b8be0c465fe64b2b81567066938d88e185ee12ced3e69c2957e36d5c56755c17`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0009_of_0024.json.gz` - `a83120a7a24a5b49313078f0be42294ee939c4d733eaa25e336a9b45a2ac3dff`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0010_of_0024.json.gz` - `19446c6e35888ed75dfa2a4a2aec92181dd925a4f3cb8d8a31f94d977eb7512a`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0011_of_0024.json.gz` - `7ed999ffa7e9a3bf63ec8f028af4b5bc6494d74d686f8bfa0cc14aee60dd6aa1`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0012_of_0024.json.gz` - `782caaeb69d619ca1cd58ac5fc56f2db16d823de15f7b1dc4221ca63cad6d247`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0013_of_0024.json.gz` - `b99fe6c44cf2dc9d96be191dba60d13a75b53655e5d3119e885385b0d41b8f27`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0014_of_0024.json.gz` - `1d0bf13ae3bc4547612c2d3b71d98bb5b2c7bf5714ff61e2ffcb3c045967a668`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0015_of_0024.json.gz` - `b78d0449fc7d97db9aa2f2e3a84c385d51412d46727e600e563d54c588d76cdb`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0016_of_0024.json.gz` - `6bd2db6a3dc9ea6ffbd74fc6e77de7d4497ed17a73f7e4f50d1f9a252d20370b`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0017_of_0024.json.gz` - `1dae794561818e0396a4fc043d41c369be14a4e60237245194695856c53e9a8d`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0018_of_0024.json.gz` - `99e72ef642569b082f917416992f18c3ab86dde2d637013971629e130f330218`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0019_of_0024.json.gz` - `6e7c81a8be0a9cffd85656ceb4eb8ec88b1e3a651098f4b1ff4412bd4d98aa05`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0020_of_0024.json.gz` - `bc5355211902fd3d59c05da6d88de628948f41b048dac7a78601cef27c09a588`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0021_of_0024.json.gz` - `9ddd807c8b2dbfc3fdd5a687faede310459f4ab72ede42f8eb3d48854d776e06`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0022_of_0024.json.gz` - `c131764e9a86c7bfbb772a64e73ed301c16e111ebb68bdb1f053c764ee69eae8`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0023_of_0024.json.gz` - `4bc254690fc5621cd59f35dc022ce5e7dbf1a37b8647c9e6e144b142bf46272d`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_evidence_rows_v1/live_jpn_evidence_rows_v1_0024_of_0024.json.gz` - `a0402e94411ac83ec316747d0a5af02ffd16f8595271e580b572f94c3a1ac225`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_printing_rows_v1/live_jpn_printing_rows_v1_0001_of_0006.json.gz` - `a7130ed1cfef9413b9ae8c9c7e85b43689496aba0258940f4954440785e6e45c`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_printing_rows_v1/live_jpn_printing_rows_v1_0002_of_0006.json.gz` - `996b9feec3336f95679b345fddcda98d86405b597cffccbe36babe1ef70f1666`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_printing_rows_v1/live_jpn_printing_rows_v1_0003_of_0006.json.gz` - `f296b064dda96845c8ede08ac93b9858d4a0538e1c8d1b70c7d59bc94fab2455`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_printing_rows_v1/live_jpn_printing_rows_v1_0004_of_0006.json.gz` - `3d339a4799ebbc5ac26034e3a030617d5ee0ad4552409def4cade772776ebafc`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_printing_rows_v1/live_jpn_printing_rows_v1_0005_of_0006.json.gz` - `71223786ebfa30b1fb5bb315cfbabc8ddaa285ae94eb701cd9b5a1428fccd90c`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_printing_rows_v1/live_jpn_printing_rows_v1_0006_of_0006.json.gz` - `e0090eeedda2397548e3a2e1ca815a602834f6863b0fd6795c2bc4fe81fe3a65`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_family_review_rows_v1/live_jpn_family_review_rows_v1_0001_of_0006.json.gz` - `db45ab8c8c59cd27225f1b819408687a13f84e76757a33fbdc9c9c31760176ef`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_family_review_rows_v1/live_jpn_family_review_rows_v1_0002_of_0006.json.gz` - `2bfee524697e6a6865a75f0cd3757a52e8e51aa791b680a9887c4ca179358fc9`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_family_review_rows_v1/live_jpn_family_review_rows_v1_0003_of_0006.json.gz` - `3363ac226f22adfe9e7d4a125ffd295deaa2c6c8b8f57b1de804356341133c1e`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_family_review_rows_v1/live_jpn_family_review_rows_v1_0004_of_0006.json.gz` - `c4124908af60239db4a251fa091beb5533b43ed1c45890250abc57eb115d475c`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_family_review_rows_v1/live_jpn_family_review_rows_v1_0005_of_0006.json.gz` - `effa111b84785cf9b5a07bc60501a2b6b695835bc6acb3d59638f5f7be1ac475`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_family_review_rows_v1/live_jpn_family_review_rows_v1_0006_of_0006.json.gz` - `8a37bcfedbc5a4931f80c0f6c721f41923447487acaea902ea183063c7976fb7`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_species_link_rows_v1/live_jpn_species_link_rows_v1_0001_of_0004.json.gz` - `aa424e85b1711da820b68e125da0a9d9dc607f9db82287951fa3422807949bbc`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_species_link_rows_v1/live_jpn_species_link_rows_v1_0002_of_0004.json.gz` - `067ecb78a8ad3bb14e8091c95a367eb9f5cb3717d36f184364f82f959d90f425`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_species_link_rows_v1/live_jpn_species_link_rows_v1_0003_of_0004.json.gz` - `cf53556d679ff90d3b3b416a616afaa6ff607e8f3b8bd557430296a7f2b009ec`
- `docs/audits/japanese_master_index_v4/baseline/rows/live_jpn_species_link_rows_v1/live_jpn_species_link_rows_v1_0004_of_0004.json.gz` - `02363ed3e5168192fd3b6a521a7761547ec054026e2729bf6ebd0b3877fb6b34`
- `docs/audits/japanese_master_index_v4/baseline/rows/language_agnostic_species_rows_v1/language_agnostic_species_rows_v1_0001_of_0001.json.gz` - `bf52776ccbf09793b3cd9ff33f8d472d7774eb42ede6eca1ce268559634e7aa0`
- `docs/audits/japanese_master_index_v4/baseline/rows/english_family_card_rows_v1/english_family_card_rows_v1_0001_of_0004.json.gz` - `54cd7b76f6fbe549b9260ba670d83570c4fd4c611997fecf99c710ab3b49900c`
- `docs/audits/japanese_master_index_v4/baseline/rows/english_family_card_rows_v1/english_family_card_rows_v1_0002_of_0004.json.gz` - `5c33a20a802defbfd0ab80f59598d235aa8137d6e66383ed9fd9ad280c83595b`
- `docs/audits/japanese_master_index_v4/baseline/rows/english_family_card_rows_v1/english_family_card_rows_v1_0003_of_0004.json.gz` - `f9c99ed2e6bbdb320e30e74215e77d384706396ef6a4a8ac07a142e6514ba248`
- `docs/audits/japanese_master_index_v4/baseline/rows/english_family_card_rows_v1/english_family_card_rows_v1_0004_of_0004.json.gz` - `e790d7795e42df8706e4a80a26d0f5be8420d0fb5cde42301c9775696a75cd9f`
- `docs/audits/japanese_master_index_v4/baseline/rows/english_family_species_link_rows_v1/english_family_species_link_rows_v1_0001_of_0004.json.gz` - `0f4f9b49c05b100b685c750557aaf16c9136aa8046588aacdd0bf698441a7283`
- `docs/audits/japanese_master_index_v4/baseline/rows/english_family_species_link_rows_v1/english_family_species_link_rows_v1_0002_of_0004.json.gz` - `6144e6dbf5e241d2c61c024736e179bf7aa6125d2f8dc4bd68f5067b361eb4ef`
- `docs/audits/japanese_master_index_v4/baseline/rows/english_family_species_link_rows_v1/english_family_species_link_rows_v1_0003_of_0004.json.gz` - `769ae94ae1f2fc09c0333599aa0e149e90637c3704a0ee2b54643d5e54f50103`
- `docs/audits/japanese_master_index_v4/baseline/rows/english_family_species_link_rows_v1/english_family_species_link_rows_v1_0004_of_0004.json.gz` - `d4d9161b45e92bba1f4992ac28d533b8287f9bd40b6ca6f6e6c8f3a041b822c1`
- `docs/audits/japanese_master_index_v4/baseline/live_jpn_parent_summary_v1.json` - `694c502a075aa668525d0424be3e4479b97d6199d42d95bf632a7dad4aae6849`
- `docs/audits/japanese_master_index_v4/baseline/live_jpn_source_coverage_v1.json` - `691514f411aa0547fa5f8fabbf8950b1112571422a01c2dc3523fdaa5ecc8810`
- `docs/audits/japanese_master_index_v4/baseline/live_jpn_set_code_inventory_v1.json` - `9ba388a6174cdc22a710d2733a4b075d635dc6d6edc1c81af39e130bc5a0f5a1`
- `docs/audits/japanese_master_index_v4/baseline/live_jpn_identity_gap_queue_v1.json` - `652c2a128d216e6f036406738fad5fb67199f9062e557511c4d88ceb9de8319d`
- `docs/audits/japanese_master_index_v4/baseline/english_family_reference_fingerprint_v1.json` - `37dc822f23da123e2899074985198bfa0d564e780d20a1defbcda36069e01c64`
- `docs/audits/japanese_master_index_v4/baseline/live_jpn_source_manifest_v1.json` - `8efbe584ece2a30bfb52b2aa6b847bc53ca7dd14099652287a67e5562bf779b2`
- `docs/audits/japanese_master_index_v4/baseline/live_jpn_row_baseline_manifest_v1.json` - `0a8a5c9ab2a21e7c69ef81e575e55934c209906f8af5b7ee5e7d5707e8648156`
