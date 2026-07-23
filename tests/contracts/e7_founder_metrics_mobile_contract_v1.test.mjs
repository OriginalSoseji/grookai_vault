import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function readSource(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("E7 mobile metrics authenticates the founder before a service-role aggregate read", () => {
  const entrypoint = readSource(
    "supabase/functions/founder-metrics-mobile-v1/index.ts",
  );
  const config = readSource(
    "supabase/functions/founder-metrics-mobile-v1/config.toml",
  );

  assert.match(config, /verify_jwt\s*=\s*false/i);
  assert.match(entrypoint, /requireAuthUser\(req\)/);
  assert.match(entrypoint, /userEmail\s*!==\s*FOUNDER_EMAIL/);
  assert.match(entrypoint, /createServiceRoleClient\(\)/);
  assert.match(entrypoint, /loadFounderMetrics\(admin\)/);
  assert.doesNotMatch(entrypoint, /loadFounderMetrics\(auth\.sb\)/);

  assert.ok(
    entrypoint.indexOf("userEmail !== FOUNDER_EMAIL") <
      entrypoint.indexOf("createServiceRoleClient()"),
    "service-role client must only be created after founder authorization",
  );
});

test("E7 mobile metrics returns aggregates only and never mutates production data", () => {
  const loader = readSource(
    "supabase/functions/_shared/founder_metrics.ts",
  );
  const mobileService = readSource(
    "lib/services/network/founder_metrics_service.dart",
  );

  for (const table of [
    "north_star_weekly_rollups",
    "north_star_weekly_breakdowns",
    "notification_type_delivery_recommendations",
  ]) {
    assert.match(loader, new RegExp(`\\.from\\("${table}"\\)`));
  }

  assert.doesNotMatch(loader, /\.(?:insert|update|upsert|delete)\s*\(/);
  assert.doesNotMatch(loader, /\.rpc\s*\(/);
  assert.match(
    mobileService,
    /const String _kFounderMetricsFunction = 'founder-metrics-mobile-v1';/,
  );
  assert.doesNotMatch(
    mobileService,
    /north_star_weekly_(?:rollups|breakdowns)|notification_type_delivery_recommendations/,
  );
});
