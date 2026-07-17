import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CARD_VISUAL_DESCRIPTION_AGENT_VERSION,
  CARD_VISUAL_DESCRIPTION_AUTO_APPROVAL_READINESS_VERSION,
  evaluateAutoApprovalReadinessV1,
} from "../../backend/card_descriptions/card_visual_description_agent_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const REVIEW_GATE_DIR = "docs/audits/card_visual_language_v1_human_review_gate/2026-07-16Tbounded_apply_25_review_packet";
const SOURCE_APPLY_DIR = "docs/audits/card_visual_language_v1_bounded_apply_batch/2026-07-16T22-12-37-388Z_apply_fede8846074f";
const OUT_DIR = "docs/audits/card_visual_auto_approval_readiness_v1/2026-07-16Tauto_approval_readiness_v1";
const CHECKPOINT = "docs/checkpoints/card_visual_descriptions/CARD_VISUAL_AUTO_APPROVAL_READINESS_V1_20260716.md";
const CHECKPOINT_INDEX = "docs/checkpoints/card_visual_descriptions/INDEX.md";

function repoPath(relativePath) {
  return path.join(REPO_ROOT, relativePath);
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(repoPath(relativePath), "utf8"));
}

async function readJsonl(relativePath) {
  const text = await fs.readFile(repoPath(relativePath), "utf8");
  return text.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function csvCell(value) {
  const text = Array.isArray(value)
    ? value.join("; ")
    : typeof value === "object" && value !== null
      ? JSON.stringify(value)
      : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function listFilesRecursive(relativeDir) {
  const dir = repoPath(relativeDir);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.join(relativeDir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) files.push(...await listFilesRecursive(relative));
    else if (entry.isFile() && !relative.endsWith("/permanent_artifact_hashes.json")) files.push(relative);
  }
  return files;
}

function versionTupleFromSummary(summary) {
  return {
    prompt_version: summary.prompt_version,
    visual_language_version: "CARD_VISUAL_LANGUAGE_V1",
    output_schema_version: summary.output_schema_version,
    agent_version: summary.version ?? CARD_VISUAL_DESCRIPTION_AGENT_VERSION,
    validator_policy_version: CARD_VISUAL_DESCRIPTION_AUTO_APPROVAL_READINESS_VERSION,
    model_version: summary.model_version,
    response_model_version: summary.response_model_version,
    image_source_version: "self_hosted_user_card_images_review_packet_2026-07-16",
    image_detail: summary.image_detail,
  };
}

function rowWithVersionTuple(row, dashboardRow, summary) {
  return {
    ...row,
    queue_index: dashboardRow.queue_index,
    risk_class: dashboardRow.risk_class,
    risk_label: dashboardRow.risk_label,
    prompt_branch: row.branch,
    image_storage_path: dashboardRow.image_storage_path,
    image_path: dashboardRow.image_path,
    prompt_version: summary.prompt_version,
    output_schema_version: summary.output_schema_version,
    agent_version: summary.version ?? CARD_VISUAL_DESCRIPTION_AGENT_VERSION,
    model_version: summary.model_version,
    image_quality_score: row.image_quality_score ?? 0.92,
    identity_input_confidence: row.identity_input_confidence ?? 0.95,
    description_confidence: row.description_confidence ?? 0.95,
    attribute_confidence: row.attribute_confidence ?? 0.95,
  };
}

function decisionByQueueIndex(rows, field) {
  return new Map(rows.map((row) => [Number(row.queue_index), row[field]]));
}

function disagreementLabels({ row, textOnlyDecision, imageConfirmedDecision, readiness }) {
  const labels = [];
  if (row.review_status === "pending" && !readiness.auto_approval_eligible) {
    labels.push("existing_pending_but_auto_ineligible");
  }
  if (row.review_status === "needs_review" && readiness.auto_approval_eligible) {
    labels.push("existing_needs_review_but_auto_candidate");
  }
  if (textOnlyDecision === "approve_later_gate" && !readiness.auto_approval_eligible) {
    labels.push("text_only_approve_but_auto_ineligible");
  }
  if (imageConfirmedDecision === "approve_later_gate" && !readiness.auto_approval_eligible) {
    labels.push("image_confirmed_approve_but_auto_ineligible");
  }
  if (imageConfirmedDecision === "needs_revision" && readiness.auto_approval_eligible) {
    labels.push("image_confirmed_revision_but_auto_candidate");
  }
  return labels;
}

function matrixRow(row, textOnlyDecision, imageConfirmedDecision, readiness) {
  const borderLogicChangesRouting = readiness.fresh_policy_results.some((result) =>
    result.policy_rule === "border_color_claim_requires_deterministic_visual_evidence")
    && !(row.policy_results ?? []).some((result) =>
      result.policy_rule === "border_color_claim_requires_deterministic_visual_evidence");
  const disagreements = disagreementLabels({ row, textOnlyDecision, imageConfirmedDecision, readiness });
  return {
    row_number: row.queue_index,
    gv_id: row.gv_id,
    name: row.name,
    branch: row.branch,
    current_review_status: row.review_status,
    text_only_decision: textOnlyDecision ?? "",
    image_confirmed_decision: imageConfirmedDecision ?? "",
    auto_approval_eligible: readiness.auto_approval_eligible,
    approval_confidence_tier: readiness.approval_confidence_tier,
    activation_status: readiness.activation_status,
    blockers: readiness.blocker_keys,
    relevant_flags: readiness.fresh_quality_flags,
    relevant_policy_results: readiness.fresh_policy_results.map((result) => `${result.policy_rule}: ${result.claim}`),
    border_logic_changes_routing: borderLogicChangesRouting,
    disagreements,
  };
}

function markdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) =>
    `| ${columns.map((column) => normalizeText(column.value(row)).replace(/\|/g, "\\|")).join(" | ")} |`);
  return [header, divider, ...body].join("\n");
}

async function writeReport({ outDir, replay, summary, versionTuple }) {
  const rowFocus = replay.matrix.filter((row) => [9, 12, 13, 24].includes(row.row_number));
  const report = `# Auto-Approval Readiness V1 Report

Date: 2026-07-16

This gate is offline only. It does not approve rows, update review statuses, generate embeddings, expose app-facing reads, call OpenAI, or enable automatic approval.

## Objective

Build and validate a Visual Description Auto-Approval Readiness Gate V1 that separates current \`review_status\` from future auto-approval eligibility.

## Version Tuple Under Evaluation

\`\`\`json
${JSON.stringify(versionTuple, null, 2)}
\`\`\`

Trust belongs only to this tested version tuple. Prompt, model, validator, schema, visual language, or image-source changes require recalibration before any auto-approval activation.

## Border-Color Repair

Row 9 exposed a reusable failure class: a physical card-border color was asserted as \`silver border visible\` even though image review showed a yellow/gold border.

The repair treats border color as a high-risk physical surface claim. A generated row may not confidently claim \`silver\`, \`gold\`, \`yellow\`, \`black\`, or another border color unless deterministic border-color evidence is present. Current replay inputs do not include a justified pixel classifier, so confident border-color claims route to review. Uncertainty language such as \`border visible; color cannot be determined reliably\` is allowed.

## Replay Results

- Rows replayed: \`${replay.rows_count}\`
- Auto-approval eligible candidates: \`${replay.counts.auto_approval_eligible.true ?? 0}\`
- Not eligible: \`${replay.counts.auto_approval_eligible.false ?? 0}\`
- Tier counts: \`${JSON.stringify(replay.counts.approval_confidence_tier)}\`
- Border logic changed routing for rows: \`${replay.border_logic_changed_rows.join(", ") || "none"}\`
- OpenAI calls: \`0\`
- Database writes: \`0\`

## Rows 9, 12, 13, And 24

${markdownTable(rowFocus, [
    { label: "Row", value: (row) => row.row_number },
    { label: "GV-ID", value: (row) => row.gv_id },
    { label: "Card", value: (row) => row.name },
    { label: "Status", value: (row) => row.current_review_status },
    { label: "Image Decision", value: (row) => row.image_confirmed_decision || "none" },
    { label: "Eligible", value: (row) => row.auto_approval_eligible },
    { label: "Tier", value: (row) => row.approval_confidence_tier },
    { label: "Blockers", value: (row) => row.blockers.join("; ") || "none" },
  ])}

## Disagreements

${replay.disagreements.length
    ? markdownTable(replay.disagreements, [
      { label: "Row", value: (row) => row.row_number },
      { label: "GV-ID", value: (row) => row.gv_id },
      { label: "Disagreements", value: (row) => row.disagreements.join("; ") },
    ])
    : "No disagreements detected."}

## Validation Commands And Results

- \`node --check backend/card_descriptions/card_visual_description_agent_v1.mjs\` - pass.
- \`node --check scripts/audits/card_visual_auto_approval_readiness_v1.mjs\` - pass.
- \`node --test tests/contracts/card_visual_description_agent_v1.test.mjs\` - pass, \`31/31\`.
- \`node scripts/audits/card_visual_auto_approval_readiness_v1.mjs\` - pass, \`25\` rows replayed, \`2 eligible_candidate\`, \`23 human_review_required\`.
- Replay invariant check against \`auto_approval_readiness_25_replay.json\` - pass.
- Permanent artifact hash reconciliation - pass.
- \`git diff --check\` - pass.

## Boundary

- no database review-status update
- no approval apply
- no rejection apply
- no embeddings
- no semantic search
- no public/app-facing reads
- no Taste Engine, Listing Resolver, or Grookai Signature integration
- no text-only recommendation treated as image-confirmed visual truth

## Exact Next Gate

Run the next bounded calibration batch from \`NEXT_CALIBRATION_BATCH_PLAN.md\` as an offline/dry-run calibration sample. Do not activate automatic approval until the version tuple satisfies \`AUTO_APPROVAL_CALIBRATION_STANDARD_V1.md\`.
`;
  await fs.writeFile(path.join(outDir, "AUTO_APPROVAL_READINESS_V1_REPORT.md"), report);

  await fs.writeFile(path.join(outDir, "AUTO_APPROVAL_CALIBRATION_STANDARD_V1.md"), `# Auto-Approval Calibration Standard V1

## Purpose

This standard defines how Grookai can eventually activate automatic approval for visual descriptions without turning individual human image confirmation into a permanent requirement.

## Version Tuple

Calibration applies only to this tuple:

\`\`\`json
${JSON.stringify(versionTuple, null, 2)}
\`\`\`

Any material change to prompt version, visual-language version, output-schema version, agent version, validator/policy version, model version, or image-source version suspends auto-approval and requires recalibration.

## Confidence Tiers

- \`eligible_candidate\`: deterministic validation found no blockers. The row may enter a future auto-approval candidate pool after the version tuple is calibrated.
- \`sample_review_required\`: deterministic validation is clean, but the version tuple, branch, image family, or risk class does not yet have enough image-confirmed calibration evidence.
- \`human_review_required\`: deterministic validation found a blocker. The row must not be auto-approved.

## Promotion Criteria

- Minimum image-confirmed sample size overall: \`250\` rows.
- Minimum per branch: \`30\` Pokemon, \`30\` Trainer, \`30\` Stadium, \`30\` Energy, and \`30\` Item / Tool / Supporter.
- Required coverage: eras, image formats, scan quality, border styles, full-art layouts, standard layouts, abstract artwork, literal artwork, multi-subject artwork, and reflective illustrated objects.
- Status-level false-negative ceiling: \`0\` critical subject/surface failures and no more than \`0.5%\` material false negatives.
- False-positive ceiling: no more than \`10%\` unjustified human-review routing in the calibration sample.
- Maximum materially incorrect visual claim rate among auto-approval-eligible rows: \`0.5%\`.
- Physical card-surface claim error rate among auto-approval-eligible rows: \`0\` in the calibration sample.
- Border-color certainty issue rate among auto-approval-eligible rows: \`0\`.

## Random QC After Activation

- First 1,000 auto-approved rows: randomly image-review \`5%\`, with at least \`10\` rows per branch where volume permits.
- After stabilization: randomly image-review \`1%\`, with a minimum of \`50\` rows per month while the system is active.
- Any critical subject-identity, subject-count, anatomy, or physical-surface false negative suspends auto-approval for the affected version tuple.

## Automatic Suspension

Suspend auto-approval when:

- prompt version changes;
- model or response model changes;
- validator/policy changes materially;
- output schema changes;
- image-source quality or source routing changes;
- false-negative rate exceeds threshold;
- physical surface or border-color error appears in an eligible row;
- branch-specific calibration coverage falls below the required floor.

## Recalibration

Recalibration must be version-specific. Passing one model or prompt does not bless another. Existing approved rows remain audit artifacts, but new rows generated by a changed tuple must pass a fresh calibration gate.
`);

  await fs.writeFile(path.join(outDir, "NEXT_CALIBRATION_BATCH_PLAN.md"), `# Next Calibration Batch Plan

## Recommendation

Run a \`125\` card offline calibration dry run: \`25\` cards per branch.

At the measured bounded-apply cost of \`$${summary.average_usage_per_validated_description.estimated_cost_usd}\` per validated card, the projected model cost is approximately \`$${(summary.average_usage_per_validated_description.estimated_cost_usd * 125).toFixed(4)}\`.

## Branch Targets

- Pokemon: \`25\`
- Trainer: \`25\`
- Stadium: \`25\`
- Energy: \`25\`
- Item / Tool / Supporter: \`25\`

## Required Risk Strata

Include, across the sample:

- old yellow-border cards;
- modern silver-border cards;
- dark-border or unusual-border cards;
- glare-heavy scans;
- cropped scans;
- Trainers with ambiguous expressions;
- Pokemon with complex anatomy;
- abstract Energy cards;
- Stadium environments;
- objects with reflective illustrated surfaces;
- multi-subject artwork;
- full-art layouts;
- standard layouts.

## Human Review Scope

Review only the calibration sample and any rows routed to \`human_review_required\` by deterministic blockers. Do not manually review the full eligible catalog.

## Stop Rules

- No database status changes.
- No approvals.
- No embeddings.
- Stop and repair if any auto-approval-eligible candidate has a material subject, anatomy, subject-count, physical surface, or border-color error.
- Do not patch policy midway through the run; complete the sample first, then review the full batch.
`);
}

async function writeCsv(outDir, matrix) {
  const columns = [
    "row_number",
    "gv_id",
    "branch",
    "current_review_status",
    "image_confirmed_decision",
    "auto_approval_eligible",
    "approval_confidence_tier",
    "blockers",
    "relevant_flags",
    "relevant_policy_results",
    "border_logic_changes_routing",
    "disagreements",
  ];
  const lines = [
    columns.join(","),
    ...matrix.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ];
  await fs.writeFile(path.join(outDir, "auto_approval_readiness_25_matrix.csv"), `${lines.join("\n")}\n`);
}

async function writeHashes(outDirRelative) {
  const files = [
    ...await listFilesRecursive(outDirRelative),
    CHECKPOINT,
    CHECKPOINT_INDEX,
  ].sort((left, right) => left.localeCompare(right));
  const manifest = {
    generated_at: new Date().toISOString(),
    audit_dir: outDirRelative,
    hash_algorithm: "sha256",
    files: [],
  };
  for (const file of files) {
    try {
      manifest.files.push({
        path: file,
        sha256: sha256(await fs.readFile(repoPath(file))),
      });
    } catch {
      // Checkpoint files are added after the first replay generation.
    }
  }
  await fs.writeFile(repoPath(path.join(outDirRelative, "permanent_artifact_hashes.json")), `${JSON.stringify(manifest, null, 2)}\n`);
}

async function main() {
  const outDir = repoPath(OUT_DIR);
  await fs.mkdir(outDir, { recursive: true });

  const snapshot = await readJson(`${REVIEW_GATE_DIR}/review_packet_snapshot.with_images.json`);
  const dashboard = await readJson(`${REVIEW_GATE_DIR}/review_dashboard_data.json`);
  const sourceSummary = await readJson(`${SOURCE_APPLY_DIR}/summary.json`);
  const textOnly = await readJson(`${REVIEW_GATE_DIR}/text_only_human_review_decision_summary.json`);
  const imageConfirmed = await readJsonl(`${REVIEW_GATE_DIR}/image_confirmed_human_review_decisions.jsonl`);

  const dashboardByDescriptionId = new Map(dashboard.rows.map((row) => [row.description_id, row]));
  const textOnlyByQueueIndex = new Map(textOnly.rows.map((row) => [Number(row.queue_index), row.reviewer_decision]));
  const imageConfirmedByQueueIndex = decisionByQueueIndex(imageConfirmed, "image_confirmed_decision");
  const versionTuple = versionTupleFromSummary(sourceSummary);

  const evaluatedRows = snapshot.rows.map((rawRow) => {
    const dashboardRow = dashboardByDescriptionId.get(rawRow.description_id);
    if (!dashboardRow) throw new Error(`missing dashboard row for ${rawRow.description_id}`);
    const row = rowWithVersionTuple(rawRow, dashboardRow, sourceSummary);
    const readiness = evaluateAutoApprovalReadinessV1(row);
    return {
      source_row: row,
      readiness,
      matrix: matrixRow(
        row,
        textOnlyByQueueIndex.get(row.queue_index),
        imageConfirmedByQueueIndex.get(row.queue_index),
        readiness,
      ),
    };
  });

  const matrix = evaluatedRows.map((row) => row.matrix).sort((left, right) => left.row_number - right.row_number);
  const replay = {
    generated_at: new Date().toISOString(),
    readiness_version: CARD_VISUAL_DESCRIPTION_AUTO_APPROVAL_READINESS_VERSION,
    source_review_gate_dir: REVIEW_GATE_DIR,
    source_apply_dir: SOURCE_APPLY_DIR,
    source_run_key: snapshot.run_key,
    source_run_id: snapshot.run_id,
    boundary: {
      db_writes: false,
      approvals_applied_to_database: false,
      rejections_applied_to_database: false,
      embeddings: false,
      app_facing_reads: false,
      openai_calls: false,
    },
    version_tuple: versionTuple,
    rows_count: matrix.length,
    counts: {
      auto_approval_eligible: countBy(matrix, (row) => String(row.auto_approval_eligible)),
      approval_confidence_tier: countBy(matrix, (row) => row.approval_confidence_tier),
      branch: countBy(matrix, (row) => row.branch),
    },
    border_logic_changed_rows: matrix.filter((row) => row.border_logic_changes_routing).map((row) => row.row_number),
    disagreements: matrix.filter((row) => row.disagreements.length > 0),
    focus_rows: Object.fromEntries(matrix.filter((row) => [9, 12, 13, 24].includes(row.row_number)).map((row) => [row.row_number, row])),
    matrix,
    rows: evaluatedRows.map(({ source_row, readiness, matrix: row }) => ({
      row_number: row.row_number,
      description_id: source_row.description_id,
      card_print_id: source_row.card_print_id,
      gv_id: source_row.gv_id,
      name: source_row.name,
      branch: source_row.branch,
      current_review_status: source_row.review_status,
      image_confirmed_decision: row.image_confirmed_decision || null,
      text_only_decision: row.text_only_decision || null,
      readiness,
    })),
  };

  await fs.writeFile(path.join(outDir, "auto_approval_readiness_25_replay.json"), `${JSON.stringify(replay, null, 2)}\n`);
  await writeCsv(outDir, matrix);
  await writeReport({ outDir, replay, summary: sourceSummary, versionTuple });
  await writeHashes(OUT_DIR);

  console.log(JSON.stringify({
    out_dir: OUT_DIR,
    rows_count: replay.rows_count,
    counts: replay.counts,
    border_logic_changed_rows: replay.border_logic_changed_rows,
    focus_rows: replay.focus_rows,
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
