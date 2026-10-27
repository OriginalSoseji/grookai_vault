#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import pg from 'pg';

import '../../backend/env.mjs';
import {
  connectExactMappingPlannerV1,
} from '../../backend/pricing/exact_mapping_planner_connection_v1.mjs';

const { Client } = pg;

export const VERSION = 'POKEMON_COUNTDOWN_CALENDAR_VARIANT_PLAN_V1';
const PROPOSAL_VERSION = 'POKEMON_SPECIAL_PRINTING_REFERENCE_PROPOSAL_V1';
const PRODUCTION_PROJECT_REF = 'ycdxbpibncqcchqiihfz';

function text(value) {
  return String(value ?? '').trim();
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
}

function uuidFromSeed(seed) {
  const hex = sha256(seed).slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const raw = hex.join('');
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

export function buildPokemonCountdownCalendarPlanTargetsV1(proposal) {
  if (proposal?.version !== PROPOSAL_VERSION) throw new Error('proposal version mismatch');
  if (proposal?.database_writes_performed !== false) throw new Error('proposal write boundary mismatch');
  return (proposal.rows ?? []).map((row) => ({
    ...row,
    target_parent_id: uuidFromSeed(
      `${VERSION}:${proposal.fingerprint_sha256}:parent:${row.source_product_id}`,
    ),
    target_child_id: uuidFromSeed(
      `${VERSION}:${proposal.fingerprint_sha256}:child:${row.source_product_id}:${row.proposed_finish_key}`,
    ),
  }));
}

export function evaluatePokemonCountdownCalendarLiveRowV1(target, live) {
  const blockers = [
    target.status !== 'ready_for_guarded_variant_parent_plan'
      ? 'proposal_row_not_ready'
      : null,
    Number(live.base_count) !== 1 ? 'base_parent_count_not_one' : null,
    live.base_gv_id !== target.base_gv_id ? 'base_gv_id_changed' : null,
    live.base_set_code !== target.base_set_code ? 'base_set_code_changed' : null,
    live.base_name !== target.base_name ? 'base_name_changed' : null,
    String(live.base_number ?? '') !== String(target.base_number ?? '')
      ? 'base_number_changed'
      : null,
    Number(live.base_finish_count) !== 1 ? 'base_finish_count_not_one' : null,
    Number(live.active_finish_count) !== 1 ? 'finish_key_missing_or_inactive' : null,
    Number(live.source_mapping_count) !== 0 ? 'source_product_already_mapped' : null,
    Number(live.variant_parent_collision_count) !== 0 ? 'variant_parent_collision' : null,
    Number(live.gv_id_collision_count) !== 0 ? 'proposed_gv_id_collision' : null,
    Number(live.target_parent_id_collision_count) !== 0 ? 'target_parent_id_collision' : null,
    Number(live.target_child_id_collision_count) !== 0 ? 'target_child_id_collision' : null,
    text(live.identity_projection_status) !== 'ready' ? 'identity_projection_not_ready' : null,
    Number(live.identity_hash_collision_count) !== 0 ? 'identity_hash_collision' : null,
  ].filter(Boolean);
  return {
    ...target,
    live,
    status: blockers.length === 0
      ? 'ready_for_transactional_rollback_rehearsal'
      : 'blocked_by_live_invariant',
    blockers,
    review_only: true,
    canonical_write_authority: false,
    mapping_authority: false,
    publication_authority: false,
  };
}

function connectionString() {
  return process.env.SUPABASE_DB_URL
    || process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || '';
}

export function assertPokemonCountdownCalendarEnvironmentSanityV1(databaseTarget, counts) {
  if (databaseTarget?.kind !== 'production_project'
      || databaseTarget?.project_ref !== PRODUCTION_PROJECT_REF
      || databaseTarget?.verified_tls !== true
      || databaseTarget?.startup_read_only !== true) {
    throw new Error('countdown_variant_plan_production_reader_required');
  }
  if (Number(counts?.card_prints) < 40_000
      || Number(counts?.sets) < 150
      || Number(counts?.card_print_traits) < 5_000) {
    throw new Error('countdown_variant_plan_environment_maturity_gate_failed');
  }
  return {
    project_ref: databaseTarget.project_ref,
    card_prints: Number(counts.card_prints),
    sets: Number(counts.sets),
    card_print_traits: Number(counts.card_print_traits),
    maturity_gate_passed: true,
  };
}

async function captureEnvironmentSanity(client, databaseTarget) {
  const result = await client.query(
    `select
       (select count(*)::integer from public.card_prints) as card_prints,
       (select count(*)::integer from public.sets) as sets,
       (select count(*)::integer from public.card_print_traits) as card_print_traits`,
  );
  if (result.rows.length !== 1) throw new Error('countdown_variant_plan_environment_count_failed');
  return assertPokemonCountdownCalendarEnvironmentSanityV1(databaseTarget, result.rows[0]);
}

async function captureLiveRow(client, target) {
  const result = await client.query(
    `with base as (
       select cp.*, s.source as set_source, s.code as registry_set_code,
              s.printed_total as registry_printed_total,
              s.printed_set_abbrev as registry_printed_set_abbrev
         from public.card_prints cp
         join public.sets s on s.id = cp.set_id
        where cp.id = $1::uuid
     ), projection as (
       select public.card_print_identity_backfill_projection_v1(
         base.set_source,
         base.set_code,
         base.registry_set_code,
         base.number,
         base.number_plain,
         base.name,
         $3::text,
         coalesce(base.printed_total, base.registry_printed_total),
         coalesce(base.printed_set_abbrev, base.registry_printed_set_abbrev)
       ) as value
       from base
     )
     select
       (select count(*)::int from base) as base_count,
       (select gv_id from base limit 1) as base_gv_id,
       (select set_code from base limit 1) as base_set_code,
       (select name from base limit 1) as base_name,
       (select number from base limit 1) as base_number,
       (select count(*)::int from public.card_printings child
         where child.card_print_id = $1::uuid
           and child.finish_key = $2::text
           and child.is_provisional = false) as base_finish_count,
       (select count(*)::int from public.finish_keys finish
         where finish.key = $2::text and finish.is_active = true) as active_finish_count,
       (select count(*)::int from public.external_mappings mapping
         where mapping.source = 'tcgplayer'
           and mapping.external_id = $4::text) as source_mapping_count,
       (select count(*)::int
          from base
          join public.card_prints existing
            on existing.set_id = base.set_id
           and coalesce(existing.number_plain, existing.number) = coalesce(base.number_plain, base.number)
           and lower(existing.name) = lower(base.name)
           and coalesce(existing.variant_key, '') = $3::text) as variant_parent_collision_count,
       (select count(*)::int from public.card_prints where gv_id = $5::text) as gv_id_collision_count,
       (select count(*)::int from public.card_prints where id = $6::uuid) as target_parent_id_collision_count,
       (select count(*)::int from public.card_printings where id = $7::uuid) as target_child_id_collision_count,
       (select value->>'status' from projection limit 1) as identity_projection_status,
       (select count(*)::int
          from projection
          join public.card_print_identity identity
            on identity.is_active = true
           and identity.identity_domain = projection.value->>'identity_domain'
           and identity.identity_key_version = projection.value->>'identity_key_version'
           and identity.identity_key_hash = projection.value->>'identity_key_hash') as identity_hash_collision_count`,
    [
      target.base_card_print_id,
      target.proposed_finish_key,
      target.proposed_variant_key,
      String(target.source_product_id),
      target.proposed_parent_gv_id,
      target.target_parent_id,
      target.target_child_id,
    ],
  );
  return result.rows[0];
}

function parseArgs(argv) {
  const value = (name) => argv.find((arg) => arg.startsWith(`--${name}=`))
    ?.slice(name.length + 3).trim() ?? '';
  const proposal = value('proposal');
  const output = value('output');
  if (!proposal || !output) throw new Error('--proposal and --output are required');
  return { proposal: path.resolve(proposal), output: path.resolve(output) };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const proposal = JSON.parse(await fs.readFile(args.proposal, 'utf8'));
  const targets = buildPokemonCountdownCalendarPlanTargetsV1(proposal);
  const url = connectionString();
  if (!url) throw new Error('SUPABASE_DB_URL is required');
  const { client, databaseTarget } = await connectExactMappingPlannerV1({
    Client,
    connectionString: url,
  });
  let rows;
  let environmentSanity;
  try {
    await client.query('begin read only');
    environmentSanity = await captureEnvironmentSanity(client, databaseTarget);
    rows = [];
    for (const target of targets) {
      rows.push(evaluatePokemonCountdownCalendarLiveRowV1(
        target,
        await captureLiveRow(client, target),
      ));
    }
    await client.query('rollback');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
  const fingerprintPayload = {
    version: VERSION,
    proposal_fingerprint_sha256: proposal.fingerprint_sha256,
    rows,
  };
  const ready = rows.filter((row) => (
    row.status === 'ready_for_transactional_rollback_rehearsal'
  )).length;
  const report = {
    version: VERSION,
    generated_at: new Date().toISOString(),
    database_reads_only: true,
    database_writes_performed: false,
    approvals_performed: false,
    public_visibility_changed: false,
    proposal_fingerprint_sha256: proposal.fingerprint_sha256,
    database_target: databaseTarget,
    environment_sanity: environmentSanity,
    summary: {
      planned_rows: rows.length,
      ready_for_transactional_rollback_rehearsal: ready,
      blocked_by_live_invariant: rows.length - ready,
    },
    rows,
    fingerprint_sha256: sha256(stableJson(fingerprintPayload)),
  };
  await fs.writeFile(args.output, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report.summary)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(`[pokemon-countdown-calendar-variant-plan] ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
