import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const PLAN_JSON = path.join(OUTPUT_DIR, 'image_truth_trainer_kit_representative_route_repair_plan_v1.json');
const PLAN_MD = path.join(OUTPUT_DIR, 'image_truth_trainer_kit_representative_route_repair_plan_v1.md');
const RESULT_JSON = path.join(OUTPUT_DIR, 'image_truth_trainer_kit_representative_route_repair_result_v1.json');
const RESULT_MD = path.join(OUTPUT_DIR, 'image_truth_trainer_kit_representative_route_repair_result_v1.md');
const PACKAGE_ID = 'IMG-TRAINER-KIT-REPRESENTATIVE-ROUTE-REPAIR-V1';
const EXPECTED_PROJECT_REF = 'ycdxbpibncqcchqiihfz';

const TARGETS = [
  ['GV-PK-TK-1', 'GV-PK-TK-tk-sm-r-2'],
  ['GV-PK-TK-3', 'GV-PK-TK-tk-sm-r-2'],
  ['GV-PK-TK-5', 'GV-PK-TK-tk-sm-r-2'],
  ['GV-PK-TK-7', 'GV-PK-TK-tk-sm-r-2'],
  ['GV-PK-TK-8', 'GV-PK-TK-tk-sm-r-2'],
  ['GV-PK-TK-9', 'GV-PK-TK-tk-sm-r-2'],
  ['GV-PK-TK-10', 'GV-PK-TK-tk-sm-r-2'],
  ['GV-PK-TK-12', 'GV-PK-TK-tk-sm-r-2'],
  ['GV-PK-TK-24', 'GV-PK-TK-tk-sm-r-20'],
  ['GV-PK-TK-27', 'GV-PK-TK-tk-sm-r-20'],
  ['GV-PK-TK-28', 'GV-PK-TK-tk-sm-r-20'],
].map(([gvId, referenceGvId]) => ({
  gv_id: gvId,
  reference_gv_id: referenceGvId,
  current_representative_url: `/api/canon/cards/${referenceGvId}/image`,
}));

function parseArgs(argv) {
  const args = { apply: false, fingerprint: null };
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === '--apply') args.apply = true;
    else if (argv[index] === '--fingerprint') args.fingerprint = argv[++index] ?? null;
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return args;
}

function clean(value) {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((out, key) => {
    out[key] = canonicalize(value[key]);
    return out;
  }, {});
}

function proofHash(value) {
  return sha256(JSON.stringify(canonicalize(value)));
}

function requireDbUrl() {
  const value = process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL;
  if (!value) throw new Error('Missing production database URL.');
  return value;
}

async function fetchCard(client, gvId) {
  const result = await client.query(`
    select id::text, gv_id, set_code, number, name, image_source, image_path,
           image_url, image_alt_url, representative_image_url, image_status, image_note
      from public.card_prints where gv_id = $1 limit 1
  `, [gvId]);
  return result.rows[0] ?? null;
}

async function sanity(client, dbUrl) {
  const counts = (await client.query(`
    select (select count(*)::int from public.card_prints) as card_prints,
           (select count(*)::int from public.sets) as sets,
           (select count(*)::int from public.card_print_traits) as card_print_traits
  `)).rows[0];
  const parsed = new URL(dbUrl);
  const dbProject = `${decodeURIComponent(parsed.username)}@${parsed.hostname}`.includes(EXPECTED_PROJECT_REF)
    ? EXPECTED_PROJECT_REF : null;
  const httpProject = clean(process.env.SUPABASE_URL)
    ? new URL(process.env.SUPABASE_URL).hostname.split('.')[0] : null;
  return {
    database_project_ref: dbProject,
    http_project_ref: httpProject,
    project_ref_verified: dbProject === EXPECTED_PROJECT_REF
      && (httpProject == null || httpProject === EXPECTED_PROJECT_REF),
    ...counts,
    invariants_passed: counts.card_prints >= 40_000 && counts.sets >= 150 && counts.card_print_traits >= 5_000,
  };
}

function note(row) {
  return [
    `${PACKAGE_ID}:self_hosted_representative_pointer`,
    `reference_card:${row.reference_gv_id}`,
    'exact_deck_position_image_not_available_in_preserved_source_listing',
  ].join('; ');
}

async function buildPlan() {
  const dbUrl = requireDbUrl();
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const environment = await sanity(client, dbUrl);
    if (!environment.project_ref_verified || !environment.invariants_passed) {
      throw new Error(`environment_mismatch:${JSON.stringify(environment)}`);
    }
    const rows = [];
    for (const target of TARGETS) {
      const [current, reference] = await Promise.all([
        fetchCard(client, target.gv_id),
        fetchCard(client, target.reference_gv_id),
      ]);
      const errors = [];
      if (!current) errors.push('target_not_found');
      if (!reference) errors.push('reference_not_found');
      if (current?.set_code !== 'tk-sm-r' || reference?.set_code !== 'tk-sm-r') errors.push('set_mismatch');
      if (clean(current?.image_path)) errors.push('target_image_path_already_present');
      if (clean(current?.image_url) || clean(current?.image_alt_url)) errors.push('target_external_image_present');
      if (clean(current?.representative_image_url) !== target.current_representative_url) {
        errors.push('current_representative_url_mismatch');
      }
      if (current?.image_status !== 'representative_shared') errors.push('target_status_mismatch');
      if (!clean(reference?.image_path) || reference?.image_source !== 'identity') {
        errors.push('reference_storage_pointer_missing');
      }
      rows.push({
        ...target,
        card_print_id: current?.id ?? null,
        name: current?.name ?? null,
        number: current?.number ?? null,
        reference_image_path: reference?.image_path ?? null,
        reference_image_status: reference?.image_status ?? null,
        proposed_image_source: 'identity',
        proposed_image_path: reference?.image_path ?? null,
        proposed_representative_image_url: null,
        proposed_image_status: 'representative_shared',
        proposed_image_note: note(target),
        validation_errors: errors,
      });
    }
    const errors = rows.flatMap((row) => row.validation_errors.map((error) => `${row.gv_id}:${error}`));
    let rollbackCompleted = false;
    if (!errors.length) {
      await client.query('begin');
      try {
        for (const row of rows) {
          const result = await client.query(`
            update public.card_prints
               set image_source = $2, image_path = $3, representative_image_url = null,
                   image_status = $4, image_note = $5
             where id = $1::uuid and image_path is null and representative_image_url = $6
          `, [row.card_print_id, row.proposed_image_source, row.proposed_image_path,
            row.proposed_image_status, row.proposed_image_note, row.current_representative_url]);
          if (result.rowCount !== 1) throw new Error(`rollback_rowcount:${row.gv_id}`);
        }
      } finally {
        await client.query('rollback');
      }
      rollbackCompleted = true;
    }
    const proof = {
      package_id: PACKAGE_ID,
      rows,
      rollback_completed: rollbackCompleted,
    };
    return {
      generated_at: new Date().toISOString(),
      package_id: PACKAGE_ID,
      mode: 'plan_only',
      environment_sanity: environment,
      row_count: rows.length,
      rows,
      validation_errors: errors,
      rollback_completed: rollbackCompleted,
      ready_for_apply: rows.length === 11 && !errors.length && rollbackCompleted,
      db_writes_performed: false,
      storage_writes_performed: false,
      proof,
      fingerprint: proofHash(proof),
    };
  } finally {
    await client.end();
  }
}

async function applyPlan(plan, fingerprint) {
  if (!plan.ready_for_apply) throw new Error(`plan_not_ready:${plan.validation_errors.join(',')}`);
  if (fingerprint !== plan.fingerprint) throw new Error(`fingerprint_mismatch:expected:${plan.fingerprint}`);
  const client = new Client({ connectionString: requireDbUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  let committed = false;
  try {
    await client.query('begin');
    for (const row of plan.rows) {
      const result = await client.query(`
        update public.card_prints
           set image_source = $2, image_path = $3, representative_image_url = null,
               image_status = $4, image_note = $5
         where id = $1::uuid and image_path is null and representative_image_url = $6
      `, [row.card_print_id, row.proposed_image_source, row.proposed_image_path,
        row.proposed_image_status, row.proposed_image_note, row.current_representative_url]);
      if (result.rowCount !== 1) throw new Error(`apply_rowcount:${row.gv_id}:${result.rowCount}`);
    }
    await client.query('commit');
    committed = true;
    const readback = [];
    for (const row of plan.rows) readback.push(await fetchCard(client, row.gv_id));
    const failures = readback.filter((row) => !clean(row.image_path)
      || clean(row.representative_image_url) || row.image_status !== 'representative_shared');
    if (failures.length) throw new Error(`readback_failed:${failures.map((row) => row.gv_id).join(',')}`);
    const result = {
      generated_at: new Date().toISOString(),
      package_id: PACKAGE_ID,
      mode: 'real_apply',
      fingerprint: plan.fingerprint,
      committed,
      db_updated_rows: readback.length,
      storage_writes_performed: false,
      representative_storage_pointers_written: readback.length,
      relative_representative_urls_cleared: readback.length,
      post_commit_failures: failures.length,
      readback,
    };
    result.proof_hash = proofHash({
      package_id: result.package_id,
      fingerprint: result.fingerprint,
      committed: result.committed,
      db_updated_rows: result.db_updated_rows,
      representative_storage_pointers_written: result.representative_storage_pointers_written,
      relative_representative_urls_cleared: result.relative_representative_urls_cleared,
      post_commit_failures: result.post_commit_failures,
    });
    return result;
  } catch (error) {
    if (!committed) try { await client.query('rollback'); } catch {}
    throw error;
  } finally {
    await client.end();
  }
}

function markdown(report) {
  return `# ${PACKAGE_ID}

- Generated: ${report.generated_at}
- Mode: ${report.mode}
- Fingerprint: \`${report.fingerprint}\`
- Rows: ${report.row_count ?? report.db_updated_rows}
- Ready/committed: ${report.ready_for_apply ?? report.committed}
- Rollback rehearsal: ${report.rollback_completed ?? 'completed in plan'}
- Storage writes: ${report.storage_writes_performed}
- Post-commit failures: ${report.post_commit_failures ?? 0}
- Proof hash: \`${report.proof_hash ?? '-'}\`

The repair replaces unsupported relative representative URLs with the existing self-hosted storage path from the matching same-set energy card. The rows remain labeled \`representative_shared\` because the exact deck-position scans are unavailable.
`;
}

async function main() {
  const args = parseArgs(process.argv);
  const plan = await buildPlan();
  await fs.writeFile(PLAN_JSON, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  await fs.writeFile(PLAN_MD, markdown(plan), 'utf8');
  if (!args.apply) {
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      row_count: plan.row_count,
      ready_for_apply: plan.ready_for_apply,
      validation_errors: plan.validation_errors,
      fingerprint: plan.fingerprint,
    }, null, 2));
    return;
  }
  const result = await applyPlan(plan, args.fingerprint);
  await fs.writeFile(RESULT_JSON, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await fs.writeFile(RESULT_MD, markdown(result), 'utf8');
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    committed: result.committed,
    db_updated_rows: result.db_updated_rows,
    post_commit_failures: result.post_commit_failures,
    proof_hash: result.proof_hash,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
