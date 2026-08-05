import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import dotenv from 'dotenv';

import {
  readVerifiedArtifact,
  writeShardedRows,
} from './artifact_rows_v1.mjs';
import {
  buildArtifact,
  contentFingerprint,
  stableJson,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';
import { buildWriterV2Plan } from './payload_writer_v2.mjs';
import {
  assertAuditOnlyArgs,
  withReadOnlyClient,
} from './read_only_guard_v1.mjs';

export const PRODUCT_INTEGRATION_INVENTORY_VERSION =
  'JPN-MASTER-INDEX-V4-PRODUCT-INTEGRATION-INVENTORY-V1';
export const EXPECTED_SCOPE_COUNT = 5_336;
export const EXPECTED_WRITER_PAYLOAD_FINGERPRINT =
  'b11c033901f8cb94b641f2c6e7f3586a3db2bc994242f7d8aa28cb2198218e2c';
export const EXPECTED_PREFLIGHT_FINGERPRINT =
  'b269de1cae5bb83113e9b88f27400613fca92508c681950861c62213cd6ec36b';
export const EXPECTED_CHILD_DATASET_FINGERPRINT =
  '42e2870a82a6cdfba84c1a7588c3d1610ebac0cebea845febe7af490ead1e60d';
export const SELF_HOSTED_IMAGE_PREFIX =
  'warehouse-derived/self-hosted-images-v1/';

const DEFAULT_PREFLIGHT_PATH =
  'docs/audits/japanese_master_index_v4/payload_preflight_v2/'
  + 'jpn_payload_preflight_v2.json';
const DEFAULT_WRITER_PROOF_PATH =
  'docs/audits/japanese_master_index_v4/payload_writer_v2/'
  + 'jpn_payload_writer_v2.json';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v4/'
  + 'product_integration_inventory_v1';

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = clean(keyFn(row)) ?? 'none';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) =>
      left.localeCompare(right)),
  );
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

export function isSelfHostedImagePath(value) {
  return clean(value)?.startsWith(SELF_HOSTED_IMAGE_PREFIX) ?? false;
}

export function classifyParentImage(row) {
  const imagePath = clean(row.image_path);
  const imageUrl = clean(row.image_url);
  const imageAltUrl = clean(row.image_alt_url);
  const representativeImageUrl = clean(row.representative_image_url);

  if (isSelfHostedImagePath(imagePath)) {
    return {
      status: 'self_hosted',
      self_hosted: true,
      has_external_pointer: Boolean(imageUrl || imageAltUrl),
      has_any_pointer: true,
    };
  }
  if (imagePath) {
    return {
      status: 'noncanonical_image_path',
      self_hosted: false,
      has_external_pointer: Boolean(imageUrl || imageAltUrl),
      has_any_pointer: true,
    };
  }
  if (imageUrl || imageAltUrl) {
    return {
      status: 'external_image_pointer_only',
      self_hosted: false,
      has_external_pointer: true,
      has_any_pointer: true,
    };
  }
  if (representativeImageUrl) {
    return {
      status: 'representative_image_only',
      self_hosted: false,
      has_external_pointer: false,
      has_any_pointer: true,
    };
  }
  return {
    status: 'missing',
    self_hosted: false,
    has_external_pointer: false,
    has_any_pointer: false,
  };
}

export function classifyChildEligibility({
  plannedChild,
  parentImage,
  liveChildCount,
}) {
  const child = plannedChild?.db_row ?? {};
  const structurallyComplete = Boolean(
    clean(child.id)
    && clean(child.card_print_id)
    && clean(child.printing_gv_id)
    && clean(child.finish_key),
  );
  const blockers = new Set(plannedChild?.gate_blockers ?? []);

  blockers.add('separate_public_visibility_approval_required');
  if (!parentImage.self_hosted && !isSelfHostedImagePath(child.image_path)) {
    blockers.add('self_hosted_image_pointer_not_proven');
  }
  blockers.add('printing_level_finish_evidence_not_established');
  if (!structurallyComplete) blockers.add('planned_child_structure_incomplete');
  if (Number(liveChildCount) > 0) {
    blockers.add('live_child_already_present_requires_reconciliation');
  }

  return {
    status: blockers.size === 0 ? 'eligible' : 'blocked',
    structurally_complete: structurallyComplete,
    blockers: [...blockers].sort(),
  };
}

function parseArgs(argv) {
  assertAuditOnlyArgs(argv);
  const options = {
    envFile: null,
    environment: 'production-read-only-2026-08-05',
    outputRoot: DEFAULT_OUTPUT_ROOT,
  };
  for (const argument of argv) {
    if (argument.startsWith('--env-file=')) {
      options.envFile = argument.slice('--env-file='.length);
    } else if (argument.startsWith('--environment=')) {
      options.environment = argument.slice('--environment='.length);
    } else if (argument.startsWith('--output-root=')) {
      options.outputRoot = argument.slice('--output-root='.length);
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  return options;
}

async function loadDescriptorRows(descriptor) {
  const rows = [];
  for (const shardPath of descriptor.shard_paths) {
    const { artifact } = await readVerifiedArtifact(shardPath);
    rows.push(...artifact.content.rows);
  }
  if (rows.length !== descriptor.row_count) {
    throw new Error('Deferred child dataset row count changed.');
  }
  if (contentFingerprint(rows) !== descriptor.content_fingerprint_sha256) {
    throw new Error('Deferred child dataset fingerprint changed.');
  }
  return rows;
}

export async function loadInventoryScope({
  preflightPath = DEFAULT_PREFLIGHT_PATH,
  writerProofPath = DEFAULT_WRITER_PROOF_PATH,
} = {}) {
  const { payload, contract } = await buildWriterV2Plan(preflightPath);
  if (
    contract.payload_fingerprint_sha256
    !== EXPECTED_WRITER_PAYLOAD_FINGERPRINT
  ) {
    throw new Error('Writer payload fingerprint changed.');
  }
  if (
    contract.source_preflight_fingerprint_sha256
    !== EXPECTED_PREFLIGHT_FINGERPRINT
  ) {
    throw new Error('Source preflight fingerprint changed.');
  }

  const { artifact: writerProof } = await readVerifiedArtifact(
    writerProofPath,
  );
  if (writerProof.content.status !== 'payload_applied_and_read_back') {
    throw new Error('Durable payload apply proof is missing.');
  }
  if (
    writerProof.content.payload_fingerprint_sha256
    !== EXPECTED_WRITER_PAYLOAD_FINGERPRINT
  ) {
    throw new Error('Durable apply proof payload fingerprint changed.');
  }

  const { artifact: preflight } = await readVerifiedArtifact(preflightPath);
  const childDescriptor = preflight.content.datasets.child_printing_rows;
  if (
    childDescriptor.content_fingerprint_sha256
    !== EXPECTED_CHILD_DATASET_FINGERPRINT
  ) {
    throw new Error('Deferred child dataset authority changed.');
  }
  const deferredChildren = await loadDescriptorRows(childDescriptor);
  const cardRows = payload.rows.card_print_rows;
  const reviewRows = payload.rows.family_review_rows;

  if (
    cardRows.length !== EXPECTED_SCOPE_COUNT
    || reviewRows.length !== EXPECTED_SCOPE_COUNT
    || deferredChildren.length !== EXPECTED_SCOPE_COUNT
  ) {
    throw new Error('Japanese V4 integration scope count changed.');
  }

  const cardIds = cardRows.map((row) => row.id);
  const cardIdSet = new Set(cardIds);
  if (cardIdSet.size !== EXPECTED_SCOPE_COUNT) {
    throw new Error('Japanese V4 parent IDs are not unique.');
  }

  const plannedChildByCardId = new Map();
  for (const row of deferredChildren) {
    if (row.apply_lane !== 'deferred_visibility_and_storage_gate') {
      throw new Error('A child candidate escaped the deferred gate.');
    }
    const cardPrintId = row.db_row?.card_print_id;
    if (!cardIdSet.has(cardPrintId) || plannedChildByCardId.has(cardPrintId)) {
      throw new Error('Deferred child scope does not map one-to-one.');
    }
    plannedChildByCardId.set(cardPrintId, row);
  }
  if (plannedChildByCardId.size !== EXPECTED_SCOPE_COUNT) {
    throw new Error('Deferred child coverage is incomplete.');
  }

  return {
    cardRows,
    reviewRows,
    plannedChildByCardId,
    source: {
      writer_payload_fingerprint_sha256:
        contract.payload_fingerprint_sha256,
      source_preflight_fingerprint_sha256:
        contract.source_preflight_fingerprint_sha256,
      deferred_child_dataset_fingerprint_sha256:
        childDescriptor.content_fingerprint_sha256,
      writer_apply_proof_content_fingerprint_sha256:
        writerProof.content_fingerprint_sha256,
    },
  };
}

const INVENTORY_SQL = `
with scope as (
  select card_print_id, position::integer
  from unnest($1::uuid[]) with ordinality as selected(card_print_id, position)
),
children as (
  select
    child.card_print_id,
    count(*)::integer as child_count,
    count(*) filter (
      where nullif(btrim(child.printing_gv_id), '') is not null
    )::integer as child_public_id_count
  from public.card_printings child
  join scope on scope.card_print_id = child.card_print_id
  group by child.card_print_id
),
print_search as (
  select document.card_print_id, count(*)::integer as row_count
  from public.v_print_identity_search_documents_v1 document
  join scope on scope.card_print_id = document.card_print_id
  where document.object_type = 'parent_print'
  group by document.card_print_id
),
legacy_search as (
  select search.id as card_print_id, count(*)::integer as row_count
  from public.v_card_search search
  join scope on scope.card_print_id = search.id
  group by search.id
),
search_v2 as (
  select search.id as card_print_id, count(*)::integer as row_count
  from public.v_cards_search_v2 search
  join scope on scope.card_print_id = search.id
  group by search.id
),
legacy_fingerprints as (
  select
    fingerprint.card_print_id,
    count(*)::integer as row_count,
    count(*) filter (where fingerprint.is_verified)::integer as verified_count
  from public.card_fingerprint_index fingerprint
  join scope on scope.card_print_id = fingerprint.card_print_id
  group by fingerprint.card_print_id
),
scanner_fingerprints as (
  select
    fingerprint.card_print_id,
    count(*)::integer as row_count,
    count(*) filter (where fingerprint.is_verified)::integer as verified_count
  from public.scanner_fingerprint_index fingerprint
  join scope on scope.card_print_id = fingerprint.card_print_id
  group by fingerprint.card_print_id
),
reviews as (
  select review.*
  from public.card_print_family_review_queue review
  join scope on scope.card_print_id = review.card_print_id
  where review.id = any($2::uuid[])
)
select
  scope.position,
  parent.id::text as card_print_id,
  parent.gv_id,
  parent.name,
  parent.set_code,
  parent.number,
  parent.identity_domain,
  parent.image_source,
  parent.image_path,
  parent.image_url,
  parent.image_alt_url,
  parent.representative_image_url,
  parent.image_status,
  parent.image_note,
  coalesce(children.child_count, 0)::integer as live_child_count,
  coalesce(children.child_public_id_count, 0)::integer as live_child_public_id_count,
  review.id::text as family_review_id,
  review.family_status,
  review.review_status as family_review_status,
  review.family_link_promotion_allowed,
  review.active as family_review_active,
  review.reviewed_by,
  review.reviewed_at,
  coalesce(print_search.row_count, 0)::integer as print_search_document_count,
  coalesce(legacy_search.row_count, 0)::integer as legacy_search_row_count,
  coalesce(search_v2.row_count, 0)::integer as search_v2_row_count,
  coalesce(legacy_fingerprints.row_count, 0)::integer as legacy_fingerprint_count,
  coalesce(legacy_fingerprints.verified_count, 0)::integer as verified_legacy_fingerprint_count,
  coalesce(scanner_fingerprints.row_count, 0)::integer as scanner_fingerprint_count,
  coalesce(scanner_fingerprints.verified_count, 0)::integer as verified_scanner_fingerprint_count
from scope
join public.card_prints parent on parent.id = scope.card_print_id
left join children on children.card_print_id = parent.id
left join reviews review on review.card_print_id = parent.id
left join print_search on print_search.card_print_id = parent.id
left join legacy_search on legacy_search.card_print_id = parent.id
left join search_v2 on search_v2.card_print_id = parent.id
left join legacy_fingerprints on legacy_fingerprints.card_print_id = parent.id
left join scanner_fingerprints on scanner_fingerprints.card_print_id = parent.id
order by scope.position`;

async function queryLiveRows(client, scope) {
  const cardIds = scope.cardRows.map((row) => row.id);
  const reviewIds = scope.reviewRows.map((row) => row.id);
  const result = await client.query(INVENTORY_SQL, [cardIds, reviewIds]);
  if (result.rows.length !== EXPECTED_SCOPE_COUNT) {
    throw new Error(
      `Live parent readback mismatch: ${result.rows.length}`,
    );
  }
  for (let index = 0; index < result.rows.length; index += 1) {
    if (result.rows[index].card_print_id !== cardIds[index]) {
      throw new Error(`Live parent order mismatch at position ${index + 1}.`);
    }
  }
  return result.rows;
}

function pickRpcSmokeRows(rows, sampleSize = 12) {
  if (rows.length <= sampleSize) return rows;
  return Array.from({ length: sampleSize }, (_, index) => {
    const position = Math.floor(index * (rows.length - 1) / (sampleSize - 1));
    return rows[position];
  });
}

async function queryRpcSmoke(client, liveRows) {
  const selected = pickRpcSmokeRows(liveRows);
  const result = await client.query(`
    with requested as (
      select gv_id
      from unnest($1::text[]) as selected(gv_id)
    )
    select
      requested.gv_id,
      exists (
        select 1
        from public.search_print_identity_v1(
          requested.gv_id,
          null,
          null,
          'parent_print',
          10,
          0
        ) match
        where match.parent_gv_id = requested.gv_id
      ) as matched
    from requested
    order by requested.gv_id`, [selected.map((row) => row.gv_id)]);
  return result.rows;
}

export function buildInventoryRows(liveRows, plannedChildByCardId) {
  return liveRows.map((row) => {
    const parentImage = classifyParentImage(row);
    const plannedChild = plannedChildByCardId.get(row.card_print_id);
    const childEligibility = classifyChildEligibility({
      plannedChild,
      parentImage,
      liveChildCount: row.live_child_count,
    });
    const planned = plannedChild.db_row;
    const hasScannerIndex = Number(row.scanner_fingerprint_count) > 0
      || Number(row.legacy_fingerprint_count) > 0;

    return {
      position: Number(row.position),
      card_print_id: row.card_print_id,
      gv_id: row.gv_id,
      name: row.name,
      set_code: row.set_code,
      number: row.number,
      identity_domain: row.identity_domain,
      image: {
        ...parentImage,
        image_source: row.image_source,
        image_path: row.image_path,
        image_url: row.image_url,
        image_alt_url: row.image_alt_url,
        representative_image_url: row.representative_image_url,
        image_status: row.image_status,
        image_note: row.image_note,
      },
      child_printing: {
        planned_child_id: planned.id,
        planned_printing_gv_id: planned.printing_gv_id,
        planned_finish_key: planned.finish_key,
        apply_lane: plannedChild.apply_lane,
        live_child_count: Number(row.live_child_count),
        live_child_public_id_count: Number(row.live_child_public_id_count),
        ...childEligibility,
      },
      family_review: {
        id: row.family_review_id,
        family_status: row.family_status,
        review_status: row.family_review_status,
        promotion_allowed: row.family_link_promotion_allowed,
        active: row.family_review_active,
        reviewed_by: row.reviewed_by,
        reviewed_at: row.reviewed_at,
      },
      search: {
        print_identity_parent_document_count:
          Number(row.print_search_document_count),
        legacy_search_row_count: Number(row.legacy_search_row_count),
        search_v2_row_count: Number(row.search_v2_row_count),
        parent_search_reachable:
          Number(row.print_search_document_count) === 1,
      },
      scanner: {
        legacy_fingerprint_count: Number(row.legacy_fingerprint_count),
        verified_legacy_fingerprint_count:
          Number(row.verified_legacy_fingerprint_count),
        scanner_fingerprint_count: Number(row.scanner_fingerprint_count),
        verified_scanner_fingerprint_count:
          Number(row.verified_scanner_fingerprint_count),
        currently_indexed: hasScannerIndex,
        external_image_seed_available: parentImage.has_external_pointer,
        self_hosted_image_seed_available: parentImage.self_hosted,
      },
    };
  });
}

export function buildSummary(rows, rpcSmokeRows) {
  const blockerRows = rows.flatMap((row) =>
    row.child_printing.blockers.map((blocker) => ({ blocker })),
  );
  const findings = [];

  const exactChecks = [
    ['parent scope', rows.length],
    ['parent search documents', rows.filter((row) =>
      row.search.print_identity_parent_document_count === 1).length],
    ['legacy search rows', rows.filter((row) =>
      row.search.legacy_search_row_count === 1).length],
    ['search V2 rows', rows.filter((row) =>
      row.search.search_v2_row_count === 1).length],
    ['family review rows', rows.filter((row) =>
      Boolean(row.family_review.id)).length],
  ];
  for (const [label, count] of exactChecks) {
    if (count !== EXPECTED_SCOPE_COUNT) {
      findings.push(`${label} count is ${count}, expected ${EXPECTED_SCOPE_COUNT}`);
    }
  }
  if (rows.some((row) => row.child_printing.live_child_count !== 0)) {
    findings.push('One or more Japanese V4 parents already has a live child printing.');
  }
  if (rows.some((row) => row.family_review.promotion_allowed)) {
    findings.push('One or more Japanese V4 family reviews is promotion-enabled.');
  }
  if (rpcSmokeRows.some((row) => !row.matched)) {
    findings.push('The exact-GV-ID search RPC smoke did not match every sample.');
  }

  return {
    scope: {
      applied_parent_rows: rows.length,
      distinct_parent_ids: new Set(rows.map((row) => row.card_print_id)).size,
      distinct_parent_gv_ids: new Set(rows.map((row) => row.gv_id)).size,
    },
    images: {
      status_counts: countBy(rows, (row) => row.image.status),
      self_hosted_parent_rows: rows.filter((row) => row.image.self_hosted).length,
      external_pointer_parent_rows: rows.filter((row) =>
        row.image.has_external_pointer).length,
      missing_all_image_pointer_rows: rows.filter((row) =>
        !row.image.has_any_pointer).length,
      image_source_counts: countBy(rows, (row) => row.image.image_source),
      image_status_counts: countBy(rows, (row) => row.image.image_status),
    },
    child_printings: {
      planned_candidates: rows.length,
      structurally_complete_candidates: rows.filter((row) =>
        row.child_printing.structurally_complete).length,
      publication_eligible_now: rows.filter((row) =>
        row.child_printing.status === 'eligible').length,
      blocked_now: rows.filter((row) =>
        row.child_printing.status === 'blocked').length,
      live_child_rows: rows.reduce((sum, row) =>
        sum + row.child_printing.live_child_count, 0),
      blocker_counts: countBy(blockerRows, (row) => row.blocker),
      planned_finish_key_counts: countBy(rows, (row) =>
        row.child_printing.planned_finish_key),
    },
    family_reviews: {
      family_status_counts: countBy(rows, (row) =>
        row.family_review.family_status),
      review_status_counts: countBy(rows, (row) =>
        row.family_review.review_status),
      promotion_allowed_rows: rows.filter((row) =>
        row.family_review.promotion_allowed).length,
      reviewed_rows: rows.filter((row) =>
        Boolean(row.family_review.reviewed_at)).length,
    },
    search: {
      print_identity_parent_documents: rows.reduce((sum, row) =>
        sum + row.search.print_identity_parent_document_count, 0),
      legacy_search_rows: rows.reduce((sum, row) =>
        sum + row.search.legacy_search_row_count, 0),
      search_v2_rows: rows.reduce((sum, row) =>
        sum + row.search.search_v2_row_count, 0),
      exact_gv_id_rpc_smoke_sample_count: rpcSmokeRows.length,
      exact_gv_id_rpc_smoke_match_count: rpcSmokeRows.filter((row) =>
        row.matched).length,
    },
    scanner: {
      currently_indexed_parent_rows: rows.filter((row) =>
        row.scanner.currently_indexed).length,
      legacy_fingerprint_rows: rows.reduce((sum, row) =>
        sum + row.scanner.legacy_fingerprint_count, 0),
      scanner_fingerprint_rows: rows.reduce((sum, row) =>
        sum + row.scanner.scanner_fingerprint_count, 0),
      external_image_seed_candidate_rows: rows.filter((row) =>
        row.scanner.external_image_seed_available).length,
      self_hosted_image_seed_candidate_rows: rows.filter((row) =>
        row.scanner.self_hosted_image_seed_available).length,
    },
    findings,
  };
}

function markdown(report) {
  const summary = report.summary;
  const family = summary.family_reviews.family_status_counts;
  return `# Japanese Master Index V4 Product Integration Inventory V1

Generated: ${report.generated_at}

## Status

- Status: \`${report.status}\`
- Applied parent scope: ${summary.scope.applied_parent_rows}
- Read-only transaction: ${report.guard.transaction_read_only}
- Database writes: false

## Image Hosting

- Self-hosted parent images: ${summary.images.self_hosted_parent_rows}
- External image pointers only: ${summary.images.external_pointer_parent_rows}
- Missing all image pointers: ${summary.images.missing_all_image_pointer_rows}

All current Japanese V4 images remain external evidence pointers. They are
not yet eligible to satisfy Grookai's self-hosted production-image policy.

## Child Printings

- Planned child candidates: ${summary.child_printings.planned_candidates}
- Structurally complete candidates: ${summary.child_printings.structurally_complete_candidates}
- Publication eligible now: ${summary.child_printings.publication_eligible_now}
- Blocked now: ${summary.child_printings.blocked_now}
- Live child rows: ${summary.child_printings.live_child_rows}

The planned \`normal\` child rows remain proposals. Parent identity evidence
does not establish printing-level finish truth, and no public-child approval
or self-hosted image proof exists.

## Family Review

- Resolved species, pending review: ${family.resolved_species ?? 0}
- Resolved domain, pending review: ${family.resolved_domain ?? 0}
- Promotion allowed: ${summary.family_reviews.promotion_allowed_rows}
- Reviewed rows: ${summary.family_reviews.reviewed_rows}

## Search

- Print-identity parent documents: ${summary.search.print_identity_parent_documents}
- Legacy search rows: ${summary.search.legacy_search_rows}
- Search V2 rows: ${summary.search.search_v2_rows}
- Exact GV-ID RPC smoke: ${summary.search.exact_gv_id_rpc_smoke_match_count}/${summary.search.exact_gv_id_rpc_smoke_sample_count}

Parent search reachability is automatic from the durable parent rows. This
does not imply child-printing, image-hosting, pricing, or scanner readiness.

## Scanner

- Currently indexed parents: ${summary.scanner.currently_indexed_parent_rows}
- Legacy fingerprint rows: ${summary.scanner.legacy_fingerprint_rows}
- Scanner fingerprint rows: ${summary.scanner.scanner_fingerprint_rows}
- External-image seed candidates: ${summary.scanner.external_image_seed_candidate_rows}
- Self-hosted-image seed candidates: ${summary.scanner.self_hosted_image_seed_candidate_rows}

## Findings

${summary.findings.length === 0
    ? '- No reconciliation failures.'
    : summary.findings.map((finding) => `- ${finding}`).join('\n')}

## Decision

The next bounded project is image acquisition and self-hosting for this exact
5,336-parent scope. Child-printing publication and scanner-index construction
must remain separate downstream gates. Family review can proceed in parallel
without promoting relationships automatically.
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.envFile) {
    dotenv.config({ path: options.envFile, quiet: true });
  }
  dotenv.config({ quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL;

  const scope = await loadInventoryScope();
  const databaseResult = await withReadOnlyClient({
    connectionString,
    environmentLabel: options.environment,
    statementTimeoutMs: 240_000,
  }, async (client, guard) => {
    const liveRows = await queryLiveRows(client, scope);
    const rpcSmokeRows = await queryRpcSmoke(client, liveRows);
    return { liveRows, rpcSmokeRows, guard };
  });

  const inventoryRows = buildInventoryRows(
    databaseResult.liveRows,
    scope.plannedChildByCardId,
  );
  const summary = buildSummary(
    inventoryRows,
    databaseResult.rpcSmokeRows,
  );
  if (summary.findings.length > 0) {
    throw new Error(
      `Integration inventory reconciliation failed: ${summary.findings.join('; ')}`,
    );
  }

  const generatedAt = new Date().toISOString();
  await fs.mkdir(options.outputRoot, { recursive: true });
  const retrieval = {
    access_mode: 'verified_apply_artifacts_plus_guarded_live_read_only',
    database_reads: true,
    database_writes: false,
    source_fetches: false,
    storage_access: false,
  };
  const rowDataset = await writeShardedRows({
    outputRoot: options.outputRoot,
    datasetKey: 'jpn_product_integration_inventory_rows_v1',
    packageId: PRODUCT_INTEGRATION_INVENTORY_VERSION,
    rows: inventoryRows,
    generatedAt,
    retrieval,
  });
  const report = {
    generated_at: generatedAt,
    inventory_version: PRODUCT_INTEGRATION_INVENTORY_VERSION,
    status: 'inventory_complete_read_only',
    source: scope.source,
    summary,
    rpc_smoke_rows: databaseResult.rpcSmokeRows,
    row_dataset: rowDataset,
    guard: databaseResult.guard,
    execution_boundary: {
      database_reads: true,
      database_transaction_read_only: true,
      database_writes: false,
      storage_reads: false,
      storage_writes: false,
      child_printing_writes: false,
      image_pointer_writes: false,
      family_promotion: false,
      search_writes: false,
      scanner_writes: false,
      pricing_writes: false,
      vault_writes: false,
    },
  };
  await writeJsonArtifact(
    path.join(options.outputRoot, 'jpn_product_integration_inventory_v1.json'),
    buildArtifact({
      packageId: PRODUCT_INTEGRATION_INVENTORY_VERSION,
      generatedAt,
      retrieval,
      content: report,
    }),
  );
  await fs.writeFile(
    path.join(options.outputRoot, 'jpn_product_integration_inventory_v1.md'),
    markdown(report),
  );
  process.stdout.write(stableJson({
    status: report.status,
    summary,
    output_root: options.outputRoot,
  }));
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
