import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = path.join('docs', 'audits', 'image_truth_v1');
const PLAN_JSON = path.join(OUTPUT_DIR, 'image_truth_jungle_edition_representative_image_apply_plan_v1.json');
const PLAN_MD = path.join(OUTPUT_DIR, 'image_truth_jungle_edition_representative_image_apply_plan_v1.md');
const RESULT_JSON = path.join(OUTPUT_DIR, 'image_truth_jungle_edition_representative_image_apply_result_v1.json');
const RESULT_MD = path.join(OUTPUT_DIR, 'image_truth_jungle_edition_representative_image_apply_result_v1.md');

const PACKAGE_ID = 'IMG-JUNGLE-EDITION-REPRESENTATIVE-IMAGE-APPLY-V1';
const EXPECTED_PROJECT_REF = 'ycdxbpibncqcchqiihfz';
const EXPECTED_TARGET_ROWS = 128;
const EXPECTED_SOURCE_ROWS = 64;
const ALLOWED_MODIFIERS = new Set(['edition:first_edition', 'edition:unlimited']);
const ALLOWED_COLUMNS = [
  'image_source',
  'representative_image_url',
  'image_status',
  'image_note',
];

function parseArgs(argv) {
  const args = { apply: false, fingerprint: null };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--fingerprint') args.fingerprint = argv[++index] ?? null;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function requireDbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort((left, right) => left.localeCompare(right)).reduce((output, key) => {
    output[key] = canonicalize(value[key]);
    return output;
  }, {});
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function proofHash(value) {
  return sha256(JSON.stringify(canonicalize(value)));
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function sourceRoute(gvId) {
  return `/api/canon/cards/${encodeURIComponent(gvId)}/image`;
}

function editionLabel(modifier) {
  return modifier === 'edition:first_edition' ? 'First Edition' : 'Unlimited';
}

function buildNote(target, source) {
  return `Identity is confirmed for Jungle ${editionLabel(target.printed_identity_modifier)}. `
    + `Displayed image is representative standard Jungle artwork from ${source.source_gv_id}; `
    + 'the exact edition visual remains pending.';
}

async function fetchEnvironmentSanity(client) {
  const result = await client.query(`
    select
      (select count(*)::int from public.card_prints) as card_prints,
      (select count(*)::int from public.sets) as sets,
      (select count(*)::int from public.card_print_traits) as card_print_traits
  `);
  const counts = result.rows[0];
  let projectRef = null;
  if (clean(process.env.SUPABASE_URL)) {
    projectRef = new URL(process.env.SUPABASE_URL).hostname.split('.')[0];
  }
  return {
    project_ref: projectRef,
    expected_project_ref: EXPECTED_PROJECT_REF,
    project_ref_verified: projectRef === EXPECTED_PROJECT_REF,
    card_prints: counts.card_prints,
    sets: counts.sets,
    card_print_traits: counts.card_print_traits,
    invariants_passed: Number(counts.card_prints) >= 40_000
      && Number(counts.sets) >= 150
      && Number(counts.card_print_traits) >= 5_000,
  };
}

async function fetchCandidates(client) {
  const result = await client.query(`
    select
      target.id::text as target_id,
      target.gv_id as target_gv_id,
      target.name,
      target.number,
      target.number_plain,
      target.set_code,
      target.variant_key,
      target.printed_identity_modifier,
      target.image_source as target_image_source,
      target.image_path as target_image_path,
      target.image_url as target_image_url,
      target.image_alt_url as target_image_alt_url,
      target.representative_image_url as target_representative_image_url,
      target.image_status as target_image_status,
      target.image_note as target_image_note,
      exists (
        select 1
        from public.card_printings child
        where child.card_print_id = target.id
          and coalesce(
            nullif(trim(child.image_path), ''),
            nullif(trim(child.image_url), ''),
            nullif(trim(child.image_alt_url), '')
          ) is not null
      ) as target_has_child_image,
      source.id::text as source_id,
      source.gv_id as source_gv_id,
      source.image_source as source_image_source,
      source.image_path as source_image_path,
      source.image_url as source_image_url,
      source.image_alt_url as source_image_alt_url,
      source.representative_image_url as source_representative_image_url,
      source.image_status as source_image_status
    from public.card_prints target
    join public.card_prints source
      on source.set_code = target.set_code
     and source.number = target.number
     and source.name = target.name
     and nullif(trim(source.printed_identity_modifier), '') is null
     and source.gv_id ~ '^GV-PK-JU-[0-9]+$'
    where target.set_code = 'base2'
      and target.gv_id ~ '^GV-PK-JU-[0-9]+-(FIRST-EDITION|UNLIMITED)$'
      and target.printed_identity_modifier in ('edition:first_edition', 'edition:unlimited')
    order by target.number_plain, target.number, target.printed_identity_modifier, target.gv_id
  `);
  return result.rows;
}

function validateCandidates(rows, environment) {
  const stopFindings = [];
  if (!environment.project_ref_verified) {
    stopFindings.push(`project_ref_mismatch:${environment.project_ref ?? 'missing'}`);
  }
  if (!environment.invariants_passed) stopFindings.push('canonical_environment_invariants_failed');
  if (rows.length !== EXPECTED_TARGET_ROWS) stopFindings.push(`unexpected_target_count:${rows.length}`);

  const targetIds = new Set();
  const sourceIds = new Set();
  const targetsPerSource = new Map();
  const updates = [];

  for (const row of rows) {
    if (targetIds.has(row.target_id)) stopFindings.push(`duplicate_target:${row.target_id}`);
    targetIds.add(row.target_id);
    sourceIds.add(row.source_id);
    targetsPerSource.set(row.source_id, (targetsPerSource.get(row.source_id) ?? 0) + 1);

    if (row.set_code !== 'base2') stopFindings.push(`target_set_mismatch:${row.target_id}`);
    if (!ALLOWED_MODIFIERS.has(row.printed_identity_modifier)) {
      stopFindings.push(`target_modifier_mismatch:${row.target_id}:${row.printed_identity_modifier}`);
    }
    if (clean(row.target_image_source)) stopFindings.push(`target_image_source_present:${row.target_id}`);
    if (clean(row.target_image_path)) stopFindings.push(`target_exact_path_present:${row.target_id}`);
    if (clean(row.target_image_url)) stopFindings.push(`target_exact_url_present:${row.target_id}`);
    if (clean(row.target_image_alt_url)) stopFindings.push(`target_alt_url_present:${row.target_id}`);
    if (clean(row.target_representative_image_url)) stopFindings.push(`target_representative_present:${row.target_id}`);
    if (clean(row.target_image_status) !== 'missing') {
      stopFindings.push(`target_status_not_missing:${row.target_id}:${row.target_image_status}`);
    }
    if (row.target_has_child_image) stopFindings.push(`target_child_image_present:${row.target_id}`);

    if (row.source_image_source !== 'identity') stopFindings.push(`source_not_identity:${row.source_id}`);
    if (!clean(row.source_image_path)?.startsWith('warehouse-derived/self-hosted-images-v1/card_prints/base2/')) {
      stopFindings.push(`source_path_not_self_hosted:${row.source_id}`);
    }
    if (row.source_image_status !== 'exact') stopFindings.push(`source_status_not_exact:${row.source_id}`);
    if (!clean(row.source_image_url)?.startsWith('https://assets.tcgdex.net/en/base/base2/')) {
      stopFindings.push(`source_url_not_tcgdex_base2:${row.source_id}`);
    }

    updates.push({
      target_id: row.target_id,
      target_gv_id: row.target_gv_id,
      source_id: row.source_id,
      source_gv_id: row.source_gv_id,
      set_code: row.set_code,
      number: row.number,
      name: row.name,
      printed_identity_modifier: row.printed_identity_modifier,
      source_image_url: row.source_image_url,
      representative_image_url: sourceRoute(row.source_gv_id),
      image_source: 'identity',
      image_status: 'representative_shared',
      image_note: buildNote(row, row),
      original: {
        image_source: clean(row.target_image_source),
        image_path: clean(row.target_image_path),
        image_url: clean(row.target_image_url),
        image_alt_url: clean(row.target_image_alt_url),
        representative_image_url: clean(row.target_representative_image_url),
        image_status: clean(row.target_image_status),
        image_note: clean(row.target_image_note),
      },
    });
  }

  if (sourceIds.size !== EXPECTED_SOURCE_ROWS) stopFindings.push(`unexpected_source_count:${sourceIds.size}`);
  for (const [sourceId, count] of targetsPerSource) {
    if (count !== 2) stopFindings.push(`unexpected_targets_per_source:${sourceId}:${count}`);
  }

  return {
    updates,
    stop_findings: [...new Set(stopFindings)].slice(0, 250),
    target_rows: targetIds.size,
    source_rows: sourceIds.size,
  };
}

function fingerprintFor(updates) {
  return proofHash({
    package_id: PACKAGE_ID,
    allowed_columns: ALLOWED_COLUMNS,
    updates: updates.map((row) => ({
      target_id: row.target_id,
      target_gv_id: row.target_gv_id,
      source_id: row.source_id,
      source_gv_id: row.source_gv_id,
      source_image_url: row.source_image_url,
      representative_image_url: row.representative_image_url,
      image_source: row.image_source,
      image_status: row.image_status,
      image_note: row.image_note,
      original: row.original,
    })),
  });
}

async function updateRows(client, updates) {
  const valuesSql = updates.map((_, index) => {
    const offset = index * 5;
    return `($${offset + 1}::uuid,$${offset + 2}::text,$${offset + 3}::text,$${offset + 4}::text,$${offset + 5}::text)`;
  }).join(',');
  const values = updates.flatMap((row) => [
    row.target_id,
    row.image_source,
    row.representative_image_url,
    row.image_status,
    row.image_note,
  ]);
  const result = await client.query(`
    with updates(id,image_source,representative_image_url,image_status,image_note) as (
      values ${valuesSql}
    )
    update public.card_prints target
       set image_source = updates.image_source,
           representative_image_url = updates.representative_image_url,
           image_status = updates.image_status,
           image_note = updates.image_note
      from updates
     where target.id = updates.id
    returning target.id::text
  `, values);
  return result.rowCount;
}

async function fetchTargetState(client, ids) {
  const result = await client.query(`
    select id::text,image_source,image_path,image_url,image_alt_url,
           representative_image_url,image_status,image_note
      from public.card_prints
     where id = any($1::uuid[])
  `, [ids]);
  return new Map(result.rows.map((row) => [row.id, row]));
}

function validateAppliedState(updates, state) {
  const findings = [];
  for (const row of updates) {
    const current = state.get(row.target_id);
    if (!current) {
      findings.push(`missing_target:${row.target_id}`);
      continue;
    }
    for (const column of ALLOWED_COLUMNS) {
      if (clean(current[column]) !== clean(row[column])) findings.push(`applied_mismatch:${row.target_id}:${column}`);
    }
    for (const column of ['image_path', 'image_url', 'image_alt_url']) {
      if (clean(current[column]) !== row.original[column]) findings.push(`exact_field_changed:${row.target_id}:${column}`);
    }
  }
  return findings;
}

function validateRolledBackState(updates, state) {
  const findings = [];
  for (const row of updates) {
    const current = state.get(row.target_id);
    if (!current) {
      findings.push(`missing_target_after_rollback:${row.target_id}`);
      continue;
    }
    for (const column of [...ALLOWED_COLUMNS, 'image_path', 'image_url', 'image_alt_url']) {
      if (clean(current[column]) !== row.original[column]) findings.push(`rollback_mismatch:${row.target_id}:${column}`);
    }
  }
  return findings;
}

async function countTextOnlyPokemon(client) {
  const result = await client.query(`
    select count(*)::int as count
      from public.card_prints parent
     where parent.gv_id like 'GV-PK-%'
       and coalesce(
         nullif(trim(parent.image_path), ''),
         nullif(trim(parent.image_url), ''),
         nullif(trim(parent.image_alt_url), ''),
         nullif(trim(parent.representative_image_url), '')
       ) is null
       and not exists (
         select 1
           from public.card_printings child
          where child.card_print_id = parent.id
            and coalesce(
              nullif(trim(child.image_path), ''),
              nullif(trim(child.image_url), ''),
              nullif(trim(child.image_alt_url), '')
            ) is not null
       )
  `);
  return result.rows[0].count;
}

async function rehearseRollback(client, updates) {
  const ids = updates.map((row) => row.target_id);
  const textOnlyBefore = await countTextOnlyPokemon(client);
  await client.query('begin');
  try {
    const updatedRows = await updateRows(client, updates);
    const appliedState = await fetchTargetState(client, ids);
    const appliedFindings = validateAppliedState(updates, appliedState);
    const textOnlyDuring = await countTextOnlyPokemon(client);
    if (updatedRows !== EXPECTED_TARGET_ROWS) appliedFindings.push(`rowcount_mismatch:${updatedRows}`);
    if (textOnlyBefore - textOnlyDuring !== EXPECTED_TARGET_ROWS) {
      appliedFindings.push(`text_only_delta_mismatch:${textOnlyBefore}:${textOnlyDuring}`);
    }
    await client.query('rollback');
    const rolledBackState = await fetchTargetState(client, ids);
    const rollbackFindings = validateRolledBackState(updates, rolledBackState);
    const textOnlyAfterRollback = await countTextOnlyPokemon(client);
    if (textOnlyAfterRollback !== textOnlyBefore) {
      rollbackFindings.push(`text_only_rollback_mismatch:${textOnlyBefore}:${textOnlyAfterRollback}`);
    }
    return {
      rollback_verified: appliedFindings.length === 0 && rollbackFindings.length === 0,
      updated_rows_during_rehearsal: updatedRows,
      text_only_before: textOnlyBefore,
      text_only_during: textOnlyDuring,
      text_only_after_rollback: textOnlyAfterRollback,
      findings: [...appliedFindings, ...rollbackFindings],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

async function applyRows(client, updates) {
  const ids = updates.map((row) => row.target_id);
  const textOnlyBefore = await countTextOnlyPokemon(client);
  await client.query('begin');
  try {
    const updatedRows = await updateRows(client, updates);
    const state = await fetchTargetState(client, ids);
    const findings = validateAppliedState(updates, state);
    const textOnlyAfter = await countTextOnlyPokemon(client);
    if (updatedRows !== EXPECTED_TARGET_ROWS) findings.push(`rowcount_mismatch:${updatedRows}`);
    if (textOnlyBefore - textOnlyAfter !== EXPECTED_TARGET_ROWS) {
      findings.push(`text_only_delta_mismatch:${textOnlyBefore}:${textOnlyAfter}`);
    }
    if (findings.length) throw new Error(`Post-apply verification failed: ${findings.slice(0, 20).join('; ')}`);
    await client.query('commit');
    return { updated_rows: updatedRows, text_only_before: textOnlyBefore, text_only_after: textOnlyAfter };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function markdown(report) {
  const rows = report.updates.slice(0, 20);
  return `# ${PACKAGE_ID} ${report.mode === 'real_apply' ? 'Result' : 'Plan'}

- Generated: ${report.generated_at}
- Mode: ${report.mode}
- Project ref verified: ${report.environment.project_ref_verified}
- Canonical environment invariants passed: ${report.environment.invariants_passed}
- Target rows: ${report.target_rows}
- Source rows: ${report.source_rows}
- Ready for apply: ${report.ready_for_apply}
- Fingerprint: \`${report.fingerprint}\`
- Rollback verified: ${report.rollback?.rollback_verified ?? false}
- Database writes performed: ${report.db_writes_performed}
- Updated rows: ${report.updated_rows ?? 0}
- Pokemon text-only before: ${report.text_only_before ?? report.rollback?.text_only_before ?? 'unknown'}
- Pokemon text-only after: ${report.text_only_after ?? report.rollback?.text_only_after_rollback ?? 'unknown'}
- Exact image fields changed: false
- Child writes performed: false
- Identity writes performed: false
- Price writes performed: false
- Storage writes performed: false
- Stop findings: ${report.stop_findings.length ? report.stop_findings.join(', ') : 'none'}

## Updates (first 20)

| target | edition | source | representative route |
| --- | --- | --- | --- |
${rows.map((row) => `| ${row.target_gv_id} | ${row.printed_identity_modifier} | ${row.source_gv_id} | ${row.representative_image_url} |`).join('\n')}

## Evidence boundary

Each target is an existing Jungle edition identity. Its deterministic source is the one standard
Jungle row with the same set, number, and name. The source has an exact self-hosted identity image
and a preserved TCGdex source URL. The edition rows receive only a representative route and an
honest representative status; exact image fields remain unchanged.
`;
}

async function writeReport(report, isResult) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const jsonPath = isResult ? RESULT_JSON : PLAN_JSON;
  const mdPath = isResult ? RESULT_MD : PLAN_MD;
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(mdPath, markdown(report), 'utf8');
}

async function main() {
  const args = parseArgs(process.argv);
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const environment = await fetchEnvironmentSanity(client);
    const candidates = await fetchCandidates(client);
    const validation = validateCandidates(candidates, environment);
    const fingerprint = fingerprintFor(validation.updates);
    const rollback = validation.stop_findings.length === 0
      ? await rehearseRollback(client, validation.updates)
      : null;
    const stopFindings = [
      ...validation.stop_findings,
      ...(rollback?.findings ?? []),
    ];
    const readyForApply = stopFindings.length === 0 && rollback?.rollback_verified === true;
    const base = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      mode: 'plan_only',
      environment,
      target_rows: validation.target_rows,
      source_rows: validation.source_rows,
      edition_counts: countBy(validation.updates, (row) => row.printed_identity_modifier),
      planned_columns: ALLOWED_COLUMNS,
      fingerprint,
      rollback,
      ready_for_apply: readyForApply,
      stop_findings: stopFindings,
      db_writes_performed: false,
      storage_writes_performed: false,
      child_writes_performed: false,
      identity_writes_performed: false,
      price_writes_performed: false,
      exact_image_fields_changed: false,
      updates: validation.updates,
    };

    await writeReport(base, false);
    if (!args.apply) {
      console.log(JSON.stringify({
        package_id: PACKAGE_ID,
        mode: base.mode,
        target_rows: base.target_rows,
        source_rows: base.source_rows,
        rollback_verified: rollback?.rollback_verified ?? false,
        text_only_before: rollback?.text_only_before ?? null,
        text_only_during: rollback?.text_only_during ?? null,
        fingerprint,
        ready_for_apply: readyForApply,
        stop_findings: stopFindings,
      }, null, 2));
      return;
    }

    if (!readyForApply) throw new Error(`Apply blocked: ${stopFindings.join('; ')}`);
    if (!args.fingerprint || args.fingerprint !== fingerprint) {
      throw new Error(`Fingerprint mismatch. Expected ${fingerprint}.`);
    }
    const applied = await applyRows(client, validation.updates);
    const result = {
      ...base,
      generated_at: new Date().toISOString(),
      mode: 'real_apply',
      db_writes_performed: true,
      updated_rows: applied.updated_rows,
      text_only_before: applied.text_only_before,
      text_only_after: applied.text_only_after,
      committed: true,
    };
    result.proof_hash = proofHash({
      package_id: result.package_id,
      fingerprint: result.fingerprint,
      updated_rows: result.updated_rows,
      text_only_before: result.text_only_before,
      text_only_after: result.text_only_after,
      planned_columns: result.planned_columns,
    });
    await writeReport(result, true);
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      mode: result.mode,
      updated_rows: result.updated_rows,
      text_only_before: result.text_only_before,
      text_only_after: result.text_only_after,
      fingerprint: result.fingerprint,
      proof_hash: result.proof_hash,
      committed: result.committed,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
