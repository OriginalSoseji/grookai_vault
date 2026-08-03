import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MEE_DEFAULT_MIN_FREE_BYTES,
  buildCursorEventV1,
  classifyPipelineOutcomeV1,
  evaluateDiskCapacityV1,
  resolveAcquisitionCursorV1,
} from "../../backend/pricing/mee_nightly_runtime_policy_v1.mjs";

test("rotating acquisition cursor advances instead of restarting at zero", () => {
  const cursor = resolveAcquisitionCursorV1({
    previous: {
      source_manifest_hash: "manifest-a",
      source_request_count: 8400,
      cycle_ordinal: 1,
      batch_ordinal: 1,
      next_start_index: 4000,
      cycle_complete: false,
    },
    sourceManifestHash: "manifest-a",
    sourceRequestCount: 8400,
  });

  assert.equal(cursor.start_index, 4000);
  assert.equal(cursor.batch_ordinal, 2);
  assert.equal(cursor.cycle_ordinal, 1);
});

test("an incomplete cycle refuses silent source-manifest replacement", () => {
  assert.throws(() => resolveAcquisitionCursorV1({
    previous: {
      source_manifest_hash: "manifest-a",
      source_request_count: 8400,
      cycle_ordinal: 1,
      batch_ordinal: 1,
      next_start_index: 4000,
      cycle_complete: false,
    },
    sourceManifestHash: "manifest-b",
    sourceRequestCount: 8400,
  }), /manifest changed/);
});

test("cursor event reconciles the selected range and marks cycle completion", () => {
  const event = buildCursorEventV1({
    runKey: "MEE-TEST-1",
    cursor: {
      acquisition_mode: "rotating_cycle",
      source_manifest_hash: "manifest-a",
      source_request_count: 8400,
      cycle_ordinal: 1,
      batch_ordinal: 3,
      start_index: 8000,
    },
    nextStartIndex: 8400,
    selectedRequestCount: 400,
  });

  assert.equal(event.cycle_complete, true);
  assert.equal(event.selected_request_count, 400);
});

test("disk guard stops provider calls before falling below the configured floor", () => {
  assert.equal(evaluateDiskCapacityV1({
    freeBytes: MEE_DEFAULT_MIN_FREE_BYTES - 1,
  }).provider_calls_allowed, false);
  assert.equal(evaluateDiskCapacityV1({
    freeBytes: MEE_DEFAULT_MIN_FREE_BYTES,
  }).provider_calls_allowed, true);
});

test("pipeline outcomes preserve partial-success truth", () => {
  assert.equal(classifyPipelineOutcomeV1([
    { phase: "fetch", status: 0, db_writes: false },
    { phase: "warehouse_apply", status: 0, db_writes: true },
    { phase: "projection", status: 1, db_writes: false },
  ]), "failed_after_writes");
  assert.equal(classifyPipelineOutcomeV1([
    { phase: "warehouse_apply", status: 0, db_writes: true },
    { phase: "warehouse_audit", status: 1, db_writes: false, non_blocking: true },
  ]), "completed_with_warnings");
});

test("operational recovery migration is additive and keeps new state private", () => {
  const migration = readFileSync(
    new URL("../../supabase/migrations/20260803010000_mee_operational_recovery_v1.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /market_listing_observations \(acquisition_run_id, id\)/);
  assert.match(migration, /market_listing_card_candidates \(observation_id, id\)/);
  assert.match(migration, /market_listing_acquisition_cursor_events/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all .* from public, anon, authenticated/);
  assert.doesNotMatch(migration, /\bdelete\s+from\b/i);
  assert.doesNotMatch(migration, /\btruncate\b/i);
  assert.doesNotMatch(migration, /\bdrop\s+table\b/i);
});

test("operational recovery indexes price events by their observation backbone", () => {
  const migration = readFileSync(
    new URL("../../supabase/migrations/20260803020000_mee_price_event_observation_index_v1.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /market_listing_price_events \(observation_id, id\)/);
  assert.doesNotMatch(migration, /\bdelete\s+from\b/i);
  assert.doesNotMatch(migration, /\btruncate\b/i);
  assert.doesNotMatch(migration, /\bdrop\s+table\b/i);
});

test("operational recovery includes a read-only schema and security readback", () => {
  const readback = readFileSync(
    new URL("../../docs/sql/mee_operational_recovery_v1_readback.sql", import.meta.url),
    "utf8",
  );
  assert.match(readback, /market_listing_observations_run_id_idx/);
  assert.match(readback, /market_listing_price_events_observation_idx/);
  assert.match(readback, /market_listing_acquisition_cursor_events/);
  assert.match(readback, /has_table_privilege\('anon'/);
  assert.match(readback, /has_table_privilege\('service_role'/);
  assert.match(readback, /pg_policies/);
  assert.doesNotMatch(readback, /^\s*(insert|update|delete|truncate|drop|alter)\b/im);
});
