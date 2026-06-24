import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "docs", "audits", "local_community_feed_v1");
const JSON_PATH = path.join(OUT_DIR, "local_community_wishlist_matching_readiness_v1.json");
const MD_PATH = path.join(OUT_DIR, "local_community_wishlist_matching_readiness_v1.md");

function read(relativePath) {
  return fsSync.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function has(source, pattern) {
  return pattern.test(source);
}

function check(name, ok, detail) {
  return { name, ok, detail };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const sources = {
    infraSql: read("supabase/migrations/20260520233000_local_community_feed_infra_v1.sql"),
    rpcSql: read("supabase/migrations/20260521124500_local_community_feed_rpc_sanitize_images_v1.sql"),
    rpcV2Sql: read("supabase/migrations/20260624120000_local_community_feed_wishlist_match_v2.sql"),
    baselineSql: read("supabase/migrations/20251213153625_baseline_init.sql"),
    policiesSql: read("supabase/migrations/20251213153633_baseline_policies.sql"),
    signalsSql: read("supabase/migrations/20260324091500_card_interaction_network_phase1_v1.sql"),
    webHelper: read("apps/web/src/lib/network/getLocalCommunityFeedRows.ts"),
    webNearby: read("apps/web/src/app/network/nearby/page.tsx"),
    webCard: read("apps/web/src/components/network/LocalCommunityFeedCard.tsx"),
    mobileService: read("lib/services/network/local_community_feed_service.dart"),
    mobileScreen: read("lib/screens/network/network_nearby_screen.dart"),
  };

  const rpcReturnSignature = sources.rpcSql.match(/returns table \([\s\S]*?\)/i)?.[0] ?? "";
  const rpcV2ReturnSignature = sources.rpcV2Sql.match(/returns table \([\s\S]*?\)/i)?.[0] ?? "";
  const nearbySurface = [
    sources.rpcV2Sql,
    sources.webHelper,
    sources.webNearby,
    sources.webCard,
    sources.mobileService,
    sources.mobileScreen,
  ].join("\n");

  const geofenceChecks = [
    check(
      "Local discovery is opt-in",
      has(sources.infraSql, /local_discovery_enabled boolean not null default false/i),
      "collector_local_discovery_settings defaults local discovery off.",
    ),
    check(
      "Location is coarse only",
      has(sources.infraSql, /location_precision text not null default 'coarse'/i)
        && has(sources.infraSql, /geohash_prefix ~ '\^\[0-9bcdefghjkmnpqrstuvwxyz\]\{3,5\}\$'/i)
        && has(sources.infraSql, /never exact lat\/lng, address, raw GPS, IP-derived location, or full geohash/i),
      "Stored locality is region/coarse geohash prefix; exact location is explicitly out of scope.",
    ),
    check(
      "RPC requires auth",
      has(sources.rpcV2Sql, /v_uid uuid := auth\.uid\(\)/i)
        && has(sources.rpcV2Sql, /raise exception 'not_authenticated'/i)
        && has(sources.rpcV2Sql, /revoke all on function public\.local_community_feed_v2\(integer\) from public, anon/i)
        && has(sources.rpcV2Sql, /grant execute on function public\.local_community_feed_v2\(integer\) to authenticated/i),
      "local_community_feed_v2 is authenticated-only.",
    ),
    check(
      "Only opted-in local collectors qualify",
      has(sources.rpcSql, /owner_setting\.local_discovery_enabled is true/i)
        && has(sources.rpcSql, /owner_setting\.country_code = vs\.country_code/i)
        && has(sources.rpcSql, /vs\.geohash_prefix = owner_setting\.geohash_prefix[\s\S]*then 'nearby'/i)
        && has(sources.rpcSql, /vs\.region_code = owner_setting\.region_code[\s\S]*then 'same_region'/i),
      "Matches are scoped to same country plus exact coarse-prefix or same-region buckets.",
    ),
    check(
      "Blocks and mutes are enforced",
      has(sources.rpcSql, /local_community_collectors_are_blocked_v1\(v_uid, sr\.owner_user_id\) is false/i)
        && has(sources.rpcSql, /collector_local_mutes/i),
      "Muted and blocked collectors are excluded in the SQL.",
    ),
    check(
      "Public projection hides raw identity and location fields",
      !/owner_user_id|geohash|latitude|longitude|address|gps|email/i.test(rpcReturnSignature),
      "Returned columns omit raw owner user IDs and exact/coarse location internals.",
    ),
    check(
      "Web and mobile call the same RPC",
      has(sources.webHelper, /\.rpc\("local_community_feed_v2"/)
        && has(sources.mobileService, /'local_community_feed_v2'/),
      "App/web parity uses the same local community feed RPC.",
    ),
  ];

  const wishlistChecks = [
    check(
      "Wishlist table exists",
      has(sources.baselineSql, /CREATE TABLE public\.wishlist_items/i)
        && has(sources.baselineSql, /card_id uuid NOT NULL/i),
      "Wishlist rows are stored against card_prints IDs.",
    ),
    check(
      "Wishlist RLS is owner-only",
      has(sources.policiesSql, /CREATE POLICY wl_rw ON public\.wishlist_items USING \(\(auth\.uid\(\) = user_id\)\)/i),
      "Wishlist items are protected by user-owned RLS.",
    ),
    check(
      "Wishlist is a known interaction signal",
      has(sources.signalsSql, /'wishlist'/i),
      "card_signals allows wishlist as a signal type.",
    ),
    check(
      "Nearby RPC joins wishlist data",
      has(sources.rpcV2Sql, /create or replace function public\.local_community_feed_v2/i)
        && has(sources.rpcV2Sql, /from public\.wishlist_items wi/i)
        && has(sources.rpcV2Sql, /wi\.user_id = v_uid/i)
        && has(sources.rpcV2Sql, /wi\.card_id = sr\.card_print_id/i),
      "Expected when nearby feed can rank or label cards that match the viewer wishlist.",
    ),
    check(
      "Nearby response exposes a wishlist match field",
      /viewer_wishlist_match boolean/i.test(rpcV2ReturnSignature)
        && /match_reason text/i.test(rpcV2ReturnSignature)
        && !/wishlist_item_id|wishlist_note|viewer_user_id|owner_user_id|card_print_id/i.test(rpcV2ReturnSignature),
      "Expected when app/web can show a deterministic wishlist-match reason.",
    ),
    check(
      "Nearby surfaces advertise wishlist matching",
      /local_community_feed_v2/i.test(nearbySurface)
        && /Wishlist match/.test(nearbySurface)
        && /This card matches your wishlist\./.test(nearbySurface)
        && !/wishlist_item_id|wishlist_note|wishlist note|wi\.note/i.test(nearbySurface),
      "Expected only after the RPC provides deterministic match data.",
    ),
  ];

  const geofenceReady = geofenceChecks.every((item) => item.ok);
  const wishlistStorageReady = wishlistChecks.slice(0, 3).every((item) => item.ok);
  const wishlistMatchingReady = wishlistChecks.slice(3).every((item) => item.ok);
  const status = geofenceReady && wishlistStorageReady && wishlistMatchingReady
    ? "PASS"
    : geofenceReady && wishlistStorageReady
      ? "PARTIAL_WISHLIST_MATCHING_NOT_WIRED"
      : "FAIL";

  const result = {
    audit_id: "LOCAL_COMMUNITY_WISHLIST_MATCHING_READINESS_V1",
    generated_at: new Date().toISOString(),
    status,
    summary: {
      geofence_ready: geofenceReady,
      wishlist_storage_ready: wishlistStorageReady,
      wishlist_matching_ready: wishlistMatchingReady,
      no_db_writes: true,
      no_migrations_applied: true,
    },
    geofence_checks: geofenceChecks,
    wishlist_checks: wishlistChecks,
    recommendation: wishlistMatchingReady
      ? "Run authenticated live RPC smoke with seeded viewer/wishlist rows."
      : "Implement a deterministic wishlist-match layer by joining viewer wishlist_items to eligible local feed rows, returning a non-sensitive match field, and adding web/mobile display parity.",
  };

  const lines = [
    "# Local Community Wishlist Matching Readiness V1",
    "",
    `Status: ${status}`,
    `Generated: ${result.generated_at}`,
    "",
    "## Summary",
    "",
    `- Geofence feed ready: ${geofenceReady}`,
    `- Wishlist storage ready: ${wishlistStorageReady}`,
    `- Wishlist matching wired into nearby feed: ${wishlistMatchingReady}`,
    "- No DB writes: true",
    "- No migrations applied: true",
    "",
    "## Geofence Checks",
    "",
    ...geofenceChecks.map((item) => `- ${item.ok ? "PASS" : "FAIL"}: ${item.name} - ${item.detail}`),
    "",
    "## Wishlist Checks",
    "",
    ...wishlistChecks.map((item) => `- ${item.ok ? "PASS" : "FAIL"}: ${item.name} - ${item.detail}`),
    "",
    "## Recommendation",
    "",
    result.recommendation,
  ];

  await fs.writeFile(JSON_PATH, `${JSON.stringify(result, null, 2)}\n`);
  await fs.writeFile(MD_PATH, `${lines.join("\n")}\n`);

  console.log(JSON.stringify({
    status,
    geofenceReady,
    wishlistStorageReady,
    wishlistMatchingReady,
    json: JSON_PATH,
    markdown: MD_PATH,
  }, null, 2));

  if (!geofenceReady || !wishlistStorageReady) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
