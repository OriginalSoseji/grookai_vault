/**
 * CANON MAINTENANCE-ONLY EXECUTION BOUNDARY
 *
 * Applies a bounded, precomputed TCGPlayer exact-mapping plan. The command is
 * dry-run by default and must be launched through run_canon_maintenance_v1.
 */
import "../env.mjs";

import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import {
  CANON_MAINTENANCE_DRY_RUN_ENV_V1,
  CANON_MAINTENANCE_ENABLE_ENV_V1,
  CANON_MAINTENANCE_ENTRYPOINT_ENV_V1,
  CANON_MAINTENANCE_ENTRYPOINT_V1,
  CANON_MAINTENANCE_MODE_ENV_V1,
  installCanonMaintenanceBoundaryV1,
} from "./canon_maintenance_boundary_v1.mjs";
import {
  buildTcgplayerExactMappingMetaV1,
  selectTcgplayerExactMappingApplyBatchV1,
  TCGPLAYER_MARKET_EXACT_MAPPING_APPLY_CONFIRMATION_V1,
  TCGPLAYER_MARKET_EXACT_MAPPING_APPLY_POLICY_V1,
  TCGPLAYER_MARKET_EXACT_MAPPING_MAX_BATCH_SIZE_V1,
} from "../pricing/tcgplayer_market_exact_mapping_apply_policy_v1.mjs";
import {
  normalizeTcgplayerMappingNameV1,
  normalizeTcgplayerMappingNumberV1,
} from "../pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs";
import {
  classifyTcgplayerMarketProductScopeV1_2,
} from "../pricing/tcgplayer_market_product_scope_v1.mjs";
import {
  loadTcgplayerMarketCanaryDefinitionV1,
} from "../pricing/tcgplayer_market_canary_definition_v1.mjs";

const { Client } = pg;
const SCRIPT_VERSION = "TCGPLAYER_MARKET_EXACT_MAPPING_APPLY_V1";
const PLAN_PATH_ENV = "TCGPLAYER_EXACT_MAPPING_PLAN_PATH";
const PLAN_SHA_ENV = "TCGPLAYER_EXACT_MAPPING_EXPECTED_SHA256";
const LIMIT_ENV = "TCGPLAYER_EXACT_MAPPING_LIMIT";
const CONFIRMATION_ENV = "TCGPLAYER_EXACT_MAPPING_APPLY_CONFIRMATION";
const EXPECTED_COMMIT_ENV = "TCGPLAYER_EXACT_MAPPING_EXPECTED_COMMIT_SHA";
const EXPECTED_PLAN_COMMIT_ENV =
  "TCGPLAYER_EXACT_MAPPING_EXPECTED_PLAN_COMMIT_SHA";
const OUTPUT_ROOT_ENV = "TCGPLAYER_EXACT_MAPPING_OUTPUT_ROOT";

if (process.env[CANON_MAINTENANCE_ENABLE_ENV_V1] !== "true") {
  throw new Error(
    "RUNTIME_ENFORCEMENT: canon maintenance is disabled. Set ENABLE_CANON_MAINTENANCE_MODE=true.",
  );
}
if (process.env[CANON_MAINTENANCE_MODE_ENV_V1] !== "EXPLICIT") {
  throw new Error(
    "RUNTIME_ENFORCEMENT: CANON_MAINTENANCE_MODE must be 'EXPLICIT'.",
  );
}
if (
  process.env[CANON_MAINTENANCE_ENTRYPOINT_ENV_V1] !==
  CANON_MAINTENANCE_ENTRYPOINT_V1
) {
  throw new Error(
    `RUNTIME_ENFORCEMENT: canon maintenance scripts must be launched from ${CANON_MAINTENANCE_ENTRYPOINT_V1}.`,
  );
}

const DRY_RUN = process.env[CANON_MAINTENANCE_DRY_RUN_ENV_V1] !== "false";
const { assertCanonMaintenanceWriteAllowed } =
  installCanonMaintenanceBoundaryV1(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_OUTPUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "market_pricing_product_v1",
  "exact_mapping_apply",
);
const CANARY_PATH = path.join(
  REPO_ROOT,
  "backend",
  "pricing",
  "canaries",
  "tcgplayer_market_canary_100_v1.json",
);

function text(value) {
  return String(value ?? "").trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function jsonl(rows) {
  return rows.length
    ? `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`
    : "";
}

function connectionString() {
  return (
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    ""
  );
}

function sslConfig(url) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(url)
    ? false
    : { rejectUnauthorized: false };
}

function git(args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

function numberField(extendedData) {
  const fields = Array.isArray(extendedData) ? extendedData : [];
  return text(
    fields.find((field) => text(field?.name).toLowerCase() === "number")
      ?.value,
  );
}

function parseMode() {
  const hasApply = process.argv.includes("--apply");
  const hasDryRun = process.argv.includes("--dry-run");
  if (hasApply && hasDryRun) {
    throw new Error("MODE_CONFLICT: use either --dry-run or --apply.");
  }
  if (hasApply && DRY_RUN) {
    throw new Error(
      "RUNTIME_ENFORCEMENT: apply flag requires CANON_MAINTENANCE_DRY_RUN=false.",
    );
  }
  return hasApply && !DRY_RUN ? "apply" : "dry_run";
}

function resolveRepoPath(value, envName) {
  if (!text(value)) throw new Error(`${envName}_REQUIRED`);
  const resolved = path.resolve(REPO_ROOT, value);
  const relative = path.relative(REPO_ROOT, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${envName}_OUTSIDE_REPOSITORY`);
  }
  return resolved;
}

function parseLimit(mode) {
  const raw = text(process.env[LIMIT_ENV]);
  if (mode === "apply" && !raw) throw new Error(`${LIMIT_ENV}_REQUIRED`);
  const value = Number(raw || TCGPLAYER_MARKET_EXACT_MAPPING_MAX_BATCH_SIZE_V1);
  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > TCGPLAYER_MARKET_EXACT_MAPPING_MAX_BATCH_SIZE_V1
  ) {
    throw new Error(
      `${LIMIT_ENV}_OUT_OF_RANGE:1-${TCGPLAYER_MARKET_EXACT_MAPPING_MAX_BATCH_SIZE_V1}`,
    );
  }
  return value;
}

async function loadFrozenPlan(mode) {
  const candidatePath = resolveRepoPath(process.env[PLAN_PATH_ENV], PLAN_PATH_ENV);
  const expectedSha = text(process.env[PLAN_SHA_ENV]).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expectedSha)) {
    throw new Error(`${PLAN_SHA_ENV}_INVALID`);
  }
  const candidateBytes = await fs.readFile(candidatePath);
  const actualSha = sha256(candidateBytes);
  if (actualSha !== expectedSha) {
    throw new Error(
      `CANDIDATE_ARTIFACT_HASH_MISMATCH:${actualSha}:${expectedSha}`,
    );
  }
  const candidates = candidateBytes
    .toString("utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const planDir = path.dirname(candidatePath);
  const summary = JSON.parse(
    await fs.readFile(path.join(planDir, "summary.json"), "utf8"),
  );
  const runPlan = JSON.parse(
    await fs.readFile(path.join(planDir, "run_plan.json"), "utf8"),
  );
  if (
    summary.status !== "passed" ||
    Number(summary.counts?.candidates) !== candidates.length ||
    runPlan.mode !== "read_only_dry_run"
  ) {
    throw new Error("SOURCE_PLAN_NOT_RECONCILED");
  }
  if (!/^[a-f0-9]{40}$/.test(text(runPlan.commit_sha))) {
    throw new Error("SOURCE_PLAN_COMMIT_INVALID");
  }

  const commitSha = git(["rev-parse", "HEAD"]);
  const branch = git(["branch", "--show-current"]);
  const trackedStatus = git(["status", "--porcelain", "--untracked-files=no"]);
  if (mode === "apply") {
    const expectedCommitSha = text(process.env[EXPECTED_COMMIT_ENV]);
    if (!/^[a-f0-9]{40}$/.test(expectedCommitSha)) {
      throw new Error(`${EXPECTED_COMMIT_ENV}_REQUIRED`);
    }
    if (commitSha !== expectedCommitSha) {
      throw new Error(
        `PRODUCING_COMMIT_MISMATCH:${commitSha}:${expectedCommitSha}`,
      );
    }
    const expectedPlanCommitSha = text(
      process.env[EXPECTED_PLAN_COMMIT_ENV],
    );
    if (!/^[a-f0-9]{40}$/.test(expectedPlanCommitSha)) {
      throw new Error(`${EXPECTED_PLAN_COMMIT_ENV}_REQUIRED`);
    }
    if (runPlan.commit_sha !== expectedPlanCommitSha) {
      throw new Error(
        `SOURCE_PLAN_COMMIT_MISMATCH:${runPlan.commit_sha}:${expectedPlanCommitSha}`,
      );
    }
    if (runPlan.tracked_worktree_clean !== true) {
      throw new Error("SOURCE_PLAN_TRACKED_WORKTREE_NOT_CLEAN");
    }
    try {
      git(["merge-base", "--is-ancestor", runPlan.commit_sha, commitSha]);
    } catch {
      throw new Error(
        `SOURCE_PLAN_COMMIT_NOT_ANCESTOR:${runPlan.commit_sha}:${commitSha}`,
      );
    }
    if (trackedStatus) throw new Error("TRACKED_WORKTREE_NOT_CLEAN");
    if (
      text(process.env[CONFIRMATION_ENV]) !==
      TCGPLAYER_MARKET_EXACT_MAPPING_APPLY_CONFIRMATION_V1
    ) {
      throw new Error(`${CONFIRMATION_ENV}_MISMATCH`);
    }
  }

  return {
    candidatePath,
    candidatePathRelative: path
      .relative(REPO_ROOT, candidatePath)
      .replace(/\\/g, "/"),
    candidateArtifactSha256: actualSha,
    candidates,
    summary,
    sourcePlan: runPlan,
    commitSha,
    branch,
    trackedWorktreeClean: !trackedStatus,
  };
}

async function loadCanaryExclusions() {
  const { definition: canary } =
    await loadTcgplayerMarketCanaryDefinitionV1(CANARY_PATH, {
      requireVerified: true,
    });
  return {
    canary_id: canary.canary_id,
    source_product_ids: [
      ...new Set(canary.printings.map((row) => Number(row.source_product_id))),
    ].sort((left, right) => left - right),
    target_card_print_ids: [
      ...new Set(canary.printings.map((row) => text(row.card_print_id))),
    ].sort(),
  };
}

async function loadLiveState(client, selected, sourceSyncRunId) {
  const sourceIds = selected.map((row) => Number(row.source_product_id));
  const targetIds = selected.map((row) => row.target.card_print_id);
  const observationIds = [
    ...new Set(
      selected.flatMap((row) => row.supporting_gap_observation_ids ?? []),
    ),
  ];
  const sourceRun = (
    await client.query(
      `select id::text, sync_mode, status, failed_count, observed_on,
              finished_at, artifact_hash
         from public.tcgcsv_source_sync_runs
        where id = $1::uuid`,
      [sourceSyncRunId],
    )
  ).rows[0];
  const sources = (
    await client.query(
      `select
         product.product_id,
         product.name as source_product_name,
         product.group_id as source_group_id,
         source_group.name as source_group_name,
         product.extended_data,
         product.source_active,
         product.catalog_metadata_status,
         count(distinct mapping.id) filter (
           where mapping.source = 'tcgplayer' and mapping.active = true
         )::integer as active_source_mapping_count
       from public.tcgcsv_source_products product
       join public.tcgcsv_source_groups source_group
         on source_group.group_id = product.group_id
       left join public.external_mappings mapping
         on mapping.external_id = product.product_id::text
        and mapping.source = 'tcgplayer'
        and mapping.active = true
      where product.product_id = any($1::integer[])
      group by product.product_id, product.name, product.group_id,
               source_group.name, product.extended_data,
               product.source_active, product.catalog_metadata_status
      order by product.product_id`,
      [sourceIds],
    )
  ).rows;
  const targets = (
    await client.query(
      `select
         card.id::text as card_print_id,
         card.gv_id,
         card.set_id::text,
         card.set_code,
         card.name,
         card.number,
         card.variant_key,
         count(distinct identity.id) filter (
           where identity.is_active = true
             and identity.identity_domain = 'pokemon_eng_standard'
         )::integer as active_standard_identity_count,
         count(distinct mapping.id) filter (
           where mapping.source = 'tcgplayer' and mapping.active = true
         )::integer as active_tcgplayer_mapping_count
       from public.card_prints card
       left join public.card_print_identity identity
         on identity.card_print_id = card.id
       left join public.external_mappings mapping
         on mapping.card_print_id = card.id
      where card.id = any($1::uuid[])
      group by card.id, card.gv_id, card.set_id, card.set_code, card.name,
               card.number, card.variant_key
      order by card.id`,
      [targetIds],
    )
  ).rows;
  const observations = observationIds.length
    ? (
        await client.query(
          `select id::text, product_id, last_seen_run_id::text, observed_on
             from public.tcgcsv_source_price_daily_observations
            where id = any($1::uuid[])
            order by id`,
          [observationIds],
        )
      ).rows
    : [];
  const activePublicationOverlap = (
    await client.query(
      `select distinct
         snapshot.source_product_id,
         snapshot.card_print_id::text
       from public.market_price_current_publication pointer
       join public.market_price_publication_snapshots snapshot
         on snapshot.publication_set_id = pointer.publication_set_id
      where pointer.singleton
        and (
          snapshot.source_product_id = any($1::integer[])
          or snapshot.card_print_id = any($2::uuid[])
        )
      order by snapshot.source_product_id, snapshot.card_print_id::text`,
      [sourceIds, targetIds],
    )
  ).rows;
  return {
    sourceRun,
    sources,
    targets,
    observations,
    activePublicationOverlap,
  };
}

function validateLiveState(selected, sourceSyncRunId, live) {
  const failures = [];
  if (
    !live.sourceRun ||
    live.sourceRun.id !== sourceSyncRunId ||
    live.sourceRun.sync_mode !== "current_full_sync" ||
    live.sourceRun.status !== "completed" ||
    Number(live.sourceRun.failed_count) !== 0
  ) {
    failures.push({ reason: "source_run_not_completed_and_reconciled" });
  }
  if (live.sources.length !== selected.length) {
    failures.push({
      reason: "source_product_count_mismatch",
      expected: selected.length,
      actual: live.sources.length,
    });
  }
  if (live.targets.length !== selected.length) {
    failures.push({
      reason: "target_count_mismatch",
      expected: selected.length,
      actual: live.targets.length,
    });
  }
  if (live.activePublicationOverlap.length > 0) {
    failures.push({
      reason: "active_publication_overlap",
      rows: live.activePublicationOverlap,
    });
  }

  const sources = new Map(
    live.sources.map((row) => [Number(row.product_id), row]),
  );
  const targets = new Map(
    live.targets.map((row) => [row.card_print_id, row]),
  );
  const observations = new Map(
    live.observations.map((row) => [row.id, row]),
  );
  for (const candidate of selected) {
    const source = sources.get(Number(candidate.source_product_id));
    const target = targets.get(candidate.target.card_print_id);
    const rowFailures = [];
    if (!source) {
      rowFailures.push("source_product_missing");
    } else {
      const liveScope = classifyTcgplayerMarketProductScopeV1_2({
        source_product_name: source.source_product_name,
        source_group_name: source.source_group_name,
        has_printed_number_evidence: Boolean(numberField(source.extended_data)),
      });
      if (!liveScope.in_scope) rowFailures.push("source_now_out_of_scope");
      if (source.source_active !== true) rowFailures.push("source_inactive");
      if (source.catalog_metadata_status !== "current") {
        rowFailures.push("source_not_current");
      }
      if (Number(source.active_source_mapping_count) !== 0) {
        rowFailures.push("source_mapping_now_exists");
      }
      if (source.source_product_name !== candidate.source_product_name) {
        rowFailures.push("source_name_changed");
      }
      if (Number(source.source_group_id) !== Number(candidate.source_group_id)) {
        rowFailures.push("source_group_changed");
      }
      if (source.source_group_name !== candidate.source_group_name) {
        rowFailures.push("source_group_name_changed");
      }
      if (
        normalizeTcgplayerMappingNumberV1(numberField(source.extended_data)) !==
        candidate.normalized_source_number
      ) {
        rowFailures.push("source_number_changed");
      }
    }
    if (!target) {
      rowFailures.push("target_missing");
    } else {
      if (target.gv_id !== candidate.target.gv_id) {
        rowFailures.push("target_gv_id_changed");
      }
      if (text(target.variant_key)) rowFailures.push("target_not_base_variant");
      if (Number(target.active_standard_identity_count) !== 1) {
        rowFailures.push("target_standard_identity_not_unique");
      }
      if (Number(target.active_tcgplayer_mapping_count) !== 0) {
        rowFailures.push("target_mapping_now_exists");
      }
      if (
        normalizeTcgplayerMappingNameV1(target.name) !==
        candidate.normalized_source_name
      ) {
        rowFailures.push("target_name_changed");
      }
      if (
        normalizeTcgplayerMappingNumberV1(target.number) !==
        candidate.normalized_source_number
      ) {
        rowFailures.push("target_number_changed");
      }
    }
    for (const observationId of candidate.supporting_gap_observation_ids) {
      const observation = observations.get(observationId);
      if (!observation) {
        rowFailures.push("supporting_observation_missing");
      } else if (
        Number(observation.product_id) !== Number(candidate.source_product_id) ||
        observation.last_seen_run_id !== sourceSyncRunId
      ) {
        rowFailures.push("supporting_observation_provenance_changed");
      }
    }
    if (rowFailures.length > 0) {
      failures.push({
        source_product_id: Number(candidate.source_product_id),
        target_card_print_id: candidate.target.card_print_id,
        reasons: [...new Set(rowFailures)].sort(),
      });
    }
  }
  return failures;
}

async function readAppliedMappings(client, ids) {
  if (ids.length === 0) return [];
  return (
    await client.query(
      `select id::text, card_print_id::text, source, external_id, meta,
              synced_at, active
         from public.external_mappings
        where id = any($1::bigint[])
        order by id`,
      [ids],
    )
  ).rows;
}

function validateAppliedReadback(selected, inserted, readback, context) {
  const failures = [];
  if (inserted.length !== selected.length || readback.length !== selected.length) {
    failures.push("applied_row_count_mismatch");
  }
  const selectedBySource = new Map(
    selected.map((row) => [String(row.source_product_id), row]),
  );
  for (const row of readback) {
    const candidate = selectedBySource.get(row.external_id);
    if (!candidate) {
      failures.push(`unexpected_external_id:${row.external_id}`);
      continue;
    }
    if (
      row.source !== "tcgplayer" ||
      row.card_print_id !== candidate.target.card_print_id ||
      row.active !== true
    ) {
      failures.push(`mapping_readback_mismatch:${row.external_id}`);
    }
    if (
      row.meta?.maintenance_run_id !== context.maintenance_run_id ||
      row.meta?.batch_fingerprint !== context.batch_fingerprint ||
      row.meta?.candidate_fingerprint !== candidate.candidate_fingerprint
    ) {
      failures.push(`mapping_provenance_mismatch:${row.external_id}`);
    }
  }
  return [...new Set(failures)].sort();
}

function buildRollbackManifest(rows, context) {
  return {
    schema_version: "TCGPLAYER_MARKET_EXACT_MAPPING_ROLLBACK_MANIFEST_V1",
    maintenance_run_id: context.maintenance_run_id,
    batch_fingerprint: context.batch_fingerprint,
    operation: "deactivate_exact_inserted_mapping_ids",
    mapping_rows: rows.map((row) => ({
      mapping_id: row.id,
      source: row.source,
      external_id: row.external_id,
      card_print_id: row.card_print_id,
      expected_candidate_fingerprint:
        row.meta?.candidate_fingerprint ?? null,
      expected_active_state: true,
    })),
  };
}

async function writeArtifacts(outDir, files) {
  const hashes = {};
  for (const [name, contents] of Object.entries(files)) {
    await fs.writeFile(path.join(outDir, name), contents);
    hashes[name] = sha256(contents);
  }
  await fs.writeFile(
    path.join(outDir, "artifact_hashes.json"),
    `${JSON.stringify(hashes, null, 2)}\n`,
  );
}

async function main() {
  const mode = parseMode();
  const limit = parseLimit(mode);
  const frozen = await loadFrozenPlan(mode);
  const canary = await loadCanaryExclusions();
  const selection = selectTcgplayerExactMappingApplyBatchV1(
    frozen.candidates,
    {
      limit,
      excludedSourceProductIds: canary.source_product_ids,
      excludedTargetCardPrintIds: canary.target_card_print_ids,
    },
  );
  const maintenanceRunId = randomUUID();
  const outputRoot = process.env[OUTPUT_ROOT_ENV]
    ? resolveRepoPath(process.env[OUTPUT_ROOT_ENV], OUTPUT_ROOT_ENV)
    : DEFAULT_OUTPUT_ROOT;
  const outDir = path.join(outputRoot, `${stamp()}_${mode}_${maintenanceRunId}`);
  await fs.mkdir(outDir, { recursive: true });
  const context = {
    maintenance_run_id: maintenanceRunId,
    batch_fingerprint: selection.batch_fingerprint,
    source_sync_run_id: frozen.sourcePlan.source_sync_run_id,
    candidate_artifact_sha256: frozen.candidateArtifactSha256,
    candidate_artifact_path: frozen.candidatePathRelative,
    candidate_plan_commit_sha: frozen.sourcePlan.commit_sha,
    producing_commit_sha: frozen.commitSha,
  };
  const runPlan = {
    script_version: SCRIPT_VERSION,
    apply_policy_version: TCGPLAYER_MARKET_EXACT_MAPPING_APPLY_POLICY_V1,
    mode,
    maintenance_run_id: maintenanceRunId,
    producing_commit_sha: frozen.commitSha,
    branch: frozen.branch,
    tracked_worktree_clean: frozen.trackedWorktreeClean,
    candidate_artifact_path: frozen.candidatePathRelative,
    candidate_artifact_sha256: frozen.candidateArtifactSha256,
    candidate_plan_commit_sha: frozen.sourcePlan.commit_sha,
    candidate_plan_tracked_worktree_clean:
      frozen.sourcePlan.tracked_worktree_clean === true,
    source_sync_run_id: frozen.sourcePlan.source_sync_run_id,
    canary_id: canary.canary_id,
    candidate_count: selection.candidate_count,
    selected_count: selection.selected_count,
    canary_excluded_count: selection.excluded_count,
    batch_fingerprint: selection.batch_fingerprint,
    selected_source_product_ids: selection.selected.map((row) =>
      Number(row.source_product_id),
    ),
    selected_target_card_print_ids: selection.selected.map(
      (row) => row.target.card_print_id,
    ),
    boundaries: {
      dry_run_default: true,
      database_writes: mode === "apply",
      insert_only: true,
      existing_mapping_updates: false,
      existing_mapping_deletes: false,
      publication_writes: false,
      customer_state_writes: false,
    },
  };
  const runPlanContents = `${JSON.stringify(runPlan, null, 2)}\n`;
  await fs.writeFile(
    path.join(outDir, "run_plan.json"),
    runPlanContents,
  );

  const url = connectionString();
  if (!url) throw new Error("database connection string is required");
  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    application_name: "tcgplayer-market-exact-mapping-apply-v1",
  });
  let inserted = [];
  let readback = [];
  let committed = false;
  let live;
  await client.connect();
  try {
    await client.query(
      mode === "apply"
        ? "begin isolation level serializable"
        : "begin read only",
    );
    await client.query("set local statement_timeout = '120s'");
    if (mode === "apply") {
      await client.query(
        "select pg_advisory_xact_lock(hashtext('tcgplayer_market_exact_mapping_apply_v1'))",
      );
    }
    live = await loadLiveState(
      client,
      selection.selected,
      frozen.sourcePlan.source_sync_run_id,
    );
    const liveFailures = validateLiveState(
      selection.selected,
      frozen.sourcePlan.source_sync_run_id,
      live,
    );
    if (liveFailures.length > 0) {
      throw new Error(`LIVE_PRECONDITION_FAILED:${JSON.stringify(liveFailures)}`);
    }

    if (mode === "apply") {
      assertCanonMaintenanceWriteAllowed();
      const insertPayload = selection.selected.map((candidate) => ({
        card_print_id: candidate.target.card_print_id,
        external_id: String(candidate.source_product_id),
        meta: buildTcgplayerExactMappingMetaV1(candidate, context),
      }));
      inserted = (
        await client.query(
          `insert into public.external_mappings (
             card_print_id,
             source,
             external_id,
             meta,
             active,
             synced_at
           )
           select
             item.card_print_id,
             'tcgplayer',
             item.external_id,
             item.meta,
             true,
             now()
           from jsonb_to_recordset($1::jsonb) as item(
             card_print_id uuid,
             external_id text,
             meta jsonb
           )
           order by item.external_id::integer
           returning id::text, card_print_id::text, source, external_id,
                     meta, synced_at, active`,
          [JSON.stringify(insertPayload)],
        )
      ).rows;
      if (inserted.length !== selection.selected.length) {
        throw new Error(
          `INSERT_RECONCILIATION_FAILED:${inserted.length}/${selection.selected.length}`,
        );
      }
      await client.query("commit");
      committed = true;
      readback = await readAppliedMappings(
        client,
        inserted.map((row) => row.id),
      );
      const readbackFailures = validateAppliedReadback(
        selection.selected,
        inserted,
        readback,
        context,
      );
      if (readbackFailures.length > 0) {
        throw new Error(
          `POST_COMMIT_READBACK_FAILED:${JSON.stringify(readbackFailures)}`,
        );
      }
    } else {
      await client.query("rollback");
    }
  } catch (error) {
    if (!committed) await client.query("rollback").catch(() => {});
    const rollbackManifest = buildRollbackManifest(
      readback.length > 0 ? readback : inserted,
      context,
    );
    const failure = {
      script_version: SCRIPT_VERSION,
      status: "failed",
      mode,
      maintenance_run_id: maintenanceRunId,
      committed,
      error: error instanceof Error ? error.message : String(error),
    };
    await writeArtifacts(outDir, {
      "run_plan.json": runPlanContents,
      "summary.json": `${JSON.stringify(failure, null, 2)}\n`,
      "selected_candidates.jsonl": jsonl(selection.selected),
      "live_precondition_readback.json": live
        ? `${JSON.stringify(live, null, 2)}\n`
        : "",
      "inserted_mappings.jsonl": jsonl(inserted),
      "mapping_readback.jsonl": jsonl(readback),
      "rollback_manifest.json": `${JSON.stringify(rollbackManifest, null, 2)}\n`,
    });
    throw error;
  } finally {
    await client.end().catch(() => {});
  }

  const summary = {
    script_version: SCRIPT_VERSION,
    status: "passed",
    mode,
    maintenance_run_id: maintenanceRunId,
    committed,
    candidate_count: selection.candidate_count,
    selected_count: selection.selected_count,
    inserted_count: inserted.length,
    readback_count: readback.length,
    canary_excluded_count: selection.excluded_count,
    active_publication_overlap_count:
      live.activePublicationOverlap.length,
    batch_fingerprint: selection.batch_fingerprint,
    source_sync_run_id: frozen.sourcePlan.source_sync_run_id,
    candidate_artifact_sha256: frozen.candidateArtifactSha256,
    database_writes: mode === "apply" ? inserted.length : 0,
    publication_writes: 0,
    customer_state_writes: 0,
  };
  const rollbackManifest = buildRollbackManifest(readback, context);
  await writeArtifacts(outDir, {
    "run_plan.json": runPlanContents,
    "summary.json": `${JSON.stringify(summary, null, 2)}\n`,
    "selected_candidates.jsonl": jsonl(selection.selected),
    "live_precondition_readback.json": `${JSON.stringify(live, null, 2)}\n`,
    "inserted_mappings.jsonl": jsonl(inserted),
    "mapping_readback.jsonl": jsonl(readback),
    "rollback_manifest.json": `${JSON.stringify(rollbackManifest, null, 2)}\n`,
  });
  process.stdout.write(
    `${JSON.stringify(
      {
        ...summary,
        artifact_root: path.relative(REPO_ROOT, outDir).replace(/\\/g, "/"),
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  console.error(
    `[tcgplayer-market-exact-mapping-apply] ${error.stack || error.message}`,
  );
  process.exitCode = 1;
});
