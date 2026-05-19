import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = "docs/audits/child_printing_public_identity_v1";
const AUDIT_MD = path.join(OUTPUT_DIR, "child_printing_public_identity_v1_audit_20260518.md");
const AUDIT_JSON = path.join(OUTPUT_DIR, "child_printing_public_identity_v1_audit_20260518.json");
const CANDIDATES_MD = path.join(OUTPUT_DIR, "child_printing_public_identity_candidates_20260518.md");
const CANDIDATES_JSON = path.join(OUTPUT_DIR, "child_printing_public_identity_candidates_20260518.json");
const WRITE_PLAN_MD = path.join(OUTPUT_DIR, "child_printing_public_identity_write_plan_20260518.md");
const WRITE_PLAN_SQL = path.join(OUTPUT_DIR, "child_printing_public_identity_write_plan_20260518.sql");
const WRITE_PLAN_JSON = path.join(OUTPUT_DIR, "child_printing_public_identity_write_plan_matrix_20260518.json");

const SUPPORTED_FINISH_SUFFIXES = new Map([
  ["normal", "STD"],
  ["holo", "HOLO"],
  ["reverse", "RH"],
  ["pokeball", "PB"],
  ["masterball", "MB"],
]);

const HIGH_RISK_SETS = ["sv03.5", "sv8pt5", "sv8", "me01", "smp"];
const PREMIUM_FINISH_KEYS = new Set(["pokeball", "masterball", "reverse"]);
const NON_MEANINGFUL_PARENT_VARIANTS = new Set(["", "base", "default", "normal", "standard", "none"]);

function requireDbUrl() {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL
  );
}

function clean(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeKey(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function isMeaningfulParentVariant(row) {
  const variantKey = normalizeKey(row.variant_key);
  const modifier = normalizeKey(row.printed_identity_modifier);
  return (variantKey && !NON_MEANINGFUL_PARENT_VARIANTS.has(variantKey)) || Boolean(modifier);
}

function proposedId(parentGvId, finishKey) {
  const suffix = SUPPORTED_FINISH_SUFFIXES.get(normalizeKey(finishKey));
  return suffix && parentGvId ? `${parentGvId}-${suffix}` : null;
}

function classifyCandidate(row, candidateId, duplicateCandidateIds, parentGvIdSet) {
  if (!row.parent_gv_id) {
    return "BLOCKED_PARENT_MISSING_GV_ID";
  }
  if (!SUPPORTED_FINISH_SUFFIXES.has(normalizeKey(row.finish_key))) {
    return "BLOCKED_UNKNOWN_FINISH_KEY";
  }
  if (!candidateId || duplicateCandidateIds.has(candidateId) || parentGvIdSet.has(candidateId)) {
    return "BLOCKED_PROPOSED_ID_COLLISION";
  }
  if (isMeaningfulParentVariant(row)) {
    return "BLOCKED_PARENT_VARIANT_BOUNDARY";
  }
  if ((Number(row.ownership_refs_count) || 0) > 0 || (Number(row.pricing_refs_count) || 0) > 0) {
    return "BLOCKED_REFERENCED_ROW_REQUIRES_MANUAL_REVIEW";
  }
  return "APPROVED_CANDIDATE";
}

function riskFor(row, classification) {
  const reasons = [];
  const setCode = normalizeKey(row.set_code).replace(/_/g, ".");
  if (classification !== "APPROVED_CANDIDATE") reasons.push(classification);
  if (HIGH_RISK_SETS.includes(String(row.set_code ?? "").toLowerCase())) reasons.push("HIGH_RISK_SET");
  if (PREMIUM_FINISH_KEYS.has(normalizeKey(row.finish_key))) reasons.push("PREMIUM_PARALLEL");
  if ((Number(row.ownership_refs_count) || 0) > 0) reasons.push("OWNED_CHILD_PRINTING");
  if ((Number(row.pricing_refs_count) || 0) > 0) reasons.push("PRICING_REFERENCE");
  if (!row.has_image) reasons.push("NO_CHILD_IMAGE");
  if (setCode === "sv03.5" || setCode === "sv8pt5") reasons.push("KNOWN_PARALLEL_SET");
  return reasons.length > 0 ? reasons : ["LOW"];
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] ?? "null";
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function markdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const separator = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? "").replace(/\|/g, "\\|")).join(" | ")} |`);
  return [header, separator, ...body].join("\n");
}

async function tableExists(client, tableName) {
  const result = await client.query("select to_regclass($1) as regclass", [`public.${tableName}`]);
  return Boolean(result.rows[0]?.regclass);
}

async function main() {
  const connectionString = requireDbUrl();
  if (!connectionString) {
    throw new Error("Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only audit.");
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query("begin read only");

    const hasPricingMappings = await tableExists(client, "justtcg_grookai_mappings");
    const hasPricingLatest = await tableExists(client, "justtcg_variant_price_snapshots_latest");
    const pricingJoinSql = hasPricingMappings
      ? `
        left join public.justtcg_grookai_mappings jgm
          on jgm.card_printing_id = cpr.id
      `
      : "";
    const pricingSelectSql = hasPricingMappings ? "count(distinct jgm.id)::int" : "0::int";

    const columnsResult = await client.query(`
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'card_printings'
      order by ordinal_position
    `);
    const cardPrintingsColumns = columnsResult.rows.map((row) => row.column_name);
    const hasPrintingGvIdColumn = cardPrintingsColumns.includes("printing_gv_id");

    const distributionResult = await client.query(`
      select
        cpr.finish_key,
        fk.label as finish_label,
        count(*)::int as row_count,
        count(*) filter (where cp.gv_id is not null)::int as with_parent_gv_id,
        count(*) filter (where coalesce(cpr.is_provisional, false) = false)::int as active_row_count
      from public.card_printings cpr
      left join public.finish_keys fk on fk.key = cpr.finish_key
      left join public.card_prints cp on cp.id = cpr.card_print_id
      group by cpr.finish_key, fk.label
      order by row_count desc, cpr.finish_key
    `);

    const baseRowsResult = await client.query(`
      select
        cpr.id as card_printing_id,
        cpr.card_print_id,
        cpr.finish_key,
        fk.label as finish_label,
        coalesce(cpr.is_provisional, false) as is_provisional,
        cp.gv_id as parent_gv_id,
        cp.name as card_name,
        cp.number,
        cp.set_code,
        s.name as set_name,
        cp.variant_key,
        cp.printed_identity_modifier,
        cp.image_url,
        cp.image_alt_url,
        cp.representative_image_url,
        cp.image_path,
        count(distinct vii.id) filter (where vii.card_printing_id is not null and vii.archived_at is null)::int as ownership_refs_count,
        ${pricingSelectSql} as pricing_refs_count
      from public.card_printings cpr
      left join public.finish_keys fk on fk.key = cpr.finish_key
      left join public.card_prints cp on cp.id = cpr.card_print_id
      left join public.sets s on s.id = cp.set_id
      left join public.vault_item_instances vii on vii.card_printing_id = cpr.id
      ${pricingJoinSql}
      group by cpr.id, cpr.card_print_id, cpr.finish_key, fk.label, fk.sort_order, cpr.is_provisional, cp.gv_id, cp.name, cp.number, cp.number_plain, cp.set_code, s.name, cp.variant_key, cp.printed_identity_modifier, cp.image_url, cp.image_alt_url, cp.representative_image_url, cp.image_path
      order by cp.set_code, cp.number_plain nulls last, cp.number, cp.name, fk.sort_order nulls last, cpr.finish_key
    `);

    const baseRows = baseRowsResult.rows.map((row) => ({
      ...row,
      finish_key: clean(row.finish_key),
      finish_label: clean(row.finish_label),
      parent_gv_id: clean(row.parent_gv_id),
      set_code: clean(row.set_code),
      set_name: clean(row.set_name),
      card_name: clean(row.card_name),
      number: clean(row.number),
      proposed_printing_gv_id: proposedId(clean(row.parent_gv_id), row.finish_key),
      has_image: Boolean(clean(row.image_url) || clean(row.image_alt_url) || clean(row.representative_image_url) || clean(row.image_path)),
    }));

    const candidateIdCounts = new Map();
    for (const row of baseRows) {
      if (row.proposed_printing_gv_id) {
        candidateIdCounts.set(row.proposed_printing_gv_id, (candidateIdCounts.get(row.proposed_printing_gv_id) ?? 0) + 1);
      }
    }
    const duplicateCandidateIds = new Set([...candidateIdCounts.entries()].filter(([, count]) => count > 1).map(([id]) => id));
    const parentGvRows = await client.query("select gv_id from public.card_prints where gv_id is not null");
    const parentGvIdSet = new Set(parentGvRows.rows.map((row) => row.gv_id));

    const candidates = baseRows.map((row) => {
      const classification = classifyCandidate(row, row.proposed_printing_gv_id, duplicateCandidateIds, parentGvIdSet);
      return {
        card_printing_id: row.card_printing_id,
        card_print_id: row.card_print_id,
        parent_gv_id: row.parent_gv_id,
        set_code: row.set_code,
        set_name: row.set_name,
        card_name: row.card_name,
        number: row.number,
        finish_key: row.finish_key,
        finish_label: row.finish_label,
        proposed_printing_gv_id: row.proposed_printing_gv_id,
        ownership_refs_count: Number(row.ownership_refs_count) || 0,
        pricing_refs_count: Number(row.pricing_refs_count) || 0,
        image_presence: row.has_image,
        risk_classification: classification,
        risk_reasons: riskFor(row, classification),
      };
    });

    const parentMultiResult = await client.query(`
      select
        cp.id as card_print_id,
        cp.gv_id,
        cp.name,
        cp.set_code,
        cp.number,
        count(cpr.id)::int as child_printing_count,
        array_agg(cpr.finish_key order by fk.sort_order nulls last, cpr.finish_key) as finish_keys
      from public.card_prints cp
      join public.card_printings cpr on cpr.card_print_id = cp.id
      left join public.finish_keys fk on fk.key = cpr.finish_key
      group by cp.id, cp.gv_id, cp.name, cp.set_code, cp.number
      having count(cpr.id) > 1
      order by child_printing_count desc, cp.set_code, cp.number
    `);

    const highRiskResult = await client.query(
      `
        select
          cp.set_code,
          count(cpr.id)::int as child_printing_count,
          count(cpr.id) filter (where cpr.finish_key in ('pokeball','masterball','reverse'))::int as premium_child_count,
          count(distinct cp.id)::int as parent_print_count
        from public.card_printings cpr
        join public.card_prints cp on cp.id = cpr.card_print_id
        where lower(cp.set_code) = any($1::text[])
           or cpr.finish_key in ('pokeball','masterball','reverse')
        group by cp.set_code
        order by premium_child_count desc, child_printing_count desc
      `,
      [HIGH_RISK_SETS],
    );

    const audit = {
      contract: "CHILD_PRINTING_PUBLIC_IDENTITY_V1",
      generated_at: new Date().toISOString(),
      mode: "read-only dry-run; no DB writes",
      schema: {
        card_printings_columns: cardPrintingsColumns,
        has_printing_gv_id_column: hasPrintingGvIdColumn,
        pricing_mapping_table_present: hasPricingMappings,
        pricing_latest_table_present: hasPricingLatest,
      },
      totals: {
        total_card_printings: baseRows.length,
        active_child_printings: baseRows.filter((row) => row.is_provisional === false).length,
        eligible_candidates: candidates.length,
        approved_candidates: candidates.filter((row) => row.risk_classification === "APPROVED_CANDIDATE").length,
        with_parent_gv_id: candidates.filter((row) => row.parent_gv_id).length,
        missing_parent_gv_id: candidates.filter((row) => !row.parent_gv_id).length,
        owned_child_printings: candidates.filter((row) => row.ownership_refs_count > 0).length,
        with_image: candidates.filter((row) => row.image_presence).length,
        parent_prints_with_multiple_child_printings: parentMultiResult.rows.length,
        proposed_id_collision_count: duplicateCandidateIds.size,
        proposed_ids_already_used_by_parent_gv_id: candidates.filter((row) => row.proposed_printing_gv_id && parentGvIdSet.has(row.proposed_printing_gv_id)).length,
      },
      finish_key_distribution: distributionResult.rows,
      blocked_by_reason: countBy(candidates.filter((row) => row.risk_classification !== "APPROVED_CANDIDATE"), "risk_classification"),
      unsupported_finish_keys: [...new Set(candidates.filter((row) => row.risk_classification === "BLOCKED_UNKNOWN_FINISH_KEY").map((row) => row.finish_key ?? "null"))].sort(),
      duplicate_proposed_ids: [...duplicateCandidateIds].sort(),
      high_risk_sets: highRiskResult.rows,
      parent_prints_with_multiple_child_printings_sample: parentMultiResult.rows.slice(0, 50),
      owned_child_printings_sample: candidates.filter((row) => row.ownership_refs_count > 0).slice(0, 50),
      candidates,
    };

    const writePlan = {
      contract: audit.contract,
      generated_at: audit.generated_at,
      status: "NOT_APPLIED",
      exact_candidate_count: candidates.length,
      approved_candidate_count: audit.totals.approved_candidates,
      blocked_by_reason: audit.blocked_by_reason,
      proposed_id_collision_count: audit.totals.proposed_id_collision_count,
      migration_required: !hasPrintingGvIdColumn,
      migration_draft: "supabase/migrations/20260518180000_child_printing_public_identity_v1.sql",
      future_update_requires_manual_approval: true,
    };

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(AUDIT_JSON, `${JSON.stringify(audit, null, 2)}\n`);
    fs.writeFileSync(CANDIDATES_JSON, `${JSON.stringify(candidates, null, 2)}\n`);
    fs.writeFileSync(WRITE_PLAN_JSON, `${JSON.stringify(writePlan, null, 2)}\n`);

    const blockedLines = Object.entries(audit.blocked_by_reason)
      .map(([reason, count]) => `- ${reason}: ${count}`)
      .join("\n") || "- none";
    const finishLines = audit.finish_key_distribution
      .map((row) => `- ${row.finish_key ?? "null"} (${row.finish_label ?? "unlabeled"}): ${row.row_count} rows, ${row.with_parent_gv_id} with parent gv_id`)
      .join("\n");
    const sampleCandidates = candidates.slice(0, 30);

    fs.writeFileSync(
      AUDIT_MD,
      `# Child Printing Public Identity V1 Audit

Generated: ${audit.generated_at}

Mode: read-only dry-run. No database writes were performed.

## Summary

- total card_printings: ${audit.totals.total_card_printings}
- active child printings: ${audit.totals.active_child_printings}
- eligible dry-run candidates: ${audit.totals.eligible_candidates}
- approved candidates: ${audit.totals.approved_candidates}
- candidates with parent gv_id: ${audit.totals.with_parent_gv_id}
- blocked because parent gv_id is missing: ${audit.totals.missing_parent_gv_id}
- owned child printings: ${audit.totals.owned_child_printings}
- child printings with image presence: ${audit.totals.with_image}
- parent prints with multiple child printings: ${audit.totals.parent_prints_with_multiple_child_printings}
- proposed child ID collision count: ${audit.totals.proposed_id_collision_count}
- proposed child IDs already used by parent card_prints.gv_id: ${audit.totals.proposed_ids_already_used_by_parent_gv_id}

## Blocked Candidates

${blockedLines}

## Finish Key Distribution

${finishLines}

## Unsupported Finish Keys

${audit.unsupported_finish_keys.length > 0 ? audit.unsupported_finish_keys.map((key) => `- ${key}`).join("\n") : "- none"}

## Highest Risk Sets

${markdownTable(audit.high_risk_sets.slice(0, 25), [
  { label: "set_code", value: (row) => row.set_code },
  { label: "child_printings", value: (row) => row.child_printing_count },
  { label: "premium_child_count", value: (row) => row.premium_child_count },
  { label: "parent_print_count", value: (row) => row.parent_print_count },
])}

## Required Audit Questions

1. How many child printings are eligible? ${audit.totals.eligible_candidates}
2. How many have parent gv_id? ${audit.totals.with_parent_gv_id}
3. How many are blocked because parent gv_id is missing? ${audit.totals.missing_parent_gv_id}
4. Are any proposed child IDs duplicated? ${audit.totals.proposed_id_collision_count === 0 ? "No." : `Yes: ${audit.totals.proposed_id_collision_count}.`}
5. Are any proposed child IDs already used by parent card_prints.gv_id? ${audit.totals.proposed_ids_already_used_by_parent_gv_id === 0 ? "No." : `Yes: ${audit.totals.proposed_ids_already_used_by_parent_gv_id}.`}
6. Which finish keys are unsupported? ${audit.unsupported_finish_keys.length > 0 ? audit.unsupported_finish_keys.join(", ") : "None in this dry-run."}
7. Which sets are highest risk? ${audit.high_risk_sets.slice(0, 10).map((row) => row.set_code).join(", ")}
8. Do any existing vault-owned child printings exist and need priority? ${audit.totals.owned_child_printings > 0 ? `Yes: ${audit.totals.owned_child_printings}.` : "No."}
9. Does this affect Species Dex denominator? No. Species Dex remains parent-print based.
10. Does this require public route changes? No for V1. Parent card routes remain default.

## Notes

- The current remote schema ${hasPrintingGvIdColumn ? "already has" : "does not yet have"} \`card_printings.printing_gv_id\`.
- Pricing child references are ${hasPricingMappings ? "included from justtcg_grookai_mappings.card_printing_id" : "not present in the current pricing mapping table schema"}.
- Parent-level variants are intentionally blocked for manual review so this lane does not collapse parent variant identity into child finish identity.
`,
    );

    fs.writeFileSync(
      CANDIDATES_MD,
      `# Child Printing Public Identity Candidates

Generated: ${audit.generated_at}

Proposed format: \`<parent_gv_id>-<finish_suffix>\`

Approved candidates: ${audit.totals.approved_candidates}
Blocked candidates: ${candidates.length - audit.totals.approved_candidates}

## Sample Candidates

${markdownTable(sampleCandidates, [
  { label: "classification", value: (row) => row.risk_classification },
  { label: "proposed_id", value: (row) => row.proposed_printing_gv_id },
  { label: "parent_gv_id", value: (row) => row.parent_gv_id },
  { label: "set", value: (row) => row.set_code },
  { label: "number", value: (row) => row.number },
  { label: "name", value: (row) => row.card_name },
  { label: "finish", value: (row) => row.finish_key },
  { label: "owned", value: (row) => row.ownership_refs_count },
])}

Full candidate evidence is in \`${CANDIDATES_JSON}\`.
`,
    );

    fs.writeFileSync(
      WRITE_PLAN_MD,
      `# Child Printing Public Identity Write Plan

Generated: ${audit.generated_at}

Status: NOT APPLIED.

This is a no-write plan for a later approved task.

## Schema Step

Add nullable \`public.card_printings.printing_gv_id\` and a partial unique index.

Draft migration: \`supabase/migrations/20260518180000_child_printing_public_identity_v1.sql\`

## Candidate Step

- exact dry-run candidate count: ${candidates.length}
- approved candidate count: ${audit.totals.approved_candidates}
- blocked candidate count: ${candidates.length - audit.totals.approved_candidates}
- collision count: ${audit.totals.proposed_id_collision_count}

## Apply Gate

Do not apply until:

- the nullable schema migration is reviewed
- blocked candidates are reviewed or intentionally deferred
- proposed ID collision count is zero
- parent gv_id collision count is zero
- owned child printings are manually prioritized

## Rollback

Because the column is nullable, rollback is:

1. clear future assigned \`printing_gv_id\` values for affected rows
2. drop the partial unique index
3. drop the nullable column only if no app release depends on it

## Post-Write Verification

- every assigned \`printing_gv_id\` is unique
- every assigned ID starts with parent \`card_prints.gv_id\`
- no parent \`card_prints.gv_id\` changed
- Species Dex denominator remains parent-print based
- no public child printing route is enabled
`,
    );

    const approvedValues = candidates
      .filter((row) => row.risk_classification === "APPROVED_CANDIDATE")
      .map((row) => `-- update public.card_printings set printing_gv_id = '${row.proposed_printing_gv_id}' where id = '${row.card_printing_id}' and printing_gv_id is null;`)
      .slice(0, 250)
      .join("\n");

    fs.writeFileSync(
      WRITE_PLAN_SQL,
      `-- CHILD_PRINTING_PUBLIC_IDENTITY_V1 write plan
-- Generated: ${audit.generated_at}
-- Status: NOT APPLIED. This file is intentionally read-only by default.

begin;

-- Collision checks.
select proposed_printing_gv_id, count(*)
from (
  values
${candidates
  .filter((row) => row.proposed_printing_gv_id)
  .map((row) => `    ('${row.proposed_printing_gv_id}'::text)`)
  .join(",\n")}
) as proposed(proposed_printing_gv_id)
group by proposed_printing_gv_id
having count(*) > 1;

-- Parent GV-ID collision check.
select cp.gv_id
from public.card_prints cp
where cp.gv_id in (
${candidates
  .filter((row) => row.proposed_printing_gv_id)
  .map((row) => `  '${row.proposed_printing_gv_id}'`)
  .join(",\n")}
);

-- Future schema migration draft; do not execute from this plan.
-- alter table public.card_printings add column if not exists printing_gv_id text;
-- comment on column public.card_printings.printing_gv_id is
--   'Finish-specific public Grookai identity for child printings. Parent card_prints.gv_id remains the parent print identity.';
-- create unique index if not exists card_printings_printing_gv_id_key
--   on public.card_printings(printing_gv_id)
--   where printing_gv_id is not null;

-- Future approved candidate updates; intentionally commented and sample-limited.
${approvedValues || "-- no approved candidates in this dry-run"}

rollback;
`,
    );

    await client.query("commit");
    console.log(`[child-printing-public-identity] wrote ${AUDIT_MD}`);
    console.log(`[child-printing-public-identity] wrote ${AUDIT_JSON}`);
    console.log(`[child-printing-public-identity] wrote ${CANDIDATES_MD}`);
    console.log(`[child-printing-public-identity] wrote ${CANDIDATES_JSON}`);
    console.log(`[child-printing-public-identity] wrote ${WRITE_PLAN_MD}`);
    console.log(`[child-printing-public-identity] wrote ${WRITE_PLAN_SQL}`);
    console.log(`[child-printing-public-identity] wrote ${WRITE_PLAN_JSON}`);
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
