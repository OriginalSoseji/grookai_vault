import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WORKFLOW = readFileSync(
  path.join(ROOT, ".github", "workflows", "prod-probe.yml"),
  "utf8",
);

test("production core API probe fails when required configuration is missing", () => {
  assert.match(WORKFLOW, /set -euo pipefail/);
  assert.match(
    WORKFLOW,
    /\[\[ -z "\$REST" \|\| -z "\$SUPABASE_URL" \|\| -z "\$ANON" \]\]/,
  );
  assert.match(WORKFLOW, /PROD_REST is missing/);
  assert.match(WORKFLOW, /PROD_SUPABASE_URL is missing/);
  assert.match(WORKFLOW, /PROD_PUBLISHABLE_KEY is missing/);
  assert.doesNotMatch(WORKFLOW, /Always succeed/);
});

test("production core API probe enforces HTTP and JSON response contracts", () => {
  assert.match(WORKFLOW, /test "\$rpc_code" = "200"/);
  assert.match(WORKFLOW, /test "\$wall_code" = "200"/);
  assert.match(WORKFLOW, /jq -e 'type == "array"' "\$artifact_dir\/search_cards\.json"/);
  assert.match(
    WORKFLOW,
    /jq -e '\(\.items \| type == "array"\) and \(\.count \| type == "number"\)'/,
  );
  assert.match(WORKFLOW, /\/functions\/v1\/wall_feed\?limit=1/);
  assert.doesNotMatch(WORKFLOW, /\/v_wall_feed\?/);
  assert.doesNotMatch(WORKFLOW, /\|\| echo N\/A/);
});

test("production core API probe preserves evidence even when the gate fails", () => {
  assert.match(WORKFLOW, /PROD_CORE_API_PROBE_RESULT_V1/);
  assert.match(WORKFLOW, /if: \$\{\{ always\(\) \}\}/);
  assert.match(WORKFLOW, /path: probe-artifacts/);
  assert.match(WORKFLOW, /if-no-files-found: error/);
});
