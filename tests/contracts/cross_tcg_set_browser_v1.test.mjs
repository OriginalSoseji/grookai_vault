import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("set detail counts use game-scoped canonical set ids", () => {
  const loader = source("apps/web/src/lib/publicSets.ts");
  assert.match(loader, /getVisibleCardCountBySetIds/);
  assert.match(loader, /\.in\("set_id", exactSetIds\)/);
  assert.match(loader, /rows\.map\(\(row\) => row\.id \?\? ""\)/);
});

test("MTG product lanes prefer source set type and never infer from one-letter prefixes", () => {
  const config = source("apps/web/src/lib/publicSetBrowseConfig.ts");
  assert.match(config, /catalog_set_type/);
  assert.doesNotMatch(config, /code\.startsWith\("t"\)/);
  assert.doesNotMatch(config, /code\.startsWith\("p"\)/);
});

test("private representative images are copied into the public cover bucket", () => {
  const backfill = source("scripts/audits/cross_tcg_set_cover_backfill_v1.mjs");
  assert.match(backfill, /requires_public_cover_copy/);
  assert.match(backfill, /downloadRepresentativeImage/);
  assert.match(backfill, /set-covers\/\$\{row\.game\}/);
  assert.match(backfill, /sourceStoragePath\.startsWith\(expectedPrefix\)/);
  assert.match(backfill, /--set-codes=/);
  assert.match(backfill, /--expected-plan-fingerprint=/);
  assert.match(backfill, /plan_fingerprint_mismatch/);
  assert.match(backfill, /\.eq\("hero_image_url", entry\.writtenUrl\)/);
  assert.match(backfill, /storage_object_still_present/);
  assert.match(backfill, /rollbackExecution/);
  assert.doesNotMatch(backfill, /\/api\/canon\/cards\/\$\{encodeURIComponent\(card\.gv_id\)\}\/image/);
});

test("the cover-gap runner is frozen, fingerprinted, and publication-verified", () => {
  const workflow = source(".github/workflows/cross-tcg-set-cover-gap-repair.yml");
  assert.match(workflow, /expected_sha:/);
  assert.match(workflow, /one_piece_plan_fingerprint:/);
  assert.match(workflow, /mtg_plan_fingerprint:/);
  assert.match(workflow, /--set-codes=don,eb02,eb03,eb04,op15,p/);
  assert.match(workflow, /--set-codes=dvd,evg,gs1,gvl,h09,jvc,oe01,ohop,opc2,opca,pd2,pd3/);
  assert.match(workflow, /cross_tcg_set_publication_gate_v1\.mjs/);
  assert.doesNotMatch(workflow, /card_prints.*(?:insert|update|delete)/i);
});
