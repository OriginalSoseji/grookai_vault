import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeNumber } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_identity_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg11a_stamped_parent_identity_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg11a_stamped_parent_identity_guarded_dry_run_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg11a_stamped_parent_identity_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-11A-STAMPED-CANONICAL-PARENT-IDENTITY-PILOT';
const SOURCE_PACKAGE_ID = 'STAMPED-IDENTITY-READINESS-V1';
const MAX_ROWS = 16;

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
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

function uuidFromSeed(seed) {
  const hex = sha256(seed).slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const raw = hex.join('');
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function suffix(value) {
  return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function numberPlain(value) {
  const normalized = normalizeNumber(value);
  const match = normalized.match(/[A-Z]*0*(\d+[a-z]?)$/i);
  return match ? match[1].toUpperCase() : normalized;
}

function buildTargets(readiness) {
  return (readiness.rows ?? [])
    .filter((row) => (
      row.readiness_status === 'ready_for_guarded_parent_identity_insert'
      && row.base_parent_child_finishes?.length === 1
      && ['normal', 'holo', 'cosmos'].includes(row.base_parent_child_finishes[0])
      && row.base_parent_ids?.length === 1
      && row.proposed_variant_key
      && row.stamp_label
    ))
    .slice(0, MAX_ROWS)
    .map((row) => {
      const targetParentId = uuidFromSeed(`${PACKAGE_ID}:parent:${row.set_key}:${row.card_number}:${row.card_name}:${row.proposed_variant_key}`);
      const targetChildId = uuidFromSeed(`${PACKAGE_ID}:child:${row.set_key}:${row.card_number}:${row.card_name}:${row.proposed_variant_key}:${row.base_parent_child_finishes[0]}`);
      return {
        target_parent_id: targetParentId,
        target_child_id: targetChildId,
        base_parent_id: row.base_parent_ids[0],
        set_key: row.set_key,
        card_number: row.card_number,
        card_name: row.card_name,
        target_finish_key: row.base_parent_child_finishes[0],
        target_variant_key: row.proposed_variant_key,
        stamp_label: row.stamp_label,
        target_number_plain: numberPlain(row.card_number),
        evidence: {
          sources: row.sources,
          preserved_evidence_sources: row.preserved_evidence_sources,
          evidence_urls: [...new Set([...(row.evidence_urls ?? []), ...(row.preserved_evidence_urls ?? [])])],
          stamp_confidence: row.stamp_confidence,
          readiness_fingerprint: readiness.fingerprint_sha256,
        },
      };
    });
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         base_parent_id uuid,
         target_finish_key text,
         target_variant_key text,
         target_number_plain text
       )
     )
     select
       'target_parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       null::text as finish_key
     from target t
     join public.card_prints cp on cp.id = t.target_parent_id
     union all
     select
       'target_child' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cpr.finish_key
     from target t
     join public.card_printings cpr on cpr.id = t.target_child_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'proposed_parent_collision' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       null::text as finish_key
     from target t
     join public.card_prints base on base.id = t.base_parent_id
     join public.card_prints cp
       on cp.id <> t.target_parent_id
      and cp.set_id = base.set_id
      and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number)
      and lower(cp.name) = lower(base.name)
      and coalesce(cp.variant_key, '') = coalesce(t.target_variant_key, '')
     order by row_type, set_code nulls last, number_plain nulls last, number nulls last, name nulls last, finish_key nulls last, row_id`,
    [JSON.stringify(targets)],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      target_parent_rows: rows.filter((row) => row.row_type === 'target_parent').length,
      target_child_rows: rows.filter((row) => row.row_type === 'target_child').length,
      proposed_parent_collision_rows: rows.filter((row) => row.row_type === 'proposed_parent_collision').length,
      total_rows: rows.length,
    },
  };
}

async function runDryRun(client, targets, packageFingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg11a_targets (
         target_parent_id uuid primary key,
         target_child_id uuid not null,
         base_parent_id uuid not null,
         set_key text not null,
         card_number text not null,
         card_name text not null,
         target_finish_key text not null,
         target_variant_key text not null,
         stamp_label text not null,
         target_number_plain text not null,
         evidence jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg11a_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         base_parent_id uuid,
         set_key text,
         card_number text,
         card_name text,
         target_finish_key text,
         target_variant_key text,
         stamp_label text,
         target_number_plain text,
         evidence jsonb
       )`,
      [JSON.stringify(targets)],
    );
    const guard = await client.query(
      `select
         (select count(*)::int from pkg11a_targets) as target_count,
         (select count(distinct target_parent_id)::int from pkg11a_targets) as target_parent_count,
         (select count(distinct target_child_id)::int from pkg11a_targets) as target_child_count,
         (select count(*)::int from pkg11a_targets target left join public.card_prints base on base.id = target.base_parent_id where base.id is null) as missing_base_count,
         (select count(*)::int from pkg11a_targets target left join public.finish_keys fk on fk.key = target.target_finish_key and fk.is_active = true where fk.key is null) as inactive_finish_count,
         (select count(*)::int
          from pkg11a_targets target
          join public.card_prints base on base.id = target.base_parent_id
          join public.card_prints cp
            on cp.set_id = base.set_id
           and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number)
           and lower(cp.name) = lower(base.name)
           and coalesce(cp.variant_key, '') = target.target_variant_key) as parent_collision_count,
         (select count(*)::int from pkg11a_targets target join public.card_printings cpr on cpr.id = target.target_child_id) as child_collision_count`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_count !== targets.length ||
      guardRow.target_parent_count !== targets.length ||
      guardRow.target_child_count !== targets.length ||
      guardRow.missing_base_count !== 0 ||
      guardRow.inactive_finish_count !== 0 ||
      guardRow.parent_collision_count !== 0 ||
      guardRow.child_collision_count !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
    }
    const parentInsert = await client.query(
      `insert into public.card_prints (
         id, game_id, set_id, name, number, variant_key, rarity, image_url, tcgplayer_id, external_ids,
         updated_at, set_code, artist, regulation_mark, image_alt_url, image_source, variants, created_at,
         last_synced_at, print_identity_key, ai_metadata, image_hash, data_quality_flags, image_status,
         image_res, image_last_checked_at, printed_set_abbrev, printed_total, gv_id,
         image_path, identity_domain, printed_identity_modifier, set_identity_model, representative_image_url, image_note
       )
       select
         target.target_parent_id, base.game_id, base.set_id, base.name, base.number,
         target.target_variant_key, base.rarity, null, null,
         jsonb_build_object('verified_master_index_v1', target.evidence), now(), base.set_code,
         base.artist, base.regulation_mark, null, null, base.variants, now(),
         now(), base.print_identity_key,
         coalesce(base.ai_metadata, '{}'::jsonb) || jsonb_build_object(
           'source', 'verified_master_set_index_v1',
           'package_id', $1::text,
           'source_package_id', $2::text,
           'base_parent_id', base.id::text,
           'stamp_label', target.stamp_label,
           'variant_key', target.target_variant_key
         ),
         null, base.data_quality_flags, 'representative_shared_stamp',
         base.image_res, now(), base.printed_set_abbrev, base.printed_total,
         concat('GV-PK-', upper(regexp_replace(coalesce(base.printed_set_abbrev, base.set_code), '[^A-Za-z0-9]+', '-', 'g')), '-', base.number_plain, '-', $3::text, upper(regexp_replace(target.target_variant_key, '[^A-Za-z0-9]+', '-', 'g'))),
         null, base.identity_domain, null, base.set_identity_model,
         coalesce(base.representative_image_url, base.image_url),
         concat('Stamped canonical identity: ', target.stamp_label, '. Representative base image only until exact stamped image is available.')
       from pkg11a_targets target
       join public.card_prints base on base.id = target.base_parent_id`,
      [PACKAGE_ID, SOURCE_PACKAGE_ID, ''],
    );
    const childInsert = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, created_at, is_provisional, provenance_source, provenance_ref, created_by,
         printing_gv_id, image_source, image_path, image_url, image_alt_url, image_status, image_note
       )
       select
         target.target_child_id,
         target.target_parent_id,
         target.target_finish_key,
         now(),
         false,
         'verified_master_set_index_v1',
         concat(target.set_key, ':', target.card_number, ':stamped_identity:', target.target_variant_key, ':', target.target_finish_key),
         'english_master_index_pkg11a_stamped_parent_identity_guarded_dry_run_v1',
         null,
         null, null, null, null,
         'representative_shared_stamp',
         concat('Stamped identity child finish copied from unambiguous base finish: ', target.target_finish_key)
       from pkg11a_targets target`,
    );
    if (parentInsert.rowCount !== targets.length || childInsert.rowCount !== targets.length) {
      throw new Error(`insert count mismatch: ${JSON.stringify({ parent_inserts: parentInsert.rowCount, child_inserts: childInsert.rowCount })}`);
    }
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from pkg11a_targets) as target_rows,
         (select count(*)::int from public.card_prints cp join pkg11a_targets target on target.target_parent_id = cp.id) as inserted_parent_rows,
         (select count(*)::int from public.card_printings cpr join pkg11a_targets target on target.target_child_id = cpr.id) as inserted_child_rows`,
      [PACKAGE_ID, packageFingerprint],
    );
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      status: 'pkg11a_stamped_parent_identity_completed_rolled_back_no_durable_change',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: proof.rows,
      guard: guardRow,
      simulated_write_counts: {
        parent_inserts: parentInsert.rowCount,
        child_inserts: childInsert.rowCount,
        deletes: 0,
        merges: 0,
      },
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => null);
    return {
      status: 'pkg11a_stamped_parent_identity_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: [],
      guard: null,
      simulated_write_counts: {
        parent_inserts: 0,
        child_inserts: 0,
        deletes: 0,
        merges: 0,
      },
    };
  }
}

function renderMarkdown(report) {
  const targetRows = report.scope.targets.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.stamp_label,
    row.target_variant_key,
    row.target_finish_key,
  ]);
  return `# PKG-11A Stamped Parent Identity Guarded Dry Run V1

Rollback-only dry run for the first stamped canonical parent identity pilot. This does not activate \`stamped\` as a child finish.

## Status

- dry_run_status: \`${report.dry_run_status}\`
- fingerprint: \`${report.package_fingerprint_sha256}\`
- target_parent_rows: ${report.scope.target_parent_rows}
- target_child_rows: ${report.scope.target_child_rows}
- durable_db_writes_performed: \`${report.durable_db_writes_performed}\`
- stop_findings: ${report.stop_findings.length}

## Rollback Proof

- before_hash: \`${report.before_snapshot?.hash_sha256 ?? 'n/a'}\`
- after_hash: \`${report.after_snapshot?.hash_sha256 ?? 'n/a'}\`
- match: \`${report.rollback_proof_equal}\`

## Targets

${markdownTable(['set', 'number', 'name', 'stamp_label', 'variant_key', 'child_finish'], targetRows)}

## Recommended Approval Text

\`\`\`text
${report.recommended_real_apply_approval_text ?? 'not ready'}
\`\`\`
`;
}

async function updateCheckpointIndex() {
  await fs.mkdir(CHECKPOINT_DIR, { recursive: true });
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-11A Stamped Parent Identity Guarded Dry Run Checkpoint V1](20260610_pkg11a_stamped_parent_identity_guarded_dry_run_checkpoint_v1.md) | Rollback-only dry run for 16 stamped canonical parent identity inserts. No durable writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? await fs.readFile(indexPath, 'utf8') : '# Master Index Checkpoint Index\n\n';
  if (current.includes('20260610_pkg11a_stamped_parent_identity_guarded_dry_run_checkpoint_v1.md')) {
    const next = current.split(/\r?\n/).map((existingLine) => (
      existingLine.includes('20260610_pkg11a_stamped_parent_identity_guarded_dry_run_checkpoint_v1.md') ? line : existingLine
    )).join('\n');
    await fs.writeFile(indexPath, next.endsWith('\n') ? next : `${next}\n`);
    return;
  }
  await fs.writeFile(indexPath, `${current.trimEnd()}\n${line}\n`);
}

async function main() {
  const readiness = await readJson(READINESS_JSON);
  const targets = buildTargets(readiness);
  const packageFingerprint = sha256(stableJson({ package_id: PACKAGE_ID, readiness_fingerprint: readiness.fingerprint_sha256, targets }));
  const targetFindings = [];
  if (readiness.package_id !== SOURCE_PACKAGE_ID) targetFindings.push('readiness_package_mismatch');
  if (targets.length !== MAX_ROWS) targetFindings.push(`target_count_not_${MAX_ROWS}:${targets.length}`);
  if (targets.some((row) => row.target_finish_key === 'stamped')) targetFindings.push('target_uses_stamped_child_finish');
  if (new Set(targets.map((row) => row.target_parent_id)).size !== targets.length) targetFindings.push('duplicate_target_parent_id');
  if (new Set(targets.map((row) => row.target_child_id)).size !== targets.length) targetFindings.push('duplicate_target_child_id');

  let execution = {
    status: 'not_run',
    error_message: targetFindings.join(', '),
    before_snapshot: null,
    after_snapshot: null,
    rollback_proof_rows: [],
    guard: null,
    simulated_write_counts: { parent_inserts: 0, child_inserts: 0, deletes: 0, merges: 0 },
  };
  if (targetFindings.length === 0) {
    const conn = connectionString();
    if (!conn) targetFindings.push('database_connection_unavailable');
    else {
      const client = new Client({ connectionString: conn });
      await client.connect();
      try {
        execution = await runDryRun(client, targets, packageFingerprint);
      } finally {
        await client.end().catch(() => {});
      }
    }
  }

  const rollbackEqual = execution.before_snapshot?.hash_sha256 === execution.after_snapshot?.hash_sha256;
  const stopFindings = [
    ...targetFindings,
    ...(execution.status !== 'pkg11a_stamped_parent_identity_completed_rolled_back_no_durable_change' ? ['dry_run_not_completed'] : []),
    ...(rollbackEqual ? [] : ['rollback_snapshot_hash_mismatch']),
  ];
  const approvalText = `Approve real PKG-11A-STAMPED-CANONICAL-PARENT-IDENTITY-PILOT apply only. Fingerprint: ${packageFingerprint}. Scope: 16 stamped canonical parent inserts and 16 child printing inserts using unambiguous base child finishes; child finishes holo=15, normal=1; no stamped finish activation; no deletes; no merges; no unsupported cleanup. Dry-run proof: ${execution.before_snapshot?.hash_sha256 ?? 'n/a'} == ${execution.after_snapshot?.hash_sha256 ?? 'n/a'}. No global apply. No migrations.`;

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg11a_stamped_parent_identity_guarded_dry_run_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: packageFingerprint,
    source_readiness_fingerprint_sha256: readiness.fingerprint_sha256,
    dry_run_status: execution.status,
    error_message: execution.error_message,
    audit_only: true,
    durable_db_writes_performed: false,
    db_writes_committed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    merges_performed: false,
    stamped_finish_activation_performed: false,
    rollback_proof_equal: rollbackEqual,
    before_snapshot: execution.before_snapshot,
    after_snapshot: execution.after_snapshot,
    rollback_proof_rows: execution.rollback_proof_rows,
    guard: execution.guard,
    simulated_write_counts: execution.simulated_write_counts,
    scope: {
      target_parent_rows: targets.length,
      target_child_rows: targets.length,
      by_set: countBy(targets, (row) => row.set_key),
      by_variant_key: countBy(targets, (row) => row.target_variant_key),
      by_child_finish: countBy(targets, (row) => row.target_finish_key),
      targets,
    },
    stop_findings: stopFindings,
    recommended_real_apply_approval_text: stopFindings.length === 0 ? approvalText : null,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  await writeText(CHECKPOINT_MD, `# PKG-11A Stamped Parent Identity Guarded Dry Run Checkpoint V1

- Package: \`${PACKAGE_ID}\`
- Fingerprint: \`${packageFingerprint}\`
- Dry-run status: \`${execution.status}\`
- Before hash: \`${execution.before_snapshot?.hash_sha256 ?? 'n/a'}\`
- After hash: \`${execution.after_snapshot?.hash_sha256 ?? 'n/a'}\`
- Rollback proof match: \`${rollbackEqual}\`
- Parent inserts simulated: ${execution.simulated_write_counts.parent_inserts}
- Child inserts simulated: ${execution.simulated_write_counts.child_inserts}
- Deletes simulated: ${execution.simulated_write_counts.deletes}
- Merges simulated: ${execution.simulated_write_counts.merges}
- DB writes committed: \`false\`
- Migrations created: \`false\`
- Stamped finish activated: \`false\`
`);
  await updateCheckpointIndex();

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: packageFingerprint,
    dry_run_status: execution.status,
    stop_findings: stopFindings,
    simulated_write_counts: execution.simulated_write_counts,
    before_hash: execution.before_snapshot?.hash_sha256 ?? null,
    after_hash: execution.after_snapshot?.hash_sha256 ?? null,
    rollback_proof_equal: rollbackEqual,
    scope: {
      target_parent_rows: targets.length,
      by_set: report.scope.by_set,
      by_child_finish: report.scope.by_child_finish,
      by_variant_key: report.scope.by_variant_key,
    },
    output_json: path.relative(ROOT, OUTPUT_JSON),
    output_md: path.relative(ROOT, OUTPUT_MD),
    recommended_real_apply_approval_text: report.recommended_real_apply_approval_text,
  }, null, 2));

  if (stopFindings.length) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
