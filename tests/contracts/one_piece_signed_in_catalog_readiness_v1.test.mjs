import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  ONE_PIECE_EXPECTED_COUNTS_V1,
  buildOnePieceSignedInCatalogReadinessReportV1,
  evaluateOnePieceSignedInCatalogReadinessV1,
} from "../../backend/pricing/one_piece_signed_in_catalog_readiness_v1.mjs";

function fixture() {
  const expected = { ...ONE_PIECE_EXPECTED_COUNTS_V1 };
  delete expected.active_sealed_release_members;
  return {
    before: {
      release_control: { release_status: "hidden" },
      release_fingerprint: "release-before",
      catalog_fingerprint: "catalog-before",
      non_one_piece_fingerprint: "other-before",
      counts: expected,
    },
    simulatedControl: { release_status: "signed_in" },
    anonymous: {
      counts: {
        games: 0,
        sets: 0,
        card_prints: 0,
        card_print_identity: 0,
        card_printings: 0,
        self_hosted_images: 0,
        image_coverage_gaps: 0,
        direct_card_matches: 0,
        legacy_search_matches: 0,
        print_identity_search_matches: 0,
        sealed_pricing_rows: 0,
        sealed_release_members: 0,
      },
      sample: null,
    },
    authenticated: {
      counts: {
        ...expected,
        direct_card_matches: 1,
        legacy_search_matches: 1,
        print_identity_search_matches: 1,
        sealed_pricing_rows: 100,
        sealed_release_members: 332,
      },
      sample: {
        image_url: "https://example.test/storage/v1/object/public/external-card-images/one-piece/card-prints/example.jpg",
        image_url_self_hosted: true,
        image_status: "exact",
      },
    },
    privileges: {
      anonymous_sealed_rpc_execute: false,
      authenticated_sealed_rpc_execute: true,
    },
    afterRollback: {
      release_control: { release_status: "hidden" },
      release_fingerprint: "release-before",
      catalog_fingerprint: "catalog-before",
      non_one_piece_fingerprint: "other-before",
      counts: expected,
    },
  };
}

test("complete rollback-only signed-in evidence passes", () => {
  const result = evaluateOnePieceSignedInCatalogReadinessV1(fixture());
  assert.equal(result.ready_for_signed_in_activation, true);
  assert.equal(result.findings.length, 0);
});

test("anonymous catalog leakage fails closed", () => {
  const input = fixture();
  input.anonymous.counts.card_prints = 1;
  const result = evaluateOnePieceSignedInCatalogReadinessV1(input);
  assert.equal(result.ready_for_signed_in_activation, false);
  assert.ok(
    result.findings.some(
      (entry) => entry.code === "anonymous_card_prints_leak",
    ),
  );
});

test("missing authenticated search, image, or sealed pricing proof blocks readiness", () => {
  const input = fixture();
  input.authenticated.counts.print_identity_search_matches = 0;
  input.authenticated.counts.sealed_pricing_rows = 99;
  input.authenticated.sample.image_url_self_hosted = false;
  const result = evaluateOnePieceSignedInCatalogReadinessV1(input);
  assert.equal(result.ready_for_signed_in_activation, false);
  assert.deepEqual(
    result.findings.map((entry) => entry.code),
    [
      "authenticated_print_identity_search_empty",
      "authenticated_sealed_pricing_read_failed",
      "authenticated_sample_image_not_self_hosted",
    ],
  );
});

test("rollback and unrelated-catalog mismatches block readiness", () => {
  const input = fixture();
  input.afterRollback.release_fingerprint = "changed";
  input.afterRollback.non_one_piece_fingerprint = "changed";
  const result = evaluateOnePieceSignedInCatalogReadinessV1(input);
  assert.equal(result.ready_for_signed_in_activation, false);
  assert.ok(
    result.findings.some(
      (entry) => entry.code === "release_control_rollback_mismatch",
    ),
  );
  assert.ok(
    result.findings.some(
      (entry) => entry.code === "non_one_piece_boundary_changed",
    ),
  );
});

test("runner is rollback-only and proves both client roles", () => {
  const source = fs.readFileSync(
    new URL(
      "../../scripts/audits/one_piece_signed_in_catalog_readiness_v1.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(source, /begin transaction read only/i);
  assert.match(source, /set local role anon/i);
  assert.match(source, /set local role authenticated/i);
  assert.match(source, /update public\.catalog_game_release_controls/i);
  assert.match(source, /await client\.query\("rollback"\)/i);
  assert.doesNotMatch(source, /await client\.query\("commit"\)/i);
  for (const boundary of [
    "durable_database_writes: 0",
    "release_activation: false",
    "storage_writes: 0",
    "image_pointer_writes: 0",
    "pricing_writes: 0",
    "vault_writes: 0",
    "deployments: 0",
  ]) {
    assert.match(source, new RegExp(boundary));
  }
});

test("report states that activation remains separately governed", () => {
  const input = fixture();
  const decision = evaluateOnePieceSignedInCatalogReadinessV1(input);
  const report = buildOnePieceSignedInCatalogReadinessReportV1({
    ...decision,
    repository: { commit_sha: "abc", branch: "test" },
    transaction: { committed: false },
    boundaries: { durable_database_writes: 0 },
    before: input.before,
    anonymous: input.anonymous,
    authenticated: input.authenticated,
    privileges: input.privileges,
    after_rollback: input.afterRollback,
  });
  assert.match(report, /separately governed signed-in activation/i);
  assert.match(report, /catalog remains hidden/i);
});
