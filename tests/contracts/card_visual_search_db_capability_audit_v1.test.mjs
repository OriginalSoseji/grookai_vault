import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  READ_ONLY_SQL,
  assertReadOnlySqlV1,
} from "../../scripts/audits/card_visual_search_db_capability_audit_v1.mjs";

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
