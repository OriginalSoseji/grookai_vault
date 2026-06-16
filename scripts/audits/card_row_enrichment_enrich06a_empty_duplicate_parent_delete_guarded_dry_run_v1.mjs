import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const INPUT_JSON = path.join(OUTPUT_DIR, 'card_row_enrichment_no_child_parent_adjudication_v1.json');
const INCLUDE_ACTIVE_PRICE_DELETE = process.argv.includes('--include-active-price-delete');
const OUTPUT_JSON = path.join(
  OUTPUT_DIR,
  INCLUDE_ACTIVE_PRICE_DELETE
    ? 'enrich06a2_empty_duplicate_price_parent_delete_guarded_dry_run_v1.json'
    : 'enrich06a_empty_duplicate_parent_delete_guarded_dry_run_v1.json',
);
const OUTPUT_MD = path.join(
  OUTPUT_DIR,
  INCLUDE_ACTIVE_PRICE_DELETE
    ? 'enrich06a2_empty_duplicate_price_parent_delete_guarded_dry_run_v1.md'
    : 'enrich06a_empty_duplicate_parent_delete_guarded_dry_run_v1.md',
);
const PACKAGE_ID = INCLUDE_ACTIVE_PRICE_DELETE
  ? 'ENRICH-06A2-EMPTY-DUPLICATE-PRICE-PARENT-DELETE'
  : 'ENRICH-06A-EMPTY-DUPLICATE-PARENT-DELETE';
const TARGET_CLASSIFICATION = 'empty_duplicate_parent_delete_candidate_needs_owner_proof';

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function buildTargets(adjudication) {
  return (adjudication.rows ?? [])
    .filter((row) => row.adjudication_classification === TARGET_CLASSIFICATION)
    .map((row) => ({
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      number_plain: row.number_plain,
      card_name: row.card_name,
      printed_identity_modifier: row.printed_identity_modifier,
      sibling_owner_count: row.sibling_owner_count,
      sibling_owner_samples: row.sibling_owner_samples,
    }));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid)
     )
     select
       cp.id::text as card_print_id,
       cp.gv_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name as card_name,
       cp.printed_identity_modifier,
       cp.variant_key,
       cp.external_ids
     from target
     join public.card_prints cp on cp.id = target.card_print_id
     order by cp.set_code, cp.number_plain nulls last, cp.number, cp.name, cp.id`,
    [JSON.stringify(targets.map((row) => ({ card_print_id: row.card_print_id })))],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    row_count: result.rows.length,
  };
}

async function validateScope(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         set_code text,
         number text,
         card_name text
       )
     ),
     child as (
       select card_print_id, count(*)::int as row_count
       from public.card_printings
       group by card_print_id
     ),
     owner_proof as (
       select target.card_print_id, count(*)::int as owner_count
       from target
       join public.card_prints owner
         on owner.id <> target.card_print_id
        and owner.set_code is not distinct from target.set_code
        and owner.number is not distinct from target.number
        and lower(owner.name) = lower(target.card_name)
       left join child owner_child on owner_child.card_print_id = owner.id
       where owner.gv_id is not null
          or coalesce(owner_child.row_count, 0) > 0
       group by target.card_print_id
     ),
     deps as (
       select
         target.card_print_id,
         count(distinct cpr.id)::int as child_count,
         count(distinct cpi.id)::int as identity_count,
         count(distinct em.id)::int as mapping_count,
         count(distinct cpt.id)::int as trait_count,
         count(distinct cps.id)::int as species_count,
         count(distinct cap.card_print_id)::int as active_price_count,
         count(distinct cpc.card_print_id)::int as cameo_count,
         count(distinct vii.id) filter (where vii.archived_at is null)::int as vault_instance_count
       from target
       left join public.card_printings cpr on cpr.card_print_id = target.card_print_id
       left join public.card_print_identity cpi on cpi.card_print_id = target.card_print_id
       left join public.external_mappings em on em.card_print_id = target.card_print_id
       left join public.card_print_traits cpt on cpt.card_print_id = target.card_print_id
       left join public.card_print_species cps on cps.card_print_id = target.card_print_id
       left join public.card_print_active_prices cap on cap.card_print_id = target.card_print_id
       left join public.card_print_cameos cpc on cpc.card_print_id = target.card_print_id
       left join public.vault_item_instances vii on vii.card_print_id = target.card_print_id
       group by target.card_print_id
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(distinct card_print_id)::int from target) as distinct_target_count,
       (select count(*)::int from target left join public.card_prints cp on cp.id = target.card_print_id where cp.id is null) as missing_parent_count,
       (select count(*)::int from target left join owner_proof op on op.card_print_id = target.card_print_id where coalesce(op.owner_count, 0) = 0) as missing_owner_proof_count,
       (select coalesce(sum(child_count), 0)::int from deps) as child_dependency_count,
       (select coalesce(sum(identity_count), 0)::int from deps) as identity_dependency_count,
       (select coalesce(sum(mapping_count), 0)::int from deps) as mapping_dependency_count,
       (select coalesce(sum(trait_count), 0)::int from deps) as trait_dependency_count,
       (select coalesce(sum(species_count), 0)::int from deps) as species_dependency_count,
       (select coalesce(sum(active_price_count), 0)::int from deps) as active_price_dependency_count,
       (select coalesce(sum(cameo_count), 0)::int from deps) as cameo_dependency_count,
       (select coalesce(sum(vault_instance_count), 0)::int from deps) as vault_instance_dependency_count`,
    [JSON.stringify(targets.map((row) => ({
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
    })))],
  );
  return {
    ...result.rows[0],
    target_fingerprint_sha256: sha256(stableJson(targets)),
  };
}

function guardPassed(guard, expectedCount) {
  return guard.target_count === expectedCount
    && guard.distinct_target_count === expectedCount
    && guard.missing_parent_count === 0
    && guard.missing_owner_proof_count === 0
    && guard.child_dependency_count === 0
    && guard.identity_dependency_count === 0
    && guard.mapping_dependency_count === 0
    && guard.trait_dependency_count === 0
    && guard.species_dependency_count === 0
    && (INCLUDE_ACTIVE_PRICE_DELETE ? true : guard.active_price_dependency_count === 0)
    && guard.cameo_dependency_count === 0
    && guard.vault_instance_dependency_count === 0;
}

async function runRollbackDryRun(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  let insideProof = null;
  let guard = null;
  let caughtError = null;

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    guard = await validateScope(client, targets);

    if (guardPassed(guard, targets.length)) {
      await client.query(
        `create temporary table enrich06a_targets (
           card_print_id uuid primary key
         ) on commit drop`,
      );
      await client.query(
        `insert into enrich06a_targets
         select card_print_id
         from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid)`,
        [JSON.stringify(targets.map((row) => ({ card_print_id: row.card_print_id })))],
      );

      const deleted = await client.query(
        `delete from public.card_prints cp
         using enrich06a_targets target
         where cp.id = target.card_print_id
         returning cp.id::text as card_print_id, cp.set_code, cp.number, cp.name as card_name`,
      );

      insideProof = {
        active_price_view_rows_accepted_as_derived: guard.active_price_dependency_count,
        deleted_active_price_rows: 0,
        deleted_parent_rows: deleted.rowCount,
        deleted_samples: deleted.rows.slice(0, 25),
      };
    } else {
      insideProof = {
        deleted_parent_rows: 0,
        guard_blocked: true,
        guard,
      };
    }
  } catch (error) {
    caughtError = {
      message: error.message,
      code: error.code ?? null,
      detail: error.detail ?? null,
      constraint: error.constraint ?? null,
    };
  } finally {
    await client.query('rollback');
  }

  const afterRollbackSnapshot = await captureSnapshot(client, targets);
  return {
    before_snapshot: beforeSnapshot,
    guard,
    inside_transaction_proof: insideProof,
    caught_error: caughtError,
    after_rollback_snapshot: afterRollbackSnapshot,
    dry_run_status: caughtError
      ? 'failed_rolled_back_after_error'
      : guard && !guardPassed(guard, targets.length)
        ? 'skipped_guard_blocked_rolled_back_no_durable_change'
        : beforeSnapshot.hash_sha256 === afterRollbackSnapshot.hash_sha256
          ? 'completed_rolled_back_no_durable_change'
          : 'failed_rollback_hash_mismatch',
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for guarded dry-run.');

  const adjudication = await readJson(INPUT_JSON);
  const targets = buildTargets(adjudication);
  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    target_classification: TARGET_CLASSIFICATION,
    targets,
  }));

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const execution = await runRollbackDryRun(client, targets);
    const stopFindings = [];
    if (targets.length === 0) stopFindings.push('no_targets');
    if (!execution.guard) stopFindings.push('missing_guard_result');
    if (execution.guard && !guardPassed(execution.guard, targets.length)) stopFindings.push('guard_blocked');
    if (execution.caught_error) stopFindings.push('transaction_error');
    if (execution.dry_run_status !== 'completed_rolled_back_no_durable_change') stopFindings.push(execution.dry_run_status);
    if (!execution.caught_error && guardPassed(execution.guard, targets.length) && execution.inside_transaction_proof?.deleted_parent_rows !== targets.length) {
      stopFindings.push('deleted_parent_row_count_mismatch');
    }

    const report = {
      version: 'ENRICH06A_EMPTY_DUPLICATE_PARENT_DELETE_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      package_fingerprint_sha256: packageFingerprint,
      source_file: INPUT_JSON,
      scope: {
        target_rows: targets.length,
        target_classification: TARGET_CLASSIFICATION,
        writes_simulated_then_rolled_back: INCLUDE_ACTIVE_PRICE_DELETE
          ? ['card_prints deletes; active price rows are derived view rows only']
          : ['card_prints deletes'],
        durable_db_writes_performed: false,
        migrations_created: false,
        forbidden: INCLUDE_ACTIVE_PRICE_DELETE
          ? ['child deletes', 'identity deletes', 'mapping deletes', 'trait deletes', 'species deletes', 'cameo deletes', 'merges', 'migrations', 'image writes', 'global apply']
          : ['child deletes', 'identity deletes', 'mapping deletes', 'trait deletes', 'species deletes', 'price deletes', 'cameo deletes', 'merges', 'migrations', 'image writes', 'global apply'],
      },
      by_set_top_25: Object.fromEntries(Object.entries(countBy(targets, (row) => row.set_code)).slice(0, 25)),
      execution,
      target_samples: targets.slice(0, 50),
      stop_findings: stopFindings,
      pass: stopFindings.length === 0,
      recommended_approval_text: stopFindings.length === 0
        ? INCLUDE_ACTIVE_PRICE_DELETE
          ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} zero-child empty duplicate parent card_print deletes with sibling owner proof; ${execution.inside_transaction_proof?.active_price_view_rows_accepted_as_derived ?? 0} card_print_active_prices view rows accepted as derived and not directly deleted. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}. No child deletes. No identity deletes. No mapping deletes. No trait/species deletes. No price table deletes. No cameo deletes. No merges. No migrations. No image writes. No global apply.`
          : `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} zero-dependency empty duplicate parent card_print deletes with sibling owner proof. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}. No child deletes. No identity deletes. No mapping deletes. No trait/species deletes. No price/cameo deletes. No merges. No migrations. No image writes. No global apply.`
        : null,
    };

    await writeJson(OUTPUT_JSON, report);

    const guardRows = execution.guard ? Object.entries(execution.guard)
      .filter(([key]) => key.endsWith('_count') || key === 'target_count' || key === 'distinct_target_count')
      .map(([metric, value]) => ({ metric, value })) : [];
    const md = [
      '# ENRICH-06A Empty Duplicate Parent Delete Guarded Dry Run V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Target rows: ${targets.length}`,
      `- Dry-run status: ${execution.dry_run_status}`,
      `- Deleted inside transaction: ${execution.inside_transaction_proof?.deleted_parent_rows ?? 0}`,
      `- Deleted active prices inside transaction: ${execution.inside_transaction_proof?.deleted_active_price_rows ?? 0}`,
      `- Before hash: \`${execution.before_snapshot.hash_sha256}\``,
      `- After rollback hash: \`${execution.after_rollback_snapshot.hash_sha256}\``,
      `- Package fingerprint: \`${packageFingerprint}\``,
      '',
      '## Guard',
      '',
      markdownTable(guardRows, [
        { label: 'metric', value: (row) => row.metric },
        { label: 'value', value: (row) => row.value },
      ]),
      '',
      '## Stop Findings',
      '',
      stopFindings.length ? stopFindings.map((finding) => `- ${finding}`).join('\n') : '_None._',
      '',
      '## Safety',
      '',
      '- Durable DB writes performed: false',
      '- Migrations created: false',
      '- No child, identity, mapping, trait, species, price, cameo, merge, image, or global apply writes were durable.',
      '',
      '## Approval Text',
      '',
      report.recommended_approval_text ? `\`${report.recommended_approval_text}\`` : '_Not available; dry-run did not pass._',
      '',
    ].join('\n');

    await writeText(OUTPUT_MD, md);
    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      pass: report.pass,
      package_fingerprint_sha256: packageFingerprint,
      dry_run_proof: `${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}`,
      recommended_approval_text: report.recommended_approval_text,
      stop_findings: stopFindings,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
