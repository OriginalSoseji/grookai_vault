import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const requireFromBackend = createRequire(path.join(ROOT, 'backend', 'package.json'));
const dotenv = requireFromBackend('dotenv');
const pg = requireFromBackend('pg');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false });
}

const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'cameo_search_v1');
const REPORT_LABEL = process.env.CAMEO_SEARCH_REPORT_LABEL ?? '20260618';
const DELTA_PATH = path.join(OUT_DIR, `cameo_search_v1_rotomamiti_refresh_delta_${REPORT_LABEL}.json`);
const DRY_RUN_PATH = path.join(OUT_DIR, `cameo_search_v1_refresh_insert_guarded_dry_run_${REPORT_LABEL}.json`);
const IS_APPLY = process.argv.includes('--apply');
const JSON_PATH = path.join(
  OUT_DIR,
  IS_APPLY
    ? `cameo_search_v1_refresh_insert_apply_${REPORT_LABEL}.json`
    : `cameo_search_v1_refresh_insert_guarded_dry_run_${REPORT_LABEL}.json`,
);
const MD_PATH = path.join(
  OUT_DIR,
  IS_APPLY
    ? `cameo_search_v1_refresh_insert_apply_${REPORT_LABEL}.md`
    : `cameo_search_v1_refresh_insert_guarded_dry_run_${REPORT_LABEL}.md`,
);
const SOURCE_NAME = 'rotomamiti_cameo_database';
const SOURCE_URL = 'https://docs.google.com/spreadsheets/d/18nIkOgqQrHZTz0TrH_gL1e1nL1RcHiCmPF5finAjToY/htmlview';
const APPROVED_APPLY_TEXT = 'Approve real CAMEO-REFRESH-01-ROTOMAMITI-LOGICAL-NEW-INSERTS apply only. Fingerprint: 94a961633283e044ba9ec4f64f63dcab35f9fdd63e8a5039d7e9c31b8b4458ed. Scope: 60 additive cameo metadata inserts from RotomAmiti current sheet; existing preservation-review cameos excluded=38. Dry-run proof: 35ceb88a4c888c4dfda36cb8d23638b2a4a70e15ee68a4dec9d7c1a4d6a6b562 == 35ceb88a4c888c4dfda36cb8d23638b2a4a70e15ee68a4dec9d7c1a4d6a6b562. No card identity writes. No child printing writes. No Species Dex writes. No pricing writes. No image writes. No migrations. No deletes.';

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normalizeKey(value) {
  return cleanText(value)
    ?.toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_') ?? null;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildSeedRow(row) {
  const subjectType = cleanText(row.cameo_subject_type);
  const subjectName = cleanText(row.cameo_subject_name);
  const cardPrintId = cleanText(row.approved_card_print_id);
  const sourceRowHash = cleanText(row.source_row_hash);
  if (!subjectType || !subjectName || !cardPrintId || !sourceRowHash) {
    throw new Error(`Invalid cameo insert candidate: ${JSON.stringify(row)}`);
  }
  return {
    card_print_id: cardPrintId,
    cameo_subject_type: subjectType,
    cameo_subject_name: subjectName,
    pokemon_ndex: subjectType === 'pokemon' ? cleanText(row.pokemon_ndex) : null,
    pokemon_species_id: null,
    trainer_key: subjectType === 'trainer' ? normalizeKey(subjectName) : null,
    source_name: SOURCE_NAME,
    source_url: SOURCE_URL,
    source_tab: cleanText(row.source_tab),
    source_gid: cleanText(row.source_gid),
    source_row_index: Number(row.source_row_index),
    source_row_hash: sourceRowHash,
    card_name_raw: cleanText(row.card_name_raw),
    set_name_raw: cleanText(row.set_name_raw),
    number_raw: cleanText(row.number_raw),
    notes_raw: cleanText(row.notes_raw),
    cameo_qualifiers: asArray(row.cameo_qualifiers),
    match_status: 'APPROVED_MATCH',
    match_confidence: 'deterministic',
    active: true,
  };
}

function duplicateValues(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value, count]) => ({ value, count }));
}

function logicalKey(row) {
  const subjectIdentifier = row.cameo_subject_type === 'pokemon'
    ? normalizeKey(row.pokemon_ndex)
    : normalizeKey(row.trainer_key ?? row.cameo_subject_name);
  return [
    row.card_print_id,
    row.cameo_subject_type,
    normalizeKey(row.cameo_subject_name),
    subjectIdentifier,
  ].join('|');
}

async function snapshot(client) {
  const result = await client.query(
    `
      select
        count(*)::int as active_count,
        count(distinct source_row_hash)::int as distinct_hashes,
        count(distinct card_print_id)::int as distinct_cards,
        coalesce(max(updated_at)::text, '') as max_updated_at
      from public.card_print_cameos
      where source_name = $1
        and active = true
    `,
    [SOURCE_NAME],
  );
  const row = result.rows[0];
  return {
    ...row,
    hash_sha256: sha256(JSON.stringify(row)),
  };
}

async function insertSeedRows(client, seedRows) {
  const result = await client.query(
    `
      with payload as (
        select *
        from jsonb_to_recordset($1::jsonb) as x(
          card_print_id uuid,
          cameo_subject_type text,
          cameo_subject_name text,
          pokemon_ndex text,
          pokemon_species_id uuid,
          trainer_key text,
          source_name text,
          source_url text,
          source_tab text,
          source_gid text,
          source_row_index integer,
          source_row_hash text,
          card_name_raw text,
          set_name_raw text,
          number_raw text,
          notes_raw text,
          cameo_qualifiers jsonb,
          match_status text,
          match_confidence text,
          active boolean
        )
      )
      insert into public.card_print_cameos (
        card_print_id,
        cameo_subject_type,
        cameo_subject_name,
        pokemon_ndex,
        pokemon_species_id,
        trainer_key,
        source_name,
        source_url,
        source_tab,
        source_gid,
        source_row_index,
        source_row_hash,
        card_name_raw,
        set_name_raw,
        number_raw,
        notes_raw,
        cameo_qualifiers,
        match_status,
        match_confidence,
        active
      )
      select
        card_print_id,
        cameo_subject_type,
        cameo_subject_name,
        pokemon_ndex,
        pokemon_species_id,
        trainer_key,
        source_name,
        source_url,
        source_tab,
        source_gid,
        source_row_index,
        source_row_hash,
        card_name_raw,
        set_name_raw,
        number_raw,
        notes_raw,
        coalesce(array(select jsonb_array_elements_text(payload.cameo_qualifiers)), '{}'::text[]),
        match_status,
        match_confidence,
        active
      from payload
      returning id
    `,
    [JSON.stringify(seedRows)],
  );
  return result.rowCount;
}

function buildMarkdown(report) {
  const lines = [];
  lines.push(IS_APPLY ? '# CAMEO_SEARCH_V1 Refresh Insert Apply' : '# CAMEO_SEARCH_V1 Refresh Insert Guarded Dry Run');
  lines.push('');
  lines.push(`Date: ${report.generated_at.slice(0, 10)}`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push(IS_APPLY
    ? 'Guarded apply for logical-new RotomAmiti cameo rows. This commits only additive cameo metadata inserts.'
    : 'Rollback-only dry run for logical-new RotomAmiti cameo rows. This proves the additive insert package only; it does not write durable DB changes.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Candidate rows: ${report.summary.candidate_rows}`);
  lines.push(`- Inserted inside transaction: ${report.execution.inserted_inside_transaction}`);
  lines.push(`- Before active cameos: ${report.execution.before_snapshot?.active_count ?? 'n/a'}`);
  lines.push(`- Inside active cameos: ${report.execution.inside_snapshot?.active_count ?? 'n/a'}`);
  lines.push(`- After rollback active cameos: ${report.execution.after_rollback_snapshot?.active_count ?? 'n/a'}`);
  lines.push(`- After apply active cameos: ${report.execution.after_apply_snapshot?.active_count ?? 'n/a'}`);
  if (IS_APPLY) {
    lines.push(`- Approved dry-run proof: \`${report.approved_dry_run_proof?.before_hash ?? 'n/a'}\` == \`${report.approved_dry_run_proof?.after_hash ?? 'n/a'}\``);
  } else {
    lines.push(`- Rollback proof: \`${report.execution.before_snapshot?.hash_sha256 ?? 'n/a'}\` == \`${report.execution.after_rollback_snapshot?.hash_sha256 ?? 'n/a'}\``);
  }
  lines.push(`- Package fingerprint: \`${report.package_fingerprint}\``);
  lines.push('');
  lines.push('## Guards');
  lines.push('');
  for (const [guard, passed] of Object.entries(report.guards)) {
    lines.push(`- ${guard}: ${passed}`);
  }
  lines.push('');
  lines.push('## Approval String');
  lines.push('');
  lines.push('```text');
  lines.push(report.approval_string);
  lines.push('```');
  lines.push('');
  lines.push('## Confirmations');
  lines.push('');
  lines.push(IS_APPLY ? '- Durable DB writes limited to `public.card_print_cameos` inserts.' : '- No durable DB writes.');
  lines.push('- No migrations.');
  lines.push('- No card identity changes.');
  lines.push('- No child printing changes.');
  lines.push('- No Species Dex changes.');
  lines.push('- No pricing changes.');
  lines.push('- No image writes.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const delta = JSON.parse(await fs.readFile(DELTA_PATH, 'utf8'));
  const candidates = asArray(delta.candidates?.logical_new_insert_candidates);
  const seedRows = candidates.map(buildSeedRow);
  const packageFingerprint = sha256(JSON.stringify(seedRows));
  if (IS_APPLY && packageFingerprint !== '94a961633283e044ba9ec4f64f63dcab35f9fdd63e8a5039d7e9c31b8b4458ed') {
    throw new Error(`Package fingerprint changed before apply: ${packageFingerprint}`);
  }
  if (IS_APPLY) {
    const dryRun = JSON.parse(await fs.readFile(DRY_RUN_PATH, 'utf8'));
    if (dryRun.package_fingerprint !== packageFingerprint) throw new Error('Dry-run fingerprint does not match apply package.');
    if (dryRun.summary?.candidate_rows !== seedRows.length) throw new Error('Dry-run candidate count does not match apply package.');
    if (dryRun.execution?.before_snapshot?.hash_sha256 !== '35ceb88a4c888c4dfda36cb8d23638b2a4a70e15ee68a4dec9d7c1a4d6a6b562') {
      throw new Error('Dry-run before proof does not match approved proof.');
    }
    if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== '35ceb88a4c888c4dfda36cb8d23638b2a4a70e15ee68a4dec9d7c1a4d6a6b562') {
      throw new Error('Dry-run rollback proof does not match approved proof.');
    }
    if (dryRun.guards?.dry_run_proof_passed !== true) throw new Error('Dry-run proof did not pass.');
  }

  const duplicatePayloadHashes = duplicateValues(seedRows.map((row) => row.source_row_hash));
  const duplicatePayloadLogicalKeys = duplicateValues(seedRows.map(logicalKey));
  const invalidRows = seedRows.filter((row) => row.cameo_subject_type === 'pokemon' && !row.pokemon_ndex);

  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is not set.');

  const client = new pg.Client({
    connectionString,
    statement_timeout: 120000,
    application_name: 'cameo_search_v1_refresh_insert_guarded_dry_run',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  let beforeSnapshot = null;
  let insideSnapshot = null;
  let afterRollbackSnapshot = null;
  let afterApplySnapshot = null;
  let insertedInsideTransaction = 0;

  try {
    await client.query('begin');
    beforeSnapshot = await snapshot(client);

    const existingHashResult = await client.query(
      `
        select source_row_hash
        from public.card_print_cameos
        where source_row_hash = any($1::text[])
      `,
      [seedRows.map((row) => row.source_row_hash)],
    );
    const targetResult = await client.query(
      `
        select id::text
        from public.card_prints
        where id = any($1::uuid[])
      `,
      [seedRows.map((row) => row.card_print_id)],
    );
    const existingLogicalResult = await client.query(
      `
        select
          card_print_id::text,
          cameo_subject_type,
          cameo_subject_name,
          pokemon_ndex,
          trainer_key
        from public.card_print_cameos
        where source_name = $1
          and active = true
      `,
      [SOURCE_NAME],
    );

    const existingLogicalKeys = new Set(existingLogicalResult.rows.map(logicalKey));
    const existingLogicalCollisions = seedRows.filter((row) => existingLogicalKeys.has(logicalKey(row)));

    const guards = {
      candidate_rows_match_delta_report: seedRows.length === delta.summary.logical_new_candidates,
      no_duplicate_payload_hashes: duplicatePayloadHashes.length === 0,
      no_duplicate_payload_logical_keys: duplicatePayloadLogicalKeys.length === 0,
      no_invalid_pokemon_rows: invalidRows.length === 0,
      no_existing_source_hash_collisions: existingHashResult.rowCount === 0,
      all_target_card_prints_exist: targetResult.rowCount === new Set(seedRows.map((row) => row.card_print_id)).size,
      no_existing_logical_cameo_collisions: existingLogicalCollisions.length === 0,
      current_source_has_no_conflict_free_apply_claim: delta.summary.current_conflicts >= 0,
    };

    if (Object.values(guards).some((passed) => !passed)) {
      await client.query('rollback');
      afterRollbackSnapshot = await snapshot(client);
      const report = {
        generated_at: new Date().toISOString(),
        mode: 'DRY_RUN_ROLLBACK_ONLY_FAILED_GUARDS',
        delta_path: path.relative(ROOT, DELTA_PATH),
        package_fingerprint: packageFingerprint,
        summary: {
          candidate_rows: seedRows.length,
          duplicate_payload_hashes: duplicatePayloadHashes.length,
          duplicate_payload_logical_keys: duplicatePayloadLogicalKeys.length,
          invalid_rows: invalidRows.length,
          existing_source_hash_collisions: existingHashResult.rowCount,
          target_card_prints_found: targetResult.rowCount,
          existing_logical_cameo_collisions: existingLogicalCollisions.length,
        },
        guards,
        execution: {
          before_snapshot: beforeSnapshot,
          inside_snapshot: null,
          after_rollback_snapshot: afterRollbackSnapshot,
          inserted_inside_transaction: 0,
        },
        approval_string: 'NOT READY: guarded dry run failed.',
        confirmations: {
          durable_db_writes: false,
          migrations: false,
          card_identity_changes: false,
          child_printing_changes: false,
          species_dex_changes: false,
          pricing_changes: false,
          image_writes: false,
        },
      };
      await fs.writeFile(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
      await fs.writeFile(MD_PATH, buildMarkdown(report));
      console.log(JSON.stringify({ status: 'blocked', guards }, null, 2));
      return;
    }

    insertedInsideTransaction = await insertSeedRows(client, seedRows);
    insideSnapshot = await snapshot(client);

    if (IS_APPLY) {
      await client.query('commit');
      afterApplySnapshot = await snapshot(client);
    } else {
      await client.query('rollback');
      afterRollbackSnapshot = await snapshot(client);
    }

    const dryRunProofPassed = IS_APPLY
      ? true
      : beforeSnapshot.hash_sha256 === afterRollbackSnapshot.hash_sha256
        && insertedInsideTransaction === seedRows.length
        && insideSnapshot.active_count === beforeSnapshot.active_count + seedRows.length;
    const applyProofPassed = IS_APPLY
      ? insertedInsideTransaction === seedRows.length
        && insideSnapshot.active_count === beforeSnapshot.active_count + seedRows.length
        && afterApplySnapshot.active_count === beforeSnapshot.active_count + seedRows.length
      : null;

    const approvalString = IS_APPLY
      ? APPROVED_APPLY_TEXT
      : `Approve real CAMEO-REFRESH-01-ROTOMAMITI-LOGICAL-NEW-INSERTS apply only. Fingerprint: ${packageFingerprint}. Scope: ${seedRows.length} additive cameo metadata inserts from RotomAmiti current sheet; existing preservation-review cameos excluded=${delta.summary.existing_missing_from_current_logical}. Dry-run proof: ${beforeSnapshot.hash_sha256} == ${afterRollbackSnapshot.hash_sha256}. No card identity writes. No child printing writes. No Species Dex writes. No pricing writes. No image writes. No migrations. No deletes.`;

    const report = {
      generated_at: new Date().toISOString(),
      mode: IS_APPLY ? 'APPLY_COMMITTED' : 'DRY_RUN_ROLLBACK_ONLY',
      delta_path: path.relative(ROOT, DELTA_PATH),
      approved_apply_text: IS_APPLY ? APPROVED_APPLY_TEXT : null,
      approved_dry_run_proof: IS_APPLY ? {
        before_hash: '35ceb88a4c888c4dfda36cb8d23638b2a4a70e15ee68a4dec9d7c1a4d6a6b562',
        after_hash: '35ceb88a4c888c4dfda36cb8d23638b2a4a70e15ee68a4dec9d7c1a4d6a6b562',
      } : null,
      package_fingerprint: packageFingerprint,
      summary: {
        candidate_rows: seedRows.length,
        duplicate_payload_hashes: duplicatePayloadHashes.length,
        duplicate_payload_logical_keys: duplicatePayloadLogicalKeys.length,
        invalid_rows: invalidRows.length,
        preservation_review_existing_missing_from_current: delta.summary.existing_missing_from_current_logical,
      },
      guards: {
        candidate_rows_match_delta_report: true,
        no_duplicate_payload_hashes: true,
        no_duplicate_payload_logical_keys: true,
        no_invalid_pokemon_rows: true,
        no_existing_source_hash_collisions: true,
        all_target_card_prints_exist: true,
        no_existing_logical_cameo_collisions: true,
        dry_run_proof_passed: dryRunProofPassed,
        apply_proof_passed: applyProofPassed,
      },
      execution: {
        before_snapshot: beforeSnapshot,
        inside_snapshot: insideSnapshot,
        after_rollback_snapshot: afterRollbackSnapshot,
        after_apply_snapshot: afterApplySnapshot,
        inserted_inside_transaction: insertedInsideTransaction,
      },
      approval_string: approvalString,
      confirmations: {
        durable_db_writes: IS_APPLY,
        durable_db_write_scope: IS_APPLY ? 'public.card_print_cameos inserts only' : null,
        migrations: false,
        card_identity_changes: false,
        child_printing_changes: false,
        species_dex_changes: false,
        pricing_changes: false,
        image_writes: false,
      },
    };

    await fs.writeFile(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(MD_PATH, buildMarkdown(report));
    console.log(JSON.stringify({
      status: (IS_APPLY ? applyProofPassed : dryRunProofPassed) ? 'ok' : 'blocked',
      json_path: path.relative(ROOT, JSON_PATH),
      md_path: path.relative(ROOT, MD_PATH),
      candidate_rows: seedRows.length,
      inserted_inside_transaction: insertedInsideTransaction,
      dry_run_proof_passed: dryRunProofPassed,
      apply_proof_passed: applyProofPassed,
      package_fingerprint: packageFingerprint,
    }, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // ignore rollback failures
    }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
