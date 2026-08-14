import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  buildOnePieceDurablePayloadPreflightFingerprintV1,
  buildOnePieceDurableSourceExpectationV1,
  evaluateOnePieceDurablePayloadPreflightV1,
} from "../../backend/pricing/one_piece_canonical_import_durable_payload_preflight_v1.mjs";

const PLAN = "docs/audits/pricing/one_piece_canonical_import_durable_payload_v1/" +
  "bounded_21_row_plan_v1/plan.json";
const SCHEMA_PLAN = "docs/audits/pricing/" +
  "one_piece_canonical_import_durable_staging_schema_apply_v1/" +
  "schema_apply_plan_v1/plan.json";
const SCHEMA_READBACK = "docs/audits/pricing/" +
  "one_piece_canonical_import_durable_staging_schema_apply_v1/" +
  "production_schema_apply_v1_independent_verify/readback.json";
const SOURCE_PROOF = "docs/audits/pricing/" +
  "one_piece_canonical_import_staging_and_canary_v1/" +
  "production_rollback_security_hardened/protected_before.json";

test("durable source expectation preserves all 21 frozen products", async () => {
  const plan = JSON.parse(await fs.readFile(PLAN, "utf8"));
  const expectation = buildOnePieceDurableSourceExpectationV1(plan);
  assert.equal(expectation.category_id, 68);
  assert.equal(expectation.group.group_id, 3189);
  assert.equal(expectation.products.length, 21);
  assert.equal(new Set(expectation.products.map((row) => row.source_product_id)).size, 21);
});

test("preflight fingerprint is deterministic and evidence-sensitive", () => {
  const input = {
    producer_commit_sha: "a".repeat(40),
    payload_plan_fingerprint_sha256: "b".repeat(64),
    payload_fingerprint_sha256: "c".repeat(64),
    schema_apply_plan_fingerprint_sha256: "d".repeat(64),
    source_expectation_sha256: "e".repeat(64),
    schema_readback_sha256: "f".repeat(64),
    source_snapshot_sha256: "1".repeat(64),
    collision_state_sha256: "2".repeat(64),
  };
  assert.equal(buildOnePieceDurablePayloadPreflightFingerprintV1(input),
    buildOnePieceDurablePayloadPreflightFingerprintV1({ ...input }));
  assert.notEqual(buildOnePieceDurablePayloadPreflightFingerprintV1(input),
    buildOnePieceDurablePayloadPreflightFingerprintV1({ ...input,
      source_snapshot_sha256: "3".repeat(64) }));
});

test("collisions and blockers fail closed", async () => {
  const [plan, schemaPlan, schemaReadback, sourceProof] = await Promise.all([
    PLAN, SCHEMA_PLAN, SCHEMA_READBACK, SOURCE_PROOF,
  ].map(async (file) => JSON.parse(await fs.readFile(file, "utf8"))));
  const result = evaluateOnePieceDurablePayloadPreflightV1({
    plan,
    schemaPlan,
    schemaReadback,
    sourceSnapshot: sourceProof.source,
    collisionState: { batch_id: 1, payload_fingerprint: 0, source_products: 0 },
    blockingPids: [123],
  });
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes("collision:batch_id"));
  assert.ok(result.findings.includes("database_session_blocked"));
});

test("production preflight is statically read-only and artifact-last", async () => {
  const source = await fs.readFile(
    "scripts/audits/one_piece_canonical_import_durable_payload_preflight_v1.mjs",
    "utf8",
  );
  assert.match(source, /default_transaction_read_only = on/);
  assert.match(source, /repeatable read read only/);
  assert.match(source, /await client\.query\("rollback"\)/);
  assert.doesNotMatch(source, /\b(?:insert|update|delete|truncate)\s+(?:into|from|table|public\.)/i);
  assert.ok(source.indexOf("await client.end()") < source.indexOf("schema_readback.json"));
});
