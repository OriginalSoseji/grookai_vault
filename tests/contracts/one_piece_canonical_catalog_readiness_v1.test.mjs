import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import { buildOnePieceReadinessArtifactsV1 } from "../../scripts/audits/one_piece_canonical_catalog_readiness_v1.mjs";

function field(name, value) {
  return { name, value };
}

function sourceFixture() {
  return {
    proof: {
      transaction_read_only: "on",
      default_transaction_read_only: "on",
      database_user: "fixture",
      rolled_back_and_closed: true,
    },
    category: { category_id: 68, display_name: "One Piece Card Game" },
    groups: [
      {
        group_id: 10,
        category_id: 68,
        name: "Starter Deck 1: Straw Hat Crew",
        published_on: "2022-12-02T00:00:00Z",
        source_active: true,
      },
    ],
    products: [
      {
        product_id: 101,
        category_id: 68,
        group_id: 10,
        name: "Monkey.D.Luffy",
        image_url: "https://example.invalid/101.jpg",
        source_active: true,
        presale_info: { isPresale: false },
        extended_data: [
          field("Number", "ST01-001"),
          field("Rarity", "L"),
          field("CardType", "Leader"),
        ],
        payload_hash: "hash-101",
      },
      {
        product_id: 102,
        category_id: 68,
        group_id: 10,
        name: "Starter Deck 1: Straw Hat Crew",
        source_active: true,
        presale_info: { isPresale: false },
        extended_data: [],
        payload_hash: "hash-102",
      },
      {
        product_id: 103,
        category_id: 68,
        group_id: 10,
        name: "Unknown source row",
        source_active: true,
        presale_info: { isPresale: false },
        extended_data: [],
        payload_hash: "hash-103",
      },
    ],
    latest_observed_on: "2026-08-13",
    latest_prices: [
      {
        source_price_row_identity: "101:normal",
        product_id: 101,
        subtype_name: "Normal",
        subtype_name_normalized: "normal",
        observed_on: "2026-08-13",
        market_price: "2.50",
      },
    ],
  };
}

test("artifact builder preserves all rows and produces deterministic gzip", () => {
  const first = buildOnePieceReadinessArtifactsV1(sourceFixture(), {
    asOfDate: "2026-08-13",
  });
  const second = buildOnePieceReadinessArtifactsV1(sourceFixture(), {
    asOfDate: "2026-08-13",
  });
  assert.equal(first.rows.length, 3);
  assert.equal(first.manifest.row_count, 3);
  assert.equal(first.manifest.logical_sha256, second.manifest.logical_sha256);
  assert.equal(first.manifest.compressed_sha256, second.manifest.compressed_sha256);
  assert.deepEqual(first.compressed, second.compressed);
  assert.equal(gunzipSync(first.compressed).toString("utf8"), first.manifestBody);
  assert.equal(first.reconciliation.counts.exact_single_card_candidates, 1);
  assert.equal(first.reconciliation.counts.sealed_product_candidates, 1);
  assert.equal(first.reconciliation.counts.ambiguous_quarantined, 1);
});

test("manifest rows preserve source hashes but grant no write or publication authority", () => {
  const result = buildOnePieceReadinessArtifactsV1(sourceFixture(), {
    asOfDate: "2026-08-13",
  });
  assert.deepEqual(
    result.rows.map((row) => row.source_payload_hash),
    ["hash-101", "hash-102", "hash-103"],
  );
  assert.ok(result.rows.every((row) => row.publishable === false));
  assert.ok(result.rows.every((row) => row.canonical_write_authorized === false));
  assert.ok(result.rows.every((row) => row.sealed_write_authorized === false));
});

test("production reader is explicitly read-only, rollback-only, and closes its client", () => {
  const source = fs.readFileSync(
    new URL("../../scripts/audits/one_piece_canonical_catalog_readiness_v1.mjs", import.meta.url),
    "utf8",
  );
  assert.match(source, /set default_transaction_read_only = on/i);
  assert.match(source, /begin transaction read only/i);
  assert.match(source, /show transaction_read_only/i);
  assert.match(source, /show default_transaction_read_only/i);
  assert.match(source, /client\.query\("rollback"\)/);
  assert.match(source, /await client\.end\(\)/);
  assert.doesNotMatch(source, /client\.query\(\s*`\s*(insert|update|delete|merge|truncate|alter|drop|create)/i);
});

test("run plan declares every forbidden side effect false", () => {
  const source = fs.readFileSync(
    new URL("../../scripts/audits/one_piece_canonical_catalog_readiness_v1.mjs", import.meta.url),
    "utf8",
  );
  for (const boundary of [
    "database_writes",
    "migrations",
    "canonical_rows",
    "sealed_rows",
    "storage_or_network_acquisition",
    "image_repoints",
    "release_control_changes",
    "app_visibility",
    "pricing_publication",
    "vault_writes",
    "deployments",
    "active_mtg_ingestion_changes",
  ]) {
    assert.match(source, new RegExp(`${boundary}: false`));
  }
});
