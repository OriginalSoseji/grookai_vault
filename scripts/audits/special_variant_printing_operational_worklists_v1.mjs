import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { buildTargets } from './special_variant_printing_transactional_rollback_v1.mjs';

export const VERSION = 'SPECIAL_VARIANT_PRINTING_OPERATIONAL_WORKLISTS_V1';
export const HUMAN_REVIEW_VERSION = 'SPECIAL_VARIANT_PRINTING_HUMAN_REVIEW_QUEUE_V1';
export const SOURCE_QUEUE_VERSION = 'SPECIAL_VARIANT_PRINTING_SOURCE_ACQUISITION_QUEUE_V1';
export const IMAGE_QUEUE_VERSION = 'SPECIAL_VARIANT_PRINTING_EXACT_IMAGE_QUEUE_V1';

const ROOT = process.cwd();
const AUTHORITY_PATH = path.join(
  ROOT,
  'docs',
  'audits',
  'special_variant_printing_authority_v1',
  'special_variant_printing_authority_v1.json',
);
const MANIFEST_PATH = path.join(
  ROOT,
  'docs',
  'audits',
  'special_variant_printing_authority_v1',
  'special_variant_printing_guarded_manifest_v1.json',
);
const COVERAGE_PATH = path.join(
  ROOT,
  'docs',
  'audits',
  'special_variant_printing_coverage_v1',
  'special_variant_printing_coverage_v1.json',
);
const OUT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'special_variant_printing_operations_v1',
);

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(stableJson(value)).digest('hex');
}

function sorted(rows) {
  return [...rows].sort((left, right) => (
    String(left.priority).localeCompare(String(right.priority))
      || String(left.gv_id ?? left.parent_gv_id).localeCompare(String(right.gv_id ?? right.parent_gv_id))
  ));
}

function reviewQueue(manifest) {
  const targetByPrinting = new Map(
    buildTargets(manifest).map((row) => [row.printing_gv_id, row]),
  );
  const rows = manifest.rows.map((row) => {
    const target = targetByPrinting.get(row.printing_gv_id);
    if (!target) throw new Error(`Missing deterministic target for ${row.printing_gv_id}.`);
    return {
      queue_id: `review:${target.child_id}`,
      priority: 'P0',
      card_print_id: row.card_print_id,
      card_printing_id: target.child_id,
      truth_review_id: target.review_id,
      parent_gv_id: row.parent_gv_id,
      printing_gv_id: row.printing_gv_id,
      name: row.name,
      number: row.number,
      set_code: row.set_code,
      variant_key: row.variant_key,
      finish_key: row.finish_key,
      image_status: row.image_status,
      source_product_id: row.source_product_id,
      source_url: row.source_url,
      source_product_title: row.source_product_title,
      source_product_payload_hash: row.source_product_payload_hash,
      source_finish_payload_hashes: row.source_finish_payload_hashes,
      authority_fingerprint_sha256: row.authority_fingerprint_sha256,
      durable_state: {
        review_status: 'quarantined_candidate',
        public_visibility: 'hidden_pending_review',
        active: true,
      },
      review_requirements: [
        'confirm_card_identity',
        'confirm_special_variant_marker',
        'confirm_finish',
        'confirm_image_is_exact_or_remains_representative',
      ],
      allowed_human_dispositions: [
        'confirm_for_separate_future_promotion_gate',
        'keep_hidden_needs_more_evidence',
        'keep_hidden_identity_or_finish_conflict',
      ],
      human_disposition: null,
      reviewed_by: null,
      reviewed_at: null,
      pricing_policy: 'prohibited_while_hidden_pending_review',
      automatic_approval_permitted: false,
      automatic_publication_permitted: false,
    };
  });
  return sorted(rows);
}

function sourceQueue(authority, coverage) {
  const authorityRows = authority.rows
    .filter((row) => row.status !== 'authoritative_candidate_ready_for_guarded_dry_run')
    .map((row) => {
      let priority = 'P2';
      let requiredAction = 'resolve_identity_or_finish_conflict_with_independent_source';
      if (row.status === 'variant_identity_corroborated_finish_needs_second_source') {
        priority = 'P1';
        requiredAction = 'obtain_second_exact_finish_source';
      } else if (row.status === 'tcgcsv_product_missing') {
        priority = 'P1';
        requiredAction = 'acquire_current_exact_catalog_product_and_finish_evidence';
      }
      return {
        queue_id: `source:${row.card_print_id}:${row.status}`,
        priority,
        card_print_id: row.card_print_id,
        gv_id: row.gv_id,
        name: row.name,
        number: row.number,
        set_code: row.set_code,
        variant_key: row.variant_key,
        lane: row.status,
        required_action: requiredAction,
        blockers: row.authority.blockers,
        expected_finishes: row.authority.expected_finishes,
        observed_finishes: row.authority.observed_finishes,
        discovery_source: row.discovery_evidence?.source ?? null,
        discovery_external_id: row.discovery_evidence?.external_id ?? null,
        source_product_id: row.authority.discovery_product_id,
        source_url: row.tcgcsv_product?.source_url ?? null,
        source_product_title: row.tcgcsv_product?.name ?? null,
        current_state: 'blocked_no_write',
        automatic_apply_permitted: false,
      };
    });

  const noSourceRows = coverage.rows
    .filter((row) => row.status === 'missing_child_no_source_finish_evidence')
    .map((row) => ({
      queue_id: `source:${row.card_print_id}:no_source_finish_evidence`,
      priority: 'P3',
      card_print_id: row.card_print_id,
      gv_id: row.gv_id,
      name: row.name,
      number: row.number,
      set_code: row.set_code,
      variant_key: row.variant_key,
      lane: row.status,
      required_action: 'acquire_exact_variant_identity_and_finish_authority',
      blockers: ['no_approved_source_finish_evidence'],
      expected_finishes: [],
      observed_finishes: [],
      discovery_source: null,
      discovery_external_id: null,
      source_product_id: null,
      source_url: null,
      source_product_title: null,
      current_state: 'blocked_no_write',
      automatic_apply_permitted: false,
    }));

  const incompleteRows = coverage.rows
    .filter((row) => row.status === 'public_child_identity_incomplete')
    .map((row) => ({
      queue_id: `source:${row.card_print_id}:public_child_identity_incomplete`,
      priority: 'P1',
      card_print_id: row.card_print_id,
      gv_id: row.gv_id,
      name: row.name,
      number: row.number,
      set_code: row.set_code,
      variant_key: row.variant_key,
      lane: row.status,
      required_action: 'repair_existing_public_child_identity_without_replacing_parent',
      blockers: ['printing_gv_id_or_provenance_incomplete'],
      expected_finishes: row.children.map((child) => child.finish_key),
      observed_finishes: row.children.map((child) => child.finish_key),
      existing_children: row.children.map((child) => ({
        card_printing_id: child.card_printing_id,
        printing_gv_id: child.printing_gv_id,
        finish_key: child.finish_key,
        provenance_source: child.provenance_source,
        provenance_ref: child.provenance_ref,
      })),
      current_state: 'existing_public_identity_repair_required',
      automatic_apply_permitted: false,
    }));

  return sorted([...authorityRows, ...noSourceRows, ...incompleteRows]);
}

function imageQueue(coverage, manifest) {
  const appliedIds = new Set(manifest.rows.map((row) => row.card_print_id));
  return sorted(coverage.rows
    .filter((row) => row.image_status !== 'exact')
    .map((row) => {
      let priority = 'P3';
      if (appliedIds.has(row.card_print_id)) priority = 'P0';
      else if (row.status === 'public_child_identity_incomplete') priority = 'P1';
      else if (row.status === 'missing_child_reference_finish_evidence_review_required') priority = 'P2';
      return {
        queue_id: `image:${row.card_print_id}`,
        priority,
        card_print_id: row.card_print_id,
        gv_id: row.gv_id,
        name: row.name,
        number: row.number,
        set_code: row.set_code,
        variant_key: row.variant_key,
        current_image_status: row.image_status,
        printing_coverage_status: row.status,
        required_asset: 'exact_variant_front_image',
        acquisition_status: 'not_started',
        representative_image_may_remain_visible_with_disclosure: true,
        representative_image_proves_variant_marker: false,
        automatic_identity_promotion_permitted: false,
      };
    }));
}

export function buildOperationalWorklists({ authority, manifest, coverage, generatedAt }) {
  const humanRows = reviewQueue(manifest);
  const sourceRows = sourceQueue(authority, coverage);
  const imageRows = imageQueue(coverage, manifest);

  const humanReview = {
    version: HUMAN_REVIEW_VERSION,
    generated_at: generatedAt,
    mode: 'offline_worklist',
    db_writes_performed: false,
    approvals_performed: false,
    rows: humanRows,
    summary: {
      total: humanRows.length,
      hidden_pending_review: humanRows.filter((row) => row.durable_state.public_visibility === 'hidden_pending_review').length,
      automatic_approval_permitted: 0,
    },
  };
  humanReview.fingerprint_sha256 = fingerprint(humanReview.rows);

  const sourceAcquisition = {
    version: SOURCE_QUEUE_VERSION,
    generated_at: generatedAt,
    mode: 'offline_worklist',
    db_writes_performed: false,
    rows: sourceRows,
    summary: {
      total: sourceRows.length,
      by_lane: Object.fromEntries([...new Set(sourceRows.map((row) => row.lane))]
        .sort()
        .map((lane) => [lane, sourceRows.filter((row) => row.lane === lane).length])),
      automatic_apply_permitted: 0,
    },
  };
  sourceAcquisition.fingerprint_sha256 = fingerprint(sourceAcquisition.rows);

  const exactImages = {
    version: IMAGE_QUEUE_VERSION,
    generated_at: generatedAt,
    mode: 'offline_worklist',
    db_writes_performed: false,
    rows: imageRows,
    summary: {
      total: imageRows.length,
      applied_hidden_priority: imageRows.filter((row) => row.priority === 'P0').length,
      applied_hidden_exact_already_available:
        coverage.rows.filter((row) => (
          manifest.rows.some((candidate) => candidate.card_print_id === row.card_print_id)
            && row.image_status === 'exact'
        )).length,
      by_current_image_status: Object.fromEntries([...new Set(imageRows.map((row) => row.current_image_status))]
        .sort()
        .map((status) => [status, imageRows.filter((row) => row.current_image_status === status).length])),
      automatic_identity_promotion_permitted: 0,
    },
  };
  exactImages.fingerprint_sha256 = fingerprint(exactImages.rows);

  return { humanReview, sourceAcquisition, exactImages };
}

function markdown(worklists) {
  const { humanReview, sourceAcquisition, exactImages } = worklists;
  const lines = [
    '# Special Variant Printing Operational Worklists V1',
    '',
    'These worklists are offline operational queues. They do not approve, publish, map, or mutate any card or printing.',
    '',
    '## Current Queues',
    '',
    `- Human image/evidence confirmation: ${humanReview.summary.total}`,
    `- Source or identity repair: ${sourceAcquisition.summary.total}`,
    `- Exact variant image acquisition: ${exactImages.summary.total}`,
    '',
    '## Locked Boundaries',
    '',
    '- All 143 applied candidates remain `quarantined_candidate` and `hidden_pending_review`.',
    '- Pricing publication is prohibited while a child remains hidden.',
    '- The 420 authority failures remain blocked.',
    '- Representative imagery never proves a stamp, error, finish, or print marker.',
    '- No queue item can approve or apply itself.',
    '',
    '## Source Queue Lanes',
    '',
    '| Lane | Rows |',
    '| --- | ---: |',
    ...Object.entries(sourceAcquisition.summary.by_lane)
      .map(([lane, count]) => `| ${lane} | ${count} |`),
    '',
    '## Exact Image Status',
    '',
    '| Current status | Rows |',
    '| --- | ---: |',
    ...Object.entries(exactImages.summary.by_current_image_status)
      .map(([status, count]) => `| ${status} | ${count} |`),
    '',
    '## Next Human Gate',
    '',
    'Review the 143 P0 rows against exact card evidence. A separate governed promotion gate must apply any confirmed decision; this worklist does not change database state.',
    '',
  ];
  return lines.join('\n');
}

async function main() {
  const [authority, manifest, coverage] = await Promise.all([
    fs.readFile(AUTHORITY_PATH, 'utf8').then(JSON.parse),
    fs.readFile(MANIFEST_PATH, 'utf8').then(JSON.parse),
    fs.readFile(COVERAGE_PATH, 'utf8').then(JSON.parse),
  ]);
  const worklists = buildOperationalWorklists({
    authority,
    manifest,
    coverage,
    generatedAt: new Date().toISOString(),
  });
  await fs.mkdir(OUT_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(OUT_DIR, 'special_variant_printing_human_review_queue_v1.json'), `${JSON.stringify(worklists.humanReview, null, 2)}\n`),
    fs.writeFile(path.join(OUT_DIR, 'special_variant_printing_source_acquisition_queue_v1.json'), `${JSON.stringify(worklists.sourceAcquisition, null, 2)}\n`),
    fs.writeFile(path.join(OUT_DIR, 'special_variant_printing_exact_image_queue_v1.json'), `${JSON.stringify(worklists.exactImages, null, 2)}\n`),
    fs.writeFile(path.join(OUT_DIR, 'SPECIAL_VARIANT_PRINTING_OPERATIONAL_WORKLISTS_V1.md'), markdown(worklists)),
  ]);
  process.stdout.write(`${JSON.stringify({
    version: VERSION,
    output_directory: path.relative(ROOT, OUT_DIR).replaceAll('\\', '/'),
    human_review_rows: worklists.humanReview.summary.total,
    source_acquisition_rows: worklists.sourceAcquisition.summary.total,
    exact_image_rows: worklists.exactImages.summary.total,
    db_writes_performed: false,
  }, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
