import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(path, "utf8");
}

const ingestionWorker = source(
  "backend/ingestion/controlled_growth_ingestion_worker_v1.mjs",
);
const pricingValidation = source(
  "backend/pricing/run_pricing_observation_live_validation_v1.mjs",
);
const nameNormalizer = source("backend/identity/normalizeCardNameV1.mjs");
const scannerService = source(
  "backend/identity_v3/scanner_v5/run_scanner_v5_identity_service_v1.mjs",
);

const edgeSources = [
  "supabase/functions/scan-upload-plan/index.ts",
  "supabase/functions/scan-read/index.ts",
  "supabase/functions/identity_scan_enqueue_v1/index.ts",
  "supabase/functions/identity_scan_get_v1/index.ts",
  "supabase/functions/ingestion-enqueue-v1/index.ts",
  "supabase/functions/operations-webhook-v1/index.ts",
  "supabase/functions/vault-add-card-instance-v1/index.ts",
  "supabase/functions/warehouse-intake-v1/index.ts",
  "supabase/functions/notification-dispatcher/index.ts",
].map((path) => ({ path, value: source(path) }));

test("controlled-growth suffix normalization avoids ambiguous nested repetition", () => {
  assert.match(
    ingestionWorker,
    /const TERMINAL_EX_RE = \/\(\[A-Za-z0-9\]\)\(\?:\\s\*-\\s\*\|\\s\+\)EX\$\/i;/,
  );
  assert.match(
    ingestionWorker,
    /const TERMINAL_GX_RE = \/\(\[A-Za-z0-9\]\)\(\?:\\s\*-\\s\*\|\\s\+\)GX\$\/i;/,
  );
  assert.doesNotMatch(
    ingestionWorker,
    /\(\?:\\s\*-\\s\*\|\\s\+\)\+(?:EX|GX)\$/,
  );

  const ex = /([A-Za-z0-9])(?:\s*-\s*|\s+)EX$/i;
  const gx = /([A-Za-z0-9])(?:\s*-\s*|\s+)GX$/i;
  assert.equal("Charizard - EX".replace(ex, "$1-EX"), "Charizard-EX");
  assert.equal("Pikachu   EX".replace(ex, "$1-EX"), "Pikachu-EX");
  assert.equal("Raichu - GX".replace(gx, "$1-GX"), "Raichu-GX");
});

test("runtime responses never expose credential fragments", () => {
  const joined = edgeSources.map(({ value }) => value).join("\n");
  for (const forbidden of [
    "authorization_header_prefix",
    "token_prefix",
    "token_suffix",
    "token_len",
    "apikey_prefix",
    "auth_prefix",
    "xbear_prefix",
  ]) {
    assert.doesNotMatch(joined, new RegExp(forbidden), forbidden);
  }
});

test("deployed runtime boundaries return stable errors instead of raw exceptions", () => {
  for (const { path, value } of edgeSources) {
    assert.doesNotMatch(
      value,
      /details?:\s*(?:[^\n]*\.message|String\s*\()/,
      `${path} must not return raw error details`,
    );
  }

  assert.match(scannerService, /error: 'internal_error'/);
  assert.match(scannerService, /error: 'scan_processing_failed'/);
  assert.doesNotMatch(
    scannerService,
    /writeJson\([^;]{0,500}error:\s*error\?\.message/s,
  );
});

test("identity replacements removed by this repair remain absent", () => {
  assert.doesNotMatch(pricingValidation, /\.replace\('Z',\s*'Z'\)/);
  assert.doesNotMatch(nameNormalizer, /\.replace\(\/\\bex\\b\/g,\s*'ex'\)/);
});
