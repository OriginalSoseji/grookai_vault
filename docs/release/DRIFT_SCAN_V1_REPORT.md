# DRIFT_SCAN_V1 Report

## Scope
- Local replayed schema versus linked remote schema (schema-only).

## Artifacts
- Local dump: docs/release/logs/DRIFT_SCAN_V1_local_schema.sql
- Remote dump: docs/release/logs/DRIFT_SCAN_V1_remote_schema.sql
- Local normalized dump: docs/release/logs/DRIFT_SCAN_V1_local_schema_norm.sql
- Remote normalized dump: docs/release/logs/DRIFT_SCAN_V1_remote_schema_norm.sql
- Unified diff patch: docs/release/logs/DRIFT_SCAN_V1_schema_diff.patch
- Structured summary (JSON): docs/release/logs/DRIFT_SCAN_V1_schema_summary.json

## Normalization Rules Applied
- Removed SET/session lines.
- Removed ownership statements (ALTER ... OWNER TO ...).
- Removed privilege churn (GRANT / REVOKE).
- Removed COMMENT ON ... lines.
- Collapsed consecutive blank lines.

## Counts
| Category | Tables | Views | Functions | Types | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Remote-only | 2 | 8 | 16 | 0 | 26 |
| Local-only | 0 | 0 | 1 | 0 | 1 |
| Same-name, different definition | 3 | 0 | 2 | 0 | 5 |

## Remote-only Relations

### TABLE (2)
- "admin"."import_runs"
- "ingest"."card_prints_raw"

### VIEW (8)
- "public"."v_card_prints_web_v1"
- "public"."v_promotion_umbrella_preflight_v1"
- "public"."v_sets_display"
- "public"."v_special_set_code_forks"
- "public"."v_special_set_print_membership"
- "public"."v_special_set_raw_counts"
- "public"."v_special_set_reconstruction_gate"
- "public"."v_vault_items_web"

### FUNCTION (16)
- "admin"."import_prices_do"("_payload" "jsonb", "_bridge_token" "text")
- "ingest"."merge_card_prints"()
- "public"."admin_condition_snapshots_read_v1"("p_snapshot_id" "uuid")
- "public"."condition_snapshots_insert_v1"("p_vault_item_id" "uuid", "p_images" "jsonb")
- "public"."gv_enqueue_condition_analysis_job_v1"()
- "public"."list_missing_price_sets"()
- "public"."refresh_vault_market_prices"("p_user" "uuid" DEFAULT NULL::"uuid")
- "public"."refresh_vault_market_prices"()
- "public"."refresh_vault_market_prices_all"()
- "public"."search_card_prints_v1"("q" "text", "limit_n" integer DEFAULT 30)
- "public"."search_cards"("q" "text", "limit" integer DEFAULT 50, "offset" integer DEFAULT 0)
- "public"."search_cards_in_set"("q" "text", "set_code" "text", "limit" integer DEFAULT 50)
- "public"."top_movers_24h"("limit_n" integer DEFAULT 25, "only_positive" boolean DEFAULT false)
- "public"."vault_add_or_increment"("p_card_id" "uuid", "p_delta_qty" integer, "p_name" "text", "p_condition_label" "text" DEFAULT 'NM'::"text", "p_notes" "text" DEFAULT NULL::"text")
- "public"."wishlist_totals"()
- "public"."wishlist_totals_for"("p_user" "uuid")

### TYPE (0)
- (none)

## Local-only Relations

### TABLE (0)
- (none)

### VIEW (0)
- (none)

### FUNCTION (1)
- "public"."vault_add_or_increment"("p_card_id" "uuid", "p_delta_qty" integer, "p_condition_label" "text" DEFAULT 'NM'::"text", "p_notes" "text" DEFAULT NULL::"text")

### TYPE (0)
- (none)

## Same-name Different-definition Objects

### TABLE (3)
- "public"."card_prints"
- "public"."pricing_jobs"
- "public"."sets"

### VIEW (0)
- (none)

### FUNCTION (2)
- "public"."fix_mojibake_common"("t" "text")
- "public"."fix_mojibake_more"("t" "text")

### TYPE (0)
- (none)

## Top 20 Highest-Risk Diffs (Public Schema, Security-Related)
1. [score=94] removed: CREATE POLICY "owner delete vault_items" ON "public"."vault_items" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));
2. [score=94] removed: CREATE POLICY "owner insert vault_items" ON "public"."vault_items" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));
3. [score=94] removed: CREATE POLICY "owner insert" ON "public"."vault_items" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));
4. [score=94] removed: CREATE POLICY "owner read" ON "public"."vault_items" FOR SELECT USING (("auth"."uid"() = "user_id"));
5. [score=94] removed: CREATE POLICY "owner select vault_items" ON "public"."vault_items" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));
6. [score=94] removed: CREATE POLICY "owner update vault_items" ON "public"."vault_items" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));
7. [score=94] removed: CREATE POLICY "owner update" ON "public"."vault_items" FOR UPDATE USING (("auth"."uid"() = "user_id"));
8. [score=94] removed: CREATE POLICY "vault_items owner delete" ON "public"."vault_items" FOR DELETE USING (("auth"."uid"() = "user_id"));
9. [score=94] removed: CREATE POLICY "vault_items owner read" ON "public"."vault_items" FOR SELECT USING (("auth"."uid"() = "user_id"));
10. [score=94] removed: CREATE POLICY "vault_items owner update" ON "public"."vault_items" FOR UPDATE USING (("auth"."uid"() = "user_id"));
11. [score=94] removed: CREATE POLICY "vault_items owner write" ON "public"."vault_items" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));
