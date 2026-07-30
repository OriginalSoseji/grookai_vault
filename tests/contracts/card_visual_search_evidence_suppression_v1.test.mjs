import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  applyCardVisualSearchEvidenceSuppressionsV1,
  CARD_VISUAL_SEARCH_EVIDENCE_SUPPRESSION_VERSION,
  loadCardVisualSearchEvidenceSuppressionsV1,
} from "../../backend/card_descriptions/card_visual_search_evidence_suppression_v1.mjs";

function suppression(overrides = {}) {
  return {
    suppression_id: "founder_suppression_fixture_sky_v1",
    authority: "founder_image_review",
    decision: "unsupported_visual_evidence",
    reviewed_at: "2026-07-30",
    reviewed_by: "founder",
    artwork_group_id: "cvag_0123456789abcdef01234567",
    card_print_id: "00000000-0000-4000-8000-000000000001",
    gv_id: "GV-FIXTURE-1",
    source_image_sha256: "a".repeat(64),
    target_observation_ids: ["obs-sky"],
    target_source_ids: [],
    rationale: "Image review does not support the sky claim.",
    replacement_authorized: false,
    ...overrides,
  };
}

function group(overrides = {}) {
  return {
    artwork_group_id: "cvag_0123456789abcdef01234567",
    printings: [
      {
        card_print_id: "00000000-0000-4000-8000-000000000001",
        gv_id: "GV-FIXTURE-1",
        source_image_sha256: "a".repeat(64),
      },
    ],
    documents: {
      scene: {
        search_document_id: "doc-scene",
        document_type: "scene",
        subject_role_keys: [],
        structured_concepts: [
          {
            source_id: "obs-sky",
            term: "orange sky",
            supporting_observation_ids: ["obs-sky"],
          },
          {
            source_id: "obs-cloud",
            term: "white cloud",
            supporting_observation_ids: ["obs-cloud"],
          },
        ],
      },
    },
    ...overrides,
  };
}

test("founder suppression removes only evidence derived from the targeted observation", async () => {
  const directory = mkdtempSync(
    path.join(os.tmpdir(), "visual-suppression-"),
  );
  const filePath = path.join(directory, "suppressions.json");
  writeFileSync(
    filePath,
    JSON.stringify({
      version: CARD_VISUAL_SEARCH_EVIDENCE_SUPPRESSION_VERSION,
      records: [suppression()],
    }),
  );
  try {
    const records =
      await loadCardVisualSearchEvidenceSuppressionsV1(filePath);
    const result = applyCardVisualSearchEvidenceSuppressionsV1(
      [group()],
      records,
    );
    const concepts = result.groups[0].documents.scene.structured_concepts;
    assert.deepEqual(concepts.map((row) => row.source_id), ["obs-cloud"]);
    assert.equal(result.stats.suppression_records, 1);
    assert.equal(result.stats.removed_structured_concepts, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("suppression fails closed when the source image changed", () => {
  assert.throws(
    () =>
      applyCardVisualSearchEvidenceSuppressionsV1(
        [group()],
        [suppression({ source_image_sha256: "b".repeat(64) })],
      ),
    /source image hash mismatch/u,
  );
});

test("suppression cannot authorize a replacement fact", async () => {
  const directory = mkdtempSync(
    path.join(os.tmpdir(), "visual-suppression-"),
  );
  const filePath = path.join(directory, "suppressions.json");
  writeFileSync(
    filePath,
    JSON.stringify({
      version: CARD_VISUAL_SEARCH_EVIDENCE_SUPPRESSION_VERSION,
      records: [suppression({ replacement_authorized: true })],
    }),
  );
  try {
    await assert.rejects(
      loadCardVisualSearchEvidenceSuppressionsV1(filePath),
      /cannot invent replacement facts/u,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
