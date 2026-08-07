import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  classifyTcgplayerMarketIntegrationPathV1,
  evaluateTcgplayerMarketPostCanaryReadinessV1,
  summarizeTcgplayerMarketIntegrationPathsV1,
  TCGPLAYER_MARKET_POST_CANARY_MIGRATIONS_V1,
  TCGPLAYER_MARKET_POST_CANARY_SURFACES_V1,
} from "../../backend/pricing/tcgplayer_market_post_canary_readiness_policy_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..", "..");
const POLICY_SOURCE = readFileSync(
  path.join(
    ROOT,
    "backend",
    "pricing",
    "tcgplayer_market_post_canary_readiness_policy_v1.mjs",
  ),
  "utf8",
);
const AUDIT_SOURCE = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "audits",
    "tcgplayer_market_post_canary_integration_inventory_v1.mjs",
  ),
  "utf8",
);

test("post-canary package freezes all three pending pricing migrations", () => {
  assert.deepEqual(
    TCGPLAYER_MARKET_POST_CANARY_MIGRATIONS_V1.map(
      (migration) => migration.id,
    ),
    ["20260728130000", "20260728133000", "20260730180000"],
  );
  for (const migration of TCGPLAYER_MARKET_POST_CANARY_MIGRATIONS_V1) {
    assert.match(migration.sha256, /^[a-f0-9]{64}$/);
    assert.match(path.basename(migration.path), new RegExp(`^${migration.id}`));
  }
});

test("surface checklist contains exactly the 17 governed product surfaces", () => {
  assert.equal(TCGPLAYER_MARKET_POST_CANARY_SURFACES_V1.length, 17);
  assert.equal(
    new Set(TCGPLAYER_MARKET_POST_CANARY_SURFACES_V1).size,
    17,
  );
  assert.equal(
    TCGPLAYER_MARKET_POST_CANARY_SURFACES_V1.includes("web_set_grid"),
    true,
  );
  assert.equal(
    TCGPLAYER_MARKET_POST_CANARY_SURFACES_V1.includes("flutter_network"),
    true,
  );
});

test("integration files are separated by ownership boundary", () => {
  assert.equal(
    classifyTcgplayerMarketIntegrationPathV1(
      "supabase/migrations/20260730180000_repair.sql",
    ),
    "database_migration",
  );
  assert.equal(
    classifyTcgplayerMarketIntegrationPathV1(
      "backend/pricing/tcgplayer_market_publication_policy_v1.mjs",
    ),
    "pricing_runtime",
  );
  assert.equal(
    classifyTcgplayerMarketIntegrationPathV1(
      "apps/web/src/lib/pricing/marketPricingReadModelV1.ts",
    ),
    "web_client",
  );
  assert.equal(
    classifyTcgplayerMarketIntegrationPathV1(
      "lib/services/vault/vault_exact_pricing.dart",
    ),
    "flutter_client",
  );
  assert.deepEqual(
    summarizeTcgplayerMarketIntegrationPathsV1([
      { path: "apps/web/a.ts" },
      { path: "apps/web/b.ts" },
      { path: "supabase/migrations/1.sql" },
    ]),
    { database_migration: 1, web_client: 2 },
  );
});

test("known migrations and surfaces pass while merge conflicts remain explicit", () => {
  const evaluation = evaluateTcgplayerMarketPostCanaryReadinessV1({
    migrationResults: TCGPLAYER_MARKET_POST_CANARY_MIGRATIONS_V1.map(
      (migration) => ({
        ...migration,
        exists: true,
        hash_matches: true,
      }),
    ),
    conflictFiles: ["package.json"],
    requiredSurfaces: TCGPLAYER_MARKET_POST_CANARY_SURFACES_V1,
  });
  assert.equal(evaluation.status, "rehearsal_ready");
  assert.equal(evaluation.migration_package_ready, true);
  assert.equal(evaluation.surface_contract_ready, true);
  assert.equal(evaluation.manual_conflict_count, 1);
  assert.deepEqual(evaluation.findings, [
    "manual_integration_conflicts_present",
  ]);
});

test("inventory audit is read-only and records frozen refs and boundaries", () => {
  assert.match(AUDIT_SOURCE, /\["merge-tree", "--write-tree"/);
  assert.match(POLICY_SOURCE, /database_writes: false/);
  assert.match(POLICY_SOURCE, /production_deploy: false/);
  assert.match(POLICY_SOURCE, /migration_apply: false/);
  assert.match(POLICY_SOURCE, /publication_activation: false/);
  assert.doesNotMatch(
    AUDIT_SOURCE,
    /createClient|SUPABASE_|DATABASE_URL|\bpsql\b|supabase\s+db/,
  );
});
