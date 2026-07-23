import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { buildMarketListingAcquisitionDryRunPlanV1 } from "../../backend/pricing/market_listing_acquisition_dry_run_plan_v1.mjs";

const assignmentMigration = readFileSync(
  new URL("../../supabase/migrations/20260629130000_market_evidence_variant_assignment_v1.sql", import.meta.url),
  "utf8",
);
const assignmentBackfill = readFileSync(
  new URL("../../docs/sql/mee_variant_assignment_v1_backfill.sql", import.meta.url),
  "utf8",
);
const assignmentAliasRepair = readFileSync(
  new URL("../../docs/sql/mee_variant_assignment_v1_alias_repair.sql", import.meta.url),
  "utf8",
);
const readModelsMigration = readFileSync(
  new URL("../../supabase/migrations/20260629131000_market_evidence_variant_read_models_v1.sql", import.meta.url),
  "utf8",
);
const nightlyWorker = readFileSync(
  new URL("../../scripts/workers/mee_nightly_droplet_worker_v1.mjs", import.meta.url),
  "utf8",
);
const smokeFetch = readFileSync(
  new URL("../../backend/pricing/market_listing_acquisition_smoke_fetch_v1.mjs", import.meta.url),
  "utf8",
);

function stripSqlComments(sql) {
  return sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

test("variant assignment schema is internal-only and source agnostic", () => {
  assert.match(assignmentMigration, /create table if not exists public\.market_evidence_variant_assignments/);
  assert.match(assignmentMigration, /source_family in \('market_reference', 'market_listing'\)/);
  assert.match(assignmentMigration, /source_table in \('market_reference_candidates', 'market_listing_card_candidates'\)/);
  assert.match(assignmentMigration, /card_printing_id uuid references public\.card_printings/);
  assert.match(assignmentMigration, /publishable = false\s+and app_visible = false\s+and market_truth = false/);
  assert.match(assignmentMigration, /revoke all on public\.market_evidence_variant_assignments from public, anon, authenticated/);
  assert.match(assignmentMigration, /grant select, insert on public\.market_evidence_variant_assignments to service_role/);
});

test("finish normalization handles Arceus Charizard variant terms", () => {
  assert.match(assignmentMigration, /cracked ice/);
  assert.match(assignmentMigration, /rocket reverse/);
  assert.match(assignmentMigration, /reverseholo/);
  assert.match(assignmentMigration, /crosshatch/);
  assert.match(assignmentMigration, /masterball/);
  assert.match(assignmentMigration, /pokeball/);
});

test("backfill assigns reference and listing evidence without public leakage", () => {
  assert.match(assignmentBackfill, /from public\.market_reference_candidates candidate/);
  assert.match(assignmentBackfill, /from public\.market_listing_card_candidates candidate/);
  assert.match(assignmentBackfill, /public\.normalize_market_evidence_finish_key_v1\(candidate\.finish_hint\)/);
  assert.match(assignmentBackfill, /observation\.listing_title/);
  assert.match(assignmentBackfill, /'MEE_VARIANT_ASSIGNMENT_RULES_V1'/);
  assert.match(assignmentBackfill, /true,\s+false,\s+false,\s+false/);
  assert.match(assignmentBackfill, /source_rows\.normalized_finish_key = 'cosmos'/);
  assert.match(assignmentBackfill, /child\.finish_key = 'cracked_ice'/);
});

test("variant assignment backfill treats card_printings as read-only identity truth", () => {
  const sql = stripSqlComments(assignmentBackfill);

  assert.match(sql, /\bfrom\s+public\.card_printings\b/i);
  assert.doesNotMatch(
    sql,
    /\b(?:insert\s+into|update|delete\s+from|merge\s+into|truncate(?:\s+table)?|alter\s+table|drop\s+table)\s+(?:only\s+)?(?:public\.)?card_printings\b/i,
  );

  const insertTargets = [...sql.matchAll(/\binsert\s+into\s+public\.([a-z0-9_]+)/gi)].map((match) => match[1]);
  assert.deepEqual([...new Set(insertTargets)], ["market_evidence_variant_assignments"]);
});

test("cosmos alias repair only maps to cracked ice when no true cosmos child exists", () => {
  assert.match(assignmentAliasRepair, /finish_alias_cosmos_to_cracked_ice/);
  assert.match(assignmentAliasRepair, /assignment\.normalized_finish_key = 'cosmos'/);
  assert.match(assignmentAliasRepair, /cracked\.finish_key = 'cracked_ice'/);
  assert.match(assignmentAliasRepair, /cosmos\.finish_key = 'cosmos'/);
  assert.match(assignmentAliasRepair, /not exists/);
  assert.match(assignmentAliasRepair, /variant_assignment_status = 'exact_child_finish'/);
});

test("variant read models keep reference, active ask, and query targets separated", () => {
  assert.match(readModelsMigration, /v_market_reference_variant_signal_rollups_v1/);
  assert.match(readModelsMigration, /v_market_listing_variant_active_ask_rollups_v1/);
  assert.match(readModelsMigration, /v_market_listing_variant_query_targets_v1/);
  assert.match(readModelsMigration, /assignment\.card_printing_id is not null/);
  assert.match(readModelsMigration, /evidence_lane/);
  assert.match(readModelsMigration, /\('cracked_ice', 'cosmos holo'\)/);
  assert.match(readModelsMigration, /\('reverse', 'reverse holofoil'\)/);
  assert.match(readModelsMigration, /source_fetch_allowed_by_this_view/);
  assert.match(readModelsMigration, /can_publish_price_directly/);
});

test("acquisition dry-run planner preserves child variant target identity", () => {
  const report = buildMarketListingAcquisitionDryRunPlanV1({
    targets: [
      {
        card_print_id: "parent-1",
        card_printing_id: "child-rh-1",
        gv_id: "GV-PK-AR-1",
        printing_gv_id: "GV-PK-AR-1-RH",
        name: "Charizard",
        set_code: "pl4",
        set_name: "Arceus",
        number: "1",
        number_plain: "1",
        rarity: "Rare Holo",
        finish_key: "reverse",
        ebay_query_text: 'Pokemon "Charizard" "Arceus" "1" "reverse holo"',
        acquisition_priority: "priority_variant_finish",
      },
    ],
    dryRunTargetLimit: 1,
    dailyCallCeiling: 10,
    maxResultsPerCall: 200,
    setShelfPageBudget: 0,
  });

  assert.equal(report.summary.planned_target_count, 1);
  assert.equal(report.summary.acquisition_request_count, 1);
  assert.equal(report.summary.strategy_counts.variant_finish, 1);

  const [request] = report.acquisition_requests;
  assert.equal(request.strategy, "variant_finish");
  assert.equal(request.query_text, 'Pokemon "Charizard" "Arceus" "1" "reverse holo"');
  assert.equal(request.card_printing_id, "child-rh-1");
  assert.equal(request.printing_gv_id, "GV-PK-AR-1-RH");
  assert.equal(request.target_hints.finish_key, "reverse");
  assert.equal(request.target_hints.card_printing_id, "child-rh-1");
  assert.equal(request.target_hints.printing_gv_id, "GV-PK-AR-1-RH");
  assert.equal(request.can_publish_price_directly, false);
  assert.equal(request.app_visible, false);
  assert.equal(request.market_truth, false);
});

test("eBay projection preserves child variant target identity in raw evidence payload", () => {
  assert.match(smokeFetch, /card_printing_id: request\.card_printing_id \?\? null/);
  assert.match(smokeFetch, /printing_gv_id: request\.printing_gv_id \?\? null/);
  assert.match(smokeFetch, /finish_key: request\.finish_key \?\? null/);
  assert.match(smokeFetch, /unique_printing_target_count_with_results/);
});

test("nightly worker keeps variant assignment guarded before final readbacks", () => {
  assert.match(nightlyWorker, /docs\/sql\/mee_variant_assignment_v1_backfill\.sql/);
  assert.match(nightlyWorker, /docs\/sql\/mee_variant_assignment_v1_readback\.sql/);
  assert.match(nightlyWorker, /docs\/sql\/mee_variant_read_models_v1_readback\.sql/);
  assert.match(nightlyWorker, /enableRunOnlyMaintenance/);
  assert.match(nightlyWorker, /run_only_maintenance_not_requested/);

  const lifecycleIndex = nightlyWorker.indexOf('key: "lifecycle_projection_drain"');
  const assignmentIndex = nightlyWorker.indexOf('key: "variant_assignment_backfill"');
  const assignmentReadbackIndex = nightlyWorker.indexOf('key: "variant_assignment_readback"');
  const qualityIndex = nightlyWorker.indexOf('key: "quality_scoring_readback"');

  assert.ok(lifecycleIndex > 0);
  assert.ok(assignmentIndex > lifecycleIndex);
  assert.ok(assignmentReadbackIndex > assignmentIndex);
  assert.ok(qualityIndex > assignmentReadbackIndex);
  assert.match(nightlyWorker, /key: "variant_assignment_backfill"[\s\S]*runOnly: true/);
});
