import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);

function normalizedSource(row) {
  return `${row.source_name ?? ""} ${row.branch ?? ""}`
    .replaceAll("\\", "/")
    .toLowerCase();
}

function hasPullRequest(row, state) {
  return (row.pull_requests ?? []).some((pr) => pr.state === state);
}

function decision(finalDisposition, reason, cleanupRecommendation) {
  return {
    final_disposition: finalDisposition,
    final_reason: reason,
    cleanup_recommendation: cleanupRecommendation,
    delete_authorized: false,
  };
}

export function classifyFinalDisposition(row) {
  const source = normalizedSource(row);

  if (source.includes("main") && row.source_name === "main") {
    return decision(
      "protected_authority",
      "Production authority remains protected.",
      "retain_protected",
    );
  }

  if (source.includes("launch_closeout") || source.includes("app-launch-closeout")) {
    return decision(
      "capability_reconciled_source_preserved",
      "The mixed launch-closeout worktree was split into tested domain waves on the fresh-main candidate.",
      "retain_until_candidate_accepted",
    );
  }
  if (
    source.includes("lot-sharing-pricing-main-v1") ||
    source.includes("mtg_supervisor_batch_size") ||
    source.includes("mtg-catalog-supervisor-batch-size")
  ) {
    return decision(
      "capability_reconciled_source_preserved",
      "The source capability was reconciled or proven superseded on the fresh-main candidate.",
      "future_archive_candidate_after_acceptance",
    );
  }
  if (source.includes("mtg-sealed-world") || source.includes("mtg_sealed")) {
    return decision(
      "capability_reconciled_unapplied",
      "The governed MTG sealed capability was migrated, but its migration remains unapplied.",
      "retain_until_migration_gate_resolved",
    );
  }

  if (source.includes("jpn-master-index-v5-official-global-catalog")) {
    return decision(
      "preserved_deferred_project",
      "The large Japanese V5 official corpus remains a non-launch continuation lane.",
      "retain_active_deferred",
    );
  }
  if (source.includes("jpn-v4-deferred-completion-checkpoint")) {
    return decision(
      "capability_reconciled_source_preserved",
      "The Japanese pause and completion checkpoint was migrated to the candidate.",
      "future_archive_candidate_after_acceptance",
    );
  }
  if (source.includes("jpn") || source.includes("japanese")) {
    return decision(
      "preserved_japanese_lineage",
      "Japanese V4 production evidence and continuation branches remain preserved; current main is the active V4 authority.",
      "retain_historical_or_deferred",
    );
  }

  if (source.includes("visual-search") || source.includes("visual_search")) {
    return decision(
      "preserved_deferred_human_gate",
      "Visual Search remains gated by human calibration, sealed holdout, and unapplied persistence work.",
      "retain_active_deferred",
    );
  }

  if (row.dirty || (row.linked_worktrees ?? []).some((worktree) => worktree.dirty)) {
    return decision(
      "preserved_dirty_do_not_touch",
      "Dirty source state was captured and restoration-proven but has not been capability-reconciled.",
      "retain_dirty",
    );
  }

  if (row.relationship === "equal" || row.relationship === "ancestor") {
    return decision(
      "superseded_by_main",
      "The source commit is equal to or contained in production authority.",
      "future_archive_candidate_after_acceptance",
    );
  }
  if (hasPullRequest(row, "MERGED")) {
    return decision(
      "superseded_by_merged_pr",
      "A linked pull request was merged; squash history may prevent ancestry from proving equivalence.",
      "future_archive_candidate_after_acceptance",
    );
  }
  if (hasPullRequest(row, "OPEN")) {
    return decision(
      "preserved_open_pr",
      "The source has an open pull request and remains independently reviewable.",
      "retain_open_pr",
    );
  }
  if (row.changed_domains?.includes("migration")) {
    return decision(
      "preserved_migration_review",
      "The source contains divergent migration history and cannot be transplanted automatically.",
      "retain_migration_evidence",
    );
  }
  if (hasPullRequest(row, "CLOSED")) {
    return decision(
      "preserved_closed_unmerged",
      "The linked pull request closed without merge; its source remains preserved for capability review.",
      "retain_deferred",
    );
  }
  if (row.source_kind === "worktree" && row.detached) {
    return decision(
      "preserved_historical_evidence",
      "Detached worktree state is retained as historical evidence.",
      "retain_historical",
    );
  }
  return decision(
    "preserved_deferred_project",
    "No automatic production integration is justified; the source remains preserved for later domain review.",
    "retain_deferred",
  );
}

export function finalizeLedger(initialLedger, metadata = {}) {
  const rows = initialLedger.rows.map((row) => ({
    ...row,
    initial_disposition: row.disposition,
    ...classifyFinalDisposition(row),
  }));
  const dispositionCounts = {};
  const cleanupCounts = {};
  for (const row of rows) {
    dispositionCounts[row.final_disposition] =
      (dispositionCounts[row.final_disposition] ?? 0) + 1;
    cleanupCounts[row.cleanup_recommendation] =
      (cleanupCounts[row.cleanup_recommendation] ?? 0) + 1;
  }
  return {
    schema_version: "GROOKAI_REPOSITORY_RECONCILIATION_FINAL_LEDGER_V1",
    generated_at: new Date().toISOString(),
    authority_sha: initialLedger.authority_sha,
    candidate_sha: metadata.candidate_sha ?? null,
    candidate_branch: metadata.candidate_branch ?? null,
    preservation_release: metadata.preservation_release ?? null,
    sources: initialLedger.sources,
    unique_source_shas: initialLedger.unique_source_shas,
    final_disposition_counts: dispositionCounts,
    cleanup_recommendation_counts: cleanupCounts,
    deletion_authorized_rows: rows.filter((row) => row.delete_authorized).length,
    rows,
  };
}

export function renderFinalLedgerSummary(ledger) {
  const dispositionLines = Object.entries(ledger.final_disposition_counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, count]) => `- \`${name}\`: ${count}`);
  const cleanupLines = Object.entries(ledger.cleanup_recommendation_counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, count]) => `- \`${name}\`: ${count}`);
  return `${[
    "# Repository Reconciliation Final Source Ledger",
    "",
    `- Authority SHA: \`${ledger.authority_sha}\``,
    `- Candidate SHA at generation: \`${ledger.candidate_sha}\``,
    `- Candidate branch: \`${ledger.candidate_branch}\``,
    `- Source records: ${ledger.rows.length}`,
    `- Unique source SHAs: ${ledger.unique_source_shas}`,
    `- Deletion-authorized rows: ${ledger.deletion_authorized_rows}`,
    "",
    "## Final Dispositions",
    "",
    ...dispositionLines,
    "",
    "## Cleanup Recommendations",
    "",
    ...cleanupLines,
    "",
    "## Governance",
    "",
    "Every source remains preserved. An archive recommendation is a future cleanup proposal only and does not authorize deleting a branch, worktree, ref, PR, recovery artifact, or local file.",
    "",
  ].join("\n")}\n`;
}

function main() {
  const [inputPath, outputPath, summaryPath, candidateSha, candidateBranch] =
    process.argv.slice(2);
  if (!inputPath || !outputPath || !summaryPath || !candidateSha || !candidateBranch) {
    throw new Error(
      "Usage: node finalize_reconciliation_ledger.mjs <initial> <output> <summary> <candidate-sha> <candidate-branch>",
    );
  }
  const initial = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const ledger = finalizeLedger(initial, {
    candidate_sha: candidateSha,
    candidate_branch: candidateBranch,
    preservation_release: "reconciliation-20260902T054000Z",
  });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(summaryPath, renderFinalLedgerSummary(ledger));
  process.stdout.write(
    `${JSON.stringify({
      sources: ledger.sources,
      final_disposition_counts: ledger.final_disposition_counts,
      cleanup_recommendation_counts: ledger.cleanup_recommendation_counts,
      deletion_authorized_rows: ledger.deletion_authorized_rows,
    })}\n`,
  );
}

if (path.resolve(process.argv[1] ?? "") === SCRIPT_PATH) {
  main();
}
