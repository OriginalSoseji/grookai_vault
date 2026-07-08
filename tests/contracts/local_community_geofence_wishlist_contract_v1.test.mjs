import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("local community geofence feed stays coarse, authenticated, and opt-in", () => {
  const infraSql = readSource("supabase/migrations/20260520233000_local_community_feed_infra_v1.sql");
  const rpcSql = readSource("supabase/migrations/20260521124500_local_community_feed_rpc_sanitize_images_v1.sql");
  const webHelper = readSource("apps/web/src/lib/network/getLocalCommunityFeedRows.ts");
  const mobileService = readSource("lib/services/network/local_community_feed_service.dart");

  assert.match(infraSql, /local_discovery_enabled boolean not null default false/i);
  assert.match(infraSql, /location_precision text not null default 'coarse'/i);
  assert.match(infraSql, /geohash_prefix ~ '\^\[0-9bcdefghjkmnpqrstuvwxyz\]\{3,5\}\$'/i);
  assert.match(infraSql, /radius_miles in \(5, 10, 25, 50, 100\)/i);
  assert.match(infraSql, /never exact lat\/lng, address, raw GPS, IP-derived location, or full geohash/i);

  assert.match(rpcSql, /v_uid uuid := auth\.uid\(\)/i);
  assert.match(rpcSql, /raise exception 'not_authenticated'/i);
  assert.match(rpcSql, /sr\.owner_user_id <> v_uid/i);
  assert.match(rpcSql, /owner_setting\.local_discovery_enabled is true/i);
  assert.match(rpcSql, /owner_setting\.country_code = vs\.country_code/i);
  assert.match(rpcSql, /vs\.geohash_prefix = owner_setting\.geohash_prefix[\s\S]*then 'nearby'/i);
  assert.match(rpcSql, /vs\.region_code = owner_setting\.region_code[\s\S]*then 'same_region'/i);
  assert.match(rpcSql, /local_community_collectors_are_blocked_v1\(v_uid, sr\.owner_user_id\) is false/i);
  assert.match(rpcSql, /collector_local_mutes/i);
  assert.match(rpcSql, /revoke all on function public\.local_community_feed_v1\(integer\) from public, anon/i);
  assert.match(rpcSql, /grant execute on function public\.local_community_feed_v1\(integer\) to authenticated/i);
  assert.doesNotMatch(rpcSql.match(/returns table \([\s\S]*?\)/i)?.[0] ?? "", /owner_user_id|geohash|latitude|longitude|address|gps|email/i);

  assert.match(webHelper, /\.rpc\("local_community_feed_v2"/);
  assert.match(webHelper, /Math\.max\(1, Math\.min\(limit, 80\)\)/);
  assert.match(mobileService, /'local_community_feed_v2'/);
  assert.match(mobileService, /limit\.clamp\(1, 80\)/);
});

test("wishlist infrastructure is wired into the v2 nearby feed without private wishlist leakage", () => {
  const baselineSql = readSource("supabase/migrations/20251213153625_baseline_init.sql");
  const policySql = readSource("supabase/migrations/20251213153633_baseline_policies.sql");
  const signalSql = readSource("supabase/migrations/20260324091500_card_interaction_network_phase1_v1.sql");
  const rpcSql = readSource("supabase/migrations/20260624120000_local_community_feed_wishlist_match_v2.sql");
  const sharedPredicateSql = readSource("supabase/migrations/20260708100000_product_evolution_e3_want_match_shared_predicate_v1.sql");
  const webNearby = readSource("apps/web/src/app/network/nearby/page.tsx");
  const webHelper = readSource("apps/web/src/lib/network/getLocalCommunityFeedRows.ts");
  const webCard = readSource("apps/web/src/components/network/LocalCommunityFeedCard.tsx");
  const mobileService = readSource("lib/services/network/local_community_feed_service.dart");
  const mobileScreen = readSource("lib/screens/network/network_nearby_screen.dart");

  assert.match(baselineSql, /CREATE TABLE public\.wishlist_items/i);
  assert.match(baselineSql, /card_id uuid NOT NULL/i);
  assert.match(policySql, /CREATE POLICY wl_rw ON public\.wishlist_items USING \(\(auth\.uid\(\) = user_id\)\)/i);
  assert.match(signalSql, /'wishlist'/i);

  const returnSignature = sharedPredicateSql.match(/create or replace function public\.local_community_feed_v2[\s\S]*?returns table \([\s\S]*?\)/i)?.[0] ?? "";
  const wantMatchSignature = sharedPredicateSql.match(/create or replace function public\.local_community_want_match_candidates_v1\s*\([\s\S]*?\)\s*returns table/i)?.[0] ?? "";
  const nearbySurface = [sharedPredicateSql, webNearby, webHelper, webCard, mobileService, mobileScreen].join("\n");
  assert.match(rpcSql, /create or replace function public\.local_community_feed_v2/i);
  assert.match(sharedPredicateSql, /create or replace function public\.local_community_visible_source_cards_v1/i);
  assert.match(sharedPredicateSql, /create or replace function public\.local_community_want_match_candidates_v1/i);
  assert.match(sharedPredicateSql, /from public\.wishlist_items wi/i);
  assert.match(sharedPredicateSql, /wi\.user_id = p_viewer_user_id/i);
  assert.match(sharedPredicateSql, /wi\.card_id = sr\.card_print_id/i);
  assert.match(sharedPredicateSql, /from public\.local_community_visible_source_cards_v1\(v_uid\)/i);
  assert.match(sharedPredicateSql, /from public\.local_community_visible_source_cards_v1\(p_viewer_user_id\)/i);
  assert.match(sharedPredicateSql, /ranked\.viewer_wishlist_match/i);
  assert.match(sharedPredicateSql, /then 'viewer_wishlist'/i);
  assert.match(sharedPredicateSql, /local_community_want_match_candidates_v1\(uuid, integer\) to authenticated, service_role/i);
  assert.doesNotMatch(wantMatchSignature, /p_include_existing/i);
  assert.match(returnSignature, /viewer_wishlist_match boolean/i);
  assert.match(returnSignature, /match_reason text/i);
  assert.doesNotMatch(returnSignature, /wishlist_item_id|wishlist_note|viewer_user_id|owner_user_id|card_print_id/i);

  assert.match(webHelper, /\.rpc\("local_community_feed_v2"/);
  assert.match(webHelper, /viewerWishlistMatch/);
  assert.match(webHelper, /matchReason/);
  assert.match(webCard, /Wishlist match/);
  assert.match(webCard, /This card matches your wishlist\./);
  assert.match(mobileService, /'local_community_feed_v2'/);
  assert.match(mobileService, /viewerWishlistMatch/);
  assert.match(mobileScreen, /Wishlist match/);
  assert.match(mobileScreen, /This card matches your wishlist\./);
  assert.doesNotMatch(nearbySurface, /wishlist_item_id|wishlist_note|wishlist note|wi\.note/i);
});
