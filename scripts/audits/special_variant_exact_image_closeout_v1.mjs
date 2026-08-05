import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import tls from 'node:tls';
import { pathToFileURL } from 'node:url';

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import { observeImage } from './special_variant_printing_self_hosted_evidence_v1.mjs';
import { validateFounderArtifact } from './special_variant_printing_review_gate_v1.mjs';

dotenv.config({ path: process.env.SPECIAL_VARIANT_ENV_FILE ?? '.env.local', quiet: true });
dotenv.config({ quiet: true });
tls.setDefaultCACertificates([
  ...tls.getCACertificates('default'),
  ...tls.getCACertificates('system'),
]);

const ROOT = process.cwd();
export const VERSION = 'SPECIAL_VARIANT_EXACT_IMAGE_CLOSEOUT_V1';
export const EXPECTED_ROW_COUNT = 143;
const AUDIT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'special_variant_printing_self_hosted_evidence_v1',
);
const BASE_MANIFEST_PATH = path.join(ROOT, 'apps', 'web', 'src', 'data', 'review', 'specialVariantPrintingEvidenceV1.json');
const ORIGINAL_FOUNDER_PATH = path.join(AUDIT_DIR, 'founder_review_v1', 'special_variant_founder_143_of_143.json');
const AMENDMENT_MANIFEST_PATH = path.join(AUDIT_DIR, 'founder_amendment_v1', 'special_variant_repair_manifest_10.json');
const AMENDMENT_FOUNDER_PATH = path.join(AUDIT_DIR, 'founder_amendment_v1', 'special_variant_founder_amendment_10.json');
const OUTPUT_PATH = path.join(AUDIT_DIR, 'special_variant_exact_image_closeout_v1.json');
const OUTPUT_MD_PATH = path.join(AUDIT_DIR, 'special_variant_exact_image_closeout_v1.md');
const HASH_PATH = path.join(AUDIT_DIR, 'special_variant_exact_image_closeout_artifact_hashes.sha256');
const REVIEW_GATE_DIR = path.join(AUDIT_DIR, 'review_gate_runs');
const APPLY_FILES = [
  'image_apply_000_025.json',
  'image_apply_025_025.json',
  'image_apply_050_025.json',
  'image_apply_075_025.json',
  'image_apply_100_025.json',
  'image_apply_125_008.json',
  'image_apply_000_010.json',
].map((file) => path.join(REVIEW_GATE_DIR, file));
const DRY_RUN_FILES = [
  'image_dry_run_000_025.json',
  'image_dry_run_025_025.json',
  'image_dry_run_050_025.json',
  'image_dry_run_075_025.json',
  'image_dry_run_100_025.json',
  'image_dry_run_125_008.json',
  'image_dry_run_000_010.json',
].map((file) => path.join(REVIEW_GATE_DIR, file));

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function createSupabase() {
  const url = String(process.env.SUPABASE_URL ?? '').trim();
  const key = String(process.env.SUPABASE_SECRET_KEY ?? '').trim();
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function mapLimit(values, limit, mapper) {
  const output = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return output;
}

async function fetchRows(supabase, table, columns, key, ids) {
  const rows = [];
  for (let index = 0; index < ids.length; index += 100) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .in(key, ids.slice(index, index + 100));
    if (error) throw new Error(`${table} readback failed:${error.message}`);
    rows.push(...(data ?? []));
  }
  return rows;
}

export function buildExpectedRows(baseManifest, originalFounder, amendmentManifest, amendmentFounder) {
  validateFounderArtifact(baseManifest, originalFounder);
  validateFounderArtifact(amendmentManifest, amendmentFounder);
  const confirmedOriginal = new Set(originalFounder.decisions
    .filter((row) => row.founder_decision === 'confirmed')
    .map((row) => row.evidence_id));
  const rows = [
    ...baseManifest.rows.filter((row) => confirmedOriginal.has(row.evidence_id)),
    ...amendmentManifest.rows,
  ];
  if (rows.length !== EXPECTED_ROW_COUNT) throw new Error(`Expected ${EXPECTED_ROW_COUNT} image rows; found ${rows.length}.`);
  if (new Set(rows.map((row) => row.evidence_id)).size !== EXPECTED_ROW_COUNT) throw new Error('Duplicate expected evidence ID.');
  if (new Set(rows.map((row) => row.card_printing_id)).size !== EXPECTED_ROW_COUNT) throw new Error('Duplicate expected card printing ID.');
  return rows;
}

export function reconcileApplyArtifacts(expectedRows, applyArtifacts, dryRunArtifacts) {
  const failures = [];
  const expectedEvidence = new Set(expectedRows.map((row) => row.evidence_id));
  const selectedEvidence = [];
  for (const report of applyArtifacts) {
    const size = Number(report.batch?.size);
    selectedEvidence.push(...(report.selected_evidence_ids ?? []));
    if (report.version !== 'SPECIAL_VARIANT_PRINTING_REVIEW_GATE_V1'
      || report.gate !== 'image'
      || report.mode !== 'apply'
      || report.database_changes_committed !== true
      || report.transaction?.committed !== true
      || report.transaction?.readback_rows?.length !== size
      || report.transaction?.writes?.child_image_updates !== size
      || report.transaction?.writes?.truth_review_updates !== size
      || report.transaction?.writes?.publication_updates !== 0
      || report.transaction?.writes?.pricing_mapping_inserts !== 0
      || report.public_visibility_changed !== false
      || report.pricing_mappings_changed !== false
      || report.canonical_parent_rows_changed !== 0
      || report.transaction?.canonical_parent_fingerprint_before !== report.transaction?.canonical_parent_fingerprint_after) {
      failures.push(`invalid_apply_artifact:${report.proof_hash ?? 'unknown'}`);
    }
    for (const row of report.transaction?.readback_rows ?? []) {
      if (row.image_source !== 'identity'
        || row.image_status !== 'exact'
        || row.review_status !== 'verified'
        || row.public_visibility !== 'hidden_pending_review') {
        failures.push(`unsafe_apply_readback:${row.evidence_id}`);
      }
    }
  }
  for (const report of dryRunArtifacts) {
    if (report.gate !== 'image'
      || report.mode !== 'dry-run'
      || report.database_changes_committed !== false
      || report.transaction?.committed !== false
      || report.canonical_parent_rows_changed !== 0) {
      failures.push(`invalid_dry_run_artifact:${report.proof_hash ?? 'unknown'}`);
    }
  }
  if (selectedEvidence.length !== EXPECTED_ROW_COUNT) failures.push(`selected_apply_count:${selectedEvidence.length}`);
  if (new Set(selectedEvidence).size !== EXPECTED_ROW_COUNT) failures.push('duplicate_apply_evidence');
  for (const evidenceId of expectedEvidence) {
    if (!selectedEvidence.includes(evidenceId)) failures.push(`missing_apply_evidence:${evidenceId}`);
  }
  return { failures, selectedEvidence };
}

async function verifyStorage(supabase, row) {
  const { data, error } = await supabase.storage.from(row.storage_bucket).download(row.storage_path);
  if (error) return { evidence_id: row.evidence_id, ok: false, failure: error.message };
  const observed = observeImage(Buffer.from(await data.arrayBuffer()));
  const ok = observed.sha256 === row.source_image.sha256
    && observed.size_bytes === row.source_image.size_bytes
    && observed.width === row.source_image.width
    && observed.height === row.source_image.height
    && observed.content_type === row.source_image.content_type;
  return { evidence_id: row.evidence_id, ok, observed, failure: ok ? null : 'storage_observation_mismatch' };
}

function markdown(report) {
  return `# Special Variant Exact Image Closeout V1

- Status: **${report.status}**
- Exact child images: \`${report.summary.exact_child_images}/${report.summary.expected_rows}\`
- Verified hidden reviews: \`${report.summary.verified_hidden_reviews}/${report.summary.expected_rows}\`
- Private storage readbacks: \`${report.summary.storage_readback_matches}/${report.summary.expected_rows}\`
- Founder-confirmed rows: \`${report.summary.founder_confirmed_rows}/${report.summary.expected_rows}\`
- Public rows: \`${report.summary.public_rows}\`
- Current priced rows: \`${report.summary.current_priced_rows}\`
- Replacement images: \`${report.summary.replacement_images}\`
- Canonical parent rows changed: \`${report.summary.canonical_parent_rows_changed}\`
- Publication authorizations: \`${report.summary.publication_authorized_rows}\`
- Pricing authorizations: \`${report.summary.pricing_authorized_rows}\`
- Apply artifacts: \`${report.summary.apply_artifacts}\`
- Rollback proofs: \`${report.summary.dry_run_artifacts}\`
- Failures: \`${report.failures.length}\`

The exact-image review workstream is complete at the hidden boundary. Image confirmation did not publish a row, create a pricing mapping, alter canonical identity, or broaden the 420 blocked authority candidates.

The next gate is a separately governed canary. Publication and pricing remain explicitly unauthorized by these founder artifacts.
`;
}

export async function main() {
  const [baseManifest, originalFounder, amendmentManifest, amendmentFounder, applyArtifacts, dryRunArtifacts] = await Promise.all([
    readJson(BASE_MANIFEST_PATH),
    readJson(ORIGINAL_FOUNDER_PATH),
    readJson(AMENDMENT_MANIFEST_PATH),
    readJson(AMENDMENT_FOUNDER_PATH),
    Promise.all(APPLY_FILES.map(readJson)),
    Promise.all(DRY_RUN_FILES.map(readJson)),
  ]);
  const expectedRows = buildExpectedRows(baseManifest, originalFounder, amendmentManifest, amendmentFounder);
  const artifactReconciliation = reconcileApplyArtifacts(expectedRows, applyArtifacts, dryRunArtifacts);
  const supabase = createSupabase();
  const childIds = expectedRows.map((row) => row.card_printing_id);
  const reviewIds = expectedRows.map((row) => row.truth_review_id);
  const [children, reviews, currentPrices, storage] = await Promise.all([
    fetchRows(
      supabase,
      'card_printings',
      'id,card_print_id,printing_gv_id,finish_key,image_source,image_path,image_status,image_url,image_alt_url',
      'id',
      childIds,
    ),
    fetchRows(
      supabase,
      'card_printing_truth_reviews',
      'id,card_printing_id,review_status,public_visibility,reviewed_by,active,evidence',
      'id',
      reviewIds,
    ),
    fetchRows(supabase, 'v_market_price_current_v1', 'card_printing_id', 'card_printing_id', childIds),
    mapLimit(expectedRows, 8, (row) => verifyStorage(supabase, row)),
  ]);

  const failures = [...artifactReconciliation.failures];
  const childById = new Map(children.map((row) => [row.id, row]));
  const reviewById = new Map(reviews.map((row) => [row.id, row]));
  for (const expected of expectedRows) {
    const child = childById.get(expected.card_printing_id);
    const review = reviewById.get(expected.truth_review_id);
    if (!child
      || child.card_print_id !== expected.card_print_id
      || child.printing_gv_id !== expected.printing_gv_id
      || child.finish_key !== expected.finish_key
      || child.image_source !== 'identity'
      || child.image_path !== expected.storage_path
      || child.image_status !== 'exact'
      || child.image_url !== null
      || child.image_alt_url !== null) {
      failures.push(`child_readback_mismatch:${expected.evidence_id}`);
    }
    if (!review
      || review.card_printing_id !== expected.card_printing_id
      || review.active !== true
      || review.review_status !== 'verified'
      || review.public_visibility !== 'hidden_pending_review'
      || review.reviewed_by !== 'founder'
      || review.evidence?.source_image_sha256 !== expected.source_image.sha256
      || review.evidence?.storage_path !== expected.storage_path) {
      failures.push(`review_readback_mismatch:${expected.evidence_id}`);
    }
  }
  for (const result of storage) {
    if (!result.ok) failures.push(`storage_readback_mismatch:${result.evidence_id}:${result.failure}`);
  }
  if (children.length !== EXPECTED_ROW_COUNT) failures.push(`child_count:${children.length}`);
  if (reviews.length !== EXPECTED_ROW_COUNT) failures.push(`review_count:${reviews.length}`);
  if (currentPrices.length !== 0) failures.push(`hidden_current_price_leak:${currentPrices.length}`);

  const founderDecisions = [
    ...originalFounder.decisions.filter((row) => row.founder_decision === 'confirmed'),
    ...amendmentFounder.decisions,
  ];
  const reportBase = {
    version: VERSION,
    generated_at: new Date().toISOString(),
    status: failures.length ? 'failed' : 'passed',
    source_commits: [...new Set(applyArtifacts.map((row) => row.commit_sha))],
    summary: {
      expected_rows: EXPECTED_ROW_COUNT,
      exact_child_images: expectedRows.filter((row) => {
        const child = childById.get(row.card_printing_id);
        return child?.image_source === 'identity'
          && child?.image_path === row.storage_path
          && child?.image_status === 'exact';
      }).length,
      verified_hidden_reviews: expectedRows.filter((row) => {
        const review = reviewById.get(row.truth_review_id);
        return review?.review_status === 'verified' && review?.public_visibility === 'hidden_pending_review';
      }).length,
      storage_readback_matches: storage.filter((row) => row.ok).length,
      founder_confirmed_rows: founderDecisions.filter((row) => row.founder_decision === 'confirmed').length,
      replacement_images: amendmentManifest.rows.filter((row) => row.source_image.sha256 !== row.repair.original_source_image_sha256).length,
      public_rows: reviews.filter((row) => row.public_visibility === 'visible').length,
      current_priced_rows: currentPrices.length,
      publication_authorized_rows: founderDecisions.filter((row) => row.publication_authorized === true).length,
      pricing_authorized_rows: founderDecisions.filter((row) => row.pricing_authorized === true).length,
      apply_artifacts: applyArtifacts.length,
      dry_run_artifacts: dryRunArtifacts.length,
      apply_selected_rows: artifactReconciliation.selectedEvidence.length,
      canonical_parent_rows_changed: applyArtifacts.reduce((sum, row) => sum + Number(row.canonical_parent_rows_changed), 0),
      unresolved_authority_candidates_unchanged: 420,
    },
    boundaries: {
      database_image_updates_complete: true,
      all_rows_hidden_pending_review: reviews.every((row) => row.public_visibility === 'hidden_pending_review'),
      publication_performed: false,
      pricing_mapping_performed: false,
      embeddings_created: false,
      canonical_identity_changed: false,
      blocked_authority_candidates_broadened: false,
    },
    evidence: {
      base_packet_fingerprint: baseManifest.packet_fingerprint,
      amendment_packet_fingerprint: amendmentManifest.packet_fingerprint,
      original_founder_artifact_sha256: sha256(await fs.readFile(ORIGINAL_FOUNDER_PATH)),
      amendment_founder_artifact_sha256: sha256(await fs.readFile(AMENDMENT_FOUNDER_PATH)),
      apply_proof_hashes: applyArtifacts.map((row) => row.proof_hash),
      dry_run_proof_hashes: dryRunArtifacts.map((row) => row.proof_hash),
    },
    failures,
  };
  const report = { ...reportBase, proof_hash: sha256(stable(reportBase)) };
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(OUTPUT_MD_PATH, markdown(report), 'utf8');

  const hashFiles = [
    BASE_MANIFEST_PATH,
    ORIGINAL_FOUNDER_PATH,
    AMENDMENT_MANIFEST_PATH,
    AMENDMENT_FOUNDER_PATH,
    ...DRY_RUN_FILES,
    ...APPLY_FILES,
    OUTPUT_PATH,
    OUTPUT_MD_PATH,
  ];
  const hashLines = [];
  for (const file of hashFiles) {
    hashLines.push(`${sha256(await fs.readFile(file))}  ${path.relative(ROOT, file).replaceAll('\\', '/')}`);
  }
  await fs.writeFile(HASH_PATH, `${hashLines.join('\n')}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({
    status: report.status,
    summary: report.summary,
    failures: report.failures,
    proof_hash: report.proof_hash,
    report: path.relative(ROOT, OUTPUT_PATH),
  }, null, 2)}\n`);
  if (failures.length) process.exitCode = 1;
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`[${VERSION}] ${String(error?.message ?? error)}`);
    process.exitCode = 1;
  });
}
