import { createHash } from 'node:crypto';

import {
  MTG_SEALED_IMAGE_STORAGE_BUCKET_V1,
  validateMtgSealedTransientImageCanaryPlanV1,
} from './mtg_sealed_image_canary_plan_v1.mjs';
import {
  GROOKAI_PRODUCTION_PROJECT_REF,
  inspectMtgSealedImageBytesV1,
} from './mtg_sealed_image_coverage_v1.mjs';

export const MTG_SEALED_IMAGE_STORAGE_CANARY_V1 =
  'MTG_SEALED_IMAGE_STORAGE_CANARY_V1';
export const MTG_SEALED_IMAGE_STORAGE_CANARY_APPROVAL_ENV_V1 =
  'MTG_SEALED_IMAGE_STORAGE_CANARY_APPROVAL';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort()
      .map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function stableMtgSealedStorageCanaryJsonV1(value) {
  return JSON.stringify(stable(value));
}

export function hashMtgSealedStorageCanaryV1(value) {
  return createHash('sha256').update(
    Buffer.isBuffer(value) || typeof value === 'string'
      ? value
      : stableMtgSealedStorageCanaryJsonV1(value),
  ).digest('hex');
}

function expectedExtension(format) {
  return format === 'jpeg' ? 'jpg' : format;
}

function validSourceUrl(row) {
  try {
    const url = new URL(row.source_image_url);
    return url.protocol === 'https:' &&
      url.hostname === 'tcgplayer-cdn.tcgplayer.com' &&
      url.username === '' && url.password === '' &&
      url.search === '' && url.hash === '' &&
      url.pathname === `/product/${row.source_product_id}_in_1000x1000.jpg`;
  } catch {
    return false;
  }
}

export function buildMtgSealedImageStorageCanaryExecutionPlanV1({
  canaryPlan,
  canaryPlanFileSha256,
  producerCommitSha,
}) {
  const canaryValidation = validateMtgSealedTransientImageCanaryPlanV1(
    canaryPlan,
  );
  if (!canaryValidation.valid) {
    throw new Error(`Invalid source canary plan: ${
      canaryValidation.findings.join(',')}`);
  }
  const core = {
    version: MTG_SEALED_IMAGE_STORAGE_CANARY_V1,
    mode: 'guarded_transient_storage_canary',
    producer_commit_sha: producerCommitSha,
    source_release_id: canaryPlan.source_release_id,
    source_coverage_fingerprint_sha256:
      canaryPlan.source_coverage_fingerprint_sha256,
    source_canary_plan_fingerprint_sha256:
      canaryPlan.plan_fingerprint_sha256,
    source_canary_plan_file_sha256: canaryPlanFileSha256,
    target_supabase_project_ref: GROOKAI_PRODUCTION_PROJECT_REF,
    target_storage_bucket: MTG_SEALED_IMAGE_STORAGE_BUCKET_V1,
    selected_variant_count: canaryPlan.rows.length,
    selected_object_count: new Set(canaryPlan.rows.map((row) =>
      row.expected_image.content_sha256)).size,
    rows: canaryPlan.rows,
    operation_contract: {
      source_fetch_retries: 2,
      maximum_source_request_attempts: canaryPlan.rows.length * 3,
      source_redirects_allowed: false,
      maximum_source_bytes_per_object: 20_000_000,
      collision_sweeps_before_upload: 2,
      upload_upsert: false,
      exact_download_readback: true,
      cleanup_after_success: true,
      cleanup_after_failure: true,
      cleanup_scope: 'only_preflight_absent_paths_owned_by_this_execution',
      final_absence_required: true,
    },
    boundaries: {
      database_connections: 0,
      database_reads: 0,
      database_writes: 0,
      durable_storage_objects: 0,
      image_evidence_rows: 0,
      image_release_rows: 0,
      image_pointer_writes: 0,
      pricing_writes: 0,
      release_pointer_writes: 0,
      visibility_writes: 0,
      vault_writes: 0,
      signer_deployments: 0,
      client_activations: 0,
      cross_game_writes: 0,
    },
  };
  const executionFingerprint = hashMtgSealedStorageCanaryV1(core);
  const requiredApprovalMessage =
    `I approve the transient 17-object MTG sealed Storage canary from ` +
    `execution commit ${producerCommitSha}, using source coverage fingerprint ` +
    `${core.source_coverage_fingerprint_sha256}, source canary-plan ` +
     `fingerprint ${core.source_canary_plan_fingerprint_sha256}, and execution ` +
     `fingerprint ${executionFingerprint}. This authorizes collision preflight, ` +
     `retrieval of exactly 17 frozen TCGPlayer image URLs with at most 2 ` +
     `transport retries per URL and 51 total source request attempts, exactly 17 ` +
    `upsert=false transient uploads to bucket ` +
    `${MTG_SEALED_IMAGE_STORAGE_BUCKET_V1}, exact byte readback, removal of ` +
    `only paths proven absent before this execution, and final verified ` +
    `absence. It authorizes no database access, signer deployment, durable ` +
    `image data, pricing, release-pointer, visibility, Vault, cross-game, or ` +
    `client writes.`;
  return {
    ...core,
    execution_fingerprint_sha256: executionFingerprint,
    approval_env: MTG_SEALED_IMAGE_STORAGE_CANARY_APPROVAL_ENV_V1,
    required_approval_message: requiredApprovalMessage,
    guard_token: requiredApprovalMessage,
  };
}

export function validateMtgSealedImageStorageCanaryExecutionPlanV1(plan) {
  const findings = [];
  const add = (condition, finding) => {
    if (condition) findings.push(finding);
  };
  const rows = plan?.rows ?? [];
  add(plan?.version !== MTG_SEALED_IMAGE_STORAGE_CANARY_V1,
    'version_mismatch');
  add(plan?.mode !== 'guarded_transient_storage_canary', 'mode_mismatch');
  add(!/^[0-9a-f]{40}$/.test(plan?.producer_commit_sha ?? ''),
    'producer_commit_invalid');
  add(plan?.target_supabase_project_ref !== GROOKAI_PRODUCTION_PROJECT_REF,
    'project_ref_mismatch');
  add(plan?.target_storage_bucket !== MTG_SEALED_IMAGE_STORAGE_BUCKET_V1,
    'bucket_mismatch');
  add(rows.length !== 17 || plan?.selected_variant_count !== 17 ||
    plan?.selected_object_count !== 17, 'scope_not_exactly_17');
  add(new Set(rows.map((row) => row.transient_object_path)).size !== rows.length,
    'duplicate_object_path');
  add(new Set(rows.map((row) => row.expected_image?.content_sha256)).size !==
    rows.length, 'duplicate_content_hash');
  add(rows.some((row) => !validSourceUrl(row)), 'source_url_not_exact');
  add(rows.some((row) => row.upload_upsert !== false), 'upsert_not_false');
  add(rows.some((row) => row.collision_precondition !==
    'transient_path_must_be_absent'), 'collision_precondition_missing');
  add(rows.some((row) => !row.transient_object_path?.startsWith(
    `sealed/mtg/canary/`) || !row.transient_object_path.endsWith(
    `.${expectedExtension(row.expected_image?.format)}`)),
  'transient_path_invalid');
  add(rows.some((row) => !/^[0-9a-f]{64}$/.test(
    row.expected_image?.content_sha256 ?? '') ||
    !Number.isSafeInteger(row.expected_image?.size_bytes) ||
    row.expected_image.size_bytes < 2_000 ||
    row.expected_image.size_bytes > 20_000_000 ||
    !Number.isSafeInteger(row.expected_image?.width) ||
    !Number.isSafeInteger(row.expected_image?.height)),
  'expected_image_contract_invalid');
  add(plan?.operation_contract?.source_fetch_retries !== 2 ||
    plan?.operation_contract?.maximum_source_request_attempts !== 51 ||
    plan?.operation_contract?.source_redirects_allowed !== false ||
    plan?.operation_contract?.collision_sweeps_before_upload !== 2 ||
    plan?.operation_contract?.upload_upsert !== false ||
    plan?.operation_contract?.cleanup_after_success !== true ||
    plan?.operation_contract?.cleanup_after_failure !== true ||
    plan?.operation_contract?.final_absence_required !== true,
  'operation_contract_unsafe');
  add(Object.values(plan?.boundaries ?? {}).some((value) => value !== 0),
    'nonzero_forbidden_boundary');
  const {
    execution_fingerprint_sha256: ignoredFingerprint,
    approval_env: ignoredApprovalEnv,
    required_approval_message: ignoredApproval,
    guard_token: ignoredGuard,
    ...core
  } = plan ?? {};
  add(plan?.execution_fingerprint_sha256 !==
    hashMtgSealedStorageCanaryV1(core), 'execution_fingerprint_mismatch');
  add(plan?.approval_env !== MTG_SEALED_IMAGE_STORAGE_CANARY_APPROVAL_ENV_V1,
    'approval_env_mismatch');
  add(plan?.required_approval_message !== plan?.guard_token,
    'guard_token_mismatch');
  return { valid: findings.length === 0, findings };
}

export function verifyMtgSealedCanaryImageBytesV1(row, buffer, contentType) {
  const observed = inspectMtgSealedImageBytesV1(buffer, contentType);
  const expected = row.expected_image;
  const fields = [
    ['valid_image', true],
    ['placeholder_suspected', false],
    ['sha256', expected.content_sha256],
    ['content_type', expected.content_type],
    ['format', expected.format],
    ['width', expected.width],
    ['height', expected.height],
    ['size_bytes', expected.size_bytes],
  ];
  const mismatches = fields.filter(([field, value]) => observed[field] !== value)
    .map(([field]) => field);
  return { valid: mismatches.length === 0, mismatches, observed };
}

function sourceTransportCode(error) {
  const value = error?.cause?.code ?? error?.code ?? error?.name ??
    'request_failed';
  return String(value).toLowerCase().replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'request_failed';
}

export async function retrieveMtgSealedCanarySourceBytesV1({
  row,
  maximumBytes,
  retryCount,
  requestSourceBytes,
  journal = async () => {},
  sleep = (milliseconds) => new Promise((resolve) =>
    setTimeout(resolve, milliseconds)),
}) {
  let lastError = null;
  for (let attempt = 1; attempt <= retryCount + 1; attempt += 1) {
    await journal({
      event: 'source_request_started',
      source_product_id: row.source_product_id,
      object_path: row.transient_object_path,
      attempt,
    });
    try {
      const source = await requestSourceBytes(row, maximumBytes);
      await journal({
        event: 'source_request_completed',
        source_product_id: row.source_product_id,
        object_path: row.transient_object_path,
        attempt,
      });
      return { ...source, requestAttempts: attempt };
    } catch (error) {
      lastError = error;
      const code = sourceTransportCode(error);
      const retryable = error?.retryable !== false;
      await journal({
        event: 'source_request_failed',
        source_product_id: row.source_product_id,
        object_path: row.transient_object_path,
        attempt,
        error_code: code,
        retryable,
      });
      if (!retryable || attempt > retryCount) {
        const failure = new Error(
          `${row.source_product_id}:source_transport_${code}_after_${attempt}_attempts`,
        );
        failure.requestAttempts = attempt;
        failure.cause = error;
        throw failure;
      }
      await sleep(1_000 * (2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

async function safeExists(storage, row, phase, journal) {
  const exists = await storage.objectExists(row);
  await journal({ event: 'object_presence_checked', phase,
    object_path: row.transient_object_path, exists });
  return exists;
}

export async function runMtgSealedImageStorageCanaryV1({
  plan,
  storage,
  fetchSourceBytes,
  journal = async () => {},
}) {
  const validation = validateMtgSealedImageStorageCanaryExecutionPlanV1(plan);
  if (!validation.valid) {
    throw new Error(`Invalid execution plan: ${validation.findings.join(',')}`);
  }
  const counters = {
    collision_checks: 0,
    source_fetches: 0,
    source_request_attempts: 0,
    uploads: 0,
    downloads: 0,
    removals: 0,
    final_absence_checks: 0,
  };
  const fetched = [];
  const uploadedPaths = [];
  const readbacks = [];
  const errors = [];
  let ownershipScopeActivated = false;
  let finalPresentPaths = [];

  try {
    for (const phase of ['initial', 'immediate_pre_upload']) {
      if (phase === 'immediate_pre_upload') {
        for (const row of plan.rows) {
          let source;
          try {
            source = await fetchSourceBytes(row);
            counters.source_request_attempts += source.requestAttempts ?? 1;
          } catch (error) {
            counters.source_request_attempts += error?.requestAttempts ?? 1;
            throw error;
          }
          counters.source_fetches += 1;
          const verified = verifyMtgSealedCanaryImageBytesV1(
            row, source.buffer, source.contentType,
          );
          await journal({ event: 'source_bytes_verified',
            object_path: row.transient_object_path,
            source_product_id: row.source_product_id,
            valid: verified.valid,
            observed: verified.observed });
          if (!verified.valid) {
            throw new Error(`${row.source_product_id}:source_${
              verified.mismatches.join('_')}_mismatch`);
          }
          fetched.push({ row, buffer: source.buffer });
        }
      }
      const collisions = [];
      for (const row of plan.rows) {
        counters.collision_checks += 1;
        if (await safeExists(storage, row, phase, journal)) {
          collisions.push(row.transient_object_path);
        }
      }
      if (collisions.length) {
        throw new Error(`Storage collision before upload: ${collisions.join(',')}`);
      }
    }

    ownershipScopeActivated = true;
    await journal({ event: 'ownership_scope_activated',
      object_paths: plan.rows.map((row) => row.transient_object_path) });
    for (const entry of fetched) {
      await storage.upload(entry.row, entry.buffer);
      uploadedPaths.push(entry.row.transient_object_path);
      counters.uploads += 1;
      await journal({ event: 'object_uploaded',
        object_path: entry.row.transient_object_path });
      const downloaded = await storage.download(entry.row);
      counters.downloads += 1;
      const verified = verifyMtgSealedCanaryImageBytesV1(
        entry.row, downloaded.buffer, downloaded.contentType,
      );
      if (!verified.valid) {
        throw new Error(`${entry.row.source_product_id}:readback_${
          verified.mismatches.join('_')}_mismatch`);
      }
      readbacks.push({ object_path: entry.row.transient_object_path,
        observed: verified.observed });
      await journal({ event: 'object_readback_verified',
        object_path: entry.row.transient_object_path,
        observed: verified.observed });
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  } finally {
    if (ownershipScopeActivated) {
      try {
        const ownedPresent = [];
        for (const row of plan.rows) {
          if (await safeExists(storage, row, 'cleanup_discovery', journal)) {
            ownedPresent.push(row.transient_object_path);
          }
        }
        if (ownedPresent.length) {
          await storage.remove(ownedPresent);
          counters.removals += ownedPresent.length;
          await journal({ event: 'owned_objects_removed',
            object_paths: ownedPresent });
        }
      } catch (error) {
        errors.push(`cleanup:${error instanceof Error ? error.message : error}`);
      }
    }
    try {
      finalPresentPaths = [];
      for (const row of plan.rows) {
        counters.final_absence_checks += 1;
        if (await safeExists(storage, row, 'final_absence', journal)) {
          finalPresentPaths.push(row.transient_object_path);
        }
      }
      if (finalPresentPaths.length) {
        errors.push(`final_absence_failed:${finalPresentPaths.join(',')}`);
      }
    } catch (error) {
      errors.push(`final_absence_check:${
        error instanceof Error ? error.message : error}`);
    }
  }

  const passed = errors.length === 0 && fetched.length === 17 &&
    uploadedPaths.length === 17 && readbacks.length === 17 &&
    counters.removals === 17 && finalPresentPaths.length === 0;
  return {
    version: MTG_SEALED_IMAGE_STORAGE_CANARY_V1,
    status: passed
      ? 'passed_uploaded_read_back_removed_and_absent'
      : finalPresentPaths.length === 0
        ? 'failed_and_absence_verified'
        : 'failed_cleanup_incomplete',
    execution_fingerprint_sha256: plan.execution_fingerprint_sha256,
    fetched_count: fetched.length,
    uploaded_count: uploadedPaths.length,
    readback_verified_count: readbacks.length,
    removed_count: counters.removals,
    final_absent_count: 17 - finalPresentPaths.length,
    durable_objects_after_run: finalPresentPaths.length,
    ownership_scope_activated: ownershipScopeActivated,
    counters,
    uploaded_paths: uploadedPaths,
    readbacks,
    final_present_paths: finalPresentPaths,
    errors,
    boundaries: plan.boundaries,
  };
}

export async function recoverMtgSealedImageStorageCanaryV1({
  plan,
  storage,
  ownershipScopeVerified,
  journal = async () => {},
}) {
  const validation = validateMtgSealedImageStorageCanaryExecutionPlanV1(plan);
  if (!validation.valid) {
    throw new Error(`Invalid execution plan: ${validation.findings.join(',')}`);
  }
  if (ownershipScopeVerified !== true) {
    throw new Error('Recovery requires verified write-ahead ownership scope');
  }

  const presentBeforeRemoval = [];
  const finalPresentPaths = [];
  const errors = [];
  let removedCount = 0;
  let discoveryChecks = 0;
  let finalAbsenceChecks = 0;

  try {
    for (const row of plan.rows) {
      discoveryChecks += 1;
      if (await safeExists(storage, row, 'recovery_discovery', journal)) {
        presentBeforeRemoval.push(row.transient_object_path);
      }
    }
    if (presentBeforeRemoval.length) {
      await storage.remove(presentBeforeRemoval);
      removedCount = presentBeforeRemoval.length;
      await journal({
        event: 'recovery_owned_objects_removed',
        object_paths: presentBeforeRemoval,
      });
    }
  } catch (error) {
    errors.push(`recovery_cleanup:${error instanceof Error
      ? error.message : error}`);
  }

  try {
    for (const row of plan.rows) {
      finalAbsenceChecks += 1;
      if (await safeExists(storage, row, 'recovery_final_absence', journal)) {
        finalPresentPaths.push(row.transient_object_path);
      }
    }
    if (finalPresentPaths.length) {
      errors.push(`recovery_final_absence_failed:${finalPresentPaths.join(',')}`);
    }
  } catch (error) {
    errors.push(`recovery_final_absence_check:${error instanceof Error
      ? error.message : error}`);
  }

  const passed = errors.length === 0 && finalPresentPaths.length === 0;
  return {
    version: MTG_SEALED_IMAGE_STORAGE_CANARY_V1,
    status: passed
      ? 'recovery_passed_all_execution_paths_absent'
      : 'recovery_failed_cleanup_incomplete',
    execution_fingerprint_sha256: plan.execution_fingerprint_sha256,
    ownership_scope_verified: true,
    discovered_present_count: presentBeforeRemoval.length,
    removed_count: removedCount,
    final_absent_count: 17 - finalPresentPaths.length,
    durable_objects_after_recovery: finalPresentPaths.length,
    discovery_checks: discoveryChecks,
    final_absence_checks: finalAbsenceChecks,
    discovered_present_paths: presentBeforeRemoval,
    final_present_paths: finalPresentPaths,
    errors,
    boundaries: plan.boundaries,
  };
}
