import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const WORKER_VERSION = "MARKET_LISTING_VARIANT_ASSIGNMENT_INCREMENTAL_V1";
const ASSIGNMENT_VERSION = "MEE_VARIANT_ASSIGNMENT_RULES_V1";
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "market_intelligence_v1",
  "variant_assignment_incremental",
);

function parseArgs(argv) {
  const args = {
    apply: false,
    acquisitionRunId: null,
    maxCandidates: 10_000,
    batchSize: 10_000,
    timeoutMinutes: 10,
    outRoot: DEFAULT_OUT_ROOT,
  };
  for (const arg of argv) {
    if (arg === "--apply") args.apply = true;
    else if (arg === "--dry-run") args.apply = false;
    else if (arg.startsWith("--acquisition-run-id=")) {
      args.acquisitionRunId = arg.slice("--acquisition-run-id=".length).trim();
    } else if (arg.startsWith("--max-candidates=")) {
      args.maxCandidates = Number(arg.slice("--max-candidates=".length));
    } else if (arg.startsWith("--batch-size=")) {
      args.batchSize = Number(arg.slice("--batch-size=".length));
    } else if (arg.startsWith("--timeout-minutes=")) {
      args.timeoutMinutes = Number(arg.slice("--timeout-minutes=".length));
    } else if (arg.startsWith("--out-root=")) {
      args.outRoot = path.resolve(arg.slice("--out-root=".length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (
    args.acquisitionRunId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      args.acquisitionRunId,
    )
  ) {
    throw new Error("--acquisition-run-id must be a UUID");
  }
  if (
    !Number.isInteger(args.maxCandidates) ||
    args.maxCandidates < 1 ||
    args.maxCandidates > 500_000
  ) {
    throw new Error("--max-candidates must be an integer from 1 through 500000");
  }
  if (
    !Number.isInteger(args.batchSize) ||
    args.batchSize < 1 ||
    args.batchSize > 50_000 ||
    args.batchSize > args.maxCandidates
  ) {
    throw new Error(
      "--batch-size must be an integer from 1 through 50000 and no greater than --max-candidates",
    );
  }
  if (
    !Number.isInteger(args.timeoutMinutes) ||
    args.timeoutMinutes < 1 ||
    args.timeoutMinutes > 60
  ) {
    throw new Error("--timeout-minutes must be an integer from 1 through 60");
  }
  return args;
}

function databaseUrl() {
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

function gitValue(args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function countByStatus(rows) {
  return Object.fromEntries(
    rows.map((row) => [row.variant_assignment_status, Number(row.row_count)]),
  );
}

async function selectAcquisitionRun(client, requestedId) {
  const result = requestedId
    ? await client.query(
        `select id, run_key, status, observed_listing_count, started_at, finished_at
         from public.market_listing_acquisition_runs
         where id = $1`,
        [requestedId],
      )
    : await client.query(
        `select id, run_key, status, observed_listing_count, started_at, finished_at
         from public.market_listing_acquisition_runs
         where source = 'ebay_active'
           and status = 'completed'
         order by created_at desc
         limit 1`,
      );
  if (result.rowCount !== 1) {
    throw new Error("One completed acquisition run is required");
  }
  const row = result.rows[0];
  if (row.status !== "completed") {
    throw new Error(`Acquisition run ${row.id} is not completed`);
  }
  return row;
}

async function selectMissingCandidateIds(client, acquisitionRunId, limit) {
  const result = await client.query(
    `select candidate.id
     from public.market_listing_observations observation
     join public.market_listing_card_candidates candidate
       on candidate.observation_id = observation.id
     where observation.acquisition_run_id = $1
       and not exists (
         select 1
         from public.market_evidence_variant_assignments existing
         where existing.source_family = 'market_listing'
           and existing.source_row_id = candidate.id
           and existing.variant_assignment_version = $2
       )
     order by candidate.id
     limit $3`,
    [acquisitionRunId, ASSIGNMENT_VERSION, limit],
  );
  return result.rows.map((row) => row.id);
}

const PROJECTION_CTES = `
  with target_candidates as materialized (
    select candidate.*
    from public.market_listing_card_candidates candidate
    where candidate.id = any($1::uuid[])
  ),
  target_parents as materialized (
    select distinct card_print_id
    from target_candidates
    where card_print_id is not null
  ),
  child_counts as materialized (
    select
      child.card_print_id,
      count(*)::integer as child_count,
      array_agg(distinct child.finish_key order by child.finish_key) as child_finish_keys
    from public.card_printings child
    join target_parents target on target.card_print_id = child.card_print_id
    group by child.card_print_id
  ),
  source_rows as materialized (
    select
      'market_listing'::text as source_family,
      'market_listing_card_candidates'::text as source_table,
      candidate.id as source_row_id,
      candidate.observation_id,
      candidate.raw_snapshot_id,
      candidate.card_print_id,
      candidate.gv_id,
      candidate.source,
      candidate.source_listing_id,
      coalesce(
        observation.listing_title,
        candidate.title_features ->> 'listing_title',
        candidate.title_features ->> 'query_text'
      ) as raw_title,
      coalesce(
        candidate.finish_features ->> 'finish_key',
        candidate.finish_features ->> 'finish',
        candidate.finish_features ->> 'finish_hint',
        observation.listing_title,
        candidate.title_features ->> 'listing_title',
        candidate.title_features ->> 'query_text'
      ) as source_finish_hint,
      public.normalize_market_evidence_finish_key_v1(coalesce(
        candidate.finish_features ->> 'finish_key',
        candidate.finish_features ->> 'finish',
        candidate.finish_features ->> 'finish_hint',
        observation.listing_title,
        candidate.title_features ->> 'listing_title',
        candidate.title_features ->> 'query_text'
      )) as normalized_finish_key,
      child_counts.child_count,
      child_counts.child_finish_keys,
      candidate.title_features,
      candidate.condition_features,
      candidate.exclusion_flags
    from target_candidates candidate
    left join public.market_listing_observations observation
      on observation.id = candidate.observation_id
    left join child_counts on child_counts.card_print_id = candidate.card_print_id
  ),
  matched_child as materialized (
    select
      source_rows.source_row_id,
      count(child.id)::integer as match_count,
      (array_agg(child.id order by child.id))[1] as card_printing_id,
      (array_agg(child.printing_gv_id order by child.id))[1] as printing_gv_id,
      (array_agg(child.finish_key order by child.id))[1] as assigned_finish_key
    from source_rows
    left join public.card_printings child
      on child.card_print_id = source_rows.card_print_id
     and (
       child.finish_key = source_rows.normalized_finish_key
       or (
         source_rows.normalized_finish_key = 'cosmos'
         and child.finish_key = 'cracked_ice'
         and not exists (
           select 1
           from public.card_printings exact_cosmos
           where exact_cosmos.card_print_id = source_rows.card_print_id
             and exact_cosmos.finish_key = 'cosmos'
         )
       )
     )
    group by source_rows.source_row_id
  ),
  single_child as materialized (
    select
      child.card_print_id,
      child.id as card_printing_id,
      child.printing_gv_id,
      child.finish_key as assigned_finish_key
    from public.card_printings child
    join child_counts
      on child_counts.card_print_id = child.card_print_id
     and child_counts.child_count = 1
  ),
  projected as materialized (
    select
      source_rows.*,
      case
        when coalesce(source_rows.child_count, 0) = 0 then null::uuid
        when matched_child.match_count = 1 then matched_child.card_printing_id
        when source_rows.normalized_finish_key is null and source_rows.child_count = 1
          then single_child.card_printing_id
        else null::uuid
      end as card_printing_id,
      case
        when coalesce(source_rows.child_count, 0) = 0 then null::text
        when matched_child.match_count = 1 then matched_child.printing_gv_id
        when source_rows.normalized_finish_key is null and source_rows.child_count = 1
          then single_child.printing_gv_id
        else null::text
      end as printing_gv_id,
      case
        when coalesce(source_rows.child_count, 0) = 0 then null::text
        when matched_child.match_count = 1 then matched_child.assigned_finish_key
        when source_rows.normalized_finish_key is null and source_rows.child_count = 1
          then single_child.assigned_finish_key
        else null::text
      end as assigned_finish_key,
      case
        when coalesce(source_rows.child_count, 0) = 0 then 'parent_has_no_child'
        when matched_child.match_count = 1 then 'exact_child_finish'
        when matched_child.match_count > 1 then 'ambiguous_finish_conflict'
        when source_rows.normalized_finish_key is null and source_rows.child_count = 1
          then 'single_child_inferred'
        when source_rows.normalized_finish_key is null then 'unknown_finish_needs_review'
        else 'no_matching_child_finish'
      end as variant_assignment_status,
      case
        when coalesce(source_rows.child_count, 0) = 0 then 0.9900
        when matched_child.match_count = 1 then 0.9000
        when matched_child.match_count > 1 then 0.2000
        when source_rows.normalized_finish_key is null and source_rows.child_count = 1 then 0.7000
        when source_rows.normalized_finish_key is null then 0.1000
        else 0.2000
      end::numeric(5,4) as variant_assignment_confidence,
      case
        when coalesce(source_rows.child_count, 0) = 0 then 'parent identity has no child finish rows'
        when matched_child.match_count = 1 then 'listing finish text matched one child finish row'
        when matched_child.match_count > 1 then 'listing finish text matched multiple child finish rows'
        when source_rows.normalized_finish_key is null and source_rows.child_count = 1
          then 'single child finish inferred because parent has exactly one child row'
        when source_rows.normalized_finish_key is null
          then 'listing title or finish features did not identify a finish for multi-finish parent'
        else 'listing finish text did not match any child finish row'
      end as variant_assignment_reason,
      array_remove(array[
        case when source_rows.child_count > 1 then 'multi_finish_parent' end,
        case when source_rows.normalized_finish_key is null then 'finish_text_unrecognized' end,
        case when matched_child.match_count > 1 then 'duplicate_child_finish_match' end,
        case when source_rows.normalized_finish_key is not null
          and coalesce(matched_child.match_count, 0) = 0
          and coalesce(source_rows.child_count, 0) > 0
          then 'finish_text_without_child_lane' end,
        case when coalesce(array_length(source_rows.exclusion_flags, 1), 0) > 0
          then 'candidate_has_exclusion_flags' end
      ]::text[], null) as variant_assignment_flags
    from source_rows
    left join matched_child on matched_child.source_row_id = source_rows.source_row_id
    left join single_child on single_child.card_print_id = source_rows.card_print_id
  )`;

const INSERT_CTE = `,
  inserted as (
    insert into public.market_evidence_variant_assignments (
      source_family, source_table, source_row_id, observation_id, raw_snapshot_id,
      card_print_id, gv_id, card_printing_id, printing_gv_id, source_finish_hint,
      normalized_finish_key, assigned_finish_key, variant_assignment_status,
      variant_assignment_confidence, variant_assignment_version,
      variant_assignment_reason, variant_assignment_flags, assignment_payload,
      needs_review, publishable, app_visible, market_truth
    )
    select
      projected.source_family,
      projected.source_table,
      projected.source_row_id,
      projected.observation_id,
      projected.raw_snapshot_id,
      projected.card_print_id,
      projected.gv_id,
      projected.card_printing_id,
      projected.printing_gv_id,
      projected.source_finish_hint,
      projected.normalized_finish_key,
      projected.assigned_finish_key,
      projected.variant_assignment_status,
      projected.variant_assignment_confidence,
      '${ASSIGNMENT_VERSION}',
      projected.variant_assignment_reason,
      projected.variant_assignment_flags,
      jsonb_build_object(
        'source', projected.source,
        'source_listing_id', projected.source_listing_id,
        'raw_title', projected.raw_title,
        'child_count', coalesce(projected.child_count, 0),
        'child_finish_keys', coalesce(to_jsonb(projected.child_finish_keys), '[]'::jsonb),
        'title_features', coalesce(projected.title_features, '{}'::jsonb),
        'condition_features', coalesce(projected.condition_features, '{}'::jsonb),
        'exclusion_flags', coalesce(to_jsonb(projected.exclusion_flags), '[]'::jsonb),
        'backfill_package', '${WORKER_VERSION}'
      ),
      true, false, false, false
    from projected
    on conflict (source_family, source_row_id, variant_assignment_version) do nothing
    returning variant_assignment_status
  )
  select variant_assignment_status, count(*)::integer as row_count
  from inserted
  group by variant_assignment_status
  order by variant_assignment_status`;

const DRY_RUN_SELECT = `
  select variant_assignment_status, count(*)::integer as row_count
  from projected
  group by variant_assignment_status
  order by variant_assignment_status`;

async function processBatch(client, candidateIds, apply) {
  if (!apply) {
    const result = await client.query(
      `${PROJECTION_CTES}${DRY_RUN_SELECT}`,
      [candidateIds],
    );
    return countByStatus(result.rows);
  }

  await client.query("begin");
  try {
    const result = await client.query(`${PROJECTION_CTES}${INSERT_CTE}`, [candidateIds]);
    const inserted = result.rows.reduce(
      (total, row) => total + Number(row.row_count),
      0,
    );
    if (inserted !== candidateIds.length) {
      throw new Error(
        `Batch reconciliation failed: selected ${candidateIds.length}, inserted ${inserted}`,
      );
    }
    await client.query("commit");
    return countByStatus(result.rows);
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = databaseUrl();
  if (!url) throw new Error("SUPABASE_DB_URL is required");
  const trackedChanges = gitValue([
    "status",
    "--porcelain",
    "--untracked-files=no",
  ]);
  if (args.apply && trackedChanges) {
    throw new Error("incremental assignment apply requires a clean tracked working tree");
  }

  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    statement_timeout: args.timeoutMinutes * 60_000,
    query_timeout: args.timeoutMinutes * 60_000 + 5_000,
  });
  await client.connect();
  const runDir = path.join(args.outRoot, stamp());
  await fs.mkdir(runDir, { recursive: true });

  try {
    await client.query(
      "select set_config('statement_timeout', $1, false)",
      [`${args.timeoutMinutes}min`],
    );
    const acquisitionRun = await selectAcquisitionRun(
      client,
      args.acquisitionRunId,
    );
    const runPlan = {
      worker_version: WORKER_VERSION,
      assignment_version: ASSIGNMENT_VERSION,
      mode: args.apply ? "apply" : "dry_run",
      commit_sha: gitValue(["rev-parse", "HEAD"]),
      branch: gitValue(["branch", "--show-current"]),
      created_at: new Date().toISOString(),
      acquisition_run: acquisitionRun,
      max_candidates: args.maxCandidates,
      batch_size: args.batchSize,
      timeout_minutes: args.timeoutMinutes,
      boundaries: {
        provider_calls: false,
        source_evidence_updates: false,
        canonical_identity_writes: false,
        pricing_publication_writes: false,
        variant_assignment_inserts: args.apply,
        assignments_require_review: true,
        assignments_publishable: false,
        assignments_app_visible: false,
        assignments_market_truth: false,
      },
    };
    const runPlanContents = `${JSON.stringify(runPlan, null, 2)}\n`;
    await fs.writeFile(path.join(runDir, "run_plan.json"), runPlanContents);

    const startedAt = new Date().toISOString();
    const batches = [];
    let processed = 0;
    let complete = false;
    while (processed < args.maxCandidates) {
      const batchLimit = Math.min(
        args.batchSize,
        args.maxCandidates - processed,
      );
      const candidateIds = await selectMissingCandidateIds(
        client,
        acquisitionRun.id,
        batchLimit,
      );
      if (!candidateIds.length) {
        complete = true;
        break;
      }

      const batchNumber = batches.length + 1;
      const selectionContents = candidateIds
        .map((candidateId) => JSON.stringify({ candidate_id: candidateId }))
        .join("\n") + "\n";
      const selectionName = `selected_candidates_${String(batchNumber).padStart(3, "0")}.jsonl`;
      await fs.writeFile(path.join(runDir, selectionName), selectionContents);
      const byStatus = await processBatch(client, candidateIds, args.apply);
      batches.push({
        batch_number: batchNumber,
        selected_count: candidateIds.length,
        selected_sha256: sha256(selectionContents),
        projected_or_inserted_by_status: byStatus,
      });
      processed += candidateIds.length;
      if (!args.apply) {
        complete = candidateIds.length < batchLimit;
        break;
      }
    }

    if (args.apply && !complete) {
      const remaining = await selectMissingCandidateIds(
        client,
        acquisitionRun.id,
        1,
      );
      complete = remaining.length === 0;
    }

    const summary = {
      worker_version: WORKER_VERSION,
      status: args.apply
        ? complete
          ? "passed"
          : "partial"
        : "planned",
      mode: runPlan.mode,
      acquisition_run_id: acquisitionRun.id,
      selected_or_inserted_count: processed,
      acquisition_run_complete: complete,
      batches,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    };
    const summaryContents = `${JSON.stringify(summary, null, 2)}\n`;
    await fs.writeFile(path.join(runDir, "summary.json"), summaryContents);
    await fs.writeFile(
      path.join(runDir, "artifact_hashes.json"),
      `${JSON.stringify(
        {
          "run_plan.json": sha256(runPlanContents),
          "summary.json": sha256(summaryContents),
          ...Object.fromEntries(
            batches.map((batch) => [
              `selected_candidates_${String(batch.batch_number).padStart(3, "0")}.jsonl`,
              batch.selected_sha256,
            ]),
          ),
        },
        null,
        2,
      )}\n`,
    );
    process.stdout.write(
      `${JSON.stringify(
        {
          ...summary,
          artifact_root: path.relative(REPO_ROOT, runDir).replace(/\\/g, "/"),
        },
        null,
        2,
      )}\n`,
    );
    if (args.apply && !complete) process.exitCode = 2;
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`[variant-assignment-incremental] ${error.stack || error.message}`);
  process.exitCode = 1;
});
