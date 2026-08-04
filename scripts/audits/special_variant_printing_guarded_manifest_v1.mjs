import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false, quiet: true });
}

export const VERSION = 'SPECIAL_VARIANT_PRINTING_GUARDED_MANIFEST_V1';
export const INPUT_JSON = path.join(
  ROOT,
  'docs',
  'audits',
  'special_variant_printing_authority_v1',
  'special_variant_printing_authority_v1.json',
);
export const OUT_JSON = path.join(
  ROOT,
  'docs',
  'audits',
  'special_variant_printing_authority_v1',
  'special_variant_printing_guarded_manifest_v1.json',
);
export const OUT_MD = path.join(
  ROOT,
  'docs',
  'audits',
  'special_variant_printing_authority_v1',
  'special_variant_printing_guarded_manifest_v1.md',
);

const ACCEPTED_STATUS = 'authoritative_candidate_ready_for_guarded_dry_run';
const CHUNK_SIZE = 100;

function backendClient() {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY.');
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

function chunks(values) {
  const output = [];
  for (let index = 0; index < values.length; index += CHUNK_SIZE) output.push(values.slice(index, index + CHUNK_SIZE));
  return output;
}

async function requireSelect(query, context) {
  const { data, error } = await query;
  if (error) throw new Error(`${context}: ${error.message}`);
  return data ?? [];
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function countBy(rows, selector) {
  const counts = {};
  for (const row of rows) {
    const key = selector(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => (
    Number(b[1]) - Number(a[1]) || a[0].localeCompare(b[0])
  )));
}

export function printingGvId(parentGvId, finishKey) {
  return `${parentGvId}-${finishKey.toUpperCase().replaceAll('_', '-')}`;
}

export function buildCandidates(authorityReport) {
  return (authorityReport.rows ?? [])
    .filter((row) => row.status === ACCEPTED_STATUS)
    .flatMap((row) => row.authority.expected_finishes
      .filter((finish) => row.authority.observed_finishes.includes(finish))
      .map((finish) => ({
        card_print_id: row.card_print_id,
        parent_gv_id: row.gv_id,
        name: row.name,
        number: row.number,
        set_code: row.set_code,
        variant_key: row.variant_key,
        finish_key: finish,
        printing_gv_id: printingGvId(row.gv_id, finish),
        image_status: 'representative_shared_stamp',
        is_provisional: false,
        provenance_source: 'tcgcsv_tcgplayer_catalog',
        provenance_ref: `tcgplayer_product:${row.authority.discovery_product_id}:finish:${finish}:authority:${authorityReport.fingerprint_sha256}`,
        source_product_id: row.authority.discovery_product_id,
        discovery_external_id: row.discovery_evidence.external_id,
        source_url: row.tcgcsv_product.source_url,
        source_product_title: row.tcgcsv_product.name,
        source_product_payload_hash: row.tcgcsv_product.payload_hash,
        source_finish_payload_hashes: row.tcgcsv_finish_observations
          .filter((observation) => observation.finish_key === finish)
          .map((observation) => observation.payload_hash)
          .sort(),
        master_evidence: row.authority.master_evidence,
        authority_fingerprint_sha256: authorityReport.fingerprint_sha256,
        required_truth_review: {
          review_status: 'quarantined_candidate',
          review_disposition: 'needs_review',
          public_visibility: 'hidden_pending_review',
          active: true,
          approval_prohibited_by_this_gate: true,
        },
      })))
    .sort((left, right) => left.printing_gv_id.localeCompare(right.printing_gv_id));
}

export function evaluateCandidate({ candidate, parent, existingChildren, gvCollision, finish, activeIdentities, exactMappingCount }) {
  const blockers = [];
  if (!parent) blockers.push('parent_missing');
  if (parent && parent.gv_id !== candidate.parent_gv_id) blockers.push('parent_gv_id_changed');
  if (parent && parent.name !== candidate.name) blockers.push('parent_name_changed');
  if (parent && String(parent.number) !== String(candidate.number)) blockers.push('parent_number_changed');
  if (parent && parent.set_code !== candidate.set_code) blockers.push('parent_set_code_changed');
  if (parent && parent.variant_key !== candidate.variant_key) blockers.push('parent_variant_key_changed');
  if (!finish || finish.is_active !== true) blockers.push('finish_key_missing_or_inactive');
  if (candidate.finish_key === 'stamped') blockers.push('synthetic_stamped_finish_prohibited');
  if ((existingChildren ?? []).some((child) => child.finish_key === candidate.finish_key)) {
    blockers.push('parent_finish_child_already_exists');
  }
  if (gvCollision) blockers.push('printing_gv_id_collision');
  if ((activeIdentities ?? []).length !== 1) blockers.push('active_parent_identity_count_not_one');
  if (exactMappingCount !== 1) blockers.push('exact_active_discovery_mapping_count_not_one');
  if (candidate.required_truth_review?.review_status !== 'quarantined_candidate'
    || candidate.required_truth_review?.public_visibility !== 'hidden_pending_review') {
    blockers.push('future_apply_visibility_guard_missing');
  }
  if (!candidate.source_product_payload_hash || candidate.source_finish_payload_hashes.length === 0) {
    blockers.push('source_payload_hash_missing');
  }
  return {
    live_status: blockers.length === 0 ? 'ready_for_transactional_rollback_dry_run' : 'blocked_live_invariant',
    blockers,
  };
}

async function loadRows(client, table, select, filterColumn, values, extra = (query) => query) {
  const rows = [];
  for (const batch of chunks(values)) {
    rows.push(...await requireSelect(
      extra(client.from(table).select(select).in(filterColumn, batch)),
      `load ${table}`,
    ));
  }
  return rows;
}

function escapeCell(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function table(rows, columns, limit = 160) {
  if (rows.length === 0) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.slice(0, limit).map((row) => `| ${columns.map((column) => escapeCell(column.value(row))).join(' | ')} |`),
    ...(rows.length > limit ? [`\n_${rows.length - limit} additional rows are preserved in JSON._`] : []),
  ].join('\n');
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_live_status).map(([status, count]) => ({ status, count }));
  return `# Special Variant Printing Guarded Manifest V1

Generated: ${report.generated_at}

## Safety Boundary

- Service-role access: SELECT only
- Database writes: none
- Migrations: none
- Child printings created: 0
- Reviews created: 0
- Approvals: 0
- Public visibility changes: 0

## Result

${table(statusRows, [
    { label: 'Live status', value: (row) => row.status },
    { label: 'Rows', value: (row) => row.count },
  ])}

- Authority parents: ${report.summary.authority_parent_count}
- Prospective child rows: ${report.summary.candidate_child_count}
- Ready for transactional rollback dry run: ${report.summary.ready_count}
- Blocked by live invariant: ${report.summary.blocked_count}
- Duplicate candidate GV-IDs: ${report.summary.duplicate_candidate_gv_ids}

## Candidate Rows

${table(report.rows, [
    { label: 'Printing GV-ID', value: (row) => row.printing_gv_id },
    { label: 'Card', value: (row) => `${row.name} ${row.number}` },
    { label: 'Variant', value: (row) => row.variant_key },
    { label: 'Finish', value: (row) => row.finish_key },
    { label: 'Status', value: (row) => row.live_status },
    { label: 'Blockers', value: (row) => row.blockers.join(', ') },
  ])}

## Next Gate

Execute a transactionally rolled-back insert simulation for only rows marked \`ready_for_transactional_rollback_dry_run\`. The simulation must create both the child row and its hidden \`quarantined_candidate\` sidecar inside the transaction, prove all readbacks, roll back, and confirm the durable database fingerprint is unchanged.
`;
}

export async function main() {
  const authorityReport = JSON.parse(await fs.readFile(INPUT_JSON, 'utf8'));
  const candidates = buildCandidates(authorityReport);
  const cardPrintIds = [...new Set(candidates.map((row) => row.card_print_id))];
  const prospectiveGvIds = [...new Set(candidates.map((row) => row.printing_gv_id))];
  const finishKeys = [...new Set(candidates.map((row) => row.finish_key))];
  const client = backendClient();

  const [parents, children, collisions, finishes, identities, mappings] = await Promise.all([
    loadRows(client, 'card_prints', 'id,gv_id,name,number,set_code,variant_key,image_status', 'id', cardPrintIds),
    loadRows(client, 'card_printings', 'id,card_print_id,finish_key,printing_gv_id,is_provisional,provenance_source,provenance_ref', 'card_print_id', cardPrintIds),
    loadRows(client, 'card_printings', 'id,card_print_id,finish_key,printing_gv_id', 'printing_gv_id', prospectiveGvIds),
    loadRows(client, 'finish_keys', 'key,is_active,label', 'key', finishKeys),
    loadRows(client, 'card_print_identity', 'id,card_print_id,is_active,identity_key_hash', 'card_print_id', cardPrintIds, (query) => query.eq('is_active', true)),
    loadRows(client, 'external_mappings', 'id,card_print_id,source,external_id,active', 'card_print_id', cardPrintIds, (query) => query.eq('source', 'justtcg').eq('active', true)),
  ]);

  const parentById = new Map(parents.map((row) => [row.id, row]));
  const finishByKey = new Map(finishes.map((row) => [row.key, row]));
  const collisionByGvId = new Map(collisions.map((row) => [row.printing_gv_id, row]));
  const childByParent = new Map();
  const identitiesByParent = new Map();
  for (const child of children) {
    const list = childByParent.get(child.card_print_id) ?? [];
    list.push(child);
    childByParent.set(child.card_print_id, list);
  }
  for (const identity of identities) {
    const list = identitiesByParent.get(identity.card_print_id) ?? [];
    list.push(identity);
    identitiesByParent.set(identity.card_print_id, list);
  }

  const rows = candidates.map((candidate) => ({
    ...candidate,
    ...evaluateCandidate({
      candidate,
      parent: parentById.get(candidate.card_print_id),
      existingChildren: childByParent.get(candidate.card_print_id) ?? [],
      gvCollision: collisionByGvId.get(candidate.printing_gv_id) ?? null,
      finish: finishByKey.get(candidate.finish_key),
      activeIdentities: identitiesByParent.get(candidate.card_print_id) ?? [],
      exactMappingCount: mappings.filter((mapping) => (
        mapping.card_print_id === candidate.card_print_id
        && mapping.external_id === authorityReport.rows.find((row) => row.card_print_id === candidate.card_print_id)?.discovery_evidence?.external_id
      )).length,
    }),
  }));
  const duplicateCandidateGvIds = candidates.length - prospectiveGvIds.length;
  const reportBase = {
    version: VERSION,
    generated_at: new Date().toISOString(),
    mode: 'read_only_guarded_manifest',
    db_writes_performed: false,
    migrations_created: false,
    approvals_performed: false,
    public_visibility_changed: false,
    source_authority_version: authorityReport.version,
    source_authority_fingerprint_sha256: authorityReport.fingerprint_sha256,
    summary: {
      authority_parent_count: cardPrintIds.length,
      candidate_child_count: rows.length,
      by_live_status: countBy(rows, (row) => row.live_status),
      by_finish: countBy(rows, (row) => row.finish_key),
      ready_count: rows.filter((row) => row.live_status === 'ready_for_transactional_rollback_dry_run').length,
      blocked_count: rows.filter((row) => row.live_status !== 'ready_for_transactional_rollback_dry_run').length,
      duplicate_candidate_gv_ids: duplicateCandidateGvIds,
    },
    rows,
  };
  const report = { ...reportBase, fingerprint_sha256: sha256(stableJson(reportBase.rows)) };
  await Promise.all([
    fs.writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`),
    fs.writeFile(OUT_MD, renderMarkdown(report)),
  ]);
  process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
