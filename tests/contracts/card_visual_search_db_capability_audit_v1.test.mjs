import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  READ_ONLY_SQL,
  assertReadOnlySqlV1,
} from "../../scripts/audits/card_visual_search_db_capability_audit_v1.mjs";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "../..");

test("all database capability audit statements are read-only", () => {
  for (const [name, sql] of Object.entries(READ_ONLY_SQL)) {
    const concrete = sql.replace("%TABLE_IDENTIFIER%", 'public."fixture"');
    assert.equal(assertReadOnlySqlV1(concrete), true, name);
  }
});

test("database capability audit rejects mutation-capable statements", () => {
  for (const sql of [
    "insert into x values (1)",
    "update x set y = 1",
    "delete from x",
    "create table x (id integer)",
    "select 1; drop table x",
  ]) {
    assert.throws(() => assertReadOnlySqlV1(sql));
  }
});

test("database capability audit exports metadata only and no row payload query", () => {
  const source = readFileSync(
    new URL(
      "../../scripts/audits/card_visual_search_db_capability_audit_v1.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(source, /begin transaction read only/u);
  assert.match(source, /row_data_exported: false/u);
  assert.doesNotMatch(source, /select\s+\*\s+from/iu);
  assert.doesNotMatch(source, /visual_attributes|fact_graph|artwork_description/u);
});

test("preserved production capability artifacts match their hashes", () => {
  const hashManifest = JSON.parse(
    readFileSync(
      path.join(
        REPO_ROOT,
        "docs/audits/card_visual_search_db_capability_v1/2026-07-29_run_30469205941/artifact_hashes.json",
      ),
      "utf8",
    ),
  );
  for (const artifact of hashManifest.artifacts) {
    const actual = crypto
      .createHash("sha256")
      .update(readFileSync(path.join(REPO_ROOT, artifact.path)))
      .digest("hex");
    assert.equal(actual, artifact.sha256, artifact.path);
  }
});
