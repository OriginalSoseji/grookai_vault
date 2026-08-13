import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildMtgCanonicalPromotionApprovalV1,
  buildMtgPromotionLedgerRowsV1,
} from "../../scripts/audits/mtg_canonical_catalog_promotion_writer_v1.mjs";

const migrationSqlByVersion = {
  "20260813190000": fs.readFileSync(
    new URL(
      "../../supabase/migrations/20260813190000_mtg_canonical_catalog_foundation_v1.sql",
      import.meta.url,
    ),
    "utf8",
  ),
  "20260813200000": fs.readFileSync(
    new URL(
      "../../supabase/migrations/20260813200000_mtg_catalog_app_visibility_boundary_v1.sql",
      import.meta.url,
    ),
    "utf8",
  ),
};

test("promotion writer records exactly the foundation and visibility migrations", () => {
  const rows = buildMtgPromotionLedgerRowsV1(migrationSqlByVersion);
  assert.deepEqual(
    rows.map(({ version, name }) => ({ version, name })),
    [
      { version: "20260813190000", name: "mtg_canonical_catalog_foundation_v1" },
      { version: "20260813200000", name: "mtg_catalog_app_visibility_boundary_v1" },
    ],
  );
  for (const row of rows) {
    assert.equal(row.statements.length, 1);
    assert.doesNotMatch(row.statements[0], /(^|\n)\s*(begin|commit);/i);
  }
});

test("promotion writer approval keeps MTG hidden and prohibits adjacent writes", () => {
  const rows = buildMtgPromotionLedgerRowsV1(migrationSqlByVersion);
  const approval = buildMtgCanonicalPromotionApprovalV1(
    {
      promotion_plan_sha256: "a".repeat(64),
      writer_payload_fingerprint: "b".repeat(64),
      foundation_migration_sha256: "c".repeat(64),
      visibility_migration_sha256: "d".repeat(64),
      mutation_contract_sha256: "e".repeat(64),
    },
    rows,
  );
  assert.match(approval.ledger_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.match(approval.required_approval_message, /hidden DSK canonical promotion/);
  assert.match(approval.required_approval_message, /do not approve signed-in or public MTG visibility/i);
  assert.match(approval.required_approval_message, /another set/);
  assert.match(approval.required_approval_message, /Pokemon mutation/);
  assert.match(approval.required_approval_message, /global db push/);
});
