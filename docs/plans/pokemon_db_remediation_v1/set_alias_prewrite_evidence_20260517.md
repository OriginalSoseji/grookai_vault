# Set Alias Prewrite Evidence - 2026-05-17

Status: no-write evidence pack for the 20 approved alias candidates only. The script used live read-only Supabase queries inside `begin transaction read only`; it did not perform writes, migrations, inserts, updates, deletes, merge operations, alias changes, migration repair, `db pull`, or production mutation.

## Source Inputs

- `docs/plans/pokemon_db_remediation_v1/set_alias_write_plan_dry_run_20260517.md`
- `docs/plans/pokemon_db_remediation_v1/set_alias_write_plan_matrix_20260517.json`
- `docs/plans/pokemon_db_remediation_v1/set_alias_dependency_audit_20260517.md`
- `docs/plans/pokemon_db_remediation_v1/set_alias_dependency_matrix_20260517.json`

## Scope Guard

The audit fails closed if any hard-stop or review-stop code appears in the input. The scoped hard stops remain excluded: `sv04.5`/`sv4pt5`, `pgo`/`swsh10.5`, `sv08.5`/`sv8pt5`, and `sv06.5`/`sv6pt5`. The scoped review stops remain excluded: `bog`/`bp`, `tk-ex-m`/`tk2b`, `tk-ex-p`/`tk2a`, `tk-ex-latia`/`tk1a`, and `tk-ex-latio`/`tk1b`.

## Summary

| Metric | Count |
| --- | --- |
| Alias pairs audited | 20 |
| Pass | 0 |
| Pass with metadata/route review | 20 |
| Blocked | 0 |
| Alias rows with zero card ownership | 20 |
| Alias rows with no hidden non-card FK dependencies | 20 |
| Canonical rows owning card_prints | 20 |
| Pairs requiring metadata manual review | 20 |
| Pairs requiring route classification review | 2 |
| Alias classification rows currently missing | 1 |
| Alias classification rows currently mismatched | 1 |


## Route Layer Evidence

- `set_code_classification` has required routing columns: yes.
- Views with set-code dependencies: `card_prints_clean`, `card_prints_public`, `v_card_images`, `v_card_prices_usd`, `v_card_prints`, `v_card_prints_badges`, `v_card_prints_canon`, `v_card_prints_noncanon`, `v_card_prints_web_v1`, `v_card_search`, `v_card_stream_v1`, `v_cards_search_v2`, `v_condition_snapshot_analyses_match_card_v1`, `v_image_coverage_canon`, `v_image_coverage_noncanon`, `v_latest_price_by_card`, `v_latest_price_pref`, `v_pokemonapi_contract_audit`, `v_promotion_umbrella_preflight_v1`, `v_recently_added`, `v_section_cards_v1`, `v_sets_display`, `v_special_set_code_forks`, `v_special_set_print_membership`, `v_special_set_raw_counts`, `v_special_set_reconstruction_gate`, `v_tcgdex_contract_audit`, `v_ticker_24h`, `v_vault_items`, `v_vault_items_ext`, `v_vault_items_web`, `v_wall_cards_v1`, `v_wishlist_items`.
- Functions with set-code dependencies: `card_comments_set_insert_defaults_v1`, `card_feed_events_set_insert_defaults_v1`, `card_history`, `card_print_identity_backfill_projection_v1`, `card_print_identity_hash_v1`, `card_print_identity_select_set_code_v1`, `card_print_identity_serialize_key_v1`, `card_prints_assign_set_identity_model`, `fill_price_obs_print_id`, `gv_condition_analysis_failures_set_auth_uid`, `gv_condition_snapshot_analyses_set_auth_uid`, `gv_condition_snapshots_set_auth_uid`, `gv_identity_scan_event_results_set_auth_uid`, `gv_identity_scan_events_set_auth_uid`, `gv_identity_scan_selections_set_auth_uid`, `list_missing_price_sets`, `list_set_codes`, `propagate_set_identity_model_to_card_prints`, `public_vault_instance_detail_v1`, `resolve_set_identity_model`, `rpc_set_item_condition`, `search_card_prints_v1`, `search_card_prints_v1`, `search_cards_in_set`, `set_auth_uid`, `set_timestamp_updated_at`, `set_vault_item_condition`, `set_vault_item_grade`, `top_movers_24h`, `trg_canon_warehouse_set_updated_at_v1`, `vault_item_set_image_mode`, `vault_item_set_user_photo`, `vault_item_set_user_photo`, `vault_mobile_collector_rows_v1`, `vault_mobile_instance_detail_v1`.

Finding: route/search preservation can be handled through an alias classification layer, not row deletion, because the required classification columns exist. Missing or mismatched alias classification rows are future write-plan inputs, not approval to delete alias set rows.

## Pass/Fail Matrix

| Name key | Canonical | Alias | Overall | Alias cards | Canonical cards | Hidden FK gate | Metadata gate | Route gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 151 | `sv03.5` | `sv3pt5` | PASS_WITH_REVIEW | 0 | 210 | PASS | REVIEW | REVIEW |
| black bolt | `sv10.5b` | `zsv10pt5` | PASS_WITH_REVIEW | 0 | 180 | PASS | REVIEW | PASS |
| champions path | `swsh3.5` | `swsh35` | PASS_WITH_REVIEW | 0 | 83 | PASS | REVIEW | PASS |
| crown zenith | `swsh12.5` | `swsh12pt5` | PASS_WITH_REVIEW | 0 | 167 | PASS | REVIEW | PASS |
| dragon majesty | `sm75` | `sm7.5` | PASS_WITH_REVIEW | 0 | 78 | PASS | REVIEW | PASS |
| heartgold soulsilver promos | `hsp` | `hgssp` | PASS_WITH_REVIEW | 0 | 25 | PASS | REVIEW | PASS |
| journey together | `sv09` | `sv9` | PASS_WITH_REVIEW | 0 | 198 | PASS | REVIEW | PASS |
| legendary collection | `base6` | `lc` | PASS_WITH_REVIEW | 0 | 110 | PASS | REVIEW | PASS |
| mega evolution | `me01` | `me1` | PASS_WITH_REVIEW | 0 | 300 | PASS | REVIEW | PASS |
| obsidian flames | `sv03` | `sv3` | PASS_WITH_REVIEW | 0 | 237 | PASS | REVIEW | PASS |
| paradox rift | `sv04` | `sv4` | PASS_WITH_REVIEW | 0 | 292 | PASS | REVIEW | PASS |
| phantasmal flames | `me02` | `me2` | PASS_WITH_REVIEW | 0 | 131 | PASS | REVIEW | PASS |
| scarlet and violet | `sv01` | `sv1` | PASS_WITH_REVIEW | 0 | 283 | PASS | REVIEW | PASS |
| shining fates | `swsh4.5` | `swsh45` | PASS_WITH_REVIEW | 0 | 75 | PASS | REVIEW | PASS |
| shining legends | `sm3.5` | `sm35` | PASS_WITH_REVIEW | 0 | 78 | PASS | REVIEW | REVIEW |
| stellar crown | `sv07` | `sv7` | PASS_WITH_REVIEW | 0 | 194 | PASS | REVIEW | PASS |
| surging sparks | `sv08` | `sv8` | PASS_WITH_REVIEW | 0 | 271 | PASS | REVIEW | PASS |
| temporal forces | `sv05` | `sv5` | PASS_WITH_REVIEW | 0 | 246 | PASS | REVIEW | PASS |
| twilight masquerade | `sv06` | `sv6` | PASS_WITH_REVIEW | 0 | 255 | PASS | REVIEW | PASS |
| white flare | `sv10.5w` | `rsv10pt5` | PASS_WITH_REVIEW | 0 | 177 | PASS | REVIEW | PASS |


## Pair Evidence

### sv03.5 <- sv3pt5

- Overall status: PASS_WITH_REVIEW.
- Card ownership: canonical card_prints=210, alias card_prints=0, alias legacy cards=0.
- External mappings: canonical=416, alias=0; external printing mappings canonical=0, alias=0.
- Set mappings: canonical justtcg=1, alias justtcg=0.
- Hidden FK dependencies on alias row: none.
- Metadata behavior: MANUAL_REVIEW_REQUIRED (source).
- Route/search preservation: alias classification exists but points to sv3pt5; alias code appears in local route/search/source files (2 file hits); alias code appears in set-code DB surfaces (4 surface hits).

### sv10.5b <- zsv10pt5

- Overall status: PASS_WITH_REVIEW.
- Card ownership: canonical card_prints=180, alias card_prints=0, alias legacy cards=0.
- External mappings: canonical=352, alias=0; external printing mappings canonical=0, alias=0.
- Set mappings: canonical justtcg=1, alias justtcg=0.
- Hidden FK dependencies on alias row: none.
- Metadata behavior: MANUAL_REVIEW_REQUIRED (source).
- Route/search preservation: alias is already classified to expected canonical code; alias code appears in local route/search/source files (1 file hits); alias code appears in set-code DB surfaces (3 surface hits).

### swsh3.5 <- swsh35

- Overall status: PASS_WITH_REVIEW.
- Card ownership: canonical card_prints=83, alias card_prints=0, alias legacy cards=0.
- External mappings: canonical=239, alias=0; external printing mappings canonical=0, alias=0.
- Set mappings: canonical justtcg=1, alias justtcg=0.
- Hidden FK dependencies on alias row: none.
- Metadata behavior: MANUAL_REVIEW_REQUIRED (printed_total, source).
- Route/search preservation: alias is already classified to expected canonical code; alias code appears in local route/search/source files (1 file hits); alias code appears in set-code DB surfaces (3 surface hits).

### swsh12.5 <- swsh12pt5

- Overall status: PASS_WITH_REVIEW.
- Card ownership: canonical card_prints=167, alias card_prints=0, alias legacy cards=0.
- External mappings: canonical=475, alias=0; external printing mappings canonical=0, alias=0.
- Set mappings: canonical justtcg=1, alias justtcg=0.
- Hidden FK dependencies on alias row: none.
- Metadata behavior: MANUAL_REVIEW_REQUIRED (source).
- Route/search preservation: alias is already classified to expected canonical code; alias code appears in local route/search/source files (2 file hits); alias code appears in set-code DB surfaces (3 surface hits).

### sm75 <- sm7.5

- Overall status: PASS_WITH_REVIEW.
- Card ownership: canonical card_prints=78, alias card_prints=0, alias legacy cards=0.
- External mappings: canonical=220, alias=0; external printing mappings canonical=0, alias=0.
- Set mappings: canonical justtcg=1, alias justtcg=0.
- Hidden FK dependencies on alias row: none.
- Metadata behavior: MANUAL_REVIEW_REQUIRED (source).
- Route/search preservation: alias is already classified to expected canonical code; alias code appears in local route/search/source files (4 file hits); alias code appears in set-code DB surfaces (6 surface hits).

### hsp <- hgssp

- Overall status: PASS_WITH_REVIEW.
- Card ownership: canonical card_prints=25, alias card_prints=0, alias legacy cards=0.
- External mappings: canonical=25, alias=0; external printing mappings canonical=0, alias=0.
- Set mappings: canonical justtcg=0, alias justtcg=0.
- Hidden FK dependencies on alias row: none.
- Metadata behavior: MANUAL_REVIEW_REQUIRED (source).
- Route/search preservation: alias is already classified to expected canonical code; alias code appears in local route/search/source files (4 file hits); alias code appears in set-code DB surfaces (5 surface hits).

### sv09 <- sv9

- Overall status: PASS_WITH_REVIEW.
- Card ownership: canonical card_prints=198, alias card_prints=0, alias legacy cards=0.
- External mappings: canonical=388, alias=0; external printing mappings canonical=0, alias=0.
- Set mappings: canonical justtcg=1, alias justtcg=0.
- Hidden FK dependencies on alias row: none.
- Metadata behavior: MANUAL_REVIEW_REQUIRED (source).
- Route/search preservation: alias is already classified to expected canonical code; alias code appears in local route/search/source files (2 file hits); alias code appears in set-code DB surfaces (3 surface hits).

### base6 <- lc

- Overall status: PASS_WITH_REVIEW.
- Card ownership: canonical card_prints=110, alias card_prints=0, alias legacy cards=0.
- External mappings: canonical=324, alias=0; external printing mappings canonical=0, alias=0.
- Set mappings: canonical justtcg=1, alias justtcg=0.
- Hidden FK dependencies on alias row: none.
- Metadata behavior: MANUAL_REVIEW_REQUIRED (source).
- Route/search preservation: alias is already classified to expected canonical code; alias code appears in local route/search/source files (21 file hits); alias code appears in set-code DB surfaces (5 surface hits).

### me01 <- me1

- Overall status: PASS_WITH_REVIEW.
- Card ownership: canonical card_prints=300, alias card_prints=0, alias legacy cards=0.
- External mappings: canonical=592, alias=0; external printing mappings canonical=0, alias=0.
- Set mappings: canonical justtcg=1, alias justtcg=0.
- Hidden FK dependencies on alias row: none.
- Metadata behavior: MANUAL_REVIEW_REQUIRED (source).
- Route/search preservation: alias is already classified to expected canonical code; alias code appears in local route/search/source files (1 file hits); alias code appears in set-code DB surfaces (3 surface hits).

### sv03 <- sv3

- Overall status: PASS_WITH_REVIEW.
- Card ownership: canonical card_prints=237, alias card_prints=0, alias legacy cards=0.
- External mappings: canonical=466, alias=0; external printing mappings canonical=0, alias=0.
- Set mappings: canonical justtcg=1, alias justtcg=0.
- Hidden FK dependencies on alias row: none.
- Metadata behavior: MANUAL_REVIEW_REQUIRED (source).
- Route/search preservation: alias is already classified to expected canonical code; alias code appears in local route/search/source files (2 file hits); alias code appears in set-code DB surfaces (3 surface hits).

### sv04 <- sv4

- Overall status: PASS_WITH_REVIEW.
- Card ownership: canonical card_prints=292, alias card_prints=0, alias legacy cards=0.
- External mappings: canonical=826, alias=0; external printing mappings canonical=0, alias=0.
- Set mappings: canonical justtcg=1, alias justtcg=0.
- Hidden FK dependencies on alias row: none.
- Metadata behavior: MANUAL_REVIEW_REQUIRED (source).
- Route/search preservation: alias is already classified to expected canonical code; alias code appears in local route/search/source files (9 file hits); alias code appears in set-code DB surfaces (3 surface hits).

### me02 <- me2

- Overall status: PASS_WITH_REVIEW.
- Card ownership: canonical card_prints=131, alias card_prints=0, alias legacy cards=0.
- External mappings: canonical=259, alias=0; external printing mappings canonical=0, alias=0.
- Set mappings: canonical justtcg=1, alias justtcg=0.
- Hidden FK dependencies on alias row: none.
- Metadata behavior: MANUAL_REVIEW_REQUIRED (source).
- Route/search preservation: alias is already classified to expected canonical code; alias code appears in local route/search/source files (1 file hits); alias code appears in set-code DB surfaces (2 surface hits).

### sv01 <- sv1

- Overall status: PASS_WITH_REVIEW.
- Card ownership: canonical card_prints=283, alias card_prints=0, alias legacy cards=0.
- External mappings: canonical=847, alias=0; external printing mappings canonical=0, alias=0.
- Set mappings: canonical justtcg=0, alias justtcg=0.
- Hidden FK dependencies on alias row: none.
- Metadata behavior: MANUAL_REVIEW_REQUIRED (source).
- Route/search preservation: alias is already classified to expected canonical code; alias code appears in local route/search/source files (13 file hits); alias code appears in set-code DB surfaces (3 surface hits).

### swsh4.5 <- swsh45

- Overall status: PASS_WITH_REVIEW.
- Card ownership: canonical card_prints=75, alias card_prints=0, alias legacy cards=0.
- External mappings: canonical=215, alias=0; external printing mappings canonical=0, alias=0.
- Set mappings: canonical justtcg=1, alias justtcg=0.
- Hidden FK dependencies on alias row: none.
- Metadata behavior: MANUAL_REVIEW_REQUIRED (source).
- Route/search preservation: alias is already classified to expected canonical code; alias code appears in local route/search/source files (6 file hits); alias code appears in set-code DB surfaces (3 surface hits).

### sm3.5 <- sm35

- Overall status: PASS_WITH_REVIEW.
- Card ownership: canonical card_prints=78, alias card_prints=0, alias legacy cards=0.
- External mappings: canonical=230, alias=0; external printing mappings canonical=0, alias=0.
- Set mappings: canonical justtcg=1, alias justtcg=0.
- Hidden FK dependencies on alias row: none.
- Metadata behavior: MANUAL_REVIEW_REQUIRED (source).
- Route/search preservation: alias classification row is absent and would be required in a future write; alias code appears in local route/search/source files (1 file hits); alias code appears in set-code DB surfaces (3 surface hits).

### sv07 <- sv7

- Overall status: PASS_WITH_REVIEW.
- Card ownership: canonical card_prints=194, alias card_prints=0, alias legacy cards=0.
- External mappings: canonical=369, alias=0; external printing mappings canonical=0, alias=0.
- Set mappings: canonical justtcg=1, alias justtcg=0.
- Hidden FK dependencies on alias row: none.
- Metadata behavior: MANUAL_REVIEW_REQUIRED (source).
- Route/search preservation: alias is already classified to expected canonical code; alias code appears in local route/search/source files (1 file hits); alias code appears in set-code DB surfaces (3 surface hits).

### sv08 <- sv8

- Overall status: PASS_WITH_REVIEW.
- Card ownership: canonical card_prints=271, alias card_prints=0, alias legacy cards=0.
- External mappings: canonical=775, alias=0; external printing mappings canonical=0, alias=0.
- Set mappings: canonical justtcg=1, alias justtcg=0.
- Hidden FK dependencies on alias row: none.
- Metadata behavior: MANUAL_REVIEW_REQUIRED (source).
- Route/search preservation: alias is already classified to expected canonical code; alias code appears in local route/search/source files (17 file hits); alias code appears in set-code DB surfaces (3 surface hits).

### sv05 <- sv5

- Overall status: PASS_WITH_REVIEW.
- Card ownership: canonical card_prints=246, alias card_prints=0, alias legacy cards=0.
- External mappings: canonical=464, alias=0; external printing mappings canonical=0, alias=0.
- Set mappings: canonical justtcg=1, alias justtcg=0.
- Hidden FK dependencies on alias row: none.
- Metadata behavior: MANUAL_REVIEW_REQUIRED (source).
- Route/search preservation: alias is already classified to expected canonical code; alias code appears in local route/search/source files (1 file hits); alias code appears in set-code DB surfaces (3 surface hits).

### sv06 <- sv6

- Overall status: PASS_WITH_REVIEW.
- Card ownership: canonical card_prints=255, alias card_prints=0, alias legacy cards=0.
- External mappings: canonical=707, alias=0; external printing mappings canonical=0, alias=0.
- Set mappings: canonical justtcg=1, alias justtcg=0.
- Hidden FK dependencies on alias row: none.
- Metadata behavior: MANUAL_REVIEW_REQUIRED (logo_url, symbol_url, source).
- Route/search preservation: alias is already classified to expected canonical code; alias code appears in local route/search/source files (6 file hits); alias code appears in set-code DB surfaces (4 surface hits).

### sv10.5w <- rsv10pt5

- Overall status: PASS_WITH_REVIEW.
- Card ownership: canonical card_prints=177, alias card_prints=0, alias legacy cards=0.
- External mappings: canonical=350, alias=0; external printing mappings canonical=0, alias=0.
- Set mappings: canonical justtcg=1, alias justtcg=0.
- Hidden FK dependencies on alias row: none.
- Metadata behavior: MANUAL_REVIEW_REQUIRED (source).
- Route/search preservation: alias is already classified to expected canonical code; alias code appears in local route/search/source files (1 file hits); alias code appears in set-code DB surfaces (3 surface hits).

## Blockers

_None._


## Manual Review Queue

- `sv3pt5` -> `sv03.5`: source.
- `zsv10pt5` -> `sv10.5b`: source.
- `swsh35` -> `swsh3.5`: printed_total, source.
- `swsh12pt5` -> `swsh12.5`: source.
- `sm7.5` -> `sm75`: source.
- `hgssp` -> `hsp`: source.
- `sv9` -> `sv09`: source.
- `lc` -> `base6`: source.
- `me1` -> `me01`: source.
- `sv3` -> `sv03`: source.
- `sv4` -> `sv04`: source.
- `me2` -> `me02`: source.
- `sv1` -> `sv01`: source.
- `swsh45` -> `swsh4.5`: source.
- `sm35` -> `sm3.5`: source.
- `sv7` -> `sv07`: source.
- `sv8` -> `sv08`: source.
- `sv5` -> `sv05`: source.
- `sv6` -> `sv06`: logo_url, symbol_url, source.
- `rsv10pt5` -> `sv10.5w`: source.


## Route Review Queue

- `sv3pt5` -> `sv03.5`: alias classification exists but points to sv3pt5; alias code appears in local route/search/source files (2 file hits); alias code appears in set-code DB surfaces (4 surface hits).
- `sm35` -> `sm3.5`: alias classification row is absent and would be required in a future write; alias code appears in local route/search/source files (1 file hits); alias code appears in set-code DB surfaces (3 surface hits).


## Future Write-Plan Implications

- No card movement is expected for any pair that remains in this candidate set.
- Alias rows must remain as permanent route/search/source aliases.
- Missing alias classification rows are future routing work, not evidence for deletion.
- Metadata copy behavior must stay null-only unless a reviewer approves a specific conflicting field.
- Any future write script must rerun these gates immediately before opening a writable transaction.

## No-Write Confirmation

- No Supabase writes.
- No migrations.
- No inserts.
- No updates.
- No deletes.
- No merge operations.
- No alias changes.
- No migration repair.
- No `db pull`.
- No production mutation.
