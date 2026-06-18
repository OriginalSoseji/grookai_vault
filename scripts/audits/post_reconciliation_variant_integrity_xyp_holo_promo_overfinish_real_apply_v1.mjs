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
const EXPECTED_FINGERPRINT = 'add9ab7fc95bc808f0edca0a3d6b2920f3fc68bd93bd756f103f1be2cf0e164e';
const EXPECTED_DRY_RUN_PROOF = '1f0688e6186042a06d54eaef52e362d828469cfe1bd38e2acefc4a2f85b5cea8';
const APPROVAL_TEXT = 'Approve real POST-REC-VAR-01-XYP-HOLO-PROMO-OVERFINISH-CLEANUP apply only. Fingerprint: add9ab7fc95bc808f0edca0a3d6b2920f3fc68bd93bd756f103f1be2cf0e164e. Scope: 118 unsupported XYP holo-promo overfinish child deletes; finishes normal=59, reverse=59; all targets support only holo in the Master Index and have zero external mapping, vault, or warehouse refs. Dry-run proof: 1f0688e6186042a06d54eaef52e362d828469cfe1bd38e2acefc4a2f85b5cea8 == 1f0688e6186042a06d54eaef52e362d828469cfe1bd38e2acefc4a2f85b5cea8. No parent writes. No migrations. No merges. No quarantine. Holo rows preserved.';

const DRY_RUN_PATH = path.join(
  ROOT,
  'docs',
  'audits',
  'post_reconciliation_variant_integrity_v1',
  'post_rec_var_01_xyp_holo_promo_overfinish_guarded_dry_run_v1.json',
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

function loadTargets() {
  const dryRun = JSON.parse(fs.readFileSync(DRY_RUN_PATH, 'utf8'));
  if (dryRun.package_id !== PACKAGE_ID) {
    throw new Error(`Unexpected dry-run package: ${dryRun.package_id}`);
  }
  if (dryRun.fingerprint !== EXPECTED_FINGERPRINT) {
    throw new Error(`Dry-run fingerprint mismatch: ${dryRun.fingerprint}`);
  }
  if (dryRun.dry_run?.before_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF
    || dryRun.dry_run?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF
    || dryRun.dry_run?.rollback_proof_matches !== true) {
    throw new Error('Dry-run proof mismatch.');
  }
  const targets = dryRun.targets ?? [];
  const fingerprint = sha256(JSON.stringify(targets.map((row) => ({
    card_printing_id: row.card_printing_id,
    printing_gv_id: row.printing_gv_id,
    set_code: row.set_code,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
  }))));
  if (fingerprint !== EXPECTED_FINGERPRINT) {
    throw new Error(`Target fingerprint mismatch: ${fingerprint}`);
  }
  if (targets.length !== 118) {
    throw new Error(`Expected 118 targets, found ${targets.length}`);
  }
  return targets;
}

async function snapshot(client, targetIds) {
  const { rows } = await client.query(`
    select
      count(*)::int as target_children,
      count(distinct cpr.card_print_id)::int as target_parents,
      count(*) filter (where cpr.finish_key = 'normal')::int as normal_targets,
      count(*) filter (where cpr.finish_key = 'reverse')::int as reverse_targets,
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

async function holoProof(client, parentIds) {
  const { rows } = await client.query(`
    select
      cp.id as card_print_id,
      cp.set_code,
      cp.number,
      cp.name,
      count(*) filter (where cpr.finish_key = 'holo')::int as holo_children,
      count(*) filter (where cpr.finish_key in ('normal', 'reverse'))::int as residual_overfinish_children
    from public.card_prints cp
    left join public.card_printings cpr on cpr.card_print_id = cp.id
    where cp.id = any($1::uuid[])
    group by cp.id, cp.set_code, cp.number, cp.name
    order by cp.number_plain nulls last, cp.number, cp.name
  `, [parentIds]);
  return rows;
}

async function applyPackage(client, targets) {
  const targetIds = targets.map((row) => row.card_printing_id);
  const parentIds = [...new Set(targets.map((row) => row.card_print_id))];
  await client.query('begin');
  try {
    const before = await snapshot(client, targetIds);
    if (before.target_children !== 118 || before.target_parents !== 59) {
      throw new Error(`Scope mismatch before apply: ${JSON.stringify(before)}`);
    }
    if (before.normal_targets !== 59 || before.reverse_targets !== 59 || before.forbidden_holo_targets !== 0) {
      throw new Error(`Finish guard mismatch before apply: ${JSON.stringify(before)}`);
    }
    if (before.external_mapping_refs !== 0 || before.vault_refs !== 0 || before.warehouse_refs !== 0) {
      throw new Error(`Dependency guard mismatch before apply: ${JSON.stringify(before)}`);
    }

    const { rowCount } = await client.query(
      'delete from public.card_printings where id = any($1::uuid[])',
      [targetIds],
    );
    if (rowCount !== 118) {
      throw new Error(`Expected 118 deletes, got ${rowCount}`);
    }
    const afterDelete = await snapshot(client, targetIds);
    if (afterDelete.target_children !== 0) {
      throw new Error(`Delete proof failed: ${JSON.stringify(afterDelete)}`);
    }
    const parentProof = await holoProof(client, parentIds);
    const badParents = parentProof.filter((row) => row.holo_children !== 1 || row.residual_overfinish_children !== 0);
    if (badParents.length) {
      throw new Error(`Parent proof failed: ${JSON.stringify(badParents.slice(0, 10))}`);
    }
    await client.query('commit');
    return { before, after_delete: afterDelete, rows_deleted: rowCount, parent_proof: parentProof };
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

function writeReport(targets, applyResult) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const report = {
    version: `${PACKAGE_ID}_REAL_APPLY_V1`,
    generated_at: new Date().toISOString(),
    approval_text: APPROVAL_TEXT,
    db_writes_committed: true,
    migrations_created: false,
    package_id: PACKAGE_ID,
    fingerprint: EXPECTED_FINGERPRINT,
    scope: {
      child_deletes: targets.length,
      parent_rows_affected_by_child_delete: new Set(targets.map((row) => row.card_print_id)).size,
      set_code: 'xyp',
      finishes: countBy(targets, (row) => row.finish_key),
      supported_finish_preserved: 'holo',
    },
    apply_result: applyResult,
    targets,
  };
  const jsonPath = path.join(OUT_DIR, 'post_rec_var_01_xyp_holo_promo_overfinish_real_apply_v1.json');
  const mdPath = path.join(OUT_DIR, 'post_rec_var_01_xyp_holo_promo_overfinish_real_apply_v1.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, `# ${PACKAGE_ID} Real Apply V1

Generated: ${report.generated_at}

## Result

- db_writes_committed: ${report.db_writes_committed}
- migrations_created: ${report.migrations_created}
- child_deletes: ${report.scope.child_deletes}
- affected parents: ${report.scope.parent_rows_affected_by_child_delete}
- finishes: ${JSON.stringify(report.scope.finishes)}
- holo rows preserved: yes

## Proof

- before target hash: \`${report.apply_result.before.hash_sha256}\`
- after delete target hash: \`${report.apply_result.after_delete.hash_sha256}\`
- rows deleted: ${report.apply_result.rows_deleted}
- parents with exactly one holo and zero residual normal/reverse: ${report.apply_result.parent_proof.length}
`);
  return report;
}

async function main() {
  const dbUrl = getDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');
  const targets = loadTargets();
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const applyResult = await applyPackage(client, targets);
    const report = writeReport(targets, applyResult);
    console.log(JSON.stringify({
      package_id: report.package_id,
      fingerprint: report.fingerprint,
      scope: report.scope,
      rows_deleted: report.apply_result.rows_deleted,
      db_writes_committed: report.db_writes_committed,
      migrations_created: report.migrations_created,
      target_children_remaining: report.apply_result.after_delete.target_children,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
