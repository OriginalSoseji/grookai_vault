import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildOnePieceSetClosureSnapshotV1,
  buildOnePieceSetImagePointerV1,
  evaluateOnePieceSetReleaseReadinessV1,
  isOnePieceSelfHostedExactImageV1,
  validateOnePieceSetImagePointersV1,
} from "../../backend/catalog/one_piece_set_release_closure_v1.mjs";

const workflow = fs.readFileSync(
  new URL("../../.github/workflows/one-piece-set-production-closure.yml", import.meta.url),
  "utf8",
);
const worker = fs.readFileSync(
  new URL("../../scripts/workers/one_piece_set_release_closure_v1.mjs", import.meta.url),
  "utf8",
);
const IMAGE_PUBLIC_BASE_URL =
  "https://project.supabase.co/storage/v1/object/public/external-card-images";

function row(overrides = {}) {
  return {
    card_print_id: "00000000-0000-4000-8000-000000000001",
    gv_id: "GV-OP-OP17-001-700001",
    set_code: "OP17",
    name: "Card",
    number: "OP17-001",
    source_product_id: "700001",
    source_image_url: "https://tcgplayer-cdn.tcgplayer.com/product/700001_200w.jpg",
    active_identity_count: 1,
    active_evidence_count: 1,
    active_mapping_count: 1,
    image_url: "https://project.supabase.co/storage/v1/object/public/" +
      "external-card-images/one-piece/card-prints/tcgplayer/700001/" +
      `${"a".repeat(32)}.jpg`,
    image_alt_url: null,
    image_source: "self_hosted_tcgplayer_exact_product_v1",
    image_status: "exact",
    image_path: `one-piece/card-prints/tcgplayer/700001/${"a".repeat(32)}.jpg`,
    image_hash: "a".repeat(64),
    visibility_status: "visible",
    ...overrides,
  };
}

function snapshot(rows = [row()]) {
  return buildOnePieceSetClosureSnapshotV1({
    set: { id: "00000000-0000-4000-8000-000000000010", game: "one_piece", code: "OP17" },
    releaseControl: { release_status: "hidden" },
    rows,
    sourcePricing: { market_product_count: 1 },
    official: { artwork_record_count: 1, unique_number_count: 1 },
    imagePublicBaseUrl: IMAGE_PUBLIC_BASE_URL,
  });
}

test("a fully traced hidden cohort is ready for activation", () => {
  assert.deepEqual(evaluateOnePieceSetReleaseReadinessV1(snapshot()).findings, []);
});

test("legacy identity pointers count as exact when Storage evidence is complete", () => {
  const legacy = row({ image_source: "identity" });
  assert.equal(isOnePieceSelfHostedExactImageV1(
    legacy,
    IMAGE_PUBLIC_BASE_URL,
  ), true);
  assert.equal(snapshot([legacy]).counts.self_hosted_exact_images, 1);
});

test("exact image proof rejects incomplete or external pointers", () => {
  assert.equal(isOnePieceSelfHostedExactImageV1(
    row({ image_url: null }), IMAGE_PUBLIC_BASE_URL), false);
  assert.equal(isOnePieceSelfHostedExactImageV1(
    row({ image_path: null }), IMAGE_PUBLIC_BASE_URL), false);
  assert.equal(isOnePieceSelfHostedExactImageV1(
    row({ image_hash: null }), IMAGE_PUBLIC_BASE_URL), false);
  assert.equal(isOnePieceSelfHostedExactImageV1(row({
    image_url: "https://example.com/storage/v1/object/public/" +
      "external-card-images/one-piece/card-prints/tcgplayer/700001/" +
      `${"a".repeat(32)}.jpg`,
  }), IMAGE_PUBLIC_BASE_URL), false);
  assert.equal(isOnePieceSelfHostedExactImageV1(row({
    image_path: "one-piece/card-prints/tcgplayer/700001/../../other.jpg",
    image_url: "https://project.supabase.co/storage/v1/object/public/" +
      "external-card-images/one-piece/card-prints/other.jpg",
  }), IMAGE_PUBLIC_BASE_URL), false);
});

test("snapshot fingerprint binds current image URLs", () => {
  const baseline = snapshot();
  const changed = snapshot([row({
    image_alt_url: "https://project.supabase.co/alternate.jpg",
  })]);
  assert.notEqual(
    baseline.snapshot_fingerprint_sha256,
    changed.snapshot_fingerprint_sha256,
  );
});

test("image and evidence gaps block activation", () => {
  const result = evaluateOnePieceSetReleaseReadinessV1(snapshot([row({
    active_evidence_count: 0,
    image_source: null,
    image_status: null,
    image_path: null,
    image_hash: null,
  })]));
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes("evidence_count_mismatch"));
  assert.ok(result.findings.includes("self_hosted_image_gap"));
});

test("image pointers are deterministic and appearance-backed", () => {
  const pointer = buildOnePieceSetImagePointerV1({
    row: row(),
    image: {
      sha256: "b".repeat(64),
      format: "jpeg",
      content_type: "image/jpeg",
      size_bytes: 2000,
      width: 700,
      height: 978,
    },
    publicBaseUrl: "https://example.supabase.co/storage/v1/object/public/external-card-images",
  });
  assert.match(pointer.image_path, /^one-piece\/card-prints\/tcgplayer\/700001\//);
  assert.equal(validateOnePieceSetImagePointersV1([pointer], 1).valid, true);
});

test("workflow freezes main provenance and keeps closure modes bounded", () => {
  assert.match(workflow, /git merge-base --is-ancestor "\$EXPECTED_SHA" origin\/main/);
  assert.match(workflow, /options:[\s\S]*?- audit[\s\S]*?- image-canary[\s\S]*?- image-apply[\s\S]*?- activation-canary[\s\S]*?- activate[\s\S]*?- verify/);
  assert.match(workflow, /EXPECTED_SNAPSHOT_FINGERPRINT/);
  assert.match(workflow, /test -n "\$SUPABASE_URL"/);
  assert.match(worker, /begin transaction isolation level serializable/i);
  assert.match(worker, /activation canary left durable residue/i);
  assert.match(worker, /Snapshot-bound mapping revalidation failed/i);
  assert.match(worker, /storage_cleanup_failed/i);
  assert.match(worker, /Independent release readback failed/i);
  assert.match(worker, /finally \{[\s\S]*?client\.end\(\)/i);
  assert.doesNotMatch(worker, /vault_entries|embeddings|semantic_search/i);
});
