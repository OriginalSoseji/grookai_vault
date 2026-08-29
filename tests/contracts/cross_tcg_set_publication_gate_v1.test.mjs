import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";

import {
  buildSetPublicationGateV1,
  classifySetProductLaneV1,
  CROSS_TCG_SET_PUBLICATION_GATE_VERSION,
  evaluateSetPublicationCandidateV1,
} from "../../backend/catalog/cross_tcg_set_publication_gate_v1.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const ORIGIN = "https://catalog.example.supabase.co";

function row(overrides = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    game: "one_piece",
    code: "ST30",
    name: "Starter Deck 30",
    catalog_set_type: "starter",
    effective_release_status: "signed_in",
    card_count: 17,
    hero_image_url:
      `${ORIGIN}/storage/v1/object/public/external-card-images/` +
      "set-covers/one_piece/st30/tcgplayer/123/image.jpg",
    image_probe: { status: "ok", http_status: 200, content_type: "image/jpeg" },
    ...overrides,
  };
}

function evaluate(overrides = {}) {
  return evaluateSetPublicationCandidateV1(row(overrides), {
    allowedStorageOrigins: [ORIGIN],
    requireImageProbe: true,
  });
}

test("the publication gate contract is versioned", () => {
  assert.equal(CROSS_TCG_SET_PUBLICATION_GATE_VERSION, "CROSS_TCG_SET_PUBLICATION_GATE_V1");
});

test("an exact self-hosted package cover with canonical cards is eligible", () => {
  const result = evaluate();
  assert.equal(result.decision, "eligible");
  assert.equal(result.cover_kind, "exact_package");
  assert.equal(result.product_lane, "deck");
  assert.deepEqual(result.issues, []);
});

test("a representative deck cover is accepted but records a package-art gap", () => {
  const result = evaluate({
    hero_image_url:
      `${ORIGIN}/storage/v1/object/public/external-card-images/` +
      "set-covers/one_piece/st30/representative/gv-op-st30-001/image.jpg",
  });
  assert.equal(result.decision, "eligible_with_coverage_gap");
  assert.equal(result.cover_kind, "representative_card");
  assert.deepEqual(result.issues.map((issue) => issue.code), ["deck_package_art_gap"]);
});

test("a legacy public self-hosted representative remains eligible with an explicit namespace gap", () => {
  const result = evaluate({
    code: "DON",
    name: "DON!! Cards",
    hero_image_url:
      `${ORIGIN}/storage/v1/object/public/external-card-images/` +
      "one-piece/card-prints/tcgplayer/655898/image.jpg",
  });
  assert.equal(result.decision, "eligible_with_coverage_gap");
  assert.equal(result.cover_kind, "representative_card");
  assert.ok(result.issues.some((issue) => issue.code === "legacy_cover_namespace_gap"));
});

test("missing, external, private, cross-game, and broken media block publication", () => {
  const cases = [
    [{ hero_image_url: null }, "missing_set_cover"],
    [{ hero_image_url: "https://images.example.com/card.jpg" }, "set_cover_not_self_hosted"],
    [{
      hero_image_url:
        `${ORIGIN}/storage/v1/object/authenticated/external-card-images/` +
        "set-covers/one_piece/st30/tcgplayer/123/image.jpg",
    }, "set_cover_not_public_governed_media"],
    [{
      hero_image_url:
        `${ORIGIN}/storage/v1/object/public/external-card-images/` +
        "set-covers/mtg/st30/tcgplayer/123/image.jpg",
    }, "set_cover_game_or_code_mismatch"],
    [{ image_probe: { status: "failed", http_status: 404, content_type: "application/json" } }, "set_cover_probe_failed"],
  ];
  for (const [overrides, expectedCode] of cases) {
    const result = evaluate(overrides);
    assert.equal(result.decision, "blocked", expectedCode);
    assert.ok(result.issues.some((issue) => issue.code === expectedCode), expectedCode);
  }
});

test("released empty sets and games without browse configuration fail closed", () => {
  assert.ok(evaluate({ card_count: 0 }).issues.some((issue) =>
    issue.code === "released_set_has_no_canonical_cards"));
  const future = evaluate({
    game: "lorcana",
    code: "001",
    name: "The First Chapter",
    hero_image_url:
      `${ORIGIN}/storage/v1/object/public/external-card-images/` +
      "set-covers/lorcana/001/tcgplayer/123/image.jpg",
  });
  assert.equal(future.decision, "blocked");
  assert.ok(future.issues.some((issue) => issue.code === "missing_game_browse_configuration"));
});

test("One Piece and MTG product classification follows game-specific vocabulary", () => {
  assert.equal(classifySetProductLaneV1({ game: "one_piece", code: "ST31" }), "deck");
  assert.equal(classifySetProductLaneV1({ game: "one_piece", code: "OP17" }), "main");
  assert.equal(classifySetProductLaneV1({ game: "mtg", code: "C15", catalog_set_type: "commander" }), "deck");
  assert.equal(classifySetProductLaneV1({ game: "mtg", code: "TMP", catalog_set_type: "expansion" }), "main");
});

test("same set code across games remains distinct while duplicate game identities block", () => {
  const mtg = row({
    id: "00000000-0000-4000-8000-000000000002",
    game: "mtg",
    code: "ST30",
    name: "Magic Set",
    catalog_set_type: "expansion",
    hero_image_url:
      `${ORIGIN}/storage/v1/object/public/external-card-images/` +
      "set-covers/mtg/st30/representative/gv-mtg-st30-001/image.jpg",
  });
  const distinct = buildSetPublicationGateV1([row(), mtg], {
    allowedStorageOrigins: [ORIGIN],
    requireImageProbe: true,
  });
  assert.equal(distinct.status, "passed");

  const duplicate = buildSetPublicationGateV1([
    row(),
    row({ id: "00000000-0000-4000-8000-000000000003" }),
  ], {
    allowedStorageOrigins: [ORIGIN],
    requireImageProbe: true,
  });
  assert.equal(duplicate.status, "blocked");
  assert.equal(duplicate.counts.blocked_set_count, 2);
});

test("fixture worker writes reconciled immutable artifacts with no write authority", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "set-publication-gate-"));
  const fixture = path.join(root, "fixture.json");
  const output = path.join(root, "output");
  fs.writeFileSync(fixture, `${JSON.stringify([row()])}\n`);
  const head = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  }).stdout.trim();
  const run = spawnSync(process.execPath, [
    path.join(ROOT, "scripts", "workers", "cross_tcg_set_publication_gate_v1.mjs"),
    `--fixture=${fixture}`,
    `--out-dir=${output}`,
    `--expected-head-sha=${head}`,
    "--skip-image-probes",
  ], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, SUPABASE_URL: ORIGIN },
  });
  assert.equal(run.status, 0, run.stderr);
  const plan = JSON.parse(fs.readFileSync(path.join(output, "run_plan.json"), "utf8"));
  const summary = JSON.parse(fs.readFileSync(path.join(output, "summary.json"), "utf8"));
  assert.equal(summary.status, "passed");
  assert.equal(summary.reconciliation.mismatch_count, 0);
  assert.equal(plan.boundaries.database_writes, false);
  assert.equal(plan.boundaries.storage_writes, false);
  assert.ok(fs.existsSync(path.join(output, "artifact_hashes.json")));
});

test("the scheduled worker is read-only and integrated with the catalog shadow workflow", () => {
  const worker = fs.readFileSync(
    path.join(ROOT, "scripts", "workers", "cross_tcg_set_publication_gate_v1.mjs"),
    "utf8",
  );
  const workflow = fs.readFileSync(
    path.join(ROOT, ".github", "workflows", "catalog-incremental-promotion.yml"),
    "utf8",
  );
  assert.match(worker, /default_transaction_read_only=on/);
  assert.match(worker, /begin transaction read only/i);
  assert.doesNotMatch(
    worker,
    /\b(insert\s+into|update\s+public|delete\s+from|truncate\s+table)\b/i,
  );
  assert.match(workflow, /cross_tcg_set_publication_gate_v1\.mjs/);
  assert.match(workflow, /CROSS_TCG_SET_PUBLICATION_GATE_REPORT\.md/);
  assert.match(workflow, /CATALOG_AUTOMATION_MODE:\s*shadow-only/);
});

test("backend and web configurations cover the same public TCGs without Pokemon vocabulary leakage", () => {
  const webConfig = fs.readFileSync(
    path.join(ROOT, "apps", "web", "src", "lib", "publicSetBrowseConfig.ts"),
    "utf8",
  );
  for (const game of ["pokemon", "one_piece", "mtg"]) {
    assert.match(webConfig, new RegExp(`\\b${game}: \\{`));
  }
  const onePieceBlock = webConfig.match(/one_piece:\s*\{[\s\S]*?\n  \},\n  mtg:/)?.[0] ?? "";
  const mtgBlock = webConfig.match(/mtg:\s*\{[\s\S]*?\n  \},\n\};/)?.[0] ?? "";
  assert.doesNotMatch(onePieceBlock, /Browse by era|Scarlet|Sword & Shield/);
  assert.doesNotMatch(mtgBlock, /Browse by era|Scarlet|Sword & Shield/);
});
