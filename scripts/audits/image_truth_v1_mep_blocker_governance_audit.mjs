import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const TCGCSV_AUDIT_JSON = path.join(OUTPUT_DIR, 'image_truth_mep_tcgcsv_finish_image_audit_v1.json');
const MASTER_INDEX_PRINTINGS_JSON = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_printings_v1.json';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'image_truth_mep_blocker_governance_audit_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'image_truth_mep_blocker_governance_audit_v1.md');

function requireDbUrl() {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    null
  );
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeNumber(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^0+(?=\d)/, '');
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function masterIndexRows(masterIndex, row) {
  const printings = masterIndex.printings ?? masterIndex.rows ?? [];
  return printings.filter((printing) => {
    return printing.set_key === 'mep'
      && normalizeNumber(printing.card_number) === normalizeNumber(row.number)
      && normalizeText(printing.card_name) === normalizeText(row.card_name);
  });
}

async function loadDbRows(rows) {
  const connectionString = requireDbUrl();
  if (!connectionString) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only governance audit.');
  const keys = rows.map((row) => ({
    number: normalizeNumber(row.number),
    card_name: normalizeText(row.card_name),
  }));
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(
      `
        select
          cp.id as card_print_id,
          cp.set_code,
          cp.number,
          cp.name as card_name,
          cp.printed_identity_modifier,
          cpi.id as card_printing_id,
          cpi.finish_key,
          cpi.image_source,
          cpi.image_path,
          cpi.image_url,
          cpi.image_alt_url,
          cpi.image_status,
          cpi.image_note
        from public.card_prints cp
        left join public.card_printings cpi on cpi.card_print_id = cp.id
        where cp.set_code = 'mep'
          and regexp_replace(lower(cp.number), '^0+(?=\\d)', '') = any($1::text[])
        order by cp.number, cp.name, cp.printed_identity_modifier nulls first, cpi.finish_key
      `,
      [[...new Set(keys.map((key) => key.number))]],
    );
    return result.rows.filter((dbRow) => {
      return keys.some((key) => key.number === normalizeNumber(dbRow.number)
        && key.card_name === normalizeText(dbRow.card_name));
    });
  } finally {
    await client.end();
  }
}

function classifyGovernance(row, dbRows, masterRows) {
  const childFinishes = [...new Set(dbRows.map((dbRow) => clean(dbRow.finish_key)).filter(Boolean))].sort();
  const masterFinishes = [...new Set(masterRows.map((printing) => clean(printing.finish_key)).filter(Boolean))].sort();
  const hasImageByFinish = Object.fromEntries(childFinishes.map((finish) => [
    finish,
    dbRows.some((dbRow) => dbRow.finish_key === finish && (
      clean(dbRow.image_path) || clean(dbRow.image_url) || clean(dbRow.image_alt_url)
    )),
  ]));

  if (row.status === 'finish_label_conflict_cosmos_vs_holo') {
    return {
      governance_status: 'finish_governance_required',
      recommended_next_step: 'Do not image-fill the current holo row. Determine whether the source-backed canonical child should be cosmos, whether holo is an alias/display label, or whether both facts exist.',
      mutation_safe_now: false,
      reason: 'Live TCGCSV/TCGplayer product title says Cosmos Holo while the current missing-display target is finish_key=holo.',
      child_finishes_in_db: childFinishes,
      master_index_finishes: masterFinishes,
      has_image_by_finish: hasImageByFinish,
    };
  }

  if (row.status === 'finish_subtype_not_usable') {
    return {
      governance_status: 'non_holo_or_modifier_governance_required',
      recommended_next_step: 'Do not image-fill the current holo row. Source data did not provide an unmodified Holofoil product; inspect whether the base row should be normal, staff/modifier-only, or blocked.',
      mutation_safe_now: false,
      reason: row.reason,
      child_finishes_in_db: childFinishes,
      master_index_finishes: masterFinishes,
      has_image_by_finish: hasImageByFinish,
    };
  }

  return {
    governance_status: 'not_a_blocker',
    recommended_next_step: 'Handled by IMG-09 representative candidate lane.',
    mutation_safe_now: false,
    reason: row.reason,
    child_finishes_in_db: childFinishes,
    master_index_finishes: masterFinishes,
    has_image_by_finish: hasImageByFinish,
  };
}

function markdownTable(rows, columns) {
  if (rows.length === 0) return '_None._';
  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => {
    const cells = columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|'));
    return `| ${cells.join(' | ')} |`;
  });
  return [header, divider, ...body].join('\n');
}

function buildMarkdown(report) {
  return `# Image Truth V1 MEP Blocker Governance Audit

This is read-only. It does not write to the DB, upload images, create migrations, clean up rows, or change parent image fields.

## Summary

- target_rows: ${report.target_rows}
- finish_governance_required: ${report.summary.by_governance_status.finish_governance_required ?? 0}
- non_holo_or_modifier_governance_required: ${report.summary.by_governance_status.non_holo_or_modifier_governance_required ?? 0}
- mutation_safe_now: ${report.summary.mutation_safe_now}

## Blocked Rows

${markdownTable(report.rows, [
  { label: 'status', value: (row) => row.governance_status },
  { label: 'number', value: (row) => row.number },
  { label: 'card', value: (row) => row.card_name },
  { label: 'target finish', value: (row) => row.finish_key },
  { label: 'db finishes', value: (row) => row.child_finishes_in_db.join(', ') },
  { label: 'index finishes', value: (row) => row.master_index_finishes.join(', ') },
  { label: 'source products', value: (row) => row.matched_products.map((product) => product.name).join('; ') },
])}

## Rule

Do not use representative images to hide finish-taxonomy disagreement. These rows need finish governance first, then an image package can be generated against the corrected child printing target.
`;
}

async function main() {
  const [tcgcsvAudit, masterIndex] = await Promise.all([
    fs.readFile(TCGCSV_AUDIT_JSON, 'utf8').then(JSON.parse),
    fs.readFile(MASTER_INDEX_PRINTINGS_JSON, 'utf8').then(JSON.parse),
  ]);
  const blockedSourceRows = (tcgcsvAudit.rows ?? []).filter((row) => row.status !== 'representative_candidate');
  const dbRows = await loadDbRows(blockedSourceRows);

  const rows = blockedSourceRows.map((row) => {
    const matchingDbRows = dbRows.filter((dbRow) => {
      return normalizeNumber(dbRow.number) === normalizeNumber(row.number)
        && normalizeText(dbRow.card_name) === normalizeText(row.card_name);
    });
    const matchingMasterRows = masterIndexRows(masterIndex, row);
    const governance = classifyGovernance(row, matchingDbRows, matchingMasterRows);
    return {
      ...row,
      ...governance,
      db_rows: matchingDbRows,
      master_index_rows: matchingMasterRows,
    };
  });

  const byGovernanceStatus = {};
  for (const row of rows) {
    byGovernanceStatus[row.governance_status] = (byGovernanceStatus[row.governance_status] ?? 0) + 1;
  }

  const report = {
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    target_table: 'card_printings',
    parent_overwrite_allowed: false,
    source_report: TCGCSV_AUDIT_JSON,
    target_rows: rows.length,
    summary: {
      by_governance_status: byGovernanceStatus,
      mutation_safe_now: rows.every((row) => row.mutation_safe_now === true),
    },
    rows,
  };

  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    generated: [OUTPUT_JSON, OUTPUT_MD],
    target_rows: report.target_rows,
    by_governance_status: report.summary.by_governance_status,
    mutation_safe_now: report.summary.mutation_safe_now,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
