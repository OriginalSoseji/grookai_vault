import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const { Client } = pg;
const ROOT = process.cwd();
const PACKAGE_ID = 'POST-REC-VAR-01-XYP-HOLO-PROMO-OVERFINISH-CLEANUP';
const AUDIT_PATH = path.join(
  ROOT,
  'docs',
  'audits',
  'post_reconciliation_variant_integrity_v1',
  'post_reconciliation_variant_integrity_audit_v1.json',
);
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'post_reconciliation_variant_integrity_v1');

function getDbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function countBy(rows, getter) {
  const counts = {};
  for (const row of rows) {
    const key = getter(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function markdownTable(rows, columns) {
  if (!rows.length) return 'None.';
  const header = `| ${columns.map((column) => column.label).join(' |')} |`;
  const sep = `| ${columns.map(() => '---').join(' |')} |`;
  const body = rows.map((row) => `| ${columns.map((column) => {
    const raw = column.value(row);
    return String(raw ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  }).join(' |')} |`);
  return [header, sep, ...body].join('\n');
}

function loadTargets() {
  const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
  const rows = (audit.guarded_delete_candidates_no_dependencies ?? [])
    .filter((row) => row.set_code === 'xyp')
    .filter((row) => ['normal', 'reverse'].includes(row.finish_key))
    .filter((row) => Array.isArray(row.master_supported_finishes)
      && row.master_supported_finishes.length === 1
      && row.master_supported_finishes[0] === 'holo')
    .filter((row) => row.external_printing_mapping_refs === 0
      && row.vault_item_instance_refs === 0
      && row.warehouse_candidate_refs === 0)
    .sort((a, b) => String(a.card_number).localeCompare(String(b.card_number), undefined, { numeric: true })
      || String(a.finish_key).localeCompare(String(b.finish_key))
      || String(a.card_printing_id).localeCompare(String(b.card_printing_id)));
  return rows;
}

async function snapshot(client, targetIds) {
  const { rows } = await client.query(`
    select
      count(*)::int as target_children,
      count(distinct cpr.card_print_id)::int as target_parents,
      count(*) filter (where cpr.finish_key in ('normal', 'reverse'))::int as target_overfinish_children,
      count(*) filter (where cpr.finish_key = 'holo')::int as forbidden_holo_targets,
      coalesce(sum((select count(*) from public.external_printing_mappings e where e.card_printing_id = cpr.id)), 0)::int as external_mapping_refs,
      coalesce(sum((select count(*) from public.vault_item_instances v where v.card_printing_id = cpr.id)), 0)::int as vault_refs,
      coalesce(sum((select count(*) from public.canon_warehouse_candidates w where w.promoted_card_printing_id = cpr.id)), 0)::int as warehouse_refs
    from public.card_printings cpr
    where cpr.id = any($1::uuid[])
  `, [targetIds]);
  const row = rows[0];
  return {
    ...row,
    hash_sha256: sha256(JSON.stringify(row)),
  };
}

async function dryRun(client, targets) {
  const targetIds = targets.map((row) => row.card_printing_id);
  await client.query('begin');
  try {
    const before = await snapshot(client, targetIds);
    if (before.target_children !== targets.length) {
      throw new Error(`Target row mismatch: expected ${targets.length}, found ${before.target_children}`);
    }
    if (before.forbidden_holo_targets !== 0) {
      throw new Error('Guard failed: package target includes holo rows.');
    }
    if (before.external_mapping_refs !== 0 || before.vault_refs !== 0 || before.warehouse_refs !== 0) {
      throw new Error('Guard failed: package target has dependency references.');
    }

    const { rowCount } = await client.query(
      'delete from public.card_printings where id = any($1::uuid[])',
      [targetIds],
    );
    const afterDelete = await snapshot(client, targetIds);
    await client.query('rollback');
    const afterRollback = await snapshot(client, targetIds);

    return {
      before_snapshot: before,
      rows_deleted_in_rollback_transaction: rowCount,
      after_delete_snapshot: afterDelete,
      after_rollback_snapshot: afterRollback,
      rollback_proof_matches: before.hash_sha256 === afterRollback.hash_sha256,
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

function writeReport(targets, dryRunResult) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const packageFingerprint = sha256(JSON.stringify(targets.map((row) => ({
    card_printing_id: row.card_printing_id,
    printing_gv_id: row.printing_gv_id,
    set_code: row.set_code,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
  }))));
  const report = {
    version: `${PACKAGE_ID}_GUARDED_DRY_RUN_V1`,
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_committed: false,
    migrations_created: false,
    package_id: PACKAGE_ID,
    fingerprint: packageFingerprint,
    scope: {
      child_delete_targets: targets.length,
      parent_rows_affected_by_child_delete: new Set(targets.map((row) => row.card_print_id)).size,
      set_code: 'xyp',
      target_finishes: countBy(targets, (row) => row.finish_key),
      supported_finish_required: 'holo',
    },
    dry_run: dryRunResult,
    targets,
    approval_text: `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} unsupported XYP holo-promo overfinish child deletes; finishes ${Object.entries(countBy(targets, (row) => row.finish_key)).map(([finish, count]) => `${finish}=${count}`).join(', ')}; all targets support only holo in the Master Index and have zero external mapping, vault, or warehouse refs. Dry-run proof: ${dryRunResult.before_snapshot.hash_sha256} == ${dryRunResult.after_rollback_snapshot.hash_sha256}. No parent writes. No migrations. No merges. No quarantine. Holo rows preserved.`,
  };

  const jsonPath = path.join(OUT_DIR, 'post_rec_var_01_xyp_holo_promo_overfinish_guarded_dry_run_v1.json');
  const mdPath = path.join(OUT_DIR, 'post_rec_var_01_xyp_holo_promo_overfinish_guarded_dry_run_v1.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, `# ${PACKAGE_ID} Guarded Dry Run V1

Generated: ${report.generated_at}

## Safety

- db_writes_committed: ${report.db_writes_committed}
- migrations_created: ${report.migrations_created}
- dry_run_rolled_back: ${report.dry_run.rollback_proof_matches}

## Scope

${markdownTable(Object.entries(report.scope).map(([metric, value]) => ({ metric, value: typeof value === 'object' ? JSON.stringify(value) : value })), [
  { label: 'metric', value: (row) => row.metric },
  { label: 'value', value: (row) => row.value },
])}

## Dry-Run Proof

- before: \`${report.dry_run.before_snapshot.hash_sha256}\`
- after rollback: \`${report.dry_run.after_rollback_snapshot.hash_sha256}\`
- proof matches: ${report.dry_run.rollback_proof_matches}
- rows deleted inside rollback transaction: ${report.dry_run.rows_deleted_in_rollback_transaction}

## Target Sample

${markdownTable(targets.slice(0, 60), [
  { label: 'set', value: (row) => row.set_code },
  { label: 'number', value: (row) => row.card_number },
  { label: 'name', value: (row) => row.card_name },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'supported', value: (row) => row.master_supported_finishes.join(', ') },
  { label: 'child_id', value: (row) => row.card_printing_id },
])}

## Approval Text

\`\`\`text
${report.approval_text}
\`\`\`
`);
  return report;
}

async function main() {
  const dbUrl = getDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for guarded dry-run.');
  const targets = loadTargets();
  if (!targets.length) throw new Error('No targets found. Run the variant integrity audit first.');
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const dryRunResult = await dryRun(client, targets);
    const report = writeReport(targets, dryRunResult);
    console.log(JSON.stringify({
      package_id: report.package_id,
      fingerprint: report.fingerprint,
      scope: report.scope,
      rollback_proof_matches: report.dry_run.rollback_proof_matches,
      dry_run_proof: `${report.dry_run.before_snapshot.hash_sha256} == ${report.dry_run.after_rollback_snapshot.hash_sha256}`,
      approval_text: report.approval_text,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
