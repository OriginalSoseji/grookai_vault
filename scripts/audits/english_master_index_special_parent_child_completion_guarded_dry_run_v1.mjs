import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'missing_promo_v1');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'special_parent_child_completion_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'special_parent_child_completion_guarded_dry_run_v1.md');

const PACKAGE_ID = 'MISSING-PROMO-03A-SPECIAL-PARENT-CHILD-COMPLETION';
const CREATED_BY = 'english_master_index_special_parent_child_completion_guarded_dry_run_v1';
const ALLOWED_FINISHES = new Set(['normal', 'holo', 'reverse', 'cosmos', 'cracked_ice', 'rocket_reverse', 'poke_ball_reverse', 'master_ball_reverse']);
const FINISH_SUFFIX = {
  normal: 'STD',
  holo: 'HOLO',
  reverse: 'RH',
  cosmos: 'COSMOS',
  cracked_ice: 'CRACKED-ICE',
  rocket_reverse: 'ROCKET-RH',
  poke_ball_reverse: 'POKE-BALL-RH',
  master_ball_reverse: 'MASTER-BALL-RH',
};

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function uuidFromSeed(seed) {
  const hash = crypto.createHash('sha256').update(seed).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function finishSuffix(finishKey) {
  return FINISH_SUFFIX[finishKey] ?? finishKey.toUpperCase().replaceAll('_', '-');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function claimFinish(row) {
  if (row.active_child_finish_key) {
    return {
      finish_key: row.active_child_finish_key,
      evidence_mode: 'active_child_finish_key',
    };
  }
  const claims = String(row.claim_finishes ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (claims.length === 1) {
    return {
      finish_key: claims[0],
      evidence_mode: 'single_exact_finish_claim',
    };
  }
  return {
    finish_key: null,
    evidence_mode: 'blocked_no_single_finish',
  };
}

function familyFor(row) {
  const token = `${row.variant_key ?? ''} ${row.printed_identity_modifier ?? ''}`.toLowerCase();
  if (token.includes('pokemon_center_ny')) return 'pokemon_center_ny_stamp';
  if (token.includes('pokemon_center')) return 'pokemon_center_stamp';
  if (token.includes('championship')) return 'championship_stamp';
  if (token.includes('prerelease')) return 'prerelease_stamp';
  if (token.includes('staff')) return 'staff_stamp';
  if (token.includes('winner')) return 'winner_stamp';
  if (token.includes('league')) return 'league_stamp';
  if (token.includes('worlds')) return 'worlds_stamp';
  if (token.includes('battle_road')) return 'battle_road_stamp';
  if (token.includes('wotc')) return 'wotc_stamp';
  if (token.includes('e3')) return 'e3_stamp';
  if (token.includes('stamp')) return 'other_stamp';
  return 'other_variant_or_modifier';
}

async function loadChildlessSpecialParents(client) {
  const result = await client.query(
    `with childless as (
       select
         cp.id,
         cp.set_code,
         cp.number,
         cp.number_plain,
         cp.name,
         cp.variant_key,
         cp.printed_identity_modifier,
         cp.gv_id,
         cp.external_ids,
         cp.external_ids->'verified_master_index_v1' as vmi
       from public.card_prints cp
       left join public.card_printings cpr on cpr.card_print_id = cp.id
       where cp.identity_domain = 'pokemon_eng_standard'
         and (coalesce(cp.variant_key, '') <> '' or cp.printed_identity_modifier is not null)
       group by cp.id
       having count(cpr.id) = 0
     )
     select
       id::text,
       set_code,
       number,
       number_plain,
       name,
       variant_key,
       printed_identity_modifier,
       gv_id,
       vmi,
       vmi->>'active_child_finish_key' as active_child_finish_key,
       vmi->>'routing_status' as routing_status,
       coalesce(vmi->'evidence_urls', '[]'::jsonb) as evidence_urls,
       coalesce(vmi->'evidence_labels', '[]'::jsonb) as evidence_labels,
       coalesce(vmi->'preserved_evidence_sources', '[]'::jsonb) as preserved_evidence_sources,
       (select count(distinct claim->>'finish_key')::int
        from jsonb_array_elements(coalesce(vmi->'finish_claims', '[]'::jsonb)) claim
        where claim ? 'finish_key') as distinct_finish_claim_count,
       (select string_agg(distinct claim->>'finish_key', ',')
        from jsonb_array_elements(coalesce(vmi->'finish_claims', '[]'::jsonb)) claim
        where claim ? 'finish_key') as claim_finishes
     from childless
     order by set_code, number_plain nulls last, number, name, variant_key`,
  );
  return result.rows;
}

async function classifyRows(client, rows) {
  const finishRows = await client.query(`select key from public.finish_keys where is_active = true`);
  const activeFinishes = new Set(finishRows.rows.map((row) => row.key));

  const classified = [];
  for (const row of rows) {
    const family = familyFor(row);
    const { finish_key: finishKey, evidence_mode: evidenceMode } = claimFinish(row);
    const evidenceUrls = Array.isArray(row.evidence_urls) ? row.evidence_urls : [];
    const evidenceLabels = Array.isArray(row.evidence_labels) ? row.evidence_labels : [];
    const preservedEvidenceSources = Array.isArray(row.preserved_evidence_sources) ? row.preserved_evidence_sources : [];
    const blockers = [];
    if (!finishKey) blockers.push('no_single_exact_finish_evidence');
    if (finishKey && !ALLOWED_FINISHES.has(finishKey)) blockers.push('finish_not_allowed_for_child_completion');
    if (finishKey && !activeFinishes.has(finishKey)) blockers.push('finish_key_inactive');
    if (!row.gv_id) blockers.push('parent_missing_gv_id');

    const printingGvId = finishKey && row.gv_id ? `${row.gv_id}-${finishSuffix(finishKey)}` : null;
    const targetChildId = finishKey ? uuidFromSeed(`${PACKAGE_ID}:${row.id}:${finishKey}`) : null;

    classified.push({
      parent_id: row.id,
      target_child_id: targetChildId,
      set_code: row.set_code,
      number: row.number,
      number_plain: row.number_plain,
      name: row.name,
      variant_key: row.variant_key,
      printed_identity_modifier: row.printed_identity_modifier,
      gv_id: row.gv_id,
      finish_key: finishKey,
      printing_gv_id: printingGvId,
      family,
      evidence_mode: evidenceMode,
      routing_status: row.routing_status,
      distinct_finish_claim_count: row.distinct_finish_claim_count,
      claim_finishes: row.claim_finishes,
      evidence_urls: evidenceUrls,
      evidence_labels: evidenceLabels,
      preserved_evidence_sources: preservedEvidenceSources,
      readiness_status: blockers.length ? 'blocked' : 'ready_for_guarded_dry_run',
      blockers,
    });
  }
  return classified;
}

async function collisionCheck(client, targets) {
  if (!targets.length) return { child_id_collisions: [], printing_gv_id_collisions: [], existing_finish_collisions: [], active_identity_missing: [], all: [] };
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         parent_id uuid,
         target_child_id uuid,
         finish_key text,
         printing_gv_id text
       )
     )
     select 'child_id_collision' as issue, t.parent_id::text, t.target_child_id::text, t.finish_key, t.printing_gv_id, cpr.id::text as existing_id
     from target t
     join public.card_printings cpr on cpr.id = t.target_child_id
     union all
     select 'printing_gv_id_collision', t.parent_id::text, t.target_child_id::text, t.finish_key, t.printing_gv_id, cpr.id::text
     from target t
     join public.card_printings cpr on cpr.printing_gv_id = t.printing_gv_id
     union all
     select 'existing_finish_collision', t.parent_id::text, t.target_child_id::text, t.finish_key, t.printing_gv_id, cpr.id::text
     from target t
     join public.card_printings cpr on cpr.card_print_id = t.parent_id and cpr.finish_key = t.finish_key
     union all
     select 'active_identity_missing', t.parent_id::text, t.target_child_id::text, t.finish_key, t.printing_gv_id, null::text
     from target t
     left join public.card_print_identity cpi on cpi.card_print_id = t.parent_id and cpi.is_active = true
     where cpi.id is null
     order by issue, parent_id`,
    [JSON.stringify(targets.map((row) => ({
      parent_id: row.parent_id,
      target_child_id: row.target_child_id,
      finish_key: row.finish_key,
      printing_gv_id: row.printing_gv_id,
    })))],
  );
  return {
    child_id_collisions: result.rows.filter((row) => row.issue === 'child_id_collision'),
    printing_gv_id_collisions: result.rows.filter((row) => row.issue === 'printing_gv_id_collision'),
    existing_finish_collisions: result.rows.filter((row) => row.issue === 'existing_finish_collision'),
    active_identity_missing: result.rows.filter((row) => row.issue === 'active_identity_missing'),
    all: result.rows,
  };
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         parent_id uuid,
         target_child_id uuid,
         finish_key text,
         printing_gv_id text
       )
     )
     select 'target_parent' as row_type, cp.id::text as row_id, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, cp.gv_id, null::text as finish_key, null::text as printing_gv_id
     from target t
     join public.card_prints cp on cp.id = t.parent_id
     union all
     select 'target_child', cpr.id::text, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, cp.gv_id, cpr.finish_key, cpr.printing_gv_id
     from target t
     join public.card_printings cpr on cpr.card_print_id = t.parent_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select 'active_identity', cpi.id::text, cp.set_code, cp.number, cp.name, cp.variant_key, cp.printed_identity_modifier, cp.gv_id, null::text, null::text
     from target t
     join public.card_print_identity cpi on cpi.card_print_id = t.parent_id and cpi.is_active = true
     join public.card_prints cp on cp.id = cpi.card_print_id
     order by row_type, set_code, number, name, variant_key nulls first, finish_key nulls first, row_id`,
    [JSON.stringify(targets.map((row) => ({
      parent_id: row.parent_id,
      target_child_id: row.target_child_id,
      finish_key: row.finish_key,
      printing_gv_id: row.printing_gv_id,
    })))],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: countBy(result.rows, (row) => row.row_type),
  };
}

async function runDryRun(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table special_parent_child_completion_targets (
         parent_id uuid primary key,
         target_child_id uuid not null unique,
         finish_key text not null,
         printing_gv_id text not null unique,
         set_code text not null,
         number text not null,
         name text not null,
         variant_key text,
         printed_identity_modifier text,
         family text not null,
         evidence_mode text not null,
         provenance jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into special_parent_child_completion_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         parent_id uuid,
         target_child_id uuid,
         finish_key text,
         printing_gv_id text,
         set_code text,
         number text,
         name text,
         variant_key text,
         printed_identity_modifier text,
         family text,
         evidence_mode text,
         provenance jsonb
       )`,
      [JSON.stringify(targets.map((row) => ({
        parent_id: row.parent_id,
        target_child_id: row.target_child_id,
        finish_key: row.finish_key,
        printing_gv_id: row.printing_gv_id,
        set_code: row.set_code,
        number: row.number,
        name: row.name,
        variant_key: row.variant_key,
        printed_identity_modifier: row.printed_identity_modifier,
        family: row.family,
        evidence_mode: row.evidence_mode,
        provenance: {
          source: 'verified_master_index_v1',
          package_id: PACKAGE_ID,
          evidence_mode: row.evidence_mode,
          routing_status: row.routing_status,
          evidence_urls: row.evidence_urls,
          evidence_labels: row.evidence_labels,
          preserved_evidence_sources: row.preserved_evidence_sources,
        },
      })))],
    );

    const guard = await client.query(
      `select
         (select count(*)::int from special_parent_child_completion_targets) as target_count,
         (select count(distinct parent_id)::int from special_parent_child_completion_targets) as parent_count,
         (select count(distinct target_child_id)::int from special_parent_child_completion_targets) as child_id_count,
         (select count(distinct printing_gv_id)::int from special_parent_child_completion_targets) as printing_gv_id_count,
         (select count(*)::int from special_parent_child_completion_targets t left join public.card_prints cp on cp.id = t.parent_id where cp.id is null) as missing_parent_count,
         (select count(*)::int from special_parent_child_completion_targets t left join public.finish_keys fk on fk.key = t.finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int from special_parent_child_completion_targets t join public.card_printings cpr on cpr.id = t.target_child_id) as child_id_collision_count,
         (select count(*)::int from special_parent_child_completion_targets t join public.card_printings cpr on cpr.printing_gv_id = t.printing_gv_id) as printing_gv_id_collision_count,
         (select count(*)::int from special_parent_child_completion_targets t join public.card_printings cpr on cpr.card_print_id = t.parent_id and cpr.finish_key = t.finish_key) as existing_finish_collision_count,
         (select count(*)::int from special_parent_child_completion_targets t join public.card_print_identity cpi on cpi.card_print_id = t.parent_id and cpi.is_active = true) as active_identity_count,
         (select count(*)::int from special_parent_child_completion_targets where finish_key = 'stamped') as forbidden_stamped_finish_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== targets.length
      || guardRow.parent_count !== targets.length
      || guardRow.child_id_count !== targets.length
      || guardRow.printing_gv_id_count !== targets.length
      || guardRow.missing_parent_count !== 0
      || guardRow.inactive_finish_count !== 0
      || guardRow.child_id_collision_count !== 0
      || guardRow.printing_gv_id_collision_count !== 0
      || guardRow.existing_finish_collision_count !== 0
      || guardRow.active_identity_count !== targets.length
      || guardRow.forbidden_stamped_finish_count !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
    }

    const insertResult = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, created_at, is_provisional, provenance_source, provenance_ref, created_by,
         printing_gv_id, image_source, image_path, image_url, image_alt_url, image_status, image_note
       )
       select
         target_child_id,
         parent_id,
         finish_key,
         now(),
         false,
         'verified_master_index_v1',
         concat(set_code, ':', number, ':', coalesce(nullif(variant_key, ''), printed_identity_modifier, family), ':', finish_key),
         $1::text,
         printing_gv_id,
         null, null, null, null,
         null,
         concat('Child printing completed from exact special-parent finish evidence: ', evidence_mode)
       from special_parent_child_completion_targets
       order by set_code, number, name, variant_key nulls first
       returning id::text, card_print_id::text, finish_key, printing_gv_id`,
      [CREATED_BY],
    );
    if (insertResult.rowCount !== targets.length) throw new Error(`insert count mismatch: ${insertResult.rowCount}`);

    const transientSnapshot = await captureSnapshot(client, targets);
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      beforeSnapshot,
      transientSnapshot,
      afterSnapshot,
      durable_after_snapshot_matches_before_snapshot: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
      transient_after_snapshot_differs_from_before_snapshot: beforeSnapshot.hash_sha256 !== transientSnapshot.hash_sha256,
      guard: guardRow,
      inserted_rows: insertResult.rows,
    };
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // ignore rollback cleanup failure
    }
    throw error;
  }
}

function renderMarkdown(report) {
  const readyByFamily = Object.entries(report.summary.ready_by_family).map(([family, count]) => [family, count]);
  const readyByFinish = Object.entries(report.summary.ready_by_finish).map(([finish, count]) => [finish, count]);
  const blockedByReason = Object.entries(report.summary.blocked_by_reason).map(([reason, count]) => [reason, count]);
  const sampleRows = report.ready_targets.slice(0, 30).map((row) => [
    row.set_code,
    row.number,
    row.name,
    row.variant_key || row.printed_identity_modifier || row.family,
    row.finish_key,
    row.evidence_mode,
  ]);
  return [
    '# Special Parent Child Completion Guarded Dry Run V1',
    '',
    'Classifies childless special/stamped parent identities and rollback-dry-runs child-printing inserts only for rows with exact finish evidence.',
    '',
    '## Guardrails',
    '',
    '- Durable DB writes performed: false',
    '- Migrations created: false',
    '- Parent writes: false',
    '- Identity writes: false',
    '- Deletes/merges/cleanup/quarantine: false',
    '- `stamped` is not used as a child finish.',
    '',
    '## Summary',
    '',
    `- Childless special parent rows audited: ${report.summary.total_childless_special_parent_rows}`,
    `- Ready child-printing inserts staged: ${report.summary.ready_target_count}`,
    `- Blocked rows: ${report.summary.blocked_count}`,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Dry-run proof: \`${report.dry_run_proof_sha256}\` == \`${report.rollback_proof_sha256}\``,
    '',
    '## Ready By Family',
    '',
    markdownTable(['family', 'rows'], readyByFamily),
    '',
    '## Ready By Finish',
    '',
    markdownTable(['finish', 'rows'], readyByFinish),
    '',
    '## Blocked By Reason',
    '',
    markdownTable(['reason', 'rows'], blockedByReason),
    '',
    '## Ready Sample',
    '',
    markdownTable(['set', 'number', 'name', 'variant/modifier', 'finish', 'evidence mode'], sampleRows),
    '',
    '## Recommended Approval',
    '',
    '```text',
    report.recommended_real_apply_approval_text,
    '```',
    '',
  ].join('\n');
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for guarded dry-run.');
  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try {
    const childlessRows = await loadChildlessSpecialParents(client);
    const classifiedRows = await classifyRows(client, childlessRows);
    const initialReadyTargets = classifiedRows.filter((row) => row.readiness_status === 'ready_for_guarded_dry_run');
    const collisions = await collisionCheck(client, initialReadyTargets);
    const collisionParentIds = new Set(collisions.all.map((row) => row.parent_id));
    const readyTargets = initialReadyTargets.filter((row) => !collisionParentIds.has(row.parent_id));
    const collisionBlockedRows = initialReadyTargets
      .filter((row) => collisionParentIds.has(row.parent_id))
      .map((row) => ({ ...row, readiness_status: 'blocked', blockers: ['collision_or_missing_identity_detected'] }));
    const blockedRows = [
      ...classifiedRows.filter((row) => row.readiness_status !== 'ready_for_guarded_dry_run'),
      ...collisionBlockedRows,
    ];
    const packageFingerprint = sha256(stableJson({
      package_id: PACKAGE_ID,
      ready_targets: readyTargets.map((row) => ({
        parent_id: row.parent_id,
        target_child_id: row.target_child_id,
        finish_key: row.finish_key,
        printing_gv_id: row.printing_gv_id,
      })),
    }));
    const dryRun = readyTargets.length ? await runDryRun(client, readyTargets) : null;
    const dryRunProof = dryRun?.beforeSnapshot?.hash_sha256 ?? 'not_applicable_no_ready_targets';
    const rollbackProof = dryRun?.afterSnapshot?.hash_sha256 ?? 'not_applicable_no_ready_targets';
    const recommendedApproval = readyTargets.length
      ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${readyTargets.length} child-only card_printing inserts for existing special/stamped parent identities; finishes ${Object.entries(countBy(readyTargets, (row) => row.finish_key)).map(([finish, count]) => `${finish}=${count}`).join(', ')}; families ${Object.entries(countBy(readyTargets, (row) => row.family)).map(([family, count]) => `${family}=${count}`).join(', ')}. Dry-run proof: ${dryRunProof} == ${rollbackProof}. No parent writes. No identity writes. No external mapping writes. No pricing writes. No image writes. No deletes. No merges. No migrations. No global apply.`
      : 'No real apply recommended. Current live DB has zero childless special/stamped parents with exact single-finish evidence ready for a child-printing insert.';

    const blockedByReason = {};
    for (const row of blockedRows) {
      for (const blocker of row.blockers.length ? row.blockers : ['unknown_blocker']) {
        blockedByReason[blocker] = (blockedByReason[blocker] ?? 0) + 1;
      }
    }

    const report = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      mode: 'rollback_only_guarded_dry_run',
      package_fingerprint_sha256: packageFingerprint,
      dry_run_proof_sha256: dryRunProof,
      rollback_proof_sha256: rollbackProof,
      durable_after_snapshot_matches_before_snapshot: dryRun?.durable_after_snapshot_matches_before_snapshot ?? true,
      transient_after_snapshot_differs_from_before_snapshot: dryRun?.transient_after_snapshot_differs_from_before_snapshot ?? false,
      db_reads_performed: true,
      db_writes_performed_inside_rolled_back_transaction: true,
      durable_db_writes_performed: false,
      migrations_created: false,
      parent_writes_performed: false,
      identity_writes_performed: false,
      external_mapping_writes_performed: false,
      pricing_writes_performed: false,
      image_writes_performed: false,
      deletes_performed: false,
      merges_performed: false,
      cleanup_performed: false,
      quarantine_performed: false,
      guard: dryRun?.guard ?? null,
      collision_summary: {
        child_id_collisions: collisions.child_id_collisions.length,
        printing_gv_id_collisions: collisions.printing_gv_id_collisions.length,
        existing_finish_collisions: collisions.existing_finish_collisions.length,
        active_identity_missing: collisions.active_identity_missing.length,
      },
      summary: {
        total_childless_special_parent_rows: childlessRows.length,
        initial_ready_signal_count: initialReadyTargets.length,
        ready_target_count: readyTargets.length,
        blocked_count: blockedRows.length,
        ready_by_family: countBy(readyTargets, (row) => row.family),
        ready_by_finish: countBy(readyTargets, (row) => row.finish_key),
        ready_by_evidence_mode: countBy(readyTargets, (row) => row.evidence_mode),
        blocked_by_reason: blockedByReason,
      },
      ready_targets: readyTargets,
      blocked_rows: blockedRows,
      before_snapshot: dryRun?.beforeSnapshot ?? null,
      transient_snapshot: dryRun?.transientSnapshot ?? null,
      after_snapshot: dryRun?.afterSnapshot ?? null,
      inserted_rows_simulated: dryRun?.inserted_rows ?? [],
      recommended_real_apply_approval_text: recommendedApproval,
    };

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, renderMarkdown(report));

    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
      package_fingerprint_sha256: packageFingerprint,
      ready_target_count: readyTargets.length,
      blocked_count: blockedRows.length,
      ready_by_finish: report.summary.ready_by_finish,
      dry_run_proof_sha256: dryRunProof,
      rollback_proof_sha256: rollbackProof,
      durable_after_snapshot_matches_before_snapshot: report.durable_after_snapshot_matches_before_snapshot,
      recommended_real_apply_approval_text: recommendedApproval,
      durable_db_writes_performed: false,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
