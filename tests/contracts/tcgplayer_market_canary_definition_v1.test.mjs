import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  validateTcgplayerMarketCanaryDefinitionV1,
} from "../../backend/pricing/tcgplayer_market_canary_definition_v1.mjs";

const WORKER = fs.readFileSync(
  new URL(
    "../../scripts/workers/tcgplayer_market_publication_worker_v1.mjs",
    import.meta.url,
  ),
  "utf8",
);
const PIPELINE = fs.readFileSync(
  new URL(
    "../../scripts/workers/tcgplayer_market_pipeline_v1.mjs",
    import.meta.url,
  ),
  "utf8",
);

function printing(overrides = {}) {
  return {
    ordinal: 1,
    card_print_id: "11111111-1111-4111-8111-111111111111",
    card_printing_id: "22222222-2222-4222-8222-222222222222",
    gv_id: "GV-PK-TST-1",
    printing_gv_id: "GV-PK-TST-1-HOLO",
    canonical_name: "Test Card",
    canonical_number: "1",
    canonical_set_name: "Test Set",
    canonical_set_code: "TST",
    expected_language: "English",
    expected_finish: "holo",
    source_product_id: 1001,
    source_product_name: "Test Card",
    source_subtype_name: "Holofoil",
    expected_publication_state: "publish",
    expected_headline_usd: 12.34,
    expected_quarantine_reason: null,
    image_url: "https://example.invalid/test.webp",
    provenance_verification: { status: "passed" },
    visual_data_verification: { status: "passed" },
    ...overrides,
  };
}

function definition(overrides = {}) {
  return {
    schema_version: "TCGPLAYER_MARKET_CANARY_DEFINITION_V1",
    canary_id: "TCGPLAYER_MARKET_CANARY_100_V1",
    source_shadow_run_id: "33333333-3333-4333-8333-333333333333",
    source_sync_run_id: "44444444-4444-4444-8444-444444444444",
    expected_count: 2,
    verification_status: "verified",
    printings: [
      printing(),
      printing({
        ordinal: 2,
        card_print_id: "55555555-5555-4555-8555-555555555555",
        card_printing_id: "66666666-6666-4666-8666-666666666666",
        gv_id: "GV-PK-TST-2",
        printing_gv_id: "GV-PK-TST-2-RH",
        canonical_number: "2",
        expected_finish: "reverse",
        source_product_id: 1002,
        source_subtype_name: "Reverse Holofoil",
      }),
    ],
    ...overrides,
  };
}

test("verified exact canary definition validates", () => {
  assert.equal(
    validateTcgplayerMarketCanaryDefinitionV1(definition(), {
      expectedCount: 2,
    }).printings.length,
    2,
  );
});

test("canary definition rejects duplicate, unverified, and finish-drift rows", () => {
  assert.throws(
    () =>
      validateTcgplayerMarketCanaryDefinitionV1(
        definition({ verification_status: "pending" }),
        { expectedCount: 2 },
      ),
    /verification_status must be verified/,
  );
  assert.throws(
    () =>
      validateTcgplayerMarketCanaryDefinitionV1(
        definition({
          printings: [
            printing(),
            printing({ ordinal: 2, source_product_id: 1002 }),
          ],
        }),
        { expectedCount: 2 },
      ),
    /duplicate card_printing_id/,
  );
  assert.throws(
    () =>
      validateTcgplayerMarketCanaryDefinitionV1(
        definition({
          printings: [
            printing({ expected_finish: "normal" }),
            definition().printings[1],
          ],
        }),
        { expectedCount: 2 },
      ),
    /source subtype and expected finish do not agree/,
  );
});

test("canary runtime is exact-definition-only and records definition provenance", () => {
  assert.match(WORKER, /canary mode requires --canary-definition/);
  assert.match(
    WORKER,
    /exact canary definition modes forbid first-N --limit selection/,
  );
  assert.match(
    WORKER,
    /--canary-definition is only valid in dry_run or canary mode/,
  );
  assert.match(WORKER, /card_printing_id = any\(\$1::uuid\[\]\)/);
  assert.match(WORKER, /canary_definition_sha256/);
  assert.match(WORKER, /resolved \$\{matches\.length\} rows/);
  assert.match(PIPELINE, /canary mode requires --canary-definition/);
  assert.match(
    PIPELINE,
    /exact canary definition modes forbid first-N --publication-limit/,
  );
  assert.match(
    PIPELINE,
    /--canary-definition is only valid in dry_run or canary mode/,
  );
  assert.match(PIPELINE, /--canary-definition=\$\{args\.canaryDefinitionPath\}/);
});
