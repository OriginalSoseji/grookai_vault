import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const SNAPSHOT_JSON_GZ = 'docs/audits/verified_master_set_index_v1/source_snapshots/pokemontcg_api_source_snapshot_v1.json.gz';
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich10_pokemontcg_snapshot_rarity_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich10_pokemontcg_snapshot_rarity_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich10_pokemontcg_snapshot_rarity_real_apply_v1.md');

const PACKAGE_ID = 'ENRICH-10-POKEMONTCG-SNAPSHOT-RARITY-BACKFILL';
const EXPECTED_FINGERPRINT = '374dde70fa829a159a61041193445e16b857e50d7aa8ec557115ff983d58ac40';
const EXPECTED_DRY_RUN_PROOF = '07f25c3238ade95521a13ec0c00ac5ae1f2029058dab24565348b1bb2f3b9f1e';
const EXPECTED_TARGET_ROWS = 26;
const APPROVAL_TEXT = 'Approve real ENRICH-10-POKEMONTCG-SNAPSHOT-RARITY-BACKFILL apply only. Fingerprint: 374dde70fa829a159a61041193445e16b857e50d7aa8ec557115ff983d58ac40. Scope: 26 null-only card_prints.rarity updates from preserved PokemonTCG snapshot exact source IDs. Dry-run proof: 07f25c3238ade95521a13ec0c00ac5ae1f2029058dab24565348b1bb2f3b9f1e == 07f25c3238ade95521a13ec0c00ac5ae1f2029058dab24565348b1bb2f3b9f1e. No non-null overwrites. No artist writes. No regulation_mark writes. No variants writes. No child writes. No identity writes. No external mapping writes. No species writes. No deletes. No merges. No migrations. No image writes. No global apply.';

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

function normalizeName(value) {
  return String(value ?? '').normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function normalizeNumber(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^0+([0-9])/, '$1');
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

function loadPokemonTcgSnapshot() {
  const snapshot = JSON.parse(zlib.gunzipSync(fsSync.readFileSync(SNAPSHOT_JSON_GZ)));
  const byId = new Map();
  for (const record of snapshot.records ?? []) {
    if (record.source_key !== 'pokemontcg_api' || record.evidence_type !== 'card_identity') continue;
    const id = String(record.raw_snapshot_ref ?? '').replace(/^pokemontcg_api:/, '');
    if (id && record.rarity) byId.set(id, record);
  }
  return { snapshot, byId };
}

async function loadCandidateParents(client) {
  const result = await client.query(`
    with english as (
      select cp.*
      from public.card_prints cp
      join public.sets s on s.id = cp.set_id
      where s.identity_domain_default like 'pokemon_eng%'
    ),
    gap as (
      select *
      from english
      where rarity is null
        and artist is null
        and regulation_mark is null
        and variants is null
    ),
    mapping as (
      select distinct on (card_print_id) card_print_id, external_id
      from public.external_mappings
      where active = true and source = 'pokemonapi'
      order by card_print_id, synced_at desc nulls last, id desc
    )
    select
      gap.id::text as card_print_id,
      gap.set_code,
      gap.number,
      gap.number_plain,
      gap.name as card_name,
      nullif(trim(both '"' from gap.external_ids->>'pokemonapi'), '') as payload_pokemonapi_id,
      mapping.external_id as mapping_pokemonapi_id
    from gap
    left join mapping on mapping.card_print_id = gap.id
    order by gap.set_code nulls last, gap.number_plain nulls last, gap.number nulls last, gap.name, gap.id
  `);
  return result.rows;
}

function buildTargets(candidateParents, snapshotById) {
  const rows = [];
  for (const parent of candidateParents) {
    const sourceId = parent.mapping_pokemonapi_id ?? parent.payload_pokemonapi_id;
    if (!sourceId) continue;
    const snapshot = snapshotById.get(sourceId);
    if (!snapshot?.rarity) continue;
    if (normalizeName(parent.card_name) !== normalizeName(snapshot.card_name)) continue;
    if (normalizeNumber(parent.number) !== normalizeNumber(snapshot.card_number)) continue;
    rows.push({
      card_print_id: parent.card_print_id,
      set_code: parent.set_code,
      number: parent.number,
      number_plain: parent.number_plain,
      card_name: parent.card_name,
      source_id: sourceId,
      source_url: snapshot.source_url,
      source_set_key: snapshot.set_key,
      source_card_number: snapshot.card_number,
      source_card_name: snapshot.card_name,
      rarity: snapshot.rarity,
      match_method: parent.mapping_pokemonapi_id ? 'active_external_mapping' : 'external_ids_payload',
    });
  }
  return rows;
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid)
     )
     select cp.id::text as card_print_id, cp.set_code, cp.number, cp.number_plain, cp.name as card_name, cp.rarity, cp.artist, cp.regulation_mark, cp.variants
     from target
     join public.card_prints cp on cp.id = target.card_print_id
     order by cp.set_code nulls last, cp.number_plain nulls last, cp.number nulls last, cp.name, cp.id`,
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
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid, rarity text)
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(distinct card_print_id)::int from target) as distinct_target_count,
       (select count(*)::int from target where nullif(rarity, '') is null) as missing_target_rarity_count,
       (select count(*)::int from target left join public.card_prints cp on cp.id = target.card_print_id where cp.id is null) as missing_parent_count,
       (select count(*)::int from target join public.card_prints cp on cp.id = target.card_print_id where cp.rarity is not null) as non_null_rarity_overwrite_count,
       (select count(*)::int from target join public.card_prints cp on cp.id = target.card_print_id where cp.artist is not null or cp.regulation_mark is not null or cp.variants is not null) as non_blank_catalog_metadata_count,
       (select count(*)::int from target join public.card_prints cp on cp.id = target.card_print_id join public.sets s on s.id = cp.set_id where s.identity_domain_default not like 'pokemon_eng%') as non_english_target_count`,
    [JSON.stringify(targets.map((row) => ({ card_print_id: row.card_print_id, rarity: row.rarity })))],
  );
  return {
    ...result.rows[0],
    target_fingerprint_sha256: sha256(stableJson(targets)),
  };
}

function guardPassed(guard, expectedCount) {
  return guard.target_count === expectedCount
    && guard.distinct_target_count === expectedCount
    && guard.missing_target_rarity_count === 0
    && guard.missing_parent_count === 0
    && guard.non_null_rarity_overwrite_count === 0
    && guard.non_blank_catalog_metadata_count === 0
    && guard.non_english_target_count === 0;
}

function validateDryRun(dryRun, packageFingerprint) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_package_id_mismatch');
  if (dryRun.pass !== true) findings.push('dry_run_not_passed');
  if (dryRun.package_fingerprint_sha256 !== packageFingerprint) findings.push('package_fingerprint_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('expected_fingerprint_mismatch');
  if (dryRun.scope?.target_parent_rows !== EXPECTED_TARGET_ROWS) findings.push('target_rows_mismatch');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_before_hash_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_after_hash_mismatch');
  if (dryRun.execution?.dry_run_status !== 'completed_rolled_back_no_durable_change') findings.push('dry_run_status_mismatch');
  if (dryRun.execution?.inside_transaction_proof?.updated_parent_rows !== EXPECTED_TARGET_ROWS) findings.push('dry_run_update_count_mismatch');
  if (dryRun.recommended_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  return findings;
}

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  let applyProof = null;
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const guard = await validateScope(client, targets);
    if (!guardPassed(guard, targets.length)) throw new Error(`preflight guard failed: ${JSON.stringify(guard)}`);

    await client.query(
      `create temporary table enrich10_targets (
         card_print_id uuid primary key,
         rarity text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into enrich10_targets
       select card_print_id, rarity
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid, rarity text)`,
      [JSON.stringify(targets.map((row) => ({ card_print_id: row.card_print_id, rarity: row.rarity })))],
    );

    const updated = await client.query(
      `update public.card_prints cp
       set rarity = target.rarity, updated_at = now()
       from enrich10_targets target
       where cp.id = target.card_print_id
         and cp.rarity is null
         and cp.artist is null
         and cp.regulation_mark is null
         and cp.variants is null
       returning cp.id::text as card_print_id, cp.set_code, cp.number, cp.name as card_name, cp.rarity`,
    );

    const proof = await client.query(
      `select
         (select count(*)::int from enrich10_targets) as target_count,
         (select count(*)::int from enrich10_targets target join public.card_prints cp on cp.id = target.card_print_id where cp.rarity = target.rarity) as matching_rarity_count,
         (select count(*)::int from enrich10_targets target join public.card_prints cp on cp.id = target.card_print_id where cp.artist is not null or cp.regulation_mark is not null or cp.variants is not null) as unexpected_metadata_write_count`,
    );

    applyProof = {
      updated_parent_rows: updated.rowCount,
      updated_samples: updated.rows.slice(0, 25),
      proof: proof.rows[0],
    };

    if (applyProof.updated_parent_rows !== EXPECTED_TARGET_ROWS) throw new Error('updated_parent_row_count_mismatch');
    if (applyProof.proof.matching_rarity_count !== EXPECTED_TARGET_ROWS) throw new Error('matching_rarity_count_mismatch');
    if (applyProof.proof.unexpected_metadata_write_count !== 0) throw new Error('unexpected_metadata_write_count');

    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }

  const afterSnapshot = await captureSnapshot(client, targets);
  return {
    before_snapshot: beforeSnapshot,
    apply_proof: applyProof,
    after_snapshot: afterSnapshot,
  };
}

async function main() {
  const dryRun = await readJson(DRY_RUN_JSON);
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');

  const { snapshot, byId } = loadPokemonTcgSnapshot();
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const candidateParents = await loadCandidateParents(client);
    const targets = buildTargets(candidateParents, byId);
    const packageFingerprint = sha256(stableJson({
      package_id: PACKAGE_ID,
      snapshot_file: SNAPSHOT_JSON_GZ,
      snapshot_generated_at: snapshot.generated_at,
      targets,
    }));

    const dryRunFindings = validateDryRun(dryRun, packageFingerprint);
    if (dryRunFindings.length > 0) throw new Error(`DRY_RUN_VALIDATION_FAILED:${dryRunFindings.join(',')}`);
    if (targets.length !== EXPECTED_TARGET_ROWS) throw new Error(`target_count_drift:${targets.length}`);

    const execution = await applyPackage(client, targets);
    const stopFindings = [];
    if (execution.before_snapshot.rows.some((row) => row.rarity !== null || row.artist !== null || row.regulation_mark !== null || row.variants !== null)) {
      stopFindings.push('before_snapshot_not_null_only');
    }
    if (execution.apply_proof.updated_parent_rows !== EXPECTED_TARGET_ROWS) stopFindings.push('updated_parent_rows_mismatch');
    if (execution.after_snapshot.rows.some((row) => row.rarity === null)) stopFindings.push('after_snapshot_missing_rarity');
    if (execution.after_snapshot.rows.some((row) => row.artist !== null || row.regulation_mark !== null || row.variants !== null)) {
      stopFindings.push('unexpected_metadata_fields_changed');
    }

    const report = {
      version: 'ENRICH10_POKEMONTCG_SNAPSHOT_RARITY_REAL_APPLY_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      approved_text: APPROVAL_TEXT,
      package_fingerprint_sha256: packageFingerprint,
      dry_run_proof: `${EXPECTED_DRY_RUN_PROOF} == ${EXPECTED_DRY_RUN_PROOF}`,
      source_file: DRY_RUN_JSON,
      source_snapshot: {
        file: SNAPSHOT_JSON_GZ,
        generated_at: snapshot.generated_at,
      },
      scope: {
        target_parent_rows: targets.length,
        writes_performed: ['card_prints.rarity null-only updates'],
        durable_db_writes_performed: true,
        non_null_overwrites: false,
        artist_writes: false,
        regulation_mark_writes: false,
        variants_writes: false,
        child_writes: false,
        identity_writes: false,
        external_mapping_writes: false,
        species_writes: false,
        deletes: false,
        merges: false,
        migrations_created: false,
        image_writes: false,
        global_apply: false,
      },
      by_set: countBy(targets, (row) => row.set_code ?? 'missing_set_code'),
      execution,
      stop_findings: stopFindings,
      pass: stopFindings.length === 0,
    };

    await writeJson(OUTPUT_JSON, report);
    const md = [
      '# ENRICH-10 PokemonTCG Snapshot Rarity Real Apply V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Target parent rows: ${targets.length}`,
      `- Updated parent rows: ${execution.apply_proof.updated_parent_rows}`,
      `- Package fingerprint: \`${packageFingerprint}\``,
      `- Dry-run proof: \`${EXPECTED_DRY_RUN_PROOF} == ${EXPECTED_DRY_RUN_PROOF}\``,
      '',
      '## Safety',
      '',
      '- Durable DB writes performed: true',
      '- Writes performed: `card_prints.rarity` null-only updates',
      '- Non-null overwrites: false',
      '- Artist/regulation_mark/variants writes: false',
      '- Child/identity/external mapping/species writes: false',
      '- Deletes/merges: false',
      '- Migrations created: false',
      '- Image writes: false',
      '- Global apply: false',
      '',
      '## By Set',
      '',
      markdownTable(Object.entries(report.by_set).map(([set_code, rows]) => ({ set_code, rows })), [
        { label: 'set_code', value: (row) => row.set_code },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Stop Findings',
      '',
      report.stop_findings.length ? report.stop_findings.map((finding) => `- ${finding}`).join('\n') : '_None._',
      '',
    ].join('\n');
    await writeText(OUTPUT_MD, md);

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      pass: report.pass,
      package_fingerprint_sha256: packageFingerprint,
      updated_parent_rows: execution.apply_proof.updated_parent_rows,
      stop_findings: stopFindings,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
