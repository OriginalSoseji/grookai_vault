import { createHash } from 'node:crypto';

import {
  hashMtgSealedDurableImagePlanV1,
  MTG_SEALED_DURABLE_IMAGE_BUCKET_V1,
  MTG_SEALED_DURABLE_IMAGE_MAX_SOURCE_BYTES_V1,
  MTG_SEALED_DURABLE_IMAGE_SOURCE_RETRIES_V1,
  validateMtgSealedDurableImagePlanV1,
} from './mtg_sealed_durable_image_plan_v1.mjs';
import {
  GROOKAI_PRODUCTION_PROJECT_REF,
  inspectMtgSealedImageBytesV1,
} from './mtg_sealed_image_coverage_v1.mjs';

export const MTG_SEALED_DURABLE_IMAGE_STORAGE_V1 =
  'MTG_SEALED_DURABLE_IMAGE_STORAGE_V1';
export const MTG_SEALED_DURABLE_IMAGE_STORAGE_APPROVAL_ENV_V1 =
  'MTG_SEALED_DURABLE_IMAGE_STORAGE_APPROVAL';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stable(entry)]));
  }
  return value;
}

export function hashMtgSealedDurableImageStorageV1(value) {
  return createHash('sha256').update(
    typeof value === 'string' || Buffer.isBuffer(value)
      ? value
      : JSON.stringify(stable(value)),
  ).digest('hex');
}

function objectResultBase(row) {
  return {
    object_index: row.object_index,
    object_path: row.durable_object_path,
    content_sha256: row.content_sha256,
    supporting_variant_count: row.supporting_variants.length,
  };
}

export function buildMtgSealedDurableImageStorageExecutionPlanV1({
  durableBundle,
  durableArtifactHashes,
  producerCommitSha,
  durableValidationOptions = {},
}) {
  const sourceValidation = validateMtgSealedDurableImagePlanV1(
    durableBundle,
    durableValidationOptions,
  );
  if (!sourceValidation.valid) {
    throw new Error(`Invalid durable source plan: ${
      sourceValidation.findings.join(',')}`);
  }
  if (!/^[0-9a-f]{40}$/.test(producerCommitSha ?? '')) {
    throw new Error('Exact 40-character producer commit SHA is required');
  }
  const requiredArtifacts = [
    'run_plan.json',
    'objects.jsonl.gz',
    'exclusions.jsonl',
    'shards.json',
    'summary.json',
    'REPORT.md',
  ];
  if (requiredArtifacts.some((name) =>
    !/^[0-9a-f]{64}$/.test(durableArtifactHashes?.[name]?.sha256 ?? '') ||
    !Number.isSafeInteger(durableArtifactHashes?.[name]?.bytes))) {
    throw new Error('Exact durable artifact hashes and byte counts are required');
  }
  const { plan, objects, exclusions, shards } = durableBundle;
  const core = {
    version: MTG_SEALED_DURABLE_IMAGE_STORAGE_V1,
    mode: 'guarded_resumable_durable_storage',
    producer_commit_sha: producerCommitSha,
    source_release_id: plan.source_release_id,
    source_coverage_fingerprint_sha256:
      plan.source_coverage_fingerprint_sha256,
    source_durable_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    source_durable_artifact_hashes: Object.fromEntries(requiredArtifacts
      .map((name) => [name, durableArtifactHashes[name]])),
    target_supabase_project_ref: GROOKAI_PRODUCTION_PROJECT_REF,
    target_storage_bucket: MTG_SEALED_DURABLE_IMAGE_BUCKET_V1,
    selected_member_count: plan.reconciliation.selected_members,
    selected_variant_count: plan.reconciliation.eligible_variants,
    selected_object_count: objects.length,
    exclusion_count: exclusions.length,
    expected_durable_bytes: plan.reconciliation.eligible_expected_bytes,
    shard_count: shards.length,
    object_dataset_fingerprint_sha256:
      plan.datasets.objects.logical_fingerprint_sha256,
    exclusion_dataset_fingerprint_sha256:
      plan.datasets.exclusions.logical_fingerprint_sha256,
    shard_dataset_fingerprint_sha256:
      plan.datasets.shards.logical_fingerprint_sha256,
    operation_contract: {
      maximum_concurrency: 10,
      shard_size: plan.execution_policy.shard_size,
      source_fetch_retries: MTG_SEALED_DURABLE_IMAGE_SOURCE_RETRIES_V1,
      maximum_source_request_attempts: objects.length *
        (MTG_SEALED_DURABLE_IMAGE_SOURCE_RETRIES_V1 + 1),
      maximum_source_bytes_per_object:
        MTG_SEALED_DURABLE_IMAGE_MAX_SOURCE_BYTES_V1,
      tls_trust_policy: 'node_bundled_plus_windows_system_ca',
      tls_certificate_verification_required: true,
      custom_ca_overrides_allowed: false,
      source_redirects_allowed: false,
      collision_readback_before_source_fetch: true,
      collision_readback_immediately_before_upload: true,
      exact_existing_object_is_reused: true,
      mismatched_existing_object_is_hard_stop: true,
      upload_upsert: false,
      overwrite_allowed: false,
      exact_readback_required:
        'sha256_size_dimensions_format_and_content_type',
      durable_commit_unit: 'one_content_addressed_object_after_exact_readback',
      verified_objects_retained_on_interruption: true,
      resume_requires_exact_execution_fingerprint: true,
      write_ahead_journal_required: true,
      per_object_result_required: true,
      stop_launching_after_first_failure: true,
      cleanup_scope:
        'only_unverified_object_created_by_current_execution_attempt',
      preexisting_or_verified_objects_never_removed: true,
      whole_plan_reconciliation_required: true,
    },
    authorized_operation_ceilings: {
      source_http_requests: objects.length *
        (MTG_SEALED_DURABLE_IMAGE_SOURCE_RETRIES_V1 + 1),
      storage_presence_reads: objects.length * 3,
      storage_downloads: objects.length * 2,
      storage_uploads: objects.length,
      storage_deletes: objects.length,
      durable_objects_on_success: objects.length,
    },
    forbidden_boundaries: {
      database_connections: 0,
      database_reads: 0,
      database_writes: 0,
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
  const executionFingerprint = hashMtgSealedDurableImageStorageV1(core);
  const requiredApprovalMessage =
    `I approve the resumable durable MTG sealed image Storage execution from ` +
    `execution commit ${producerCommitSha}, using source coverage fingerprint ` +
    `${core.source_coverage_fingerprint_sha256}, durable plan fingerprint ` +
    `${core.source_durable_plan_fingerprint_sha256}, and execution fingerprint ` +
    `${executionFingerprint}. This authorizes exact collision readback, ` +
    `retrieval of exactly ${core.selected_object_count} frozen unique images ` +
    `covering ${core.selected_variant_count} variants with at most ` +
    `${core.operation_contract.source_fetch_retries} transport retries per ` +
    `object and ${core.operation_contract.maximum_source_request_attempts} ` +
    `total source requests using verified Node bundled-plus-Windows-system CA ` +
    `trust, at most ${core.selected_object_count} upsert=false durable uploads ` +
    `to bucket ${core.target_storage_bucket}, exact readback, resumable ` +
    `retention of verified objects, and removal only of an unverified object ` +
    `proven created by the current attempt. It preserves ` +
    `${core.exclusion_count} exclusions and authorizes no database, image ` +
    `evidence, pointer, pricing, release, visibility, Vault, signer, client, or ` +
    `cross-game writes.`;
  return {
    ...core,
    execution_fingerprint_sha256: executionFingerprint,
    approval_env: MTG_SEALED_DURABLE_IMAGE_STORAGE_APPROVAL_ENV_V1,
    required_approval_message: requiredApprovalMessage,
    guard_token: requiredApprovalMessage,
  };
}

export function validateMtgSealedDurableImageStorageExecutionPlanV1(
  executionPlan,
  durableBundle,
  durableValidationOptions = {},
) {
  const findings = [];
  const add = (condition, finding) => {
    if (condition) findings.push(finding);
  };
  const sourceValidation = validateMtgSealedDurableImagePlanV1(
    durableBundle,
    durableValidationOptions,
  );
  add(!sourceValidation.valid, 'durable_source_plan_invalid');
  const sourcePlan = durableBundle?.plan ?? {};
  const objects = durableBundle?.objects ?? [];
  const exclusions = durableBundle?.exclusions ?? [];
  const shards = durableBundle?.shards ?? [];
  add(executionPlan?.version !== MTG_SEALED_DURABLE_IMAGE_STORAGE_V1,
    'version_mismatch');
  add(executionPlan?.mode !== 'guarded_resumable_durable_storage',
    'mode_mismatch');
  add(!/^[0-9a-f]{40}$/.test(executionPlan?.producer_commit_sha ?? ''),
    'producer_commit_invalid');
  add(executionPlan?.source_durable_plan_fingerprint_sha256 !==
    sourcePlan.plan_fingerprint_sha256, 'durable_plan_fingerprint_mismatch');
  add(executionPlan?.source_coverage_fingerprint_sha256 !==
    sourcePlan.source_coverage_fingerprint_sha256,
  'coverage_fingerprint_mismatch');
  add(executionPlan?.target_supabase_project_ref !==
    GROOKAI_PRODUCTION_PROJECT_REF, 'project_ref_mismatch');
  add(executionPlan?.target_storage_bucket !==
    MTG_SEALED_DURABLE_IMAGE_BUCKET_V1, 'storage_bucket_mismatch');
  add(executionPlan?.selected_object_count !== objects.length ||
    executionPlan?.selected_variant_count !== objects.flatMap((row) =>
      row.supporting_variants).length ||
    executionPlan?.exclusion_count !== exclusions.length ||
    executionPlan?.shard_count !== shards.length, 'scope_count_mismatch');
  add(executionPlan?.selected_member_count !==
    sourcePlan.reconciliation?.selected_members ||
    executionPlan?.expected_durable_bytes !==
      sourcePlan.reconciliation?.eligible_expected_bytes,
  'source_reconciliation_mismatch');
  add(executionPlan?.object_dataset_fingerprint_sha256 !==
    hashMtgSealedDurableImagePlanV1(objects),
  'object_dataset_fingerprint_mismatch');
  add(executionPlan?.exclusion_dataset_fingerprint_sha256 !==
    hashMtgSealedDurableImagePlanV1(exclusions),
  'exclusion_dataset_fingerprint_mismatch');
  add(executionPlan?.shard_dataset_fingerprint_sha256 !==
    hashMtgSealedDurableImagePlanV1(shards),
  'shard_dataset_fingerprint_mismatch');
  const contract = executionPlan?.operation_contract ?? {};
  add(contract.maximum_concurrency !== 10 ||
    contract.shard_size !== sourcePlan.execution_policy?.shard_size ||
    contract.source_fetch_retries !== 2 ||
    contract.maximum_source_request_attempts !== objects.length * 3 ||
    contract.maximum_source_bytes_per_object !== 20_000_000,
  'execution_ceiling_mismatch');
  add(contract.tls_trust_policy !== 'node_bundled_plus_windows_system_ca' ||
    contract.tls_certificate_verification_required !== true ||
    contract.custom_ca_overrides_allowed !== false ||
    contract.source_redirects_allowed !== false,
  'tls_or_transport_policy_unsafe');
  add(contract.collision_readback_before_source_fetch !== true ||
    contract.collision_readback_immediately_before_upload !== true ||
    contract.exact_existing_object_is_reused !== true ||
    contract.mismatched_existing_object_is_hard_stop !== true ||
    contract.upload_upsert !== false || contract.overwrite_allowed !== false,
  'collision_or_upload_policy_unsafe');
  add(contract.verified_objects_retained_on_interruption !== true ||
    contract.resume_requires_exact_execution_fingerprint !== true ||
    contract.write_ahead_journal_required !== true ||
    contract.per_object_result_required !== true ||
    contract.stop_launching_after_first_failure !== true ||
    contract.preexisting_or_verified_objects_never_removed !== true ||
    contract.whole_plan_reconciliation_required !== true,
  'resume_or_recovery_policy_unsafe');
  add(executionPlan?.authorized_operation_ceilings?.source_http_requests !==
    objects.length * 3 ||
    executionPlan?.authorized_operation_ceilings?.storage_presence_reads !==
      objects.length * 3 ||
    executionPlan?.authorized_operation_ceilings?.storage_downloads !==
      objects.length * 2 ||
    executionPlan?.authorized_operation_ceilings?.storage_uploads !==
      objects.length ||
    executionPlan?.authorized_operation_ceilings?.storage_deletes !==
      objects.length ||
    executionPlan?.authorized_operation_ceilings?.durable_objects_on_success !==
      objects.length, 'operation_ceiling_mismatch');
  add(Object.values(executionPlan?.forbidden_boundaries ?? {})
    .some((value) => value !== 0), 'nonzero_forbidden_boundary');
  const {
    execution_fingerprint_sha256: ignoredFingerprint,
    approval_env: ignoredApprovalEnv,
    required_approval_message: ignoredApproval,
    guard_token: ignoredGuard,
    ...core
  } = executionPlan ?? {};
  add(executionPlan?.execution_fingerprint_sha256 !==
    hashMtgSealedDurableImageStorageV1(core),
  'execution_fingerprint_mismatch');
  add(executionPlan?.approval_env !==
    MTG_SEALED_DURABLE_IMAGE_STORAGE_APPROVAL_ENV_V1,
  'approval_env_mismatch');
  add(executionPlan?.required_approval_message !== executionPlan?.guard_token,
    'guard_token_mismatch');
  return { valid: findings.length === 0, findings: [...new Set(findings)].sort() };
}

export function verifyMtgSealedDurableImageBytesV1(row, buffer, contentType) {
  const observed = inspectMtgSealedImageBytesV1(buffer, contentType);
  const expected = row.expected_image;
  const checks = [
    ['valid_image', true],
    ['placeholder_suspected', false],
    ['sha256', expected.content_sha256],
    ['content_type', expected.content_type],
    ['format', expected.format],
    ['width', expected.width],
    ['height', expected.height],
    ['size_bytes', expected.size_bytes],
  ];
  const mismatches = checks.filter(([field, value]) =>
    observed[field] !== value).map(([field]) => field);
  return { valid: mismatches.length === 0, mismatches, observed };
}

export function validateMtgSealedDurableImageResumeJournalV1({
  events,
  executionPlan,
  knownObjectPaths,
}) {
  if (!Array.isArray(events) || !(knownObjectPaths instanceof Set)) {
    throw new Error('Resume journal events and known paths are required');
  }
  const attempts = new Map();
  let expectedSequence = 1;
  for (const event of events) {
    if (event.sequence !== expectedSequence ||
        event.execution_fingerprint_sha256 !==
          executionPlan.execution_fingerprint_sha256) {
      throw new Error('Resume journal sequence or authority mismatch');
    }
    expectedSequence += 1;
    if (event.object_path && !knownObjectPaths.has(event.object_path)) {
      throw new Error('Resume journal contains an unknown object path');
    }
    if (event.event === 'source_request_started') {
      if (!event.object_path || !knownObjectPaths.has(event.object_path)) {
        throw new Error('Source-attempt journal event lacks a known object path');
      }
      attempts.set(event.object_path, (attempts.get(event.object_path) ?? 0) + 1);
      if (attempts.get(event.object_path) >
          executionPlan.operation_contract.source_fetch_retries + 1) {
        throw new Error('Resume journal exceeds per-object source ceiling');
      }
    }
  }
  if ([...attempts.values()].reduce((total, value) => total + value, 0) >
      executionPlan.operation_contract.maximum_source_request_attempts) {
    throw new Error('Resume journal exceeds global source ceiling');
  }
  return {
    priorRequestAttemptsByPath: attempts,
    nextSequence: expectedSequence,
  };
}

function transportCode(error) {
  const value = error?.cause?.code ?? error?.code ?? error?.name ??
    'request_failed';
  return String(value).toLowerCase().replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'request_failed';
}

export async function retrieveMtgSealedDurableImageSourceBytesV1({
  row,
  priorRequestAttempts = 0,
  maximumAttempts = MTG_SEALED_DURABLE_IMAGE_SOURCE_RETRIES_V1 + 1,
  maximumBytes = MTG_SEALED_DURABLE_IMAGE_MAX_SOURCE_BYTES_V1,
  requestSourceBytes,
  journal = async () => {},
  sleep = (milliseconds) => new Promise((resolve) =>
    setTimeout(resolve, milliseconds)),
}) {
  if (!Number.isSafeInteger(priorRequestAttempts) || priorRequestAttempts < 0 ||
      priorRequestAttempts >= maximumAttempts) {
    const error = new Error(
      `${row.durable_object_path}:source_attempt_ceiling_exhausted`,
    );
    error.requestAttempts = 0;
    throw error;
  }
  let attemptsThisRun = 0;
  for (let attempt = priorRequestAttempts + 1;
    attempt <= maximumAttempts; attempt += 1) {
    attemptsThisRun += 1;
    await journal({
      event: 'source_request_started',
      object_path: row.durable_object_path,
      source_product_id: row.primary_source.source_product_id,
      cumulative_attempt: attempt,
    });
    try {
      const source = await requestSourceBytes(row, maximumBytes);
      await journal({
        event: 'source_request_completed',
        object_path: row.durable_object_path,
        source_product_id: row.primary_source.source_product_id,
        cumulative_attempt: attempt,
      });
      return { ...source, requestAttempts: attemptsThisRun };
    } catch (error) {
      const code = transportCode(error);
      const retryable = error?.retryable !== false;
      await journal({
        event: 'source_request_failed',
        object_path: row.durable_object_path,
        source_product_id: row.primary_source.source_product_id,
        cumulative_attempt: attempt,
        error_code: code,
        retryable,
      });
      if (!retryable || attempt >= maximumAttempts) {
        const failure = new Error(
          `${row.durable_object_path}:source_transport_${code}_after_` +
          `${attemptsThisRun}_new_attempts`,
        );
        failure.requestAttempts = attemptsThisRun;
        failure.cause = error;
        throw failure;
      }
      await sleep(1_000 * (2 ** (attempt - 1)));
    }
  }
  throw new Error(`${row.durable_object_path}:source_attempt_loop_exhausted`);
}

async function presence(storage, row, phase, journal, counters) {
  const exists = await storage.objectExists(row);
  counters.storage_presence_reads += 1;
  await journal({
    event: 'object_presence_checked',
    object_path: row.durable_object_path,
    phase,
    exists,
  });
  return exists;
}

async function exactReadback(storage, row, phase, journal, counters) {
  const downloaded = await storage.download(row);
  counters.storage_downloads += 1;
  const verified = verifyMtgSealedDurableImageBytesV1(
    row,
    downloaded.buffer,
    downloaded.contentType,
  );
  await journal({
    event: 'object_readback_completed',
    object_path: row.durable_object_path,
    phase,
    valid: verified.valid,
    mismatches: verified.mismatches,
    observed: verified.observed,
  });
  return verified;
}

async function removeCurrentAttemptObject(storage, row, journal, counters) {
  await storage.remove([row.durable_object_path]);
  counters.storage_deletes += 1;
  await journal({
    event: 'current_attempt_unverified_object_removed',
    object_path: row.durable_object_path,
  });
  const stillPresent = await presence(
    storage,
    row,
    'cleanup_absence_verification',
    journal,
    counters,
  );
  if (stillPresent) {
    throw new Error(`${row.durable_object_path}:cleanup_absence_failed`);
  }
}

export async function processMtgSealedDurableImageObjectV1({
  row,
  executionPlan,
  storage,
  requestSourceBytes,
  priorRequestAttempts = 0,
  journal = async () => {},
  sleep,
}) {
  const counters = {
    source_http_requests: 0,
    storage_presence_reads: 0,
    storage_downloads: 0,
    storage_uploads: 0,
    storage_deletes: 0,
  };
  let uploadConfirmed = false;
  let cleanupVerified = null;
  await journal({ event: 'object_processing_started', ...objectResultBase(row) });
  try {
    const existing = await presence(
      storage, row, 'initial_collision_readback', journal, counters,
    );
    if (existing) {
      const verified = await exactReadback(
        storage, row, 'preexisting_object', journal, counters,
      );
      if (!verified.valid) {
        throw new Error(`${row.durable_object_path}:preexisting_collision_` +
          `${verified.mismatches.join('_')}_mismatch`);
      }
      const result = {
        ...objectResultBase(row),
        status: 'reused_preexisting_exact_object',
        exact_readback: verified.observed,
        cleanup_verified: null,
        counters,
        errors: [],
      };
      await journal({ event: 'object_terminal', ...result });
      return result;
    }

    let source;
    try {
      source = await retrieveMtgSealedDurableImageSourceBytesV1({
        row,
        priorRequestAttempts,
        maximumAttempts:
          executionPlan.operation_contract.source_fetch_retries + 1,
        maximumBytes:
          executionPlan.operation_contract.maximum_source_bytes_per_object,
        requestSourceBytes,
        journal,
        ...(sleep ? { sleep } : {}),
      });
      counters.source_http_requests += source.requestAttempts;
    } catch (error) {
      counters.source_http_requests += error?.requestAttempts ?? 0;
      throw error;
    }
    const sourceVerified = verifyMtgSealedDurableImageBytesV1(
      row, source.buffer, source.contentType,
    );
    await journal({
      event: 'source_bytes_verified',
      object_path: row.durable_object_path,
      valid: sourceVerified.valid,
      mismatches: sourceVerified.mismatches,
      observed: sourceVerified.observed,
    });
    if (!sourceVerified.valid) {
      throw new Error(`${row.durable_object_path}:source_` +
        `${sourceVerified.mismatches.join('_')}_mismatch`);
    }

    const immediateExisting = await presence(
      storage, row, 'immediate_pre_upload_collision_readback', journal, counters,
    );
    if (immediateExisting) {
      const verified = await exactReadback(
        storage, row, 'concurrent_exact_object', journal, counters,
      );
      if (!verified.valid) {
        throw new Error(`${row.durable_object_path}:concurrent_collision_` +
          `${verified.mismatches.join('_')}_mismatch`);
      }
      const result = {
        ...objectResultBase(row),
        status: 'reused_concurrent_exact_object',
        exact_readback: verified.observed,
        cleanup_verified: null,
        counters,
        errors: [],
      };
      await journal({ event: 'object_terminal', ...result });
      return result;
    }

    await journal({
      event: 'upload_intent_recorded',
      object_path: row.durable_object_path,
      content_sha256: row.content_sha256,
      preflight_absent: true,
      upload_upsert: false,
    });
    try {
      await storage.upload(row, source.buffer);
      uploadConfirmed = true;
      counters.storage_uploads += 1;
      await journal({
        event: 'object_upload_confirmed',
        object_path: row.durable_object_path,
      });
    } catch (uploadError) {
      const nowExists = await presence(
        storage, row, 'ambiguous_upload_reconciliation', journal, counters,
      );
      if (nowExists) {
        const verified = await exactReadback(
          storage, row, 'ambiguous_upload_exact_readback', journal, counters,
        );
        if (verified.valid) {
          const result = {
            ...objectResultBase(row),
            status: 'adopted_exact_object_after_ambiguous_upload',
            exact_readback: verified.observed,
            cleanup_verified: null,
            counters,
            errors: [],
          };
          await journal({ event: 'object_terminal', ...result });
          return result;
        }
      }
      throw uploadError;
    }

    const verified = await exactReadback(
      storage, row, 'newly_uploaded_object', journal, counters,
    );
    if (!verified.valid) {
      throw new Error(`${row.durable_object_path}:new_upload_readback_` +
        `${verified.mismatches.join('_')}_mismatch`);
    }
    const result = {
      ...objectResultBase(row),
      status: 'uploaded_and_exact_readback_verified',
      exact_readback: verified.observed,
      cleanup_verified: null,
      counters,
      errors: [],
    };
    await journal({ event: 'object_terminal', ...result });
    return result;
  } catch (error) {
    const errors = [error instanceof Error ? error.message : String(error)];
    if (uploadConfirmed) {
      try {
        await removeCurrentAttemptObject(storage, row, journal, counters);
        cleanupVerified = true;
      } catch (cleanupError) {
        cleanupVerified = false;
        errors.push(`cleanup:${cleanupError instanceof Error
          ? cleanupError.message : cleanupError}`);
      }
    }
    const result = {
      ...objectResultBase(row),
      status: cleanupVerified === false
        ? 'failed_cleanup_incomplete'
        : 'failed_without_unverified_residue',
      exact_readback: null,
      cleanup_verified: cleanupVerified,
      counters,
      errors,
    };
    await journal({ event: 'object_terminal', ...result });
    return result;
  }
}

function addCounters(target, source) {
  for (const key of Object.keys(target)) target[key] += source[key] ?? 0;
}

export async function runMtgSealedDurableImageStorageV1({
  executionPlan,
  durableBundle,
  storage,
  requestSourceBytes,
  priorRequestAttemptsByPath = new Map(),
  concurrency = executionPlan?.operation_contract?.maximum_concurrency,
  journal = async () => {},
  onObjectResult = async () => {},
  sleep,
  durableValidationOptions = {},
}) {
  const validation = validateMtgSealedDurableImageStorageExecutionPlanV1(
    executionPlan,
    durableBundle,
    durableValidationOptions,
  );
  if (!validation.valid) {
    throw new Error(`Invalid execution plan: ${validation.findings.join(',')}`);
  }
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 ||
      concurrency > executionPlan.operation_contract.maximum_concurrency) {
    throw new Error('Concurrency exceeds the frozen execution ceiling');
  }
  const rows = durableBundle.objects;
  const knownPaths = new Set(rows.map((row) => row.durable_object_path));
  let priorSourceRequestCount = 0;
  for (const [objectPath, attempts] of priorRequestAttemptsByPath.entries()) {
    if (!knownPaths.has(objectPath) || !Number.isSafeInteger(attempts) ||
        attempts < 0 || attempts >
          executionPlan.operation_contract.source_fetch_retries + 1) {
      throw new Error('Prior source-attempt state exceeds the frozen scope');
    }
    priorSourceRequestCount += attempts;
  }
  if (priorSourceRequestCount >
      executionPlan.operation_contract.maximum_source_request_attempts) {
    throw new Error('Prior source-attempt state exceeds the global ceiling');
  }
  const results = [];
  let stop = false;
  let active = 0;
  let peakConcurrency = 0;
  for (const shard of durableBundle.shards) {
    if (stop) break;
    const shardRows = rows.filter((row) =>
      row.object_index >= shard.first_object_index &&
      row.object_index <= shard.last_object_index);
    if (shardRows.length !== shard.object_count) {
      throw new Error(`Shard object reconciliation failed: ${shard.shard_key}`);
    }
    let nextShardIndex = 0;
    const worker = async () => {
      while (!stop) {
        const index = nextShardIndex;
        nextShardIndex += 1;
        if (index >= shardRows.length) return;
        const row = shardRows[index];
        active += 1;
        peakConcurrency = Math.max(peakConcurrency, active);
        let result;
        try {
          result = await processMtgSealedDurableImageObjectV1({
            row,
            executionPlan,
            storage,
            requestSourceBytes,
            priorRequestAttempts:
              priorRequestAttemptsByPath.get(row.durable_object_path) ?? 0,
            journal,
            ...(sleep ? { sleep } : {}),
          });
        } catch (error) {
          result = {
            ...objectResultBase(row),
            status: 'failed_cleanup_incomplete',
            exact_readback: null,
            cleanup_verified: false,
            counters: {
              source_http_requests: 0,
              storage_presence_reads: 0,
              storage_downloads: 0,
              storage_uploads: 0,
              storage_deletes: 0,
            },
            errors: [error instanceof Error ? error.message : String(error)],
          };
        } finally {
          active -= 1;
        }
        results.push(result);
        await onObjectResult(result);
        if (result.status.startsWith('failed_')) stop = true;
      }
    };
    await Promise.all(Array.from({
      length: Math.min(concurrency, shardRows.length),
    }, () => worker()));
  }
  results.sort((left, right) => left.object_index - right.object_index);
  const counters = {
    source_http_requests: 0,
    storage_presence_reads: 0,
    storage_downloads: 0,
    storage_uploads: 0,
    storage_deletes: 0,
  };
  for (const result of results) addCounters(counters, result.counters);
  const failures = results.filter((result) =>
    result.status.startsWith('failed_'));
  const verified = results.filter((result) => !result.status.startsWith('failed_'));
  const complete = failures.length === 0 && results.length === rows.length;
  const exactVariantCount = complete ? verified.reduce((total, result) =>
    total + result.supporting_variant_count, 0) : null;
  return {
    version: MTG_SEALED_DURABLE_IMAGE_STORAGE_V1,
    status: complete
      ? 'passed_all_durable_objects_exactly_verified'
      : failures.some((result) => result.status === 'failed_cleanup_incomplete')
        ? 'failed_cleanup_incomplete'
        : 'failed_partial_verified_progress_retained',
    execution_fingerprint_sha256:
      executionPlan.execution_fingerprint_sha256,
    planned_object_count: rows.length,
    attempted_object_count: results.length,
    exact_verified_object_count: verified.length,
    exact_verified_variant_count: exactVariantCount,
    uploaded_object_count: results.filter((result) =>
      result.status === 'uploaded_and_exact_readback_verified').length,
    reused_preexisting_object_count: results.filter((result) =>
      result.status === 'reused_preexisting_exact_object').length,
    reused_concurrent_object_count: results.filter((result) =>
      result.status === 'reused_concurrent_exact_object').length,
    adopted_ambiguous_upload_count: results.filter((result) =>
      result.status === 'adopted_exact_object_after_ambiguous_upload').length,
    failed_object_count: failures.length,
    unattempted_object_count: rows.length - results.length,
    peak_concurrency: peakConcurrency,
    counters,
    prior_source_request_count: priorSourceRequestCount,
    cumulative_source_request_count:
      priorSourceRequestCount + counters.source_http_requests,
    results,
    failures,
    zero_reconciliation_mismatches: complete &&
      verified.length === executionPlan.selected_object_count &&
      exactVariantCount === executionPlan.selected_variant_count &&
      counters.source_http_requests <=
        executionPlan.operation_contract.maximum_source_request_attempts -
          priorSourceRequestCount &&
      counters.storage_uploads <=
        executionPlan.authorized_operation_ceilings.storage_uploads,
    forbidden_boundaries: executionPlan.forbidden_boundaries,
  };
}
