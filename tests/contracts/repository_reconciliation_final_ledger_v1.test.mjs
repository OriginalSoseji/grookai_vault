import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  classifyFinalDisposition,
  finalizeLedger,
} from "../../scripts/repository/finalize_reconciliation_ledger.mjs";

const initial = JSON.parse(
  fs.readFileSync(
    "docs/audits/repository_reconciliation_20260902/initial_source_ledger.json",
    "utf8",
  ),
);

test("final ledger classifies every preserved source without deletion authority", () => {
  const final = finalizeLedger(initial, {
    candidate_sha: "candidate-sha",
    candidate_branch: "integration/reconciled-main-v1",
  });
  assert.equal(final.rows.length, 841);
  assert.equal(final.unique_source_shas, 461);
  assert.equal(final.deletion_authorized_rows, 0);
  assert.ok(final.rows.every((row) => row.final_disposition));
  assert.ok(final.rows.every((row) => row.cleanup_recommendation));
  assert.ok(final.rows.every((row) => row.delete_authorized === false));
});

test("known reconciliation and deferred lanes remain explicit", () => {
  assert.equal(
    classifyFinalDisposition({
      source_name: "C:/grookai_vault_launch_closeout",
      source_kind: "worktree",
      dirty: true,
    }).final_disposition,
    "capability_reconciled_source_preserved",
  );
  assert.equal(
    classifyFinalDisposition({
      source_name: "agent/visual-search-lab-runtime-fix",
      source_kind: "remote_branch",
    }).final_disposition,
    "preserved_deferred_human_gate",
  );
  assert.equal(
    classifyFinalDisposition({
      source_name: "catalog/jpn-master-index-v5-official-global-catalog",
      source_kind: "remote_branch",
    }).final_disposition,
    "preserved_deferred_project",
  );
});

test("merged pull requests override misleading squash ancestry", () => {
  const result = classifyFinalDisposition({
    source_name: "agent/example",
    source_kind: "remote_branch",
    relationship: "diverged",
    pull_requests: [{ state: "MERGED" }],
    changed_domains: [],
  });
  assert.equal(result.final_disposition, "superseded_by_merged_pr");
  assert.equal(result.cleanup_recommendation, "future_archive_candidate_after_acceptance");
  assert.equal(result.delete_authorized, false);
});
