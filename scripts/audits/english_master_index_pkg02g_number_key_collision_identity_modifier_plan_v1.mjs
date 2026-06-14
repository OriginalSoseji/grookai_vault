import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'english_master_index_v1',
);
const SQL_DIR = path.join(ROOT, 'docs', 'sql');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const PKG02D_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02d_collision_adjudication_v1.json');
const PKG02F_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02f_duplicate_dependency_transfer_real_apply_v1.json');
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_pkg02g_number_key_collision_identity_modifier_plan_v1.json',
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  'english_master_index_pkg02g_number_key_collision_identity_modifier_plan_v1.md',
);
const OUTPUT_SQL = path.join(
  SQL_DIR,
  'english_master_index_pkg02g_number_key_collision_identity_modifier_guarded_dry_run_transaction_v1.sql',
);
const CHECKPOINT_MD = path.join(
  CHECKPOINT_DIR,
  '20260609_pkg02g_number_key_collision_identity_modifier_plan_checkpoint_v1.md',
);

const PACKAGE_ID = 'PKG-02G-NUMBER-KEY-IDENTITY-MODIFIER';
const PARENT_PACKAGE_ID = 'PKG-02B-FULL-BETA';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlUuid(value) {
  return `${sqlString(value)}::uuid`;
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function slug(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function derivePrintedIdentityModifier({ number, name }) {
  const printedNumber = String(number ?? '').trim();
  const printedName = String(name ?? '').trim();
  const prefixMatch = printedNumber.match(/^([A-Za-z]+)(?=\d+$)/);
  if (prefixMatch) return `number_prefix:${prefixMatch[1].toUpperCase()}`;
  if (/\bLV\.?\s*X\b/i.test(printedName)) return 'level_x';
  const parenthetical = printedName.match(/\(([^)]+)\)/);
  if (parenthetical) return `trainer_subject:${slug(parenthetical[1])}`;
  if (/\bTechnical Machine G\b/i.test(printedName)) return 'name_suffix:g';
  return null;
}

function deriveCollisionKind({ number, name, conflictNumber, conflictName }) {
  if (/^[A-Za-z]+\d+$/.test(String(number ?? '')) || /^[A-Za-z]+\d+$/.test(String(conflictNumber ?? ''))) {
    return 'prefixed_number_collision';
  }
  if (/\bLV\.?\s*X\b/i.test(`${name ?? ''} ${conflictName ?? ''}`)) return 'lvx_name_modifier_collision';
  if (/\bTechnical Machine\b/i.test(`${name ?? ''} ${conflictName ?? ''}`)) return 'technical_machine_name_collision';
  if (/[()]/.test(`${name ?? ''} ${conflictName ?? ''}`)) return 'trainer_parenthetical_name_collision';
  return 'other_number_plain_collision';
}

function computeNumberPlain(number) {
  if (number === null || number === undefined) return null;
  const raw = String(number);
  if (/^[A-Za-z][0-9]+$/.test(raw)) return raw.toUpperCase();
  if (/[0-9]/.test(raw)) return raw.replace(/\/.*$/, '').replace(/[^0-9]/g, '');
  return raw;
}

async function captureRows(cardPrintIds) {
  const conn = connectionString();
  if (!conn) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      rows: [],
    };
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(
      `select
         cp.id,
         to_jsonb(cp) as card_print,
         s.code as resolved_set_code,
         s.name as resolved_set_name,
         coalesce((
           select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id)
           from public.card_printings cpr
           where cpr.card_print_id = cp.id
         ), '[]'::jsonb) as card_printings,
         coalesce((
           select jsonb_agg(to_jsonb(em) order by em.source, em.external_id, em.id)
           from public.external_mappings em
           where em.card_print_id = cp.id
         ), '[]'::jsonb) as external_mappings,
         coalesce((
           select jsonb_agg(to_jsonb(cpi) order by cpi.id)
           from public.card_print_identity cpi
           where cpi.card_print_id = cp.id
         ), '[]'::jsonb) as card_print_identity,
         coalesce((
           select jsonb_agg(to_jsonb(cpt) order by cpt.id)
           from public.card_print_traits cpt
           where cpt.card_print_id = cp.id
         ), '[]'::jsonb) as card_print_traits,
         coalesce((
           select jsonb_agg(to_jsonb(cps) order by cps.id)
           from public.card_print_species cps
           where cps.card_print_id = cp.id
         ), '[]'::jsonb) as card_print_species,
         coalesce((
           select jsonb_agg(to_jsonb(vi) order by vi.id)
           from public.vault_items vi
           where vi.card_id = cp.id
         ), '[]'::jsonb) as vault_items
       from public.card_prints cp
       left join public.sets s on s.id = cp.set_id
       where cp.id = any($1::uuid[])
       order by s.code nulls first, cp.number_plain nulls first, cp.number nulls first, cp.name, cp.id`,
      [cardPrintIds],
    );
    await client.query('rollback');
    const rows = result.rows.map((row) => ({
      card_print_id: row.id,
      card_print: row.card_print,
      resolved_set_code: row.resolved_set_code,
      resolved_set_name: row.resolved_set_name,
      card_printings: row.card_printings,
      external_mappings: row.external_mappings,
      card_print_identity: row.card_print_identity,
      card_print_traits: row.card_print_traits,
      card_print_species: row.card_print_species,
      vault_items: row.vault_items,
      dependency_counts: {
        card_printings: row.card_printings.length,
        external_mappings: row.external_mappings.length,
        card_print_identity: row.card_print_identity.length,
        card_print_traits: row.card_print_traits.length,
        card_print_species: row.card_print_species.length,
        vault_items: row.vault_items.length,
      },
    }));
    return {
      available: true,
      reason: null,
      captured_at: new Date().toISOString(),
      rows,
      hash_sha256: sha256(stableJson(rows)),
      impact_counts: {
        card_prints_found: rows.length,
        card_printings_found: rows.reduce((sum, row) => sum + row.dependency_counts.card_printings, 0),
        external_mappings_found: rows.reduce((sum, row) => sum + row.dependency_counts.external_mappings, 0),
        identity_rows_found: rows.reduce((sum, row) => sum + row.dependency_counts.card_print_identity, 0),
        trait_rows_found: rows.reduce((sum, row) => sum + row.dependency_counts.card_print_traits, 0),
        species_rows_found: rows.reduce((sum, row) => sum + row.dependency_counts.card_print_species, 0),
        vault_items_found: rows.reduce((sum, row) => sum + row.dependency_counts.vault_items, 0),
      },
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      available: false,
      reason: error.message,
      rows: [],
    };
  } finally {
    await client.end().catch(() => {});
  }
}

async function captureAffectedSetRows(setIds) {
  const conn = connectionString();
  if (!conn) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      rows: [],
    };
  }
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(
      `select
         cp.id,
         cp.set_id,
         cp.set_code,
         cp.set_identity_model,
         cp.number,
         cp.number_plain,
         cp.name,
         cp.printed_identity_modifier,
         cp.variant_key
       from public.card_prints cp
       where cp.set_id = any($1::uuid[])
       order by cp.set_id, cp.number_plain nulls first, cp.number nulls first, cp.name, cp.id`,
      [setIds],
    );
    await client.query('rollback');
    return {
      available: true,
      reason: null,
      rows: result.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      available: false,
      reason: error.message,
      rows: [],
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function addUpdate(updatesById, row) {
  const existing = updatesById.get(row.card_print_id);
  if (existing && stableJson(existing.target_fields) !== stableJson(row.target_fields)) {
    throw new Error(`conflicting proposed update for ${row.card_print_id}`);
  }
  updatesById.set(row.card_print_id, row);
}

function buildPlanRows(collisionRows, currentRowsById) {
  const updatesById = new Map();
  const collisionPlanRows = [];

  for (const row of collisionRows) {
    const currentTarget = currentRowsById.get(row.blocked_card_print_id);
    const targetModifier = derivePrintedIdentityModifier({
      number: row.target_number,
      name: row.target_name,
    });
    const conflict = row.conflict_rows[0] ?? {};
    const conflictModifier = derivePrintedIdentityModifier({
      number: conflict.current_number ?? conflict.number,
      name: conflict.current_name ?? conflict.name,
    });
    const collisionKind = deriveCollisionKind({
      number: row.target_number,
      name: row.target_name,
      conflictNumber: conflict.current_number ?? conflict.number,
      conflictName: conflict.current_name ?? conflict.name,
    });

    addUpdate(updatesById, {
      update_class: 'blocked_target_parent_recovery',
      reason: 'recover_blocked_parent_identity_after_modifier_disambiguation',
      collision_kind: collisionKind,
      card_print_id: row.blocked_card_print_id,
      set_key: row.set_key,
      set_name: row.set_name,
      target_fields: {
        set_code: row.target_set_code,
        number: row.target_number,
        name: row.target_name,
        printed_identity_modifier: targetModifier,
      },
      expected_before_fields: {
        set_code: currentTarget?.card_print?.set_code ?? null,
        number: currentTarget?.card_print?.number ?? null,
        name: currentTarget?.card_print?.name ?? null,
        printed_identity_modifier: currentTarget?.card_print?.printed_identity_modifier ?? null,
      },
      evidence: {
        collision_source: 'PKG-02D',
        target_number_plain: row.target_number_plain,
        target_finishes: row.current_target_fields?.finishes ?? [],
      },
    });

    if (conflict.card_print_id) {
      const currentConflict = currentRowsById.get(conflict.card_print_id);
      const currentModifier = currentConflict?.card_print?.printed_identity_modifier ?? null;
      if (currentModifier !== conflictModifier) {
        addUpdate(updatesById, {
          update_class: 'existing_collision_holder_modifier',
          reason: 'preserve_existing_distinct_card_while_freeing_number_plain_identity_collision',
          collision_kind: collisionKind,
          card_print_id: conflict.card_print_id,
          set_key: row.set_key,
          set_name: row.set_name,
          target_fields: {
            set_code: currentConflict?.card_print?.set_code ?? conflict.current_set_code ?? conflict.set_code ?? row.target_set_code,
            number: currentConflict?.card_print?.number ?? conflict.current_number ?? conflict.number,
            name: currentConflict?.card_print?.name ?? conflict.current_name ?? conflict.name,
            printed_identity_modifier: conflictModifier,
          },
          expected_before_fields: {
            set_code: currentConflict?.card_print?.set_code ?? null,
            number: currentConflict?.card_print?.number ?? null,
            name: currentConflict?.card_print?.name ?? null,
            printed_identity_modifier: currentModifier,
          },
          evidence: {
            collision_source: 'PKG-02D',
            target_number_plain: conflict.current_number_plain ?? conflict.number_plain,
            target_finishes: conflict.current_finishes ?? [],
          },
        });
      }
    }

    collisionPlanRows.push({
      blocked_card_print_id: row.blocked_card_print_id,
      conflict_card_print_id: conflict.card_print_id ?? null,
      set_key: row.set_key,
      collision_kind: collisionKind,
      blocked_target_number: row.target_number,
      blocked_target_name: row.target_name,
      blocked_target_modifier: targetModifier,
      conflict_number: conflict.current_number ?? conflict.number ?? null,
      conflict_name: conflict.current_name ?? conflict.name ?? null,
      conflict_modifier: conflictModifier,
    });
  }

  return {
    parent_update_rows: [...updatesById.values()].sort((left, right) =>
      left.update_class.localeCompare(right.update_class) ||
      left.set_key.localeCompare(right.set_key) ||
      String(left.target_fields.number ?? '').localeCompare(String(right.target_fields.number ?? ''), undefined, { numeric: true }) ||
      String(left.target_fields.name ?? '').localeCompare(String(right.target_fields.name ?? ''))),
    collision_plan_rows: collisionPlanRows,
  };
}

function simulateUniqueIndexes({ affectedSetRows, parentUpdateRows }) {
  const updatesById = new Map(parentUpdateRows.map((row) => [row.card_print_id, row]));
  const finalRows = affectedSetRows.map((row) => {
    const update = updatesById.get(row.id);
    const number = update?.target_fields.number ?? row.number;
    return {
      ...row,
      set_code: update?.target_fields.set_code ?? row.set_code,
      number,
      number_plain: computeNumberPlain(number),
      name: update?.target_fields.name ?? row.name,
      printed_identity_modifier:
        update ? update.target_fields.printed_identity_modifier : row.printed_identity_modifier,
    };
  });

  const groups = new Map();
  for (const row of finalRows) {
    if (!row.set_id || !row.number_plain || row.set_identity_model !== 'standard') continue;
    const key = [
      row.set_id,
      row.number_plain,
      row.printed_identity_modifier ?? '',
      row.variant_key ?? '',
    ].join('|');
    const group = groups.get(key) ?? [];
    group.push({
      card_print_id: row.id,
      set_code: row.set_code,
      number: row.number,
      number_plain: row.number_plain,
      name: row.name,
      printed_identity_modifier: row.printed_identity_modifier,
      variant_key: row.variant_key ?? '',
    });
    groups.set(key, group);
  }

  const collisionGroups = [...groups.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([identity_key, rows]) => ({ identity_key, rows }));
  return {
    checked_rows: finalRows.length,
    final_unique_collision_groups: collisionGroups,
    final_unique_collision_count: collisionGroups.length,
  };
}

function summarize({ collisionPlanRows, parentUpdateRows }) {
  const byCollisionKind = {};
  const bySet = {};
  const byUpdateClass = {};
  for (const row of collisionPlanRows) {
    byCollisionKind[row.collision_kind] = (byCollisionKind[row.collision_kind] ?? 0) + 1;
    bySet[row.set_key] ??= {
      set_key: row.set_key,
      total_collision_rows: 0,
      prefixed_number_collision: 0,
      lvx_name_modifier_collision: 0,
      technical_machine_name_collision: 0,
      trainer_parenthetical_name_collision: 0,
      other_number_plain_collision: 0,
    };
    bySet[row.set_key].total_collision_rows += 1;
    bySet[row.set_key][row.collision_kind] += 1;
  }
  for (const row of parentUpdateRows) {
    byUpdateClass[row.update_class] = (byUpdateClass[row.update_class] ?? 0) + 1;
  }
  return {
    number_key_collision_rows: collisionPlanRows.length,
    parent_update_rows: parentUpdateRows.length,
    blocked_target_parent_recovery_rows: byUpdateClass.blocked_target_parent_recovery ?? 0,
    existing_collision_holder_modifier_rows: byUpdateClass.existing_collision_holder_modifier ?? 0,
    by_collision_kind: byCollisionKind,
    by_update_class: byUpdateClass,
    by_set: Object.values(bySet).sort((left, right) => left.set_key.localeCompare(right.set_key)),
  };
}

function buildSql({ packageFingerprint, parentUpdateRows }) {
  const values = parentUpdateRows.map((row) => `  (${[
    sqlUuid(row.card_print_id),
    sqlString(row.update_class),
    sqlString(row.collision_kind),
    sqlString(row.expected_before_fields.set_code),
    sqlString(row.expected_before_fields.number),
    sqlString(row.expected_before_fields.name),
    sqlString(row.expected_before_fields.printed_identity_modifier),
    sqlString(row.target_fields.set_code),
    sqlString(row.target_fields.number),
    sqlString(row.target_fields.name),
    sqlString(row.target_fields.printed_identity_modifier),
  ].join(', ')})`).join(',\n');

  return `-- ${PACKAGE_ID} guarded dry-run transaction
-- Fingerprint: ${packageFingerprint}
-- Scope: 58 number-key collision rows, ${parentUpdateRows.length} parent updates, no deletes, rollback-only.
-- No real apply. No migrations.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create temporary table pkg02g_parent_update_targets (
  card_print_id uuid primary key,
  update_class text not null,
  collision_kind text not null,
  expected_set_code text,
  expected_number text,
  expected_name text,
  expected_printed_identity_modifier text,
  target_set_code text,
  target_number text,
  target_name text,
  target_printed_identity_modifier text
) on commit drop;

insert into pkg02g_parent_update_targets (
  card_print_id,
  update_class,
  collision_kind,
  expected_set_code,
  expected_number,
  expected_name,
  expected_printed_identity_modifier,
  target_set_code,
  target_number,
  target_name,
  target_printed_identity_modifier
)
values
${values};

do $$
declare
  target_count int;
  drift_count int;
  final_collision_count int;
begin
  select count(*) into target_count from pkg02g_parent_update_targets;
  if target_count <> ${parentUpdateRows.length} then
    raise exception 'PKG-02G target count mismatch: %', target_count;
  end if;

  perform 1
  from public.card_prints cp
  where cp.id in (select card_print_id from pkg02g_parent_update_targets)
  for update;

  select count(*) into drift_count
  from public.card_prints cp
  join pkg02g_parent_update_targets target on target.card_print_id = cp.id
  where cp.set_code is distinct from target.expected_set_code
     or cp.number is distinct from target.expected_number
     or cp.name is distinct from target.expected_name
     or cp.printed_identity_modifier is distinct from target.expected_printed_identity_modifier;

  if drift_count <> 0 then
    raise exception 'PKG-02G before-state drift rows: %', drift_count;
  end if;

  update public.card_prints cp
  set printed_identity_modifier = target.target_printed_identity_modifier
  from pkg02g_parent_update_targets target
  where cp.id = target.card_print_id
    and target.update_class = 'existing_collision_holder_modifier';

  update public.card_prints cp
  set
    set_code = target.target_set_code,
    number = target.target_number,
    name = target.target_name,
    printed_identity_modifier = target.target_printed_identity_modifier
  from pkg02g_parent_update_targets target
  where cp.id = target.card_print_id
    and target.update_class = 'blocked_target_parent_recovery';

  select count(*) into drift_count
  from public.card_prints cp
  join pkg02g_parent_update_targets target on target.card_print_id = cp.id
  where cp.set_code is distinct from target.target_set_code
     or cp.number is distinct from target.target_number
     or cp.name is distinct from target.target_name
     or cp.printed_identity_modifier is distinct from target.target_printed_identity_modifier;

  if drift_count <> 0 then
    raise exception 'PKG-02G final field mismatch rows: %', drift_count;
  end if;

  select count(*) into final_collision_count
  from (
    select
      cp.set_id,
      cp.number_plain,
      coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
      coalesce(cp.variant_key, '') as variant_key,
      count(*) as row_count
    from public.card_prints cp
    where cp.set_id in (
      select distinct cp2.set_id
      from public.card_prints cp2
      join pkg02g_parent_update_targets target on target.card_print_id = cp2.id
    )
      and cp.set_id is not null
      and cp.number_plain is not null
      and cp.set_identity_model = 'standard'
    group by cp.set_id, cp.number_plain, coalesce(cp.printed_identity_modifier, ''), coalesce(cp.variant_key, '')
    having count(*) > 1
  ) collisions;

  if final_collision_count <> 0 then
    raise exception 'PKG-02G final unique identity collision groups: %', final_collision_count;
  end if;
end $$;

rollback;
`;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-02G Number-Key Collision Identity Modifier Plan V1');
  lines.push('');
  lines.push('This is an audit-only plan and rollback-only dry-run artifact for the 58 number-key collision rows excluded from PKG-02F.');
  lines.push('');
  lines.push('No SQL was executed. No DB writes, migrations, cleanup, quarantine, merge, or delete operation was performed.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| plan_status | ${report.plan_status} |`);
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |`);
  lines.push(`| number_key_collision_rows | ${report.summary.number_key_collision_rows} |`);
  lines.push(`| parent_update_rows | ${report.summary.parent_update_rows} |`);
  lines.push(`| blocked_target_parent_recovery_rows | ${report.summary.blocked_target_parent_recovery_rows} |`);
  lines.push(`| existing_collision_holder_modifier_rows | ${report.summary.existing_collision_holder_modifier_rows} |`);
  lines.push(`| simulated_final_unique_collision_count | ${report.simulated_unique_index_result.final_unique_collision_count} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Collision Kinds');
  lines.push('');
  lines.push('| Kind | Rows |');
  lines.push('| --- | ---: |');
  for (const [kind, count] of Object.entries(report.summary.by_collision_kind)) {
    lines.push(`| ${mdEscape(kind)} | ${count} |`);
  }
  lines.push('');
  lines.push('## Set Summary');
  lines.push('');
  lines.push('| Set | Rows | Prefix | LV.X | Technical Machine | Trainer Parenthetical | Other |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const row of report.summary.by_set) {
    lines.push(`| ${mdEscape(row.set_key)} | ${row.total_collision_rows} | ${row.prefixed_number_collision} | ${row.lvx_name_modifier_collision} | ${row.technical_machine_name_collision} | ${row.trainer_parenthetical_name_collision} | ${row.other_number_plain_collision} |`);
  }
  lines.push('');
  lines.push('## Required Approval Phrase For Dry Run');
  lines.push('');
  lines.push('```text');
  lines.push(report.required_operator_decision.exact_approval_phrase_required);
  lines.push('```');
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  for (const item of report.safety) lines.push(`- ${item}`);
  lines.push('');
  lines.push('## Stop Findings');
  lines.push('');
  if (report.stop_findings.length === 0) lines.push('- none');
  else for (const finding of report.stop_findings) lines.push(`- ${mdEscape(finding)}`);
  return `${lines.join('\n')}\n`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-02G Number-Key Collision Identity Modifier Plan Checkpoint V1](20260609_pkg02g_number_key_collision_identity_modifier_plan_checkpoint_v1.md) | Audit-only plan for 58 number-key collision rows using printed_identity_modifier; prepares rollback-only dry-run artifact, no execution, no migrations. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg02g_number_key_collision_identity_modifier_plan_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg02g_number_key_collision_identity_modifier_plan_checkpoint_v1.md') ? line : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const pkg02d = readJson(PKG02D_JSON);
  const pkg02f = readJson(PKG02F_JSON);
  const collisionRows = (pkg02d.adjudication_rows ?? [])
    .filter((row) => row.adjudication_status === 'number_plain_identity_collision_not_merge_safe');
  const involvedIds = [...new Set([
    ...collisionRows.map((row) => row.blocked_card_print_id),
    ...collisionRows.flatMap((row) => (row.conflict_rows ?? []).map((conflict) => conflict.card_print_id).filter(Boolean)),
  ])];
  const snapshot = await captureRows(involvedIds);
  const currentRowsById = new Map(snapshot.rows.map((row) => [row.card_print_id, row]));
  const {
    parent_update_rows: parentUpdateRows,
    collision_plan_rows: collisionPlanRows,
  } = buildPlanRows(collisionRows, currentRowsById);
  const affectedSetIds = [...new Set(snapshot.rows.map((row) => row.card_print?.set_id).filter(Boolean))];
  const affectedSetSnapshot = await captureAffectedSetRows(affectedSetIds);
  const simulatedUniqueIndexResult = simulateUniqueIndexes({
    affectedSetRows: affectedSetSnapshot.rows,
    parentUpdateRows,
  });
  const summary = summarize({ collisionPlanRows, parentUpdateRows });
  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    collisionPlanRows,
    parentUpdateRows,
  }));
  const sql = buildSql({ packageFingerprint, parentUpdateRows });
  const sqlHash = sha256(sql);
  const approvalPhrase = `Approve ${PACKAGE_ID} for guarded dry-run transaction execution only. Fingerprint: ${packageFingerprint}. Scope: 58 number-key collision rows, ${summary.parent_update_rows} parent identity updates, no deletes, rollback-only. No real apply. No migrations.`;

  const stopFindings = [];
  if (pkg02d.audit_status !== 'pkg02d_collision_adjudication_complete_no_write') {
    stopFindings.push('pkg02d_collision_adjudication_not_complete');
  }
  if (pkg02f.apply_status !== 'pkg02f_duplicate_dependency_transfer_real_apply_committed_and_verified') {
    stopFindings.push('pkg02f_real_apply_not_verified');
  }
  if (!snapshot.available) stopFindings.push('current_involved_row_snapshot_unavailable');
  if (!affectedSetSnapshot.available) stopFindings.push('affected_set_snapshot_unavailable');
  if (collisionRows.length !== 58) stopFindings.push('number_key_collision_row_count_not_58');
  if (snapshot.rows.length !== involvedIds.length) stopFindings.push('current_snapshot_missing_involved_rows');
  if (summary.blocked_target_parent_recovery_rows !== 58) {
    stopFindings.push('blocked_target_parent_recovery_rows_not_58');
  }
  if (simulatedUniqueIndexResult.final_unique_collision_count !== 0) {
    stopFindings.push('simulated_final_unique_index_collisions_present');
  }
  if (parentUpdateRows.some((row) => row.update_class === 'blocked_target_parent_recovery' && !row.target_fields.number)) {
    stopFindings.push('blocked_target_update_missing_number');
  }

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg02g_number_key_collision_identity_modifier_plan_v1',
    audit_only: true,
    plan_only: true,
    dry_run_artifact_prepared: true,
    dry_run_executed: false,
    real_apply_performed: false,
    db_reads_performed: snapshot.available || affectedSetSnapshot.available,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    merge_performed: false,
    delete_performed: false,
    apply_paths_executed: false,
    plan_status: stopFindings.length === 0
      ? 'pkg02g_number_key_collision_identity_modifier_plan_prepared_apply_blocked_no_write'
      : 'pkg02g_number_key_collision_identity_modifier_plan_blocked',
    package_scope: {
      package_id: PACKAGE_ID,
      parent_package_id: PARENT_PACKAGE_ID,
      package_fingerprint_sha256: packageFingerprint,
      number_key_collision_rows: 58,
      parent_update_rows: summary.parent_update_rows,
      blocked_target_parent_recovery_rows: summary.blocked_target_parent_recovery_rows,
      existing_collision_holder_modifier_rows: summary.existing_collision_holder_modifier_rows,
      deletes_included: false,
      global_apply_included: false,
      migrations_included: false,
    },
    source_artifacts: {
      pkg02d_collision_adjudication: path.relative(ROOT, PKG02D_JSON).replaceAll('\\', '/'),
      pkg02f_real_apply: path.relative(ROOT, PKG02F_JSON).replaceAll('\\', '/'),
    },
    current_snapshot: {
      available: snapshot.available,
      reason: snapshot.reason,
      captured_at: snapshot.captured_at,
      row_count: snapshot.rows.length,
      hash_sha256: snapshot.hash_sha256,
      impact_counts: snapshot.impact_counts,
    },
    affected_set_snapshot: {
      available: affectedSetSnapshot.available,
      reason: affectedSetSnapshot.reason,
      set_count: affectedSetIds.length,
      row_count: affectedSetSnapshot.rows.length,
    },
    summary,
    collision_plan_rows: collisionPlanRows,
    parent_update_rows: parentUpdateRows,
    simulated_unique_index_result: simulatedUniqueIndexResult,
    sql_artifact: {
      path: path.relative(ROOT, OUTPUT_SQL).replaceAll('\\', '/'),
      sha256: sqlHash,
      contains_update_statement: /\bupdate\s+public\.card_prints\b/i.test(sql),
      contains_delete_statement: /\bdelete\s+from\b/i.test(sql),
      contains_commit_statement: /(^|\n)\s*commit\s*;/i.test(sql.replace(/--.*$/gm, '')),
      contains_rollback_statement: /(^|\n)\s*rollback\s*;/i.test(sql.replace(/--.*$/gm, '')),
      execution_performed: false,
    },
    required_operator_decision: {
      decision_needed: true,
      exact_approval_phrase_required: approvalPhrase,
      approval_effect: 'Authorizes rollback-only execution of the PKG-02G dry-run transaction artifact. It does not authorize durable apply, deletes, migrations, cleanup, quarantine, or global apply.',
    },
    safety: [
      'No SQL was executed.',
      'No DB writes were performed.',
      'No migrations were created.',
      'No deletes are present in the SQL artifact.',
      'PKG-02G uses printed_identity_modifier to disambiguate real distinct cards.',
      'The simulated final standard-set unique identity check has zero collision groups.',
    ],
    stop_findings: stopFindings,
    report_hash_sha256: sha256(stableJson({
      summary,
      collisionPlanRows,
      parentUpdateRows,
      simulatedUniqueIndexResult,
      packageFingerprint,
    })),
    pass: stopFindings.length === 0,
  };

  writeJson(OUTPUT_JSON, report);
  fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));
  fs.mkdirSync(SQL_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_SQL, sql);
  fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
  fs.writeFileSync(CHECKPOINT_MD, renderMarkdown({
    ...report,
    plan_status: `${report.plan_status}_checkpoint`,
  }));
  updateCheckpointIndex();

  console.log(JSON.stringify({
    plan_status: report.plan_status,
    package_id: report.package_scope.package_id,
    package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
    number_key_collision_rows: report.summary.number_key_collision_rows,
    parent_update_rows: report.summary.parent_update_rows,
    blocked_target_parent_recovery_rows: report.summary.blocked_target_parent_recovery_rows,
    existing_collision_holder_modifier_rows: report.summary.existing_collision_holder_modifier_rows,
    simulated_final_unique_collision_count: report.simulated_unique_index_result.final_unique_collision_count,
    sql_artifact: report.sql_artifact.path,
    sql_sha256: report.sql_artifact.sha256,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
    stop_findings: report.stop_findings.length,
    required_approval: report.required_operator_decision.exact_approval_phrase_required,
  }, null, 2));

  if (!report.pass) process.exitCode = 1;
}

await main();
