import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import {
  ALLOWED_APPLY_COLUMNS,
  FETCH_CONCURRENCY,
  MANIFEST_SCHEMA,
  OUTPUT_DIR,
  ROOT,
  TLS_VERIFICATION_MODE,
  assetDefinitions,
  clean,
  computeCodeBundleHash,
  computeManifestFingerprint,
  countBy,
  createDataClient,
  createStorageClient,
  errorDetail,
  fetchImage,
  inspectStorageAsset,
  isAllowedHostedPath,
  mapLimit,
  markdownTable,
  proofHash,
  rowDefinitions,
  targetBindingFromEnvironment,
  validateManifestSemantics,
  verifyImageObservation,
  writeJsonl,
} from './self_hosted_images_wh22_common.mjs';

dotenv.config({ path: process.env.IMG_HOST_ENV_FILE ?? '.env.local', quiet: true });
dotenv.config({ quiet: true });

const PACKAGE_ID = 'IMG-HOST-WH-22A-RESIDUAL-GOVERNED-UPLOAD-DRY-RUN';
const ASSET_MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh22a_residual_governed_asset_manifest_v1.jsonl');
const ROW_MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh22a_residual_governed_row_manifest_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh22a_residual_governed_upload_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh22a_residual_governed_upload_dry_run_summary_v1.md');
const PKMNCARDS_FIXTURE = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'source_fixtures',
  'generated_pkmncards_preservation_v1',
  'svp.json',
);

async function fetchRowsAndInventory() {
  const specs = rowDefinitions();
  const client = createDataClient();
  const { data: rows, error: rowsError } = await client
    .from('card_prints')
    .select('*')
    .in('gv_id', specs.map((row) => row.gv_id))
    .order('gv_id');
  if (rowsError) throw new Error(`card_prints_scope_read_failed:${rowsError.message}`);

  const hostedFilter = 'image_path.like.warehouse-derived/self-hosted-images-v1/%,image_path.like.warehouse-derived/image-truth-v1/%';
  async function exactCount(configure) {
    let query = client.from('card_prints').select('*', { count: 'exact', head: true });
    query = configure(query);
    const { count, error } = await query;
    if (error) throw new Error(`inventory_count_failed:${error.message}`);
    return Number(count ?? 0);
  }
  const [total, pocket, fixture, allHosted, pocketHosted, fixtureHosted] = await Promise.all([
    exactCount((query) => query.like('gv_id', 'GV-%')),
    exactCount((query) => query.like('gv_id', 'GV-TCGP-%')),
    exactCount((query) => query.eq('set_code', 'E7TEST')),
    exactCount((query) => query.like('gv_id', 'GV-%').or(hostedFilter)),
    exactCount((query) => query.like('gv_id', 'GV-TCGP-%').or(hostedFilter)),
    exactCount((query) => query.eq('set_code', 'E7TEST').or(hostedFilter)),
  ]);
  return {
    rows: rows ?? [],
    inventory: {
      total_gvid_rows: total,
      pocket_rows: pocket,
      fixture_rows: fixture,
      governed_physical_rows: total - pocket - fixture,
      all_gvid_canon_hosted_before: allHosted,
      pocket_canon_hosted_before: pocketHosted,
      fixture_canon_hosted_before: fixtureHosted,
      governed_physical_canon_hosted_before: allHosted - pocketHosted - fixtureHosted,
    },
  };
}

async function hydrateSourceEvidence(definitions) {
  const fixture = JSON.parse(await fs.readFile(PKMNCARDS_FIXTURE, 'utf8'));
  const byNumber = new Map((fixture.records ?? []).map((row) => [String(row.card_number), row]));
  return definitions.map((definition) => {
    if (definition.source_provider !== 'pkmncards') return definition;
    const number = definition.asset_id.replace(/^svp-/, '');
    const evidence = byNumber.get(number);
    return {
      ...definition,
      source_page_url: evidence?.source_url ?? null,
      source_evidence_label: evidence?.evidence_label ?? null,
    };
  });
}

async function acquireAssets(definitions, supabase) {
  return mapLimit(definitions, FETCH_CONCURRENCY, async (definition) => {
    try {
      const fetched = await fetchImage(definition.source_url);
      const sourceErrors = verifyImageObservation(fetched.observation, definition.expected, { requireHttpSuccess: true });
      let storage;
      try {
        storage = await inspectStorageAsset(supabase, definition);
      } catch (error) {
        storage = {
          exists: false,
          valid: false,
          observation: null,
          errors: [`storage_inspection_exception:${errorDetail(error).code ?? errorDetail(error).message}`],
        };
      }
      const expectsReuse = definition.initial_storage_disposition === 'reuse_existing_first_party';
      const storageErrors = [];
      if (expectsReuse && !storage.exists) storageErrors.push('required_reuse_object_missing');
      if (storage.exists && !storage.valid) storageErrors.push('target_storage_object_integrity_mismatch');
      const storageState = storage.exists
        ? (storage.valid ? 'verified_existing_object' : 'existing_object_integrity_mismatch')
        : 'missing_upload_target';
      return {
        manifest_schema: MANIFEST_SCHEMA,
        asset_id: definition.asset_id,
        owner_gv_id: definition.owner_gv_id,
        set_code: definition.set_code,
        source_provider: definition.source_provider,
        source_route: definition.source_route,
        source_page_url: definition.source_page_url,
        source_evidence_label: definition.source_evidence_label ?? null,
        preserved_evidence_ref: definition.preserved_evidence_ref,
        verified_fallback_url: definition.source_url,
        source_expected: definition.expected,
        source_observed: fetched.observation,
        source_validation_errors: sourceErrors,
        source_verified: sourceErrors.length === 0,
        target_storage_bucket: definition.target_storage_bucket,
        target_storage_path: definition.target_storage_path,
        initial_storage_disposition: definition.initial_storage_disposition,
        storage_state: storageState,
        storage_observed: storage.observation,
        storage_validation_errors: [...storage.errors, ...storageErrors],
        storage_verified: storage.exists && storage.valid,
        upload_required: !storage.exists && !expectsReuse,
        overwrite_allowed: false,
      };
    } catch (error) {
      return {
        manifest_schema: MANIFEST_SCHEMA,
        asset_id: definition.asset_id,
        owner_gv_id: definition.owner_gv_id,
        set_code: definition.set_code,
        source_provider: definition.source_provider,
        source_route: definition.source_route,
        source_page_url: definition.source_page_url,
        source_evidence_label: definition.source_evidence_label ?? null,
        preserved_evidence_ref: definition.preserved_evidence_ref,
        verified_fallback_url: definition.source_url,
        source_expected: definition.expected,
        source_observed: null,
        source_validation_errors: [`source_acquisition_exception:${errorDetail(error).code ?? errorDetail(error).message}`],
        source_acquisition_error: errorDetail(error),
        source_verified: false,
        target_storage_bucket: definition.target_storage_bucket,
        target_storage_path: definition.target_storage_path,
        initial_storage_disposition: definition.initial_storage_disposition,
        storage_state: 'not_checked_due_source_failure',
        storage_observed: null,
        storage_validation_errors: ['not_checked_due_source_failure'],
        storage_verified: false,
        upload_required: false,
        overwrite_allowed: false,
      };
    }
  });
}

async function inspectCurrentFallbackUrls(snapshots, assetById, specByGvId, acquiredByUrl) {
  const urls = new Set();
  for (const snapshot of snapshots) {
    for (const field of ['image_url', 'image_alt_url', 'representative_image_url']) {
      const url = clean(snapshot[field]);
      if (url) urls.add(url);
    }
  }
  const observations = new Map(acquiredByUrl);
  const pending = [...urls].filter((url) => !observations.has(url)).sort();
  const fetched = await mapLimit(pending, FETCH_CONCURRENCY, async (url) => {
    try {
      const result = await fetchImage(url);
      return [url, result.observation];
    } catch (error) {
      return [url, { ok: false, status: null, error: errorDetail(error) }];
    }
  });
  for (const [url, observation] of fetched) observations.set(url, observation);

  const byGvId = new Map();
  for (const snapshot of snapshots) {
    const spec = specByGvId.get(snapshot.gv_id);
    const asset = assetById.get(spec?.asset_id);
    const candidates = [];
    for (const field of ['image_url', 'image_alt_url', 'representative_image_url']) {
      const url = clean(snapshot[field]);
      if (!url) continue;
      const observation = observations.get(url) ?? null;
      const errors = observation
        ? verifyImageObservation(observation, asset.source_expected, { requireHttpSuccess: true })
        : ['missing_observation'];
      candidates.push({ field, url, observation, exact_asset_match: errors.length === 0, validation_errors: errors });
    }
    byGvId.set(snapshot.gv_id, candidates);
  }
  return byGvId;
}

function buildRowManifest(specs, snapshots, assetRows, fallbackByGvId) {
  const snapshotByGvId = new Map(snapshots.map((row) => [row.gv_id, row]));
  const assetById = new Map(assetRows.map((row) => [row.asset_id, row]));
  return specs.map((spec) => {
    const snapshot = snapshotByGvId.get(spec.gv_id) ?? null;
    const asset = assetById.get(spec.asset_id) ?? null;
    if (!snapshot || !asset) {
      return {
        manifest_schema: MANIFEST_SCHEMA,
        gv_id: spec.gv_id,
        asset_id: spec.asset_id,
        row_validation_errors: [!snapshot ? 'missing_current_row' : 'missing_asset'],
      };
    }
    const fallbackField = spec.image_claim_role === 'exact_parent' ? 'image_url' : 'representative_image_url';
    const proposedValues = {
      image_source: 'identity',
      image_path: asset.target_storage_path,
      [fallbackField]: asset.verified_fallback_url,
    };
    if (spec.expected_current_image_status !== spec.proposed_image_status) {
      proposedValues.image_status = spec.proposed_image_status;
    }
    const expectedAfterSnapshot = { ...snapshot, ...proposedValues };
    const rowErrors = [];
    if (snapshot.set_code !== spec.set_code) rowErrors.push('set_code_mismatch');
    if (String(snapshot.number ?? '') !== spec.number) rowErrors.push('number_mismatch');
    if (![spec.expected_current_image_status, spec.proposed_image_status].includes(clean(snapshot.image_status))) {
      rowErrors.push('image_status_mismatch');
    }
    if (clean(snapshot.image_path) && clean(snapshot.image_path) !== asset.target_storage_path) rowErrors.push('unexpected_existing_image_path');
    if (clean(snapshot.image_path) && !isAllowedHostedPath(snapshot.image_path)) rowErrors.push('existing_image_path_not_canon_hosted');
    const currentFallbackCandidates = fallbackByGvId.get(spec.gv_id) ?? [];
    const hasVerifiedCurrentFallback = currentFallbackCandidates.some((row) => row.exact_asset_match);
    return {
      manifest_schema: MANIFEST_SCHEMA,
      package_id: PACKAGE_ID,
      target_table: 'card_prints',
      target_row_id: snapshot.id,
      gv_id: spec.gv_id,
      name: snapshot.name,
      set_code: snapshot.set_code,
      number: snapshot.number,
      asset_id: spec.asset_id,
      asset_owner_gv_id: asset.owner_gv_id,
      image_claim_role: spec.image_claim_role,
      target_storage_bucket: asset.target_storage_bucket,
      target_storage_path: asset.target_storage_path,
      current_row_snapshot: snapshot,
      current_row_snapshot_hash: proofHash(snapshot),
      proposed_values: proposedValues,
      expected_after_snapshot_hash: proofHash(expectedAfterSnapshot),
      row_disposition: Object.entries(proposedValues).every(([key, value]) => clean(snapshot[key]) === clean(value))
        ? 'already_pointed'
        : 'pointer_update_required',
      verified_fallback_url: asset.verified_fallback_url,
      current_fallback_candidates: currentFallbackCandidates,
      current_functional_fallback_present: hasVerifiedCurrentFallback,
      fallback_column_assessment: hasVerifiedCurrentFallback
        ? 'existing_provider_fallback_already_verified'
        : `guarded_${fallbackField}_repair_planned_in_wh22`,
      fallback_field: fallbackField,
      fallback_column_write_in_wh22: true,
      original_provider_reference_preserved_in_manifest: true,
      allowed_apply_columns: ALLOWED_APPLY_COLUMNS,
      changed_columns: Object.keys(proposedValues).filter((key) => clean(snapshot[key]) !== clean(proposedValues[key])),
      preserved_columns: [
        'image_note',
        'image_alt_url',
        ...(fallbackField === 'image_url' ? ['representative_image_url'] : ['image_url']),
      ],
      blocked_apply_columns: ['id', 'gv_id', 'name', 'set_code', 'number', 'image_note', 'image_alt_url'],
      row_validation_errors: rowErrors,
    };
  });
}

function renderSummaryMarkdown(summary) {
  return `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Source/storage TLS verification: ${summary.source_tls_verification}
- Approval fingerprint: \`${summary.fingerprint}\`
- Asset manifest hash: \`${summary.asset_manifest_hash}\`
- Row manifest hash: \`${summary.row_manifest_hash}\`
- Parent-row mappings: ${summary.parent_row_mappings}
- Unique verified assets: ${summary.unique_verified_assets}
- New uploads required now: ${summary.new_uploads_required_now}
- Existing first-party assets reused: ${summary.existing_first_party_assets_reused}
- Representative rows sharing a base asset: ${summary.representative_shared_rows}
- Rows with a functional current third-party fallback: ${summary.rows_with_functional_current_fallback}
- Rows receiving a verified provider fallback in WH22: ${summary.rows_with_guarded_fallback_repair_planned}
- Exact-status promotions (missing -> exact): ${summary.image_status_promotions_planned}
- Ready for storage apply: ${summary.ready_for_storage_apply}
- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}
- Storage writes performed: ${summary.storage_writes_performed}
- Database writes performed: ${summary.db_writes_performed}
- Migrations created: ${summary.migrations_created}

## Coverage accounting

| measure | before | projected after WH22 |
| --- | ---: | ---: |
| Governed English physical parent rows | ${summary.inventory.governed_physical_canon_hosted_before} / ${summary.inventory.governed_physical_rows} | ${summary.inventory.governed_physical_canon_hosted_after_projection} / ${summary.inventory.governed_physical_rows} |
| Broad canon-hosted GV-ID rows | ${summary.inventory.all_gvid_canon_hosted_before} / ${summary.inventory.total_gvid_rows} | ${summary.inventory.all_gvid_canon_hosted_after_projection} / ${summary.inventory.total_gvid_rows} |

The governed denominator excludes all ${summary.inventory.pocket_rows} \`GV-TCGP-*\` Pocket rows and all ${summary.inventory.fixture_rows} E7TEST fixture rows. The projected broad hosted count of ${summary.inventory.all_gvid_canon_hosted_after_projection} includes ${summary.inventory.pocket_canon_hosted_before} already-hosted Pocket rows, so it is not the governed physical denominator.

## Source providers

${markdownTable(Object.entries(summary.by_source_provider).map(([provider, count]) => ({ provider, count })))}

## WH22 column decision

WH22 writes a role-minimal subset of \`${summary.wh22_planned_db_columns.join(', ')}\`. Exact parents receive the verified fallback in \`image_url\`; stamped representative rows receive the verified base-art fallback in \`representative_image_url\`. \`image_alt_url\` and \`image_note\` remain unchanged. The immutable before snapshot retains every replaced dead provider URL as acquisition evidence.
`;
}

async function main() {
  const specs = rowDefinitions();
  const definitions = await hydrateSourceEvidence(assetDefinitions());
  const { rows: snapshots, inventory } = await fetchRowsAndInventory();
  const supabase = createStorageClient();
  const assetRows = (await acquireAssets(definitions, supabase))
    .sort((left, right) => left.asset_id.localeCompare(right.asset_id));
  const assetById = new Map(assetRows.map((row) => [row.asset_id, row]));
  const specByGvId = new Map(specs.map((row) => [row.gv_id, row]));
  const acquiredByUrl = new Map(
    assetRows
      .filter((row) => row.source_observed)
      .map((row) => [row.verified_fallback_url, row.source_observed]),
  );
  const fallbackByGvId = await inspectCurrentFallbackUrls(
    snapshots,
    assetById,
    specByGvId,
    acquiredByUrl,
  );
  const rowRows = buildRowManifest(specs, snapshots, assetRows, fallbackByGvId)
    .sort((left, right) => left.gv_id.localeCompare(right.gv_id));
  const targetBinding = await targetBindingFromEnvironment();
  const codeBundle = await computeCodeBundleHash();
  const semanticErrors = validateManifestSemantics(assetRows, rowRows, targetBinding);

  const missingGvIds = specs.filter((spec) => !snapshots.some((row) => row.gv_id === spec.gv_id)).map((row) => row.gv_id);
  const sourceFailures = assetRows.filter((row) => !row.source_verified);
  const storageIntegrityFailures = assetRows.filter((row) => row.storage_state === 'existing_object_integrity_mismatch');
  const missingRequiredReuse = assetRows.filter(
    (row) => row.initial_storage_disposition === 'reuse_existing_first_party' && !row.storage_verified,
  );
  const rowFailures = rowRows.filter((row) => (row.row_validation_errors ?? []).length > 0);
  const targetPathGroups = new Map();
  for (const asset of assetRows) {
    const rows = targetPathGroups.get(asset.target_storage_path) ?? [];
    rows.push(asset);
    targetPathGroups.set(asset.target_storage_path, rows);
  }
  const conflictingAssetPaths = [...targetPathGroups.values()].filter((rows) => {
    if (rows.length < 2) return false;
    return new Set(rows.map((row) => JSON.stringify(row.source_expected))).size > 1;
  });
  const manifestFingerprint = computeManifestFingerprint(assetRows, rowRows, targetBinding, codeBundle.hash);
  const assetManifestHash = proofHash(assetRows);
  const rowManifestHash = proofHash(rowRows);
  const targetUnhostedRows = rowRows.filter((row) => !isAllowedHostedPath(row.current_row_snapshot?.image_path)).length;
  const projectedGovernedHosted = Number(inventory.governed_physical_canon_hosted_before) + targetUnhostedRows;
  const projectedBroadHosted = Number(inventory.all_gvid_canon_hosted_before) + targetUnhostedRows;
  const stopFindings = [
    ...(specs.length !== 24 ? ['static_row_scope_not_24'] : []),
    ...(definitions.length !== 21 ? ['static_asset_scope_not_21'] : []),
    ...(snapshots.length !== 24 ? ['live_row_scope_not_24'] : []),
    ...(missingGvIds.length ? ['missing_whitelisted_rows'] : []),
    ...(sourceFailures.length ? ['source_integrity_failures'] : []),
    ...(storageIntegrityFailures.length ? ['target_storage_integrity_collisions'] : []),
    ...(missingRequiredReuse.length ? ['required_first_party_reuse_missing_or_invalid'] : []),
    ...(rowFailures.length ? ['current_row_precondition_failures'] : []),
    ...(conflictingAssetPaths.length ? ['conflicting_unique_asset_paths'] : []),
    ...(semanticErrors.length ? ['manifest_semantic_validation_failures'] : []),
  ];

  const summary = {
    manifest_schema: MANIFEST_SCHEMA,
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'dry_run_no_write',
    source_tls_verification: TLS_VERIFICATION_MODE,
    target_binding: targetBinding,
    code_bundle_hash: codeBundle.hash,
    code_bundle_files: codeBundle.files,
    fingerprint: manifestFingerprint,
    asset_manifest_hash: assetManifestHash,
    row_manifest_hash: rowManifestHash,
    asset_manifest_jsonl: path.relative(ROOT, ASSET_MANIFEST_JSONL),
    row_manifest_jsonl: path.relative(ROOT, ROW_MANIFEST_JSONL),
    parent_row_mappings: rowRows.length,
    effective_pointer_updates_now: rowRows.filter((row) => row.row_disposition === 'pointer_update_required').length,
    unique_verified_assets: assetRows.filter((row) => row.source_verified).length,
    new_uploads_required_now: assetRows.filter((row) => row.upload_required).length,
    existing_first_party_assets_reused: assetRows.filter(
      (row) => row.initial_storage_disposition === 'reuse_existing_first_party' && row.storage_verified,
    ).length,
    representative_shared_rows: rowRows.filter((row) => row.image_claim_role === 'representative_shared_stamp').length,
    rows_with_functional_current_fallback: rowRows.filter((row) => row.current_functional_fallback_present).length,
    rows_with_guarded_fallback_repair_planned: rowRows.filter((row) => row.fallback_column_write_in_wh22).length,
    image_status_promotions_planned: rowRows.filter(
      (row) => row.changed_columns?.includes('image_status'),
    ).length,
    fallback_column_write_in_wh22: true,
    wh22_planned_db_columns: ALLOWED_APPLY_COLUMNS.map((column) => `card_prints.${column}`),
    wh22_preserved_columns: ['card_prints.image_note', 'card_prints.image_alt_url'],
    by_source_provider: countBy(assetRows, (row) => row.source_provider),
    by_storage_state: countBy(assetRows, (row) => row.storage_state),
    by_image_claim_role: countBy(rowRows, (row) => row.image_claim_role),
    inventory: {
      ...inventory,
      target_unhosted_rows_before: targetUnhostedRows,
      governed_physical_canon_hosted_after_projection: projectedGovernedHosted,
      all_gvid_canon_hosted_after_projection: projectedBroadHosted,
      all_gvid_unhosted_after_projection: Number(inventory.total_gvid_rows) - projectedBroadHosted,
      governed_scope_formula: 'total_gvid_rows - pocket_rows - fixture_rows',
      projected_broad_count_note: 'Includes already-hosted Pocket rows; it is not the governed English physical denominator.',
    },
    stop_findings: stopFindings,
    ready_for_storage_apply: stopFindings.length === 0 && assetRows.some((row) => row.upload_required),
    storage_writes_performed: false,
    db_writes_performed: false,
    migrations_created: false,
    deletes_or_merges_performed: false,
    source_failures: sourceFailures.map((row) => ({ asset_id: row.asset_id, errors: row.source_validation_errors })),
    row_failures: rowFailures.map((row) => ({ gv_id: row.gv_id, errors: row.row_validation_errors })),
    semantic_validation_errors: semanticErrors,
  };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await writeJsonl(ASSET_MANIFEST_JSONL, assetRows);
  await writeJsonl(ROW_MANIFEST_JSONL, rowRows);
  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, renderSummaryMarkdown(summary), 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    fingerprint: summary.fingerprint,
    asset_manifest_hash: summary.asset_manifest_hash,
    row_manifest_hash: summary.row_manifest_hash,
    parent_row_mappings: summary.parent_row_mappings,
    unique_verified_assets: summary.unique_verified_assets,
    new_uploads_required_now: summary.new_uploads_required_now,
    existing_first_party_assets_reused: summary.existing_first_party_assets_reused,
    rows_with_functional_current_fallback: summary.rows_with_functional_current_fallback,
    rows_with_guarded_fallback_repair_planned: summary.rows_with_guarded_fallback_repair_planned,
    image_status_promotions_planned: summary.image_status_promotions_planned,
    ready_for_storage_apply: summary.ready_for_storage_apply,
    stop_findings: summary.stop_findings,
    inventory: summary.inventory,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
