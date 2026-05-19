import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import process from "node:process";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = "docs/audits/child_printing_public_identity_v1";
const CANDIDATES_JSON = path.join(OUTPUT_DIR, "child_printing_public_identity_candidates_20260518.json");
const EXECUTION_JSON = path.join(OUTPUT_DIR, "child_printing_public_identity_backfill_execution_20260518.json");
const EXECUTION_MD = path.join(OUTPUT_DIR, "child_printing_public_identity_backfill_execution_20260518.md");

const EXPECTED_TOTAL = 55582;
const EXPECTED_APPROVED = 44698;
const EXPECTED_BLOCKED = 10884;
const EXPECTED_MISSING_PARENT_GV_ID = 10377;
const EXPECTED_PARENT_VARIANT_BOUNDARY = 507;
const SPECIES_DENOMINATORS = new Map([
  ["pikachu", 223],
  ["charizard", 133],
]);

function requireDbUrl() {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL
  );
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function assertCondition(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function chunkArray(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function readCandidates() {
  const raw = await fs.readFile(CANDIDATES_JSON, "utf8");
  const candidates = JSON.parse(raw);
  assertCondition(Array.isArray(candidates), "Candidate matrix must be a JSON array.");
  return candidates;
}

function summarizeCandidates(candidates) {
  const approved = candidates.filter((row) => row.risk_classification === "APPROVED_CANDIDATE");
  const blocked = candidates.filter((row) => row.risk_classification !== "APPROVED_CANDIDATE");
  const blockedByReason = blocked.reduce((acc, row) => {
    acc[row.risk_classification] = (acc[row.risk_classification] ?? 0) + 1;
    return acc;
  }, {});
  const approvedFinishDistribution = approved.reduce((acc, row) => {
    acc[row.finish_key] = (acc[row.finish_key] ?? 0) + 1;
    return acc;
  }, {});
  const proposedCounts = new Map();
  for (const row of approved) {
    if (row.proposed_printing_gv_id) {
      proposedCounts.set(row.proposed_printing_gv_id, (proposedCounts.get(row.proposed_printing_gv_id) ?? 0) + 1);
    }
  }
  const duplicateProposedIds = [...proposedCounts.entries()].filter(([, count]) => count > 1);

  return {
    total: candidates.length,
    approved,
    blocked,
    approved_count: approved.length,
    blocked_count: blocked.length,
    blocked_by_reason: blockedByReason,
    approved_finish_distribution: approvedFinishDistribution,
    duplicate_proposed_id_count: duplicateProposedIds.length,
    target_checksum: sha256(
      approved
        .map((row) => `${row.card_printing_id}:${row.card_print_id}:${row.parent_gv_id}:${row.proposed_printing_gv_id}`)
        .sort()
        .join("\n"),
    ),
  };
}

async function queryOne(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows[0] ?? {};
}

async function parentGvChecksum(client) {
  const result = await client.query(`
    select id::text as id, coalesce(gv_id, '') as gv_id
    from public.card_prints
    order by id
  `);
  return sha256(result.rows.map((row) => `${row.id}:${row.gv_id}`).join("\n"));
}

async function remoteCounts(client) {
  const counts = await queryOne(client, `
    select
      count(*)::int as total_card_printings,
      count(*) filter (where printing_gv_id is not null)::int as populated_printing_gv_id,
      count(*) filter (where printing_gv_id is null)::int as null_printing_gv_id
    from public.card_printings
  `);
  const collisions = await queryOne(client, `
    select count(*)::int as collision_groups
    from (
      select printing_gv_id
      from public.card_printings
      where printing_gv_id is not null
      group by printing_gv_id
      having count(*) > 1
    ) collisions
  `);
  const parentCollisions = await queryOne(client, `
    select count(*)::int as parent_collision_count
    from public.card_printings cpr
    join public.card_prints cp
      on cp.gv_id = cpr.printing_gv_id
    where cpr.printing_gv_id is not null
  `);
  const suffixCounts = await client.query(`
    select suffix, count(*)::int as row_count
    from (
      select case
        when printing_gv_id like '%-STD' then 'STD'
        when printing_gv_id like '%-HOLO' then 'HOLO'
        when printing_gv_id like '%-RH' then 'RH'
        when printing_gv_id like '%-PB' then 'PB'
        when printing_gv_id like '%-MB' then 'MB'
        else 'OTHER'
      end as suffix
      from public.card_printings
      where printing_gv_id is not null
    ) suffixes
    group by suffix
    order by suffix
  `);

  return {
    ...counts,
    collision_groups: collisions.collision_groups,
    parent_collision_count: parentCollisions.parent_collision_count,
    suffix_counts: Object.fromEntries(suffixCounts.rows.map((row) => [row.suffix, row.row_count])),
  };
}

async function speciesDenominators(client) {
  const result = await client.query(
    `
      select ps.slug, count(distinct cps.card_print_id)::int as total_print_count
      from public.pokemon_species ps
      join public.card_print_species cps
        on cps.species_id = ps.id
      where ps.slug = any($1::text[])
        and cps.active = true
        and cps.counts_for_completion = true
      group by ps.slug
      order by ps.slug
    `,
    [[...SPECIES_DENOMINATORS.keys()]],
  );
  return Object.fromEntries(result.rows.map((row) => [row.slug, row.total_print_count]));
}

async function countRowsByPrintingIds(client, ids, predicateSql) {
  let total = 0;
  for (const chunk of chunkArray(ids, 5000)) {
    const row = await queryOne(
      client,
      `
        select count(*)::int as row_count
        from public.card_printings
        where id = any($1::uuid[])
          ${predicateSql}
      `,
      [chunk],
    );
    total += Number(row.row_count ?? 0);
  }
  return total;
}

async function loadTempCandidates(client, approved) {
  await client.query(`
    create temp table tmp_child_printing_public_identity_backfill_v1 (
      card_printing_id uuid primary key,
      card_print_id uuid not null,
      parent_gv_id text not null,
      proposed_printing_gv_id text not null,
      finish_key text not null,
      risk_classification text not null
    ) on commit drop
  `);

  for (const chunk of chunkArray(approved, 1000)) {
    await client.query(
      `
        insert into tmp_child_printing_public_identity_backfill_v1 (
          card_printing_id,
          card_print_id,
          parent_gv_id,
          proposed_printing_gv_id,
          finish_key,
          risk_classification
        )
        select *
        from unnest(
          $1::uuid[],
          $2::uuid[],
          $3::text[],
          $4::text[],
          $5::text[],
          $6::text[]
        )
      `,
      [
        chunk.map((row) => row.card_printing_id),
        chunk.map((row) => row.card_print_id),
        chunk.map((row) => row.parent_gv_id),
        chunk.map((row) => row.proposed_printing_gv_id),
        chunk.map((row) => row.finish_key),
        chunk.map((row) => row.risk_classification),
      ],
    );
  }
}

async function transactionAssertions(client) {
  const checks = {
    temp_count: await queryOne(client, `select count(*)::int as value from tmp_child_printing_public_identity_backfill_v1`),
    non_approved_temp_rows: await queryOne(
      client,
      `select count(*)::int as value from tmp_child_printing_public_identity_backfill_v1 where risk_classification <> 'APPROVED_CANDIDATE'`,
    ),
    null_proposed_ids: await queryOne(
      client,
      `select count(*)::int as value from tmp_child_printing_public_identity_backfill_v1 where proposed_printing_gv_id is null or proposed_printing_gv_id = ''`,
    ),
    duplicate_proposed_ids: await queryOne(
      client,
      `
        select count(*)::int as value
        from (
          select proposed_printing_gv_id
          from tmp_child_printing_public_identity_backfill_v1
          group by proposed_printing_gv_id
          having count(*) > 1
        ) duplicates
      `,
    ),
    target_rows_already_populated: await queryOne(
      client,
      `
        select count(*)::int as value
        from tmp_child_printing_public_identity_backfill_v1 candidate
        join public.card_printings cpng
          on cpng.id = candidate.card_printing_id
        where cpng.printing_gv_id is not null
      `,
    ),
    proposed_id_existing_conflicts: await queryOne(
      client,
      `
        select count(*)::int as value
        from tmp_child_printing_public_identity_backfill_v1 candidate
        join public.card_printings cpng
          on cpng.printing_gv_id = candidate.proposed_printing_gv_id
         and cpng.id <> candidate.card_printing_id
      `,
    ),
    proposed_id_parent_conflicts: await queryOne(
      client,
      `
        select count(*)::int as value
        from tmp_child_printing_public_identity_backfill_v1 candidate
        join public.card_prints cp
          on cp.gv_id = candidate.proposed_printing_gv_id
      `,
    ),
    missing_or_mismatched_target_rows: await queryOne(
      client,
      `
        select count(*)::int as value
        from tmp_child_printing_public_identity_backfill_v1 candidate
        left join public.card_printings cpng
          on cpng.id = candidate.card_printing_id
         and cpng.card_print_id = candidate.card_print_id
        left join public.card_prints cp
          on cp.id = cpng.card_print_id
        where cpng.id is null
           or cp.gv_id is distinct from candidate.parent_gv_id
      `,
    ),
  };

  const flatChecks = Object.fromEntries(Object.entries(checks).map(([key, row]) => [key, Number(row.value ?? 0)]));
  assertCondition(flatChecks.temp_count === EXPECTED_APPROVED, "Temp candidate count mismatch.", flatChecks);
  for (const [key, value] of Object.entries(flatChecks)) {
    if (key !== "temp_count") {
      assertCondition(value === 0, `Transaction assertion failed: ${key}`, flatChecks);
    }
  }
  return flatChecks;
}

async function guardedUpdate(client) {
  const result = await client.query(`
    with updated as (
      update public.card_printings cpng
      set printing_gv_id = candidate.proposed_printing_gv_id
      from tmp_child_printing_public_identity_backfill_v1 candidate,
           public.card_prints cp
      where cpng.id = candidate.card_printing_id
        and cpng.card_print_id = candidate.card_print_id
        and cp.id = cpng.card_print_id
        and cp.gv_id = candidate.parent_gv_id
        and candidate.risk_classification = 'APPROVED_CANDIDATE'
        and candidate.proposed_printing_gv_id is not null
        and cpng.printing_gv_id is null
      returning cpng.id
    )
    select count(*)::int as updated_rows from updated
  `);
  return Number(result.rows[0]?.updated_rows ?? 0);
}

function assertCandidateSummary(summary) {
  assertCondition(summary.total === EXPECTED_TOTAL, "Total candidate count drift.", summary);
  assertCondition(summary.approved_count === EXPECTED_APPROVED, "Approved candidate count drift.", summary);
  assertCondition(summary.blocked_count === EXPECTED_BLOCKED, "Blocked candidate count drift.", summary);
  assertCondition(
    summary.blocked_by_reason.BLOCKED_PARENT_MISSING_GV_ID === EXPECTED_MISSING_PARENT_GV_ID,
    "Missing parent gv_id blocked count drift.",
    summary,
  );
  assertCondition(
    summary.blocked_by_reason.BLOCKED_PARENT_VARIANT_BOUNDARY === EXPECTED_PARENT_VARIANT_BOUNDARY,
    "Parent variant boundary blocked count drift.",
    summary,
  );
  assertCondition(summary.duplicate_proposed_id_count === 0, "Duplicate proposed printing_gv_id candidates found.", summary);
}

function renderMarkdown(report) {
  const postCounts = report.post_write.remote_counts ?? {};
  const postDenominators = report.post_write.species_denominators ?? {};
  const suffixCounts = postCounts.suffix_counts ?? {};
  return [
    "# Child Printing Public Identity Backfill Execution",
    "",
    `Generated: ${report.generated_at}`,
    `Status: ${report.status}`,
    "",
    "## Pre-Write Snapshot",
    "",
    `- Total card printings: ${report.pre_write.remote_counts.total_card_printings}`,
    `- Populated printing_gv_id rows: ${report.pre_write.remote_counts.populated_printing_gv_id}`,
    `- Existing collision groups: ${report.pre_write.remote_counts.collision_groups}`,
    `- Parent gv_id checksum: ${report.pre_write.parent_gv_id_checksum}`,
    `- Target checksum: ${report.pre_write.target_candidate_checksum}`,
    "",
    "## Candidate Counts",
    "",
    `- Approved candidates: ${report.candidates.approved_count}`,
    `- Blocked candidates: ${report.candidates.blocked_count}`,
    `- Missing parent gv_id blocked: ${report.candidates.blocked_by_reason.BLOCKED_PARENT_MISSING_GV_ID}`,
    `- Parent variant boundary blocked: ${report.candidates.blocked_by_reason.BLOCKED_PARENT_VARIANT_BOUNDARY}`,
    `- Proposed ID collision groups: ${report.candidates.duplicate_proposed_id_count}`,
    "",
    "## Transaction Result",
    "",
    `- Transaction status: ${report.transaction.status}`,
    `- Updated rows: ${report.transaction.updated_rows}`,
    "",
    "## Post-Write Verification",
    "",
    `- Populated printing_gv_id rows: ${postCounts.populated_printing_gv_id ?? "pending"}`,
    `- Blocked rows still null: ${report.post_write.blocked_rows_still_null ?? "pending"}`,
    `- Blocked rows populated: ${report.post_write.blocked_rows_populated ?? "pending"}`,
    `- Duplicate printing_gv_id groups: ${postCounts.collision_groups ?? "pending"}`,
    `- Parent gv_id checksum unchanged: ${report.post_write.parent_gv_id_checksum_unchanged ?? "pending"}`,
    `- Pikachu denominator: ${postDenominators.pikachu ?? "pending"}`,
    `- Charizard denominator: ${postDenominators.charizard ?? "pending"}`,
    "",
    "## Suffix Coverage",
    "",
    ...(Object.keys(suffixCounts).length > 0
      ? Object.entries(suffixCounts).map(([suffix, count]) => `- ${suffix}: ${count}`)
      : ["- pending"]),
    "",
    "## Rollback Note",
    "",
    "Rollback must clear only rows where `card_printings.id` and `printing_gv_id` match the approved candidate matrix captured by this execution artifact.",
    "",
    "## Explicit Non-Actions",
    "",
    "- No parent `card_prints.gv_id` changes.",
    "- No Species Dex denominator changes.",
    "- No scanner changes.",
    "- No public child printing route enablement.",
    "- No unrelated DB remediation.",
  ].join("\n");
}

async function main() {
  assertCondition(process.argv.includes("--execute"), "Refusing to run without --execute.");

  const connectionString = requireDbUrl();
  assertCondition(Boolean(connectionString), "Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.");

  const candidates = await readCandidates();
  const summary = summarizeCandidates(candidates);
  assertCandidateSummary(summary);

  const client = new Client({
    connectionString,
    application_name: "child_printing_public_identity_backfill_execute_v1",
    statement_timeout: 120000,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const report = {
    contract: "CHILD_PRINTING_PUBLIC_IDENTITY_V1",
    generated_at: new Date().toISOString(),
    status: "STARTED",
    candidates: {
      total: summary.total,
      approved_count: summary.approved_count,
      blocked_count: summary.blocked_count,
      blocked_by_reason: summary.blocked_by_reason,
      approved_finish_distribution: summary.approved_finish_distribution,
      duplicate_proposed_id_count: summary.duplicate_proposed_id_count,
    },
    pre_write: {},
    transaction: {},
    post_write: {},
    confirmations: {
      parent_gv_id_changes: false,
      species_dex_denominator_changes: false,
      scanner_changes: false,
      public_child_route_enablement: false,
      unrelated_db_remediation: false,
    },
  };

  try {
    report.pre_write.remote_counts = await remoteCounts(client);
    report.pre_write.species_denominators = await speciesDenominators(client);
    report.pre_write.parent_gv_id_checksum = await parentGvChecksum(client);
    report.pre_write.target_candidate_checksum = summary.target_checksum;
    report.pre_write.blocked_rows_null = await countRowsByPrintingIds(
      client,
      summary.blocked.map((row) => row.card_printing_id),
      "and printing_gv_id is null",
    );

    assertCondition(Number(report.pre_write.remote_counts.total_card_printings) === EXPECTED_TOTAL, "Remote child printing count drift.", report.pre_write.remote_counts);
    assertCondition(Number(report.pre_write.remote_counts.populated_printing_gv_id) === 0, "printing_gv_id is already populated before first backfill.", report.pre_write.remote_counts);
    assertCondition(Number(report.pre_write.remote_counts.collision_groups) === 0, "Existing printing_gv_id collision groups found.", report.pre_write.remote_counts);
    assertCondition(Number(report.pre_write.remote_counts.parent_collision_count) === 0, "Existing parent gv_id collision found.", report.pre_write.remote_counts);
    for (const [slug, expected] of SPECIES_DENOMINATORS) {
      assertCondition(report.pre_write.species_denominators[slug] === expected, `Pre-write ${slug} denominator mismatch.`, report.pre_write.species_denominators);
    }

    report.status = "PRE_WRITE_SNAPSHOT_CREATED";
    await fs.writeFile(EXECUTION_JSON, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await fs.writeFile(EXECUTION_MD, `${renderMarkdown(report)}\n`, "utf8");

    await client.query("begin");
    try {
      await client.query("set local lock_timeout = '5s'");
      await client.query("set local statement_timeout = '120s'");
      await loadTempCandidates(client, summary.approved);
      report.transaction.assertions = await transactionAssertions(client);
      report.transaction.updated_rows = await guardedUpdate(client);
      assertCondition(report.transaction.updated_rows === EXPECTED_APPROVED, "Updated row count mismatch; rolling back.", report.transaction);
      await client.query("commit");
      report.transaction.status = "COMMITTED";
    } catch (error) {
      await client.query("rollback").catch(() => {});
      report.transaction.status = "ROLLED_BACK";
      report.transaction.error = { message: error.message, details: error.details ?? null };
      report.status = "FAILED_ROLLED_BACK";
      await fs.writeFile(EXECUTION_JSON, `${JSON.stringify(report, null, 2)}\n`, "utf8");
      await fs.writeFile(EXECUTION_MD, `${renderMarkdown(report)}\n`, "utf8");
      throw error;
    }

    report.post_write.remote_counts = await remoteCounts(client);
    report.post_write.species_denominators = await speciesDenominators(client);
    report.post_write.parent_gv_id_checksum = await parentGvChecksum(client);
    report.post_write.parent_gv_id_checksum_unchanged =
      report.post_write.parent_gv_id_checksum === report.pre_write.parent_gv_id_checksum;
    report.post_write.blocked_rows_still_null = await countRowsByPrintingIds(
      client,
      summary.blocked.map((row) => row.card_printing_id),
      "and printing_gv_id is null",
    );
    report.post_write.blocked_rows_populated = await countRowsByPrintingIds(
      client,
      summary.blocked.map((row) => row.card_printing_id),
      "and printing_gv_id is not null",
    );

    assertCondition(Number(report.post_write.remote_counts.populated_printing_gv_id) === EXPECTED_APPROVED, "Post-write populated count mismatch.", report.post_write.remote_counts);
    assertCondition(report.post_write.blocked_rows_still_null === EXPECTED_BLOCKED, "Blocked rows were not all left null.", report.post_write);
    assertCondition(report.post_write.blocked_rows_populated === 0, "Blocked rows were populated.", report.post_write);
    assertCondition(Number(report.post_write.remote_counts.collision_groups) === 0, "Post-write collision groups found.", report.post_write.remote_counts);
    assertCondition(Number(report.post_write.remote_counts.parent_collision_count) === 0, "Post-write parent gv_id collision found.", report.post_write.remote_counts);
    assertCondition(report.post_write.parent_gv_id_checksum_unchanged, "Parent gv_id checksum changed.", report.post_write);
    for (const [slug, expected] of SPECIES_DENOMINATORS) {
      assertCondition(report.post_write.species_denominators[slug] === expected, `Post-write ${slug} denominator mismatch.`, report.post_write.species_denominators);
    }
    for (const suffix of ["STD", "HOLO", "RH", "PB", "MB"]) {
      assertCondition((Number(report.post_write.remote_counts.suffix_counts[suffix]) || 0) > 0, `Missing suffix coverage for ${suffix}.`, report.post_write.remote_counts.suffix_counts);
    }

    report.status = "COMMITTED_AND_VERIFIED";
    await fs.writeFile(EXECUTION_JSON, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await fs.writeFile(EXECUTION_MD, `${renderMarkdown(report)}\n`, "utf8");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[child-printing-public-identity:backfill] fatal:", error);
  process.exitCode = 1;
});
