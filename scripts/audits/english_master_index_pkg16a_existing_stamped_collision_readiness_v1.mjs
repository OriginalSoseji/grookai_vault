import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_identity_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg16a_existing_stamped_collision_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg16a_existing_stamped_collision_readiness_v1.md');

const PACKAGE_ID = 'PKG-16A-EXISTING-STAMPED-COLLISION-READINESS';
const ACTIVE_CHILD_FINISHES = new Set(['normal', 'holo', 'reverse', 'cosmos', 'cracked_ice']);

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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function evidenceTexts(row) {
  return [
    ...(row.preserved_evidence_labels ?? []),
    ...(row.preserved_evidence_notes ?? []),
    ...(row.preserved_evidence_snapshot_refs ?? []),
    ...(row.preserved_evidence_urls ?? []),
    row.stamp_label,
  ].filter(Boolean).map(String);
}

function detectFinishClaims(row) {
  const claims = [];
  for (const text of evidenceTexts(row)) {
    const compact = normalizeText(text).replace(/[^a-z0-9]+/g, ' ').trim();
    if (/\bnon\s*holo\b|\bnonholo\b|\bnon\s*foil\b|\bnonfoil\b/.test(compact)) {
      claims.push({ finish_key: 'normal', reason: 'explicit_non_holo_label', evidence_text: text });
      continue;
    }
    if (/\bcosmos\b/.test(compact)) {
      claims.push({ finish_key: 'cosmos', reason: 'explicit_cosmos_label', evidence_text: text });
      continue;
    }
    if (/\bcracked\s+ice\b/.test(compact)) {
      claims.push({ finish_key: 'cracked_ice', reason: 'explicit_cracked_ice_label', evidence_text: text });
      continue;
    }
    if (/\breverse\b/.test(compact)) {
      claims.push({ finish_key: 'reverse', reason: 'explicit_reverse_label', evidence_text: text });
      continue;
    }
    if (/\bholo\b|\bholofoil\b|\bholographic\b|\bfoil\b/.test(compact)) {
      claims.push({ finish_key: 'holo', reason: 'explicit_holo_label', evidence_text: text });
    }
  }
  return claims.filter((claim) => ACTIVE_CHILD_FINISHES.has(claim.finish_key));
}

async function loadCollisionParents(collisionIds) {
  const conn = connectionString();
  if (!conn) return { available: false, reason: 'database_connection_unavailable', parentsById: new Map() };
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(
      `select
         cp.id::text as card_print_id,
         cp.set_code,
         cp.number,
         cp.number_plain,
         cp.name as card_name,
         cp.variant_key,
         coalesce((
           select jsonb_agg(cpr.finish_key order by cpr.finish_key)
           from public.card_printings cpr
           where cpr.card_print_id = cp.id
         ), '[]'::jsonb) as child_finishes,
         coalesce((select count(*)::int from public.external_mappings em where em.card_print_id = cp.id), 0) as external_mapping_count,
         coalesce((select count(*)::int from public.vault_items vi where vi.card_id = cp.id), 0) as vault_item_count,
         coalesce((select count(*)::int from public.vault_item_instances vii where vii.card_print_id = cp.id), 0) as vault_instance_parent_count,
         coalesce((select count(*)::int from public.pricing_watch pw where pw.card_print_id = cp.id), 0) as pricing_watch_count,
         coalesce((select count(*)::int from public.card_feed_events cfe where cfe.card_print_id = cp.id), 0) as card_feed_event_count
       from public.card_prints cp
       where cp.id = any($1::uuid[])
       order by cp.set_code, cp.number, cp.name, cp.variant_key, cp.id`,
      [collisionIds],
    );
    await client.query('rollback');
    return {
      available: true,
      reason: null,
      parentsById: new Map(result.rows.map((row) => [row.card_print_id, row])),
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { available: false, reason: error.message, parentsById: new Map() };
  } finally {
    await client.end().catch(() => {});
  }
}

function classify(row, liveParents) {
  const collisionParents = (row.stamped_variant_collision_ids ?? [])
    .map((id) => liveParents.get(id))
    .filter(Boolean);
  const collisionFinishes = [...new Set(collisionParents.flatMap((parent) => parent.child_finishes ?? []))].sort();
  const claimFinishes = [...new Set(detectFinishClaims(row).map((claim) => claim.finish_key))].sort();
  const baseFinishes = [...new Set(row.base_parent_child_finishes ?? [])].sort();

  let status = 'blocked_collision_manual_review';
  const blockers = [];
  let target_finish_key = null;

  if (collisionParents.length !== 1) blockers.push(`collision_parent_count_${collisionParents.length}`);
  if (collisionFinishes.length === 0) blockers.push('collision_parent_has_no_child_finish');
  if (collisionFinishes.length > 1) blockers.push(`collision_parent_multiple_child_finishes_${collisionFinishes.join('_')}`);

  if (claimFinishes.length === 1 && collisionFinishes.includes(claimFinishes[0])) {
    target_finish_key = claimFinishes[0];
    status = blockers.length === 0
      ? 'already_satisfied_exact_claim_on_existing_parent'
      : 'blocked_collision_exact_claim_but_parent_not_clean';
  } else if (claimFinishes.length > 1) {
    blockers.push(`conflicting_finish_claims_${claimFinishes.join('_')}`);
    status = 'blocked_collision_conflicting_finish_claims';
  } else if (baseFinishes.length === 1 && collisionFinishes.length === 1 && baseFinishes[0] === collisionFinishes[0]) {
    target_finish_key = collisionFinishes[0];
    status = blockers.length === 0
      ? 'already_satisfied_single_base_finish_existing_parent'
      : 'blocked_collision_single_base_but_parent_not_clean';
  } else {
    blockers.push('missing_exact_active_finish_for_existing_collision_parent');
  }

  return {
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    proposed_variant_key: row.proposed_variant_key,
    stamp_label: row.stamp_label,
    base_parent_child_finishes: baseFinishes,
    collision_parent_ids: row.stamped_variant_collision_ids ?? [],
    collision_parent_child_finishes: collisionFinishes,
    target_finish_key,
    status,
    blockers,
    finish_claims: detectFinishClaims(row),
    preserved_evidence_sources: row.preserved_evidence_sources ?? [],
    preserved_evidence_urls: row.preserved_evidence_urls ?? [],
    collision_parent_dependencies: collisionParents.map((parent) => ({
      card_print_id: parent.card_print_id,
      child_finishes: parent.child_finishes ?? [],
      external_mapping_count: parent.external_mapping_count,
      vault_item_count: parent.vault_item_count,
      vault_instance_parent_count: parent.vault_instance_parent_count,
      pricing_watch_count: parent.pricing_watch_count,
      card_feed_event_count: parent.card_feed_event_count,
    })),
  };
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_status).map(([status, count]) => [status, count]);
  const readyRows = report.rows
    .filter((row) => row.status.startsWith('already_satisfied_'))
    .slice(0, 60)
    .map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.stamp_label,
      row.target_finish_key,
      row.status,
    ]);
  const blockedRows = report.rows
    .filter((row) => !row.status.startsWith('already_satisfied_'))
    .slice(0, 60)
    .map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.stamp_label,
      row.collision_parent_child_finishes.join(', '),
      row.blockers.join(', '),
    ]);

  return `# PKG-16A Existing Stamped Collision Readiness V1

Audit-only review of Master Index stamped rows where Grookai already has a stamped parent with the same set, number, name, and variant key.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

- collision_rows_reviewed: ${report.summary.collision_rows_reviewed}
- already_satisfied_rows: ${report.summary.already_satisfied_rows}
- blocked_rows: ${report.summary.blocked_rows}
- fingerprint_sha256: \`${report.fingerprint_sha256}\`

${markdownTable(['status', 'rows'], statusRows)}

## Already Satisfied Sample

${readyRows.length ? markdownTable(['set', 'number', 'name', 'stamp', 'finish', 'status'], readyRows) : 'No already-satisfied collision rows were found.'}

## Blocked Sample

${blockedRows.length ? markdownTable(['set', 'number', 'name', 'stamp', 'collision_finishes', 'blockers'], blockedRows) : 'No blocked collision rows.'}
`;
}

async function main() {
  const readiness = await readJson(READINESS_JSON);
  const collisionRows = (readiness.rows ?? [])
    .filter((row) => row.readiness_status === 'already_has_stamped_variant_collision');
  const collisionIds = [...new Set(collisionRows.flatMap((row) => row.stamped_variant_collision_ids ?? []))].sort();
  const live = await loadCollisionParents(collisionIds);
  const rows = collisionRows.map((row) => classify(row, live.parentsById));
  const alreadySatisfied = rows.filter((row) => row.status.startsWith('already_satisfied_'));
  const payload = rows.map((row) => ({
    set_key: row.set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    proposed_variant_key: row.proposed_variant_key,
    collision_parent_ids: row.collision_parent_ids,
    collision_parent_child_finishes: row.collision_parent_child_finishes,
    target_finish_key: row.target_finish_key,
    status: row.status,
  }));
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg16a_existing_stamped_collision_readiness_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    fingerprint_sha256: sha256(stableJson(payload)),
    source_artifacts: {
      stamped_identity_readiness: path.relative(ROOT, READINESS_JSON).replaceAll('\\', '/'),
    },
    live_read: {
      available: live.available,
      reason: live.reason,
      collision_parent_ids_requested: collisionIds.length,
      collision_parent_rows_loaded: live.parentsById.size,
    },
    summary: {
      collision_rows_reviewed: rows.length,
      already_satisfied_rows: alreadySatisfied.length,
      blocked_rows: rows.length - alreadySatisfied.length,
      by_status: countBy(rows, (row) => row.status),
      by_target_finish_key: countBy(alreadySatisfied, (row) => row.target_finish_key),
      by_set: countBy(rows, (row) => row.set_key),
    },
    recommended_next_package: {
      package_id: 'PKG-16B-EXISTING-STAMPED-COLLISION-CLOSURE',
      candidate_rows: alreadySatisfied.length,
      allowed_shape: 'report-level closure only unless a downstream Master Index comparison adapter is explicitly changed to treat existing stamped variant parents with active child finishes as satisfying stamped taxonomy facts',
      forbidden_shape: 'no child finish_key=stamped, no duplicate parent inserts, no deletes, no merges, no source-rule weakening',
      status: alreadySatisfied.length > 0 ? 'ready_for_downstream_closure_adapter_plan' : 'blocked_no_clean_existing_collisions',
    },
    rows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
    recommended_next_package: report.recommended_next_package,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
