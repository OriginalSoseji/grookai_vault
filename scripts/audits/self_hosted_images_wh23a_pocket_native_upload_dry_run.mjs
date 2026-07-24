import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import {
  ALLOWED_APPLY_COLUMNS,
  FETCH_CONCURRENCY,
  HOSTED_CONVENTION_SAMPLES,
  MANIFEST_SCHEMA,
  OUTPUT_DIR,
  PACKAGE_SCOPE,
  ROOT,
  TLS_VERIFICATION_MODE,
  assetDefinitions,
  computeCodeBundleHash,
  computeManifestFingerprint,
  createDataClient,
  createStorageClient,
  fetchPocketImage,
  inspectStorageAsset,
  mapLimit,
  proofHash,
  rowDefinitions,
  targetBindingFromEnvironment,
  validateManifestSemantics,
  verifyImageObservation,
  writeJsonl,
} from './self_hosted_images_wh23_common.mjs';

dotenv.config({ path: process.env.IMG_HOST_ENV_FILE ?? '.env.local', quiet: true });
dotenv.config({ quiet: true });

const PACKAGE_ID = 'IMG-HOST-WH-23A-POCKET-NATIVE-UPLOAD-DRY-RUN';
const ASSET_MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh23a_pocket_native_asset_manifest_v1.jsonl');
const ROW_MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh23a_pocket_native_row_manifest_v1.jsonl');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh23a_pocket_native_upload_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh23a_pocket_native_upload_dry_run_summary_v1.md');
const HOSTED_PREFIX = 'warehouse-derived/self-hosted-images-v1/';

async function fetchLiveScope() {
  const client = createDataClient();
  const specs = rowDefinitions();
  const targetIds = specs.map((row) => row.gv_id);
  const sampleIds = HOSTED_CONVENTION_SAMPLES.map((row) => row.gv_id);
  const [{ data: targets, error: targetError }, { data: samples, error: sampleError }] = await Promise.all([
    client.from('card_prints').select('*').in('gv_id', targetIds).order('gv_id'),
    client.from('card_prints').select('*').in('gv_id', sampleIds).order('gv_id'),
  ]);
  if (targetError) throw new Error(`target_scope_read_failed:${targetError.message}`);
  if (sampleError) throw new Error(`convention_scope_read_failed:${sampleError.message}`);

  const pocketRows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from('card_prints')
      .select('gv_id,image_path')
      .like('gv_id', 'GV-TCGP-%')
      .order('gv_id')
      .range(from, from + 999);
    if (error) throw new Error(`pocket_inventory_read_failed:${error.message}`);
    pocketRows.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  const setIds = [...new Set((targets ?? []).map((row) => row.set_id).filter(Boolean))];
  const { data: sets, error: setsError } = await client.from('sets').select('*').in('id', setIds);
  if (setsError) throw new Error(`set_identity_read_failed:${setsError.message}`);
  return {
    targets: targets ?? [],
    samples: samples ?? [],
    sets: sets ?? [],
    pocket_rows: pocketRows,
  };
}

async function verifyHostedConvention(samples, supabase) {
  const liveByGvId = new Map(samples.map((row) => [row.gv_id, row]));
  return mapLimit(HOSTED_CONVENTION_SAMPLES, FETCH_CONCURRENCY, async (expected) => {
    const live = liveByGvId.get(expected.gv_id) ?? null;
    const storage = await inspectStorageAsset(supabase, {
      target_storage_bucket: process.env.SELF_HOSTED_IMAGES_STORAGE_BUCKET ?? 'user-card-images',
      target_storage_path: expected.path,
    }, {
      content_type: 'image/webp',
      size_bytes: expected.size_bytes,
      sha256: expected.sha256,
      width: 600,
      height: 825,
      format: 'webp',
    });
    const errors = [];
    if (!live) errors.push('sample_row_missing');
    if (live?.image_path !== expected.path) errors.push('sample_path_drift');
    if (live?.image_url !== expected.source_url) errors.push('sample_provider_provenance_drift');
    if (live?.image_source !== 'identity') errors.push('sample_image_source_drift');
    if (live?.image_status !== 'exact') errors.push('sample_image_status_drift');
    if (live?.identity_domain !== 'tcg_pocket_excluded') errors.push('sample_identity_domain_drift');
    if (!storage.valid) errors.push(...storage.errors.map((error) => `storage:${error}`));
    return {
      gv_id: expected.gv_id,
      image_path: live?.image_path ?? null,
      provider_provenance: live?.image_url ?? null,
      image_source: live?.image_source ?? null,
      image_status: live?.image_status ?? null,
      identity_domain: live?.identity_domain ?? null,
      storage_observation: storage.observation,
      verified: errors.length === 0,
      validation_errors: errors,
    };
  });
}

async function acquireAssets(definitions, supabase) {
  return mapLimit(definitions, FETCH_CONCURRENCY, async (definition) => {
    try {
      const [primary, fallback] = await Promise.all([
        fetchPocketImage(definition.source_url),
        fetchPocketImage(definition.fallback_url),
      ]);
      const primaryErrors = verifyImageObservation(primary.observation, definition.source_expected, { requireHttpSuccess: true });
      const fallbackErrors = verifyImageObservation(fallback.observation, definition.fallback_expected, { requireHttpSuccess: true });
      const storage = await inspectStorageAsset(supabase, definition);
      return {
        manifest_schema: MANIFEST_SCHEMA,
        asset_id: definition.asset_id,
        owner_gv_id: definition.owner_gv_id,
        number: definition.number,
        name: definition.name,
        set_code: definition.set_code,
        identity_domain: definition.identity_domain,
        source_provider: definition.source_provider,
        source_page_url: definition.source_page_url,
        source_url: definition.source_url,
        source_expected: definition.source_expected,
        source_observed: primary.observation,
        source_verified: primaryErrors.length === 0,
        source_validation_errors: primaryErrors,
        fallback_provider: definition.fallback_provider,
        fallback_url: definition.fallback_url,
        fallback_expected: definition.fallback_expected,
        fallback_observed: fallback.observation,
        fallback_verified: fallbackErrors.length === 0,
        fallback_validation_errors: fallbackErrors,
        quality_claim: definition.quality_claim,
        quality_evidence: {
          pokemon_zone_full_card: `${primary.observation.width}x${primary.observation.height}`,
          serebii_independent_full_card: `${fallback.observation.width}x${fallback.observation.height}`,
          highest_verified_untransformed_full_card_source: '367x512',
          excluded_non_full_card_evidence: '734x1024 illustration-only layer lacks the complete card frame and text',
          upscale_policy: 'prohibited; preserve exact native source bytes',
        },
        transformation: definition.transformation,
        target_storage_bucket: definition.target_storage_bucket,
        target_storage_path: definition.target_storage_path,
        storage_state: storage.exists ? (storage.valid ? 'verified_existing_exact_object' : 'existing_object_integrity_collision') : 'missing_upload_target',
        storage_observed: storage.observation,
        storage_validation_errors: storage.exists ? storage.errors : [],
        upload_required: !storage.exists,
        overwrite_allowed: false,
      };
    } catch (error) {
      return {
        manifest_schema: MANIFEST_SCHEMA,
        asset_id: definition.asset_id,
        owner_gv_id: definition.owner_gv_id,
        number: definition.number,
        name: definition.name,
        set_code: definition.set_code,
        identity_domain: definition.identity_domain,
        source_provider: definition.source_provider,
        source_page_url: definition.source_page_url,
        source_url: definition.source_url,
        source_expected: definition.source_expected,
        source_observed: null,
        source_verified: false,
        source_validation_errors: [`acquisition_exception:${error instanceof Error ? error.message : String(error)}`],
        fallback_provider: definition.fallback_provider,
        fallback_url: definition.fallback_url,
        fallback_expected: definition.fallback_expected,
        fallback_observed: null,
        fallback_verified: false,
        fallback_validation_errors: ['not_verified_due_acquisition_exception'],
        quality_claim: definition.quality_claim,
        transformation: definition.transformation,
        target_storage_bucket: definition.target_storage_bucket,
        target_storage_path: definition.target_storage_path,
        storage_state: 'not_checked_due_acquisition_exception',
        storage_observed: null,
        storage_validation_errors: ['not_checked_due_acquisition_exception'],
        upload_required: false,
        overwrite_allowed: false,
      };
    }
  });
}

function buildRowManifest(specs, snapshots, assetRows) {
  const snapshotByGvId = new Map(snapshots.map((row) => [row.gv_id, row]));
  const assetById = new Map(assetRows.map((row) => [row.asset_id, row]));
  return specs.map((spec) => {
    const snapshot = snapshotByGvId.get(spec.gv_id) ?? null;
    const asset = assetById.get(spec.asset_id) ?? null;
    const errors = [];
    if (!snapshot) errors.push('current_row_missing');
    if (!asset) errors.push('asset_missing');
    if (snapshot?.name !== spec.expected_name) errors.push('name_mismatch');
    if (String(snapshot?.number ?? '') !== spec.number) errors.push('number_mismatch');
    if (snapshot?.set_code !== null) errors.push('set_code_mismatch');
    if (snapshot?.identity_domain !== spec.expected_identity_domain) errors.push('identity_domain_mismatch');
    if (snapshot?.external_ids?.tcgdex !== `P-A-${spec.number.padStart(3, '0')}`) errors.push('tcgdex_external_id_mismatch');
    if (snapshot?.image_status !== spec.expected_image_status) errors.push('image_status_not_missing');
    for (const field of ['image_path', 'image_url', 'image_alt_url', 'representative_image_url', 'image_source']) {
      if (snapshot?.[field] !== null) errors.push(`${field}_not_null`);
    }
    const proposedValues = asset ? {
      image_path: asset.target_storage_path,
      image_source: 'identity',
      image_status: 'exact',
      image_url: asset.fallback_url,
    } : null;
    const expectedAfter = snapshot && proposedValues ? { ...snapshot, ...proposedValues } : null;
    return {
      manifest_schema: MANIFEST_SCHEMA,
      package_id: PACKAGE_ID,
      target_table: 'card_prints',
      target_row_id: snapshot?.id ?? null,
      gv_id: spec.gv_id,
      name: snapshot?.name ?? spec.expected_name,
      set_code: snapshot?.set_code ?? null,
      set_id: snapshot?.set_id ?? null,
      number: snapshot?.number ?? spec.number,
      identity_domain: snapshot?.identity_domain ?? null,
      asset_id: spec.asset_id,
      target_storage_bucket: asset?.target_storage_bucket ?? null,
      target_storage_path: asset?.target_storage_path ?? null,
      current_row_snapshot: snapshot,
      current_row_snapshot_hash: snapshot ? proofHash(snapshot) : null,
      proposed_values: proposedValues,
      expected_after_snapshot_hash: expectedAfter ? proofHash(expectedAfter) : null,
      verified_fallback_url: asset?.fallback_url ?? null,
      fallback_policy: 'third_party_failure_fallback_only; Grookai-hosted image_path is primary',
      changed_columns: proposedValues ? Object.keys(proposedValues).sort() : [],
      allowed_apply_columns: ALLOWED_APPLY_COLUMNS,
      preserved_identity_fields: ['id', 'gv_id', 'set_id', 'set_code', 'number', 'identity_domain', 'external_ids'],
      preserved_image_fields: ['image_alt_url', 'image_note', 'representative_image_url'],
      row_validation_errors: errors,
    };
  });
}

function renderMarkdown(summary) {
  return `# ${PACKAGE_ID}\n\n- Mode: ${summary.mode}\n- Scope: ${summary.package_scope}\n- Approval fingerprint: \`${summary.fingerprint}\`\n- Code bundle hash: \`${summary.code_bundle_hash}\`\n- Asset manifest hash: \`${summary.asset_manifest_hash}\`\n- Row manifest hash: \`${summary.row_manifest_hash}\`\n- Verified primary assets: ${summary.verified_primary_assets} / 27\n- Verified independent fallbacks: ${summary.verified_fallback_assets} / 27\n- Highest verified untransformed full-card source: ${summary.highest_verified_untransformed_source}\n- Exact source bytes preserved without upscale: ${summary.source_bytes_preserved_without_upscale}\n- Existing hosted Pocket convention samples verified: ${summary.hosted_convention_samples_verified} / 4\n- New uploads required: ${summary.new_uploads_required}\n- Ready for guarded storage apply: ${summary.ready_for_storage_apply}\n- Stop findings: ${summary.stop_findings.length ? summary.stop_findings.join(', ') : 'none'}\n- Storage writes performed: false\n- Database writes performed: false\n- Migrations created: false\n\nThe 600x825 convention samples are exact copies of the historical TCGdex Pocket payloads. For P-A 74–100, the highest directly verified, untransformed complete-card sources available at acquisition time are 367x512, so WH23 stores the exact Pokemon Zone WebP bytes instead of manufacturing a larger upscale. The Serebii JPEG remains in \`image_url\` only as a functioning provider fallback; \`image_path\` is the Grookai-hosted primary.\n`;
}

async function main() {
  const specs = rowDefinitions();
  const definitions = assetDefinitions();
  const live = await fetchLiveScope();
  const storage = createStorageClient();
  const [assetRows, conventionRows] = await Promise.all([
    acquireAssets(definitions, storage),
    verifyHostedConvention(live.samples, storage),
  ]);
  assetRows.sort((a, b) => Number(a.number) - Number(b.number));
  const rowRows = buildRowManifest(specs, live.targets, assetRows).sort((a, b) => Number(a.number) - Number(b.number));
  const targetBinding = await targetBindingFromEnvironment();
  const codeBundle = await computeCodeBundleHash();
  const semanticErrors = validateManifestSemantics(assetRows, rowRows, targetBinding);
  const hostedPocket = live.pocket_rows.filter((row) => String(row.image_path ?? '').startsWith(HOSTED_PREFIX));
  const unhostedPocket = live.pocket_rows.filter((row) => !String(row.image_path ?? '').startsWith(HOSTED_PREFIX));
  const expectedIds = specs.map((row) => row.gv_id);
  const actualGapIds = unhostedPocket.map((row) => row.gv_id).sort((a, b) => Number(a.split('-').at(-1)) - Number(b.split('-').at(-1)));
  const sourceFailures = assetRows.filter((row) => !row.source_verified || !row.fallback_verified);
  const storageCollisions = assetRows.filter((row) => row.storage_state === 'existing_object_integrity_collision');
  const rowFailures = rowRows.filter((row) => row.row_validation_errors.length > 0);
  const conventionFailures = conventionRows.filter((row) => !row.verified);
  const set = live.sets[0] ?? null;
  const setErrors = [];
  if (live.sets.length !== 1) setErrors.push('target_set_scope_not_one');
  if (set?.code !== 'P-A' || set?.name !== 'Promos-A') setErrors.push('target_set_identity_mismatch');
  if (set?.identity_domain_default !== 'tcg_pocket_excluded') setErrors.push('target_set_domain_mismatch');
  if (set?.source?.domain !== 'tcg_pocket') setErrors.push('target_set_source_domain_mismatch');
  const inventoryErrors = [];
  if (live.pocket_rows.length !== 2012) inventoryErrors.push('pocket_inventory_count_not_2012');
  if (hostedPocket.length !== 1985) inventoryErrors.push('hosted_pocket_count_not_1985');
  if (proofHash(actualGapIds) !== proofHash(expectedIds)) inventoryErrors.push('unhosted_pocket_gap_scope_drift');
  const stopFindings = [
    ...(sourceFailures.length ? ['source_or_fallback_integrity_failure'] : []),
    ...(storageCollisions.length ? ['target_storage_integrity_collision'] : []),
    ...(rowFailures.length ? ['row_precondition_failure'] : []),
    ...(conventionFailures.length ? ['hosted_pocket_convention_failure'] : []),
    ...(setErrors.length ? ['pocket_set_identity_failure'] : []),
    ...(inventoryErrors.length ? ['pocket_inventory_scope_failure'] : []),
    ...(semanticErrors.length ? ['manifest_semantic_failure'] : []),
  ];
  const fingerprint = computeManifestFingerprint(assetRows, rowRows, targetBinding, codeBundle.hash);
  const summary = {
    manifest_schema: MANIFEST_SCHEMA,
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'dry_run_no_write',
    package_scope: PACKAGE_SCOPE,
    target_binding: targetBinding,
    tls_verification: TLS_VERIFICATION_MODE,
    code_bundle_hash: codeBundle.hash,
    code_bundle_files: codeBundle.files,
    fingerprint,
    asset_manifest_hash: proofHash(assetRows),
    row_manifest_hash: proofHash(rowRows),
    asset_manifest_jsonl: path.relative(ROOT, ASSET_MANIFEST_JSONL),
    row_manifest_jsonl: path.relative(ROOT, ROW_MANIFEST_JSONL),
    target_rows: rowRows.length,
    unique_assets: assetRows.length,
    verified_primary_assets: assetRows.filter((row) => row.source_verified).length,
    verified_fallback_assets: assetRows.filter((row) => row.fallback_verified).length,
    highest_verified_untransformed_source: '367x512 across Pokemon Zone and Serebii for every scoped card at acquisition time',
    source_bytes_preserved_without_upscale: assetRows.every((row) => row.transformation === 'none_exact_primary_source_bytes'),
    hosted_convention: {
      path_template: 'warehouse-derived/self-hosted-images-v1/card_prints/unknown/{gv-id-lower}/{sha256-prefix-24}.webp',
      image_source: 'identity',
      image_status: 'exact',
      historical_sample_dimensions: '600x825 exact TCGdex payload bytes',
      scoped_dimension_exception: '367x512 exact current untransformed full-card payload bytes; no upscale',
      sample_rows: conventionRows,
    },
    hosted_convention_samples_verified: conventionRows.filter((row) => row.verified).length,
    new_uploads_required: assetRows.filter((row) => row.upload_required).length,
    already_hosted_exact_assets: assetRows.filter((row) => row.storage_state === 'verified_existing_exact_object').length,
    inventory: {
      pocket_parent_rows: live.pocket_rows.length,
      hosted_pocket_parent_rows: hostedPocket.length,
      unhosted_pocket_parent_rows: unhostedPocket.length,
      exact_gap_gv_ids: actualGapIds,
      target_set: set,
    },
    planned_columns: ALLOWED_APPLY_COLUMNS.map((column) => `card_prints.${column}`),
    fallback_policy: 'Grookai image_path primary; verified Serebii image_url only as failure fallback',
    stop_findings: stopFindings,
    source_failures: sourceFailures.map((row) => ({ asset_id: row.asset_id, primary: row.source_validation_errors, fallback: row.fallback_validation_errors })),
    row_failures: rowFailures.map((row) => ({ gv_id: row.gv_id, errors: row.row_validation_errors })),
    convention_failures: conventionFailures,
    set_errors: setErrors,
    inventory_errors: inventoryErrors,
    semantic_validation_errors: semanticErrors,
    ready_for_storage_apply: stopFindings.length === 0 && assetRows.every((row) => row.upload_required || row.storage_state === 'verified_existing_exact_object'),
    storage_writes_performed: false,
    db_writes_performed: false,
    migrations_created: false,
  };
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await writeJsonl(ASSET_MANIFEST_JSONL, assetRows);
  await writeJsonl(ROW_MANIFEST_JSONL, rowRows);
  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, renderMarkdown(summary), 'utf8');
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    mode: summary.mode,
    fingerprint: summary.fingerprint,
    code_bundle_hash: summary.code_bundle_hash,
    asset_manifest_hash: summary.asset_manifest_hash,
    row_manifest_hash: summary.row_manifest_hash,
    verified_primary_assets: summary.verified_primary_assets,
    verified_fallback_assets: summary.verified_fallback_assets,
    hosted_convention_samples_verified: summary.hosted_convention_samples_verified,
    new_uploads_required: summary.new_uploads_required,
    ready_for_storage_apply: summary.ready_for_storage_apply,
    stop_findings: summary.stop_findings,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
