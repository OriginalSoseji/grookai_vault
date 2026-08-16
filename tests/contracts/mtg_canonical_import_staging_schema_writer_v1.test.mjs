import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildMtgStagingLedgerRowV1,
  buildMtgStagingSchemaApprovalV1,
} from "../../scripts/audits/mtg_canonical_import_staging_schema_writer_v1.mjs";

const SQL = fs.readFileSync(
  new URL(
    "../../supabase/migrations/20260813185000_mtg_canonical_import_staging_v1.sql",
    import.meta.url,
  ),
  "utf8",
);

test("schema writer ledger row is exact and bounded", () => {
  const row = buildMtgStagingLedgerRowV1(SQL);
  assert.equal(row.version, "20260813185000");
  assert.equal(row.name, "mtg_canonical_import_staging_v1");
  assert.equal(row.statements.length, 1);
  assert.doesNotMatch(row.statements[0], /(^|\n)\s*(begin|commit);/i);
});

test("schema writer approval prohibits broader MTG and Pokemon changes", () => {
  const row = buildMtgStagingLedgerRowV1(SQL);
  const approval = buildMtgStagingSchemaApprovalV1("a".repeat(64), row);
  assert.match(approval.ledger_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.match(approval.required_approval_message, /no canonical game/);
  assert.match(approval.required_approval_message, /global db push/);
  assert.match(approval.required_approval_message, /other migration writes/);
});
