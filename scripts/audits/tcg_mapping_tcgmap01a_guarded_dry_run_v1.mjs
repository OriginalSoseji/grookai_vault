import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/tcg_mapping_v1';
const READINESS_JSON = path.join(OUTPUT_DIR, 'tcg_mapping_tcgdex_tcgplayer_readiness_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'tcgmap01a_tcgdex_tcgplayer_mapping_insert_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'tcgmap01a_tcgdex_tcgplayer_mapping_insert_guarded_dry_run_v1.md');
const PACKAGE_ID = 'TCGMAP-01A-TCGDEX-TCGPLAYER-MAPPING-INSERTS';

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

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function buildTargets(readiness) {
  return (readiness.ready_rows ?? []).map((row) => ({
    card_print_id: row.card_print_id,
    source: 'tcgplayer',
    external_id: String(row.tcgplayer_external_id),
    tcgdex_external_id: row.tcgdex_external_id,
    set_code: row.set_code,
    number: row.number,
    name: row.name,
    meta: row.meta ?? {
      derived_from: 'tcgdex_pricing_productId',
      tcgdex_external_id: row.tcgdex_external_id,
      validated_variant_paths: row.validated_variant_paths ?? [],
      promoted_by: 'tcg_mapping_tcgmap01a_guarded_dry_run_v1',
    },
  }));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid, external_id text)
     ),
     scoped as (
       select em.*
       from public.external_mappings em
       join target t
         on em.card_print_id = t.card_print_id
         or (em.source = 'tcgplayer' and em.external_id = t.external_id)
       where em.source = 'tcgplayer'
     )
     select
       id::text,
       card_print_id::text,
       source,
       external_id,
       active,
       synced_at,
       meta
     from scoped
     order by source, external_id, card_print_id, id`,
    [JSON.stringify(targets)],
  );

  const countResult = await client.query(
    `select
       count(*)::int as active_tcgplayer_rows,
       count(distinct card_print_id)::int as active_tcgplayer_card_prints,
       count(distinct external_id)::int as active_tcgplayer_external_ids
     from public.external_mappings
     where source = 'tcgplayer'
       and active = true`,
  );

  return {
    captured_at: new Date().toISOString(),
    scoped_rows: result.rows,
    scoped_hash_sha256: sha256(stableJson(result.rows)),
    global_counts: countResult.rows[0],
    global_hash_sha256: sha256(stableJson(countResult.rows[0])),
  };
}

async function validateScope(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         source text,
         external_id text,
         tcgdex_external_id text,
         set_code text,
         number text,
         name text,
         meta jsonb
       )
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(distinct card_print_id)::int from target) as distinct_card_print_count,
       (select count(distinct external_id)::int from target) as distinct_external_id_count,
       (select count(*)::int from target where source <> 'tcgplayer') as non_tcgplayer_source_count,
       (select count(*)::int from target where nullif(external_id, '') is null) as missing_external_id_count,
       (select count(*)::int from target left join public.card_prints cp on cp.id = target.card_print_id where cp.id is null) as missing_parent_count,
       (select count(*)::int
        from target
        join public.external_mappings em
          on em.source = 'tcgplayer'
         and em.active = true
         and em.card_print_id = target.card_print_id) as active_card_mapping_collision_count,
       (select count(*)::int
        from target
        join public.external_mappings em
          on em.source = 'tcgplayer'
         and em.external_id = target.external_id) as external_id_collision_count,
       (select count(*)::int from (
          select card_print_id
          from target
          group by card_print_id
          having count(*) > 1
        ) duplicate_cards) as batch_duplicate_card_print_count,
       (select count(*)::int from (
          select external_id
          from target
          group by external_id
          having count(*) > 1
        ) duplicate_external_ids) as batch_duplicate_external_id_count`,
    [JSON.stringify(targets)],
  );

  return {
    ...result.rows[0],
    target_fingerprint_sha256: sha256(stableJson(targets)),
  };
}

function guardPassed(guard, expectedTargetRows) {
  return guard.target_count === expectedTargetRows
    && guard.distinct_card_print_count === expectedTargetRows
    && guard.distinct_external_id_count === expectedTargetRows
    && guard.non_tcgplayer_source_count === 0
    && guard.missing_external_id_count === 0
    && guard.missing_parent_count === 0
    && guard.active_card_mapping_collision_count === 0
    && guard.external_id_collision_count === 0
    && guard.batch_duplicate_card_print_count === 0
    && guard.batch_duplicate_external_id_count === 0;
}

async function runRollbackDryRun(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  let guard = null;
  let insideProof = null;

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '180s'");
    await client.query(
      `create temporary table tcgmap01a_targets (
         card_print_id uuid primary key,
         source text not null,
         external_id text not null unique,
         tcgdex_external_id text not null,
         set_code text,
         number text,
         name text,
         meta jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into tcgmap01a_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         source text,
         external_id text,
         tcgdex_external_id text,
         set_code text,
         number text,
         name text,
         meta jsonb
       )`,
      [JSON.stringify(targets)],
    );

    guard = await validateScope(client, targets);
    if (!guardPassed(guard, targets.length)) {
      throw new Error('Guard validation failed before dry-run insert.');
    }

    const insertResult = await client.query(
      `insert into public.external_mappings (
         card_print_id,
         source,
         external_id,
         active,
         synced_at,
         meta
       )
       select
         card_print_id,
         source,
         external_id,
         true,
         now(),
         meta || jsonb_build_object(
           'backfill_package', $1::text,
           'dry_run_readiness_fingerprint', $2::text
         )
       from tcgmap01a_targets`,
      [PACKAGE_ID, guard.target_fingerprint_sha256],
    );

    const verification = await client.query(
      `with target as (
         select * from tcgmap01a_targets
       )
       select
         (select count(*)::int
          from public.external_mappings em
          join target t
            on t.card_print_id = em.card_print_id
           and t.external_id = em.external_id
          where em.source = 'tcgplayer'
            and em.active = true) as inserted_active_rows,
         (select count(*)::int
          from (
            select em.external_id
            from public.external_mappings em
            where em.source = 'tcgplayer'
              and em.active = true
            group by em.external_id
            having count(distinct em.card_print_id) > 1
          ) s) as active_external_id_collision_groups,
         (select count(*)::int
          from (
            select em.card_print_id
            from public.external_mappings em
            where em.source = 'tcgplayer'
              and em.active = true
            group by em.card_print_id
            having count(*) > 1
          ) s) as active_card_print_multi_mapping_groups`,
    );

    insideProof = {
      inserted_rows: insertResult.rowCount,
      ...verification.rows[0],
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  }

  await client.query('rollback');
  const afterRollbackSnapshot = await captureSnapshot(client, targets);

  return {
    before_snapshot: beforeSnapshot,
    guard,
    inside_transaction_proof: insideProof,
    after_rollback_snapshot: afterRollbackSnapshot,
    dry_run_status:
      beforeSnapshot.scoped_hash_sha256 === afterRollbackSnapshot.scoped_hash_sha256
      && beforeSnapshot.global_hash_sha256 === afterRollbackSnapshot.global_hash_sha256
        ? 'completed_rolled_back_no_durable_change'
        : 'rollback_snapshot_mismatch',
  };
}

function buildMarkdown(report) {
  const lines = [];
  lines.push(`# ${report.package_id}`);
  lines.push('');
  lines.push('Guarded rollback-only dry-run for TCGdex-derived TCGplayer external mappings.');
  lines.push('');
  lines.push('## Result');
  lines.push('');
  lines.push(`- pass: ${report.pass}`);
  lines.push(`- readiness_fingerprint: \`${report.readiness_fingerprint_sha256}\``);
  lines.push(`- target_fingerprint: \`${report.target_fingerprint_sha256}\``);
  lines.push(`- dry_run_proof: \`${report.execution.before_snapshot.scoped_hash_sha256}\` == \`${report.execution.after_rollback_snapshot.scoped_hash_sha256}\``);
  lines.push(`- target rows: ${report.target_rows}`);
  lines.push(`- inserted inside transaction: ${report.execution.inside_transaction_proof?.inserted_rows ?? 0}`);
  lines.push('');
  lines.push('## Guardrails');
  lines.push('');
  lines.push('- db_writes_performed: false');
  lines.push('- migrations_created: false');
  lines.push('- cleanup_performed: false');
  lines.push('- image_writes_performed: false');
  lines.push('- rollback_only: true');
  lines.push('');
  lines.push('## Scope Sample');
  lines.push('');
  lines.push(markdownTable(report.sample_rows, [
    { label: 'set', value: (row) => row.set_code },
    { label: 'number', value: (row) => row.number },
    { label: 'name', value: (row) => row.name },
    { label: 'card_print_id', value: (row) => `\`${row.card_print_id}\`` },
    { label: 'tcgplayer', value: (row) => `\`${row.external_id}\`` },
  ]));
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) {
    throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for guarded dry-run.');
  }

  const readiness = await readJson(READINESS_JSON);
  const targets = buildTargets(readiness);
  if (targets.length === 0) {
    throw new Error('No ready rows found in TCG mapping readiness report.');
  }

  const expectedTargetRows = readiness?.totals?.ready_to_insert;
  if (targets.length !== expectedTargetRows) {
    throw new Error(`Ready row count mismatch: targets=${targets.length}, readiness=${expectedTargetRows}`);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    application_name: 'tcgmap01a_guarded_dry_run',
  });

  await client.connect();
  try {
    const execution = await runRollbackDryRun(client, targets);
    const pass = execution.dry_run_status === 'completed_rolled_back_no_durable_change'
      && execution.inside_transaction_proof?.inserted_rows === targets.length
      && execution.inside_transaction_proof?.inserted_active_rows === targets.length
      && execution.inside_transaction_proof?.active_external_id_collision_groups === 0;

    const report = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      pass,
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      image_writes_performed: false,
      rollback_only: true,
      readiness_report: READINESS_JSON,
      readiness_fingerprint_sha256: readiness.fingerprint_sha256,
      target_rows: targets.length,
      target_fingerprint_sha256: sha256(stableJson(targets)),
      execution,
      sample_rows: targets.slice(0, 25),
    };

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, buildMarkdown(report));

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      package_id: PACKAGE_ID,
      pass,
      target_rows: targets.length,
      target_fingerprint_sha256: report.target_fingerprint_sha256,
      dry_run_proof: `${execution.before_snapshot.scoped_hash_sha256} == ${execution.after_rollback_snapshot.scoped_hash_sha256}`,
      inserted_inside_transaction: execution.inside_transaction_proof?.inserted_rows ?? 0,
      db_writes_performed: false,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[tcgmap01a-dry-run] failed:', error);
  process.exit(1);
});
