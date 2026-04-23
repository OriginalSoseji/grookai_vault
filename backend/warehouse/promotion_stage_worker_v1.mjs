import '../env.mjs';

import pg from 'pg';
import { auditWarehouseCandidateIdentitySlotV1 } from '../identity/identity_slot_audit_v1.mjs';
import {
  resolveIdentityResolutionV1,
  validateIdentityResolutionForApprovedActionV1,
} from '../identity/identity_resolution_v1.mjs';
import { validatePerfectOrderVariantIdentityForPromotion } from '../identity/perfect_order_variant_identity_rule_v1.mjs';
import { executeAliasMappingWithinTransaction } from './promotion_executor_v1.mjs';
import {
  buildSourceBackedInterpreterPackage,
  getSourceBackedIdentity,
  normalizeVariantKey,
} from './source_identity_contract_v1.mjs';
import {
  assertExecuteCanonWriteV1,
} from '../lib/contracts/execute_canon_write_v1.mjs';

const { Pool } = pg;

const WORKER_NAME = 'promotion_stage_worker_v1';
const STAGING_PAYLOAD_VERSION = 'warehouse_staging_v1';
const STAGING_CONTRACT = 'promotion_stage_from_write_plan_v1';
const STAGEABLE_ACTION_TYPES = new Set([
  'CREATE_CARD_PRINT',
  'CREATE_CARD_PRINTING',
  'ENRICH_CANON_IMAGE',
]);
const POKEMON_GAME = 'pokemon';

function log(event, payload = {}) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    worker: WORKER_NAME,
    event,
    ...payload,
  }));
}

function parseArgs(argv) {
  const opts = {
    candidateId: null,
    limit: 10,
    dryRun: true,
    apply: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      opts.dryRun = true;
      opts.apply = false;
      continue;
    }
    if (arg === '--apply') {
      opts.apply = true;
      opts.dryRun = false;
      continue;
    }
    if (arg === '--candidate-id') {
      opts.candidateId = normalizeTextOrNull(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg.startsWith('--candidate-id=')) {
      opts.candidateId = normalizeTextOrNull(arg.slice('--candidate-id='.length));
      continue;
    }
    if (arg === '--limit') {
      const parsed = Number.parseInt(argv[i + 1] ?? '', 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        opts.limit = parsed;
      }
      i += 1;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number.parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        opts.limit = parsed;
      }
    }
  }

  return opts;
}

function normalizeTextOrNull(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLowerOrNull(value) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeNameKey(value) {
  const normalized = normalizeTextOrNull(value);
  return normalized
    ? normalized.replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase()
    : null;
}

function normalizeNumberPlain(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;

  if (normalized.includes('/')) {
    const [left] = normalized.split('/', 1);
    const digits = left?.replace(/[^0-9]/g, '') ?? '';
    return digits.length > 0 ? digits : null;
  }

  const digits = normalized.replace(/[^0-9]/g, '');
  return digits.length > 0 ? digits : null;
}

function toLowerSnakeCase(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  return normalized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function asRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueText(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const normalized = normalizeTextOrNull(value);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((a, b) => a.localeCompare(b))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function sameJson(left, right) {
  return JSON.stringify(canonicalizeJson(left)) === JSON.stringify(canonicalizeJson(right));
}

function buildComparableStagePayload(payload) {
  const normalizedPayload = asRecord(payload);
  if (!normalizedPayload) return null;

  const candidateSummary = asRecord(normalizedPayload.candidate_summary);
  const stagedContext = asRecord(normalizedPayload.staged_context);

  return {
    payload_version: normalizeTextOrNull(normalizedPayload.payload_version),
    staging_contract: normalizeTextOrNull(normalizedPayload.staging_contract),
    candidate_id: normalizeTextOrNull(normalizedPayload.candidate_id),
    approved_action_type: normalizeTextOrNull(normalizedPayload.approved_action_type),
    candidate_summary: candidateSummary
      ? {
          ...candidateSummary,
          state: normalizeTextOrNull(candidateSummary.state),
          current_review_hold_reason: normalizeTextOrNull(candidateSummary.current_review_hold_reason),
        }
      : null,
    founder_approval: asRecord(normalizedPayload.founder_approval) ?? null,
    evidence_summary: asRecord(normalizedPayload.evidence_summary) ?? null,
    latest_normalized_package: asRecord(normalizedPayload.latest_normalized_package) ?? null,
    latest_classification_package: asRecord(normalizedPayload.latest_classification_package) ?? null,
    latest_identity_audit_package: asRecord(normalizedPayload.latest_identity_audit_package) ?? null,
    latest_metadata_extraction_package: asRecord(normalizedPayload.latest_metadata_extraction_package) ?? null,
    latest_interpreter_package: asRecord(normalizedPayload.latest_interpreter_package) ?? null,
    write_plan: asRecord(normalizedPayload.write_plan) ?? null,
    frozen_identity: asRecord(normalizedPayload.frozen_identity) ?? null,
    normalization_asset: asRecord(normalizedPayload.normalization_asset) ?? null,
    staged_context: stagedContext
      ? {
          created_by: normalizeTextOrNull(stagedContext.created_by),
          staged_via: normalizeTextOrNull(stagedContext.staged_via),
        }
      : null,
  };
}

function sameStagePayload(left, right) {
  return sameJson(buildComparableStagePayload(left), buildComparableStagePayload(right));
}

function getLatestEventPackage(events, key) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const metadata = asRecord(events[index]?.metadata);
    const candidate = asRecord(metadata?.[key]);
    if (candidate) {
      return {
        event_type: events[index].event_type,
        created_at: events[index].created_at,
        value: candidate,
      };
    }
  }
  return null;
}

function getLatestMetadataExtraction(events) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const metadata = asRecord(events[index]?.metadata);
    const normalizedPackage = asRecord(metadata?.normalized_metadata_package);
    const rawPackage = asRecord(metadata?.raw_extraction_package);
    if (!normalizedPackage && !rawPackage) continue;
    return {
      event_type: events[index].event_type,
      created_at: events[index].created_at,
      raw_extraction_package: rawPackage,
      normalized_metadata_package: normalizedPackage,
    };
  }
  return null;
}

function getLatestNormalization(events) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const metadata = asRecord(events[index]?.metadata);
    const normalizationPackage = asRecord(metadata?.promotion_image_normalization_package);
    if (!normalizationPackage) continue;
    return {
      event_type: events[index].event_type,
      created_at: events[index].created_at,
      promotion_image_normalization_package: normalizationPackage,
    };
  }
  return null;
}

function getLatestInterpreter(events) {
  return getLatestEventPackage(events, 'interpreter_package');
}

function getLatestNormalizedPackage(events) {
  return getLatestEventPackage(events, 'normalized_package');
}

function getLatestClassificationPackage(events) {
  return getLatestEventPackage(events, 'classification_package');
}

function getLatestIdentityAuditPackage(events) {
  return getLatestEventPackage(events, 'identity_audit_package');
}

function getLatestIdentityResolutionPackage(classificationPackage, identityAuditPackage = null, candidate = null) {
  const resolved = asRecord(classificationPackage?.identity_resolution_package);
  if (resolved) {
    return resolved;
  }

  const identityAuditStatus = getIdentityAuditStatus(identityAuditPackage);
  const inlineResolution = normalizeTextOrNull(classificationPackage?.identity_resolution);
  if (!identityAuditStatus && !inlineResolution) {
    return null;
  }

  return resolveIdentityResolutionV1({ candidate, classificationPackage, identityAuditPackage });
}

function getMetadataIdentity(metadataExtraction) {
  return asRecord(metadataExtraction?.normalized_metadata_package?.identity);
}

function getPrintedModifier(metadataExtraction) {
  return asRecord(metadataExtraction?.normalized_metadata_package?.printed_modifier);
}

function normalizePrintedModifierVariantKey(printedModifier) {
  const status = normalizeTextOrNull(printedModifier?.status);
  if (status !== 'READY') return null;

  const modifierKey = normalizeTextOrNull(printedModifier?.modifier_key);
  if (modifierKey) {
    const normalizedKey = toLowerSnakeCase(modifierKey);
    return normalizedKey === 'stamp' || normalizedKey.endsWith('_stamp') ? normalizedKey : null;
  }

  const modifierLabel = normalizeTextOrNull(printedModifier?.modifier_label);
  if (!modifierLabel || !/\bstamp\b/i.test(modifierLabel)) return null;

  const normalizedFromLabel = toLowerSnakeCase(modifierLabel);
  return normalizedFromLabel.endsWith('_stamp')
    ? normalizedFromLabel
    : `${normalizedFromLabel}_stamp`;
}

function getIdentityAuditStatus(identityAuditPackage) {
  return normalizeTextOrNull(identityAuditPackage?.identity_audit_status);
}

function getIdentityResolution(identityResolutionPackage, classificationPackage = null) {
  return (
    normalizeTextOrNull(identityResolutionPackage?.identity_resolution) ??
    normalizeTextOrNull(classificationPackage?.identity_resolution) ??
    null
  );
}

async function buildAliasExecutionContext(client, artifact) {
  if (!artifact?.candidate) {
    return {
      identityAuditPackage: null,
      identityResolutionPackage: null,
      identityResolution: null,
      mappingPlan: null,
      currentStaging: null,
    };
  }

  let identityAuditPackage = artifact.latestIdentityAuditPackage?.value ?? null;
  const classificationPackage = artifact.latestClassificationPackage?.value ?? null;
  if (!identityAuditPackage) {
    identityAuditPackage = await auditWarehouseCandidateIdentitySlotV1(client, {
      candidate: artifact.candidate,
    });
  }

  const identityResolutionPackage = getLatestIdentityResolutionPackage(
    classificationPackage,
    identityAuditPackage,
    artifact.candidate,
  );
  const identityResolution = getIdentityResolution(identityResolutionPackage, classificationPackage);
  const mappingPlan = identityResolution === 'MAP_ALIAS'
    ? await buildIdentityResolutionBlockedWritePlan(client, {
        classificationPackage,
        identityAuditPackage,
        candidate: artifact.candidate,
      })
    : null;

  return {
    identityAuditPackage,
    identityResolutionPackage,
    identityResolution,
    mappingPlan,
    currentStaging: findCurrentStagingRow(artifact),
  };
}

function validateAliasExecutionContext(artifact, aliasContext) {
  const candidate = artifact?.candidate;
  if (!candidate) {
    return { ok: false, reason: 'candidate_not_found', missing: ['Candidate'] };
  }

  if (!normalizeTextOrNull(candidate.founder_approved_by_user_id) || !normalizeTextOrNull(candidate.founder_approved_at)) {
    return {
      ok: false,
      reason: 'founder_approval_missing',
      missing: ['Founder approval metadata'],
    };
  }

  if (aliasContext?.identityResolution !== 'MAP_ALIAS') {
    return {
      ok: false,
      reason: 'identity_resolution_not_map_alias',
      missing: ['identity_resolution MAP_ALIAS'],
    };
  }

  const actionPayload = asRecord(aliasContext.identityResolutionPackage?.action_payload);
  const missingRequirements = uniqueText([
    ...(Array.isArray(actionPayload?.missing_requirements) ? actionPayload.missing_requirements : []),
    !normalizeTextOrNull(actionPayload?.source) ? 'external_source' : null,
    !normalizeTextOrNull(actionPayload?.external_id) ? 'external_id' : null,
    !normalizeTextOrNull(actionPayload?.matched_card_print_id) ? 'matched_card_print_id' : null,
  ]);
  if (missingRequirements.length > 0) {
    return {
      ok: false,
      reason: 'alias_mapping_payload_incomplete',
      missing: missingRequirements,
    };
  }

  if (candidate.state === 'APPROVED_BY_FOUNDER') {
    return { ok: true };
  }

  if (candidate.state === 'STAGED_FOR_PROMOTION') {
    if (!aliasContext.currentStaging) {
      return {
        ok: false,
        reason: 'alias_candidate_current_staging_missing',
        missing: ['Current staging row'],
      };
    }
    if (normalizeTextOrNull(aliasContext.currentStaging.execution_status) !== 'FAILED') {
      return {
        ok: false,
        reason: `alias_execution_requires_failed_staging:${normalizeTextOrNull(aliasContext.currentStaging.execution_status) ?? 'null'}`,
        missing: ['Current staging row in FAILED status'],
      };
    }
    return { ok: true };
  }

  return {
    ok: false,
    reason: `candidate_not_alias_executable:${candidate.state}`,
    missing: ['Candidate must be APPROVED_BY_FOUNDER or STAGED_FOR_PROMOTION with FAILED staging'],
  };
}

function validateIdentityAuditForAction(identityAuditPackage, approvedActionType) {
  if (approvedActionType === 'ENRICH_CANON_IMAGE') {
    return { ok: true, status: getIdentityAuditStatus(identityAuditPackage) };
  }

  const status = getIdentityAuditStatus(identityAuditPackage);
  if (!status) {
    return {
      ok: false,
      reason: 'identity_audit_missing',
      missing: ['Identity audit package'],
    };
  }

  if (approvedActionType === 'CREATE_CARD_PRINT') {
    if (status === 'NEW_CANONICAL' || status === 'VARIANT_IDENTITY') {
      return { ok: true, status };
    }
    return {
      ok: false,
      reason: `identity_audit_disallows_create_card_print:${status}`,
      missing: ['Identity audit status NEW_CANONICAL or VARIANT_IDENTITY'],
    };
  }

  if (approvedActionType === 'CREATE_CARD_PRINTING') {
    if (status === 'PRINTING_ONLY') {
      return { ok: true, status };
    }
    return {
      ok: false,
      reason: `identity_audit_disallows_create_card_printing:${status}`,
      missing: ['Identity audit status PRINTING_ONLY'],
    };
  }

  if (status === 'ALIAS' || status === 'SLOT_CONFLICT' || status === 'AMBIGUOUS') {
    return {
      ok: false,
      reason: `identity_audit_disallows_promotion:${status}`,
      missing: ['Identity audit status must not be ALIAS, SLOT_CONFLICT, or AMBIGUOUS'],
    };
  }

  return { ok: true, status };
}

function buildEmptyAction(reason = null) {
  return {
    action: 'NONE',
    target_id: null,
    payload: null,
    reason,
  };
}

function buildBlockedWritePlan(reason, missingRequirements) {
  return {
    status: 'BLOCKED',
    reason,
    actions: {
      card_prints: buildEmptyAction(reason),
      card_printings: buildEmptyAction(reason),
      external_mappings: buildEmptyAction('Promotion Executor V1 does not write external_mappings.'),
      image_fields: buildEmptyAction(reason),
    },
    preview: {
      before: null,
      after: null,
    },
    missing_requirements: uniqueText(missingRequirements),
  };
}

async function buildIdentityResolutionBlockedWritePlan(client, {
  classificationPackage,
  identityAuditPackage,
  candidate,
}) {
  const resolutionPackage = getLatestIdentityResolutionPackage(classificationPackage, identityAuditPackage, candidate);
  const resolution = getIdentityResolution(resolutionPackage, classificationPackage);
  if (!resolution) {
    return buildBlockedWritePlan('Identity resolution is missing from the classification package.', ['identity_resolution']);
  }

  if (resolution === 'MAP_ALIAS') {
    const actionPayload = asRecord(resolutionPackage?.action_payload);
    const matchedCardPrintId = normalizeTextOrNull(actionPayload?.matched_card_print_id);
    const parent = matchedCardPrintId ? await fetchCardPrintById(client, matchedCardPrintId) : null;
    const mappingPayload = actionPayload
      ? {
          source: normalizeTextOrNull(actionPayload.source),
          external_id: normalizeTextOrNull(actionPayload.external_id),
          card_print_id: matchedCardPrintId,
          active: actionPayload.active === false ? false : true,
          bridge_source: normalizeTextOrNull(actionPayload.bridge_source),
          source_set_id: normalizeTextOrNull(actionPayload.source_set_id),
          source_candidate_id: normalizeTextOrNull(actionPayload.source_candidate_id),
        }
      : null;
    return {
      status: 'BLOCKED',
      reason: 'MAP_ALIAS resolves to external mapping attachment and is not executable by promotion staging.',
      actions: {
        card_prints: buildEmptyAction('MAP_ALIAS reuses existing canon instead of creating a new parent row.'),
        card_printings: buildEmptyAction('MAP_ALIAS does not create child printings.'),
        external_mappings: mappingPayload
          ? {
              action: 'UPSERT',
              target_id: matchedCardPrintId,
              payload: mappingPayload,
              reason: 'Attach the upstream alias row to the existing canonical card_print via external_mappings.',
            }
          : buildEmptyAction('MAP_ALIAS is missing external mapping inputs.'),
        image_fields: buildEmptyAction('MAP_ALIAS does not update canon image fields.'),
      },
      preview: {
        before: {
          card_prints: parent,
          card_printings: null,
          external_mappings: null,
          image_fields: null,
        },
        after: {
          card_prints: parent,
          card_printings: null,
          external_mappings: mappingPayload,
          image_fields: null,
        },
      },
      missing_requirements: uniqueText([
        'Identity resolution MAP_ALIAS is not executable by promotion staging.',
        ...(Array.isArray(actionPayload?.missing_requirements) ? actionPayload.missing_requirements : []),
      ]),
    };
  }

  if (resolution === 'BLOCK_REVIEW_REQUIRED') {
    return buildBlockedWritePlan(
      resolutionPackage?.explanation ?? 'Identity resolution requires founder review before any lawful action can be chosen.',
      ['Founder review decision required before promotion staging'],
    );
  }

  if (resolution === 'BLOCK_AMBIGUOUS') {
    return buildBlockedWritePlan(
      resolutionPackage?.explanation ?? 'Identity resolution remains ambiguous and cannot be staged.',
      ['Ambiguous identity must be resolved before promotion staging'],
    );
  }

  return buildBlockedWritePlan(
    `Identity resolution ${resolution} is not executable by promotion staging.`,
    ['Executable identity resolution required before promotion staging'],
  );
}

function inferApprovedActionType(writePlan) {
  if (!writePlan || writePlan.status !== 'READY') return null;
  if (writePlan.actions?.card_prints?.action === 'CREATE') return 'CREATE_CARD_PRINT';
  if (writePlan.actions?.card_printings?.action === 'CREATE') return 'CREATE_CARD_PRINTING';
  if (writePlan.actions?.image_fields?.action === 'UPDATE') return 'ENRICH_CANON_IMAGE';
  return null;
}

function buildFrozenIdentity(writePlan, metadataExtraction) {
  const afterCardPrint = asRecord(writePlan?.preview?.after?.card_prints);
  const identity = getMetadataIdentity(metadataExtraction);
  return {
    set_code:
      normalizeLowerOrNull(afterCardPrint?.set_code) ??
      normalizeLowerOrNull(identity?.set_code),
    name:
      normalizeTextOrNull(afterCardPrint?.name) ??
      normalizeTextOrNull(identity?.name),
    number_plain:
      normalizeTextOrNull(afterCardPrint?.number_plain) ??
      normalizeNumberPlain(afterCardPrint?.number) ??
      normalizeNumberPlain(identity?.number ?? identity?.printed_number),
    variant_key:
      normalizeTextOrNull(afterCardPrint?.variant_key) ??
      normalizePrintedModifierVariantKey(getPrintedModifier(metadataExtraction)) ??
      null,
  };
}

function freezeCandidateStateForPayload(candidateState) {
  return candidateState;
}

async function fetchCandidateRow(client, candidateId) {
  const { rows } = await client.query(
    `
      select
        id,
        submitted_by_user_id,
        intake_channel,
        submission_type,
        notes,
        tcgplayer_id,
        submission_intent,
        state,
        current_review_hold_reason,
        current_staging_id,
        interpreter_decision,
        interpreter_reason_code,
        interpreter_explanation,
        interpreter_resolved_finish_key,
        needs_promotion_review,
        proposed_action_type,
        claimed_identity_payload,
        reference_hints_payload,
        founder_approved_by_user_id,
        founder_approved_at,
        founder_approval_notes,
        created_at,
        updated_at
      from public.canon_warehouse_candidates
      where id = $1
      limit 1
    `,
    [candidateId],
  );
  return rows[0] ?? null;
}

async function fetchEvidenceRows(client, candidateId) {
  const { rows } = await client.query(
    `
      select
        id,
        evidence_kind,
        evidence_slot,
        identity_snapshot_id,
        condition_snapshot_id,
        identity_scan_event_id,
        storage_path,
        created_at
      from public.canon_warehouse_candidate_evidence
      where candidate_id = $1
      order by created_at asc, id asc
    `,
    [candidateId],
  );
  return rows;
}

async function fetchEventRows(client, candidateId) {
  const { rows } = await client.query(
    `
      select
        id,
        event_type,
        metadata,
        created_at
      from public.canon_warehouse_candidate_events
      where candidate_id = $1
      order by created_at asc, id asc
    `,
    [candidateId],
  );
  return rows;
}

async function fetchStagingRows(client, candidateId) {
  const { rows } = await client.query(
    `
      select
        id,
        candidate_id,
        approved_action_type,
        frozen_payload,
        founder_approved_by_user_id,
        founder_approved_at,
        staged_by_user_id,
        staged_at,
        execution_status,
        execution_attempts,
        last_error,
        last_attempted_at,
        executed_at
      from public.canon_warehouse_promotion_staging
      where candidate_id = $1
      order by staged_at desc nulls last, id desc
    `,
    [candidateId],
  );
  return rows;
}

async function fetchApprovedCandidateIds(client, limit) {
  const { rows } = await client.query(
    `
      select id
      from public.canon_warehouse_candidates
      where state = 'APPROVED_BY_FOUNDER'
      order by updated_at asc, id asc
      limit $1
    `,
    [limit],
  );
  return rows.map((row) => row.id);
}

async function fetchSetRowsByCode(client, setCode) {
  const normalizedSetCode = normalizeLowerOrNull(setCode);
  if (!normalizedSetCode) return [];
  const { rows } = await client.query(
    `
      select id, code, name
      from public.sets
      where game = $1
        and lower(code) = $2
      order by id asc
    `,
    [POKEMON_GAME, normalizedSetCode],
  );
  return rows;
}

async function fetchCardPrintBySetCodeIdentity(client, setCode, numberPlain, variantKey) {
  const normalizedSetCode = normalizeLowerOrNull(setCode);
  const normalizedNumberPlain = normalizeTextOrNull(numberPlain);
  const normalizedVariantKey = normalizeVariantKey(variantKey);
  if (!normalizedSetCode || !normalizedNumberPlain) {
    return [];
  }

  const { rows } = await client.query(
    `
      select
        id,
        set_id,
        set_code,
        name,
        number,
        number_plain,
        variant_key,
        gv_id,
        tcgplayer_id,
        image_url,
        image_alt_url
      from public.card_prints
      where lower(set_code) = $1
        and number_plain = $2
        and (
          (variant_key is null and $3::text is null)
          or variant_key = $3::text
        )
      limit 2
    `,
    [normalizedSetCode, normalizedNumberPlain, normalizedVariantKey],
  );

  return rows;
}

async function fetchCardPrintByIdentity(client, setId, numberPlain, variantKey) {
  const normalizedVariantKey = normalizeVariantKey(variantKey);
  const { rows } = await client.query(
    `
      select
        id,
        set_id,
        set_code,
        name,
        number,
        number_plain,
        variant_key,
        tcgplayer_id,
        image_url,
        image_alt_url
      from public.card_prints
      where set_id = $1
        and number_plain = $2
        and (
          (variant_key is null and $3::text is null)
          or variant_key = $3::text
        )
      order by id asc
      limit 2
    `,
    [setId, numberPlain, normalizedVariantKey],
  );
  return rows;
}

async function fetchCardPrintById(client, cardPrintId) {
  const normalized = normalizeTextOrNull(cardPrintId);
  if (!normalized) return null;
  const { rows } = await client.query(
    `
      select
        id,
        set_id,
        set_code,
        name,
        number,
        number_plain,
        variant_key,
        tcgplayer_id,
        image_url,
        image_alt_url
      from public.card_prints
      where id = $1
      limit 1
    `,
    [normalized],
  );
  return rows[0] ?? null;
}

async function fetchCardPrintingByCardPrintAndFinish(client, cardPrintId, finishKey) {
  const normalizedCardPrintId = normalizeTextOrNull(cardPrintId);
  const normalizedFinishKey = normalizeTextOrNull(finishKey);
  if (!normalizedCardPrintId || !normalizedFinishKey) return null;
  const { rows } = await client.query(
    `
      select
        id,
        card_print_id,
        finish_key,
        is_provisional,
        provenance_source,
        provenance_ref,
        created_by
      from public.card_printings
      where card_print_id = $1
        and finish_key = $2
      limit 1
    `,
    [normalizedCardPrintId, normalizedFinishKey],
  );
  return rows[0] ?? null;
}

async function buildPromotionWritePlanSnapshot(client, {
  candidate,
  metadataExtraction,
  interpreterPackage,
  normalizationPackage,
  identityAuditPackage,
  classificationPackage,
}) {
  const identityResolutionPackage = getLatestIdentityResolutionPackage(
    classificationPackage,
    identityAuditPackage,
    candidate,
  );
  const identityResolution = getIdentityResolution(identityResolutionPackage, classificationPackage);
  if (identityResolution === 'MAP_ALIAS' || identityResolution === 'BLOCK_REVIEW_REQUIRED' || identityResolution === 'BLOCK_AMBIGUOUS') {
    return buildIdentityResolutionBlockedWritePlan(client, {
      classificationPackage,
      identityAuditPackage,
      candidate,
    });
  }

  const sourceBackedIdentity = getSourceBackedIdentity(candidate);
  const effectiveInterpreterPackage =
    interpreterPackage ??
    (
      sourceBackedIdentity.is_bridge_candidate
        ? buildSourceBackedInterpreterPackage({
            candidate,
            classificationPackage: {
              proposed_action_type: candidate.proposed_action_type,
              identity_resolution: classificationPackage?.identity_resolution ?? null,
              identity_resolution_package: classificationPackage?.identity_resolution_package ?? null,
            },
            identityAuditPackage,
          })
        : null
    );

  if (!effectiveInterpreterPackage) {
    return buildBlockedWritePlan('Interpreter package is required before staging.', ['Interpreter package']);
  }

  if (normalizeTextOrNull(effectiveInterpreterPackage.status) !== 'READY') {
    return buildBlockedWritePlan(
      normalizeTextOrNull(effectiveInterpreterPackage.founder_explanation) ?? 'Interpreter package is not READY.',
      asArray(effectiveInterpreterPackage.missing_fields),
    );
  }

  const proposedAction =
    normalizeTextOrNull(effectiveInterpreterPackage.proposed_action) ??
    normalizeTextOrNull(candidate.proposed_action_type);
  const sourceBackedStageableWithoutNormalization =
    sourceBackedIdentity.auto_ready &&
    (proposedAction === 'CREATE_CARD_PRINT' || proposedAction === 'CREATE_CARD_PRINTING');

  const normalizationStatus = normalizeTextOrNull(normalizationPackage?.status);
  if (normalizationStatus !== 'READY' && !sourceBackedStageableWithoutNormalization) {
    return buildBlockedWritePlan('Normalization asset is not READY for staging.', ['Normalization package']);
  }

  const identity = getMetadataIdentity(metadataExtraction);
  const printedModifier = getPrintedModifier(metadataExtraction);
  const setCode = normalizeLowerOrNull(identity?.set_code);
  const name = normalizeTextOrNull(identity?.name);
  const printedNumber = normalizeTextOrNull(identity?.printed_number) ?? normalizeTextOrNull(identity?.number);
  const numberPlain = normalizeNumberPlain(printedNumber);
  const variantKey =
    normalizeVariantKey(effectiveInterpreterPackage?.canon_context?.variant_key) ??
    normalizeVariantKey(normalizePrintedModifierVariantKey(printedModifier));
  const variantIdentityValidation = validatePerfectOrderVariantIdentityForPromotion(
    effectiveInterpreterPackage?.variant_identity ?? null,
    variantKey,
  );

  if (!setCode || !name || !numberPlain) {
    return buildBlockedWritePlan('Missing required identity fields (set, name, number).', [
      !setCode ? 'Valid set_code required before staging' : null,
      !name ? 'Card name required before staging' : null,
      !numberPlain ? 'Printed number required before staging' : null,
    ]);
  }

  if (!variantIdentityValidation.ok) {
    return buildBlockedWritePlan(
      variantIdentityValidation.reason ?? 'Collision-resolved promotion target requires a deterministic variant_key.',
      variantIdentityValidation.missing_requirements,
    );
  }

  if (proposedAction === 'CREATE_CARD_PRINT') {
    const setRows = await fetchSetRowsByCode(client, setCode);
    if (setRows.length !== 1) {
      if (!sourceBackedStageableWithoutNormalization) {
        return buildBlockedWritePlan('UNKNOWN_SET', ['Valid set_code required before staging']);
      }

      const existingRows = await fetchCardPrintBySetCodeIdentity(client, setCode, numberPlain, variantKey);
      if (existingRows.length > 1) {
        return buildBlockedWritePlan('AMBIGUOUS_TARGET', ['Single canonical target required before staging']);
      }
      if (existingRows.length === 1) {
        const existing = existingRows[0];
        if (normalizeNameKey(existing.name) === normalizeNameKey(name)) {
          return buildBlockedWritePlan(
            'CREATE_CARD_PRINT is inconsistent because the exact canonical identity already exists.',
            ['No exact canonical identity may exist for CREATE_CARD_PRINT'],
          );
        }
        return buildBlockedWritePlan('AMBIGUOUS_TARGET', ['Conflicting canonical identity already exists']);
      }

      const payload = {
        set_id: null,
        set_code: setCode,
        name,
        number: printedNumber ?? numberPlain,
        number_plain: numberPlain,
        variant_key: variantKey,
        rarity: null,
        tcgplayer_id: normalizeTextOrNull(candidate.tcgplayer_id),
        image_url: null,
        image_alt_url: null,
      };

      return {
        status: 'READY',
        reason:
          'Source-backed CREATE_CARD_PRINT is ready to stage without a normalization asset. Canon set bootstrap is still required before executor apply.',
        actions: {
          card_prints: {
            action: 'CREATE',
            target_id: null,
            payload,
            reason: 'Source-backed bridge identity is deterministic and no exact canonical identity exists for this set_code, number, and variant.',
          },
          card_printings: buildEmptyAction('Source-backed parent creation does not create a child printing.'),
          external_mappings: buildEmptyAction('Promotion Executor V1 does not write external_mappings.'),
          image_fields: buildEmptyAction('No normalized promotion asset is required for source-backed CREATE_CARD_PRINT staging.'),
        },
        preview: {
          before: null,
          after: {
            card_prints: payload,
            card_printings: null,
            external_mappings: null,
            image_fields: null,
          },
        },
        missing_requirements: [],
      };
    }

    const existingRows = await fetchCardPrintByIdentity(client, setRows[0].id, numberPlain, variantKey);
    if (existingRows.length > 1) {
      return buildBlockedWritePlan('AMBIGUOUS_TARGET', ['Single canonical target required before staging']);
    }
    if (existingRows.length === 1) {
      const existing = existingRows[0];
      if (normalizeNameKey(existing.name) === normalizeNameKey(name)) {
        return buildBlockedWritePlan('CREATE_CARD_PRINT is inconsistent because the exact canonical identity already exists.', [
          'No exact canonical identity may exist for CREATE_CARD_PRINT',
        ]);
      }
      return buildBlockedWritePlan('AMBIGUOUS_TARGET', ['Conflicting canonical identity already exists']);
    }

    const payload = {
      set_id: setRows[0].id,
      set_code: setRows[0].code,
      name,
      number: printedNumber ?? numberPlain,
      number_plain: numberPlain,
      variant_key: variantKey,
      rarity: null,
      tcgplayer_id: normalizeTextOrNull(candidate.tcgplayer_id),
      image_url: null,
      image_alt_url: null,
    };

    return {
      status: 'READY',
      reason: 'Promotion would create one canonical parent row from the frozen write plan.',
      actions: {
        card_prints: {
          action: 'CREATE',
          target_id: null,
          payload,
          reason: 'No exact canonical identity exists for this set, number, and variant.',
        },
        card_printings: buildEmptyAction('Stamped parent creation does not create a child printing.'),
        external_mappings: buildEmptyAction('Promotion Executor V1 does not write external_mappings.'),
        image_fields: buildEmptyAction('Image attachment remains a downstream promotion concern.'),
      },
      preview: {
        before: null,
        after: {
          card_prints: payload,
          card_printings: null,
          external_mappings: null,
          image_fields: null,
        },
      },
      missing_requirements: [],
    };
  }

  if (proposedAction === 'CREATE_CARD_PRINTING') {
    const matchedCardPrintId = normalizeTextOrNull(interpreterPackage?.canon_context?.matched_card_print_id);
    const finishKey = normalizeTextOrNull(interpreterPackage?.canon_context?.finish_key);
    if (!matchedCardPrintId || !finishKey) {
      return buildBlockedWritePlan('CREATE_CARD_PRINTING requires a resolved parent card_print and finish_key.', [
        !matchedCardPrintId ? 'Resolved parent card_print_id' : null,
        !finishKey ? 'finish_key' : null,
      ]);
    }

    const parent = await fetchCardPrintById(client, matchedCardPrintId);
    if (!parent) {
      return buildBlockedWritePlan('Resolved parent card_print could not be found.', ['Resolved parent card_print']);
    }

    const existingPrinting = await fetchCardPrintingByCardPrintAndFinish(client, parent.id, finishKey);
    return {
      status: 'READY',
      reason: existingPrinting
        ? 'Parent card exists and the requested child printing already exists.'
        : 'Promotion would create one child printing under the resolved parent.',
      actions: {
        card_prints: {
          action: 'REUSE',
          target_id: parent.id,
          payload: null,
          reason: 'Existing canonical parent row would be reused.',
        },
        card_printings: existingPrinting
          ? {
              action: 'REUSE',
              target_id: existingPrinting.id,
              payload: null,
              reason: 'Existing child printing already satisfies the requested finish.',
            }
          : {
              action: 'CREATE',
              target_id: null,
              payload: {
                card_print_id: parent.id,
                finish_key: finishKey,
                is_provisional: false,
                provenance_source: STAGING_CONTRACT,
                provenance_ref: `warehouse_candidate:${candidate.id}`,
                created_by: WORKER_NAME,
              },
              reason: 'A new child printing would be inserted under the resolved parent.',
            },
        external_mappings: buildEmptyAction('Promotion Executor V1 does not write external_mappings.'),
        image_fields: buildEmptyAction('This action path does not update canon image fields.'),
      },
      preview: {
        before: {
          card_prints: parent,
          card_printings: existingPrinting,
          external_mappings: null,
          image_fields: {
            image_url: normalizeTextOrNull(parent.image_url),
            image_alt_url: normalizeTextOrNull(parent.image_alt_url),
          },
        },
        after: {
          card_prints: parent,
          card_printings: existingPrinting ?? {
            card_print_id: parent.id,
            finish_key: finishKey,
            is_provisional: false,
            provenance_source: STAGING_CONTRACT,
            provenance_ref: `warehouse_candidate:${candidate.id}`,
            created_by: WORKER_NAME,
          },
          external_mappings: null,
          image_fields: {
            image_url: normalizeTextOrNull(parent.image_url),
            image_alt_url: normalizeTextOrNull(parent.image_alt_url),
          },
        },
      },
      missing_requirements: [],
    };
  }

  if (proposedAction === 'ENRICH_CANON_IMAGE') {
    const matchedCardPrintId = normalizeTextOrNull(interpreterPackage?.canon_context?.matched_card_print_id);
    if (!matchedCardPrintId) {
      return buildBlockedWritePlan('Resolved canon image target is required before staging.', ['Resolved card_print target']);
    }
    const parent = await fetchCardPrintById(client, matchedCardPrintId);
    if (!parent) {
      return buildBlockedWritePlan('Resolved canon image target could not be found.', ['Resolved card_print target']);
    }
    const normalizedFrontStoragePath = normalizeTextOrNull(
      normalizationPackage?.outputs?.normalized_front_storage_path,
    );
    if (!normalizedFrontStoragePath) {
      return buildBlockedWritePlan('Normalized front asset is required before image enrichment can be staged.', [
        'Normalized front asset',
      ]);
    }

    return {
      status: 'READY',
      reason: 'Promotion would reuse the canonical target and freeze the normalized promotion asset for later image attachment.',
      actions: {
        card_prints: {
          action: 'REUSE',
          target_id: parent.id,
          payload: null,
          reason: 'Existing canonical target would be reused.',
        },
        card_printings: buildEmptyAction('This action path does not create child printings.'),
        external_mappings: buildEmptyAction('Promotion Executor V1 does not write external_mappings.'),
        image_fields: {
          action: 'UPDATE',
          target_id: parent.id,
          payload: {
            normalized_front_storage_path: normalizedFrontStoragePath,
          },
          reason: 'The normalized promotion asset is frozen for a later execution step.',
        },
      },
      preview: {
        before: {
          card_prints: parent,
          card_printings: null,
          external_mappings: null,
          image_fields: {
            image_url: normalizeTextOrNull(parent.image_url),
            image_alt_url: normalizeTextOrNull(parent.image_alt_url),
          },
        },
        after: {
          card_prints: parent,
          card_printings: null,
          external_mappings: null,
          image_fields: {
            normalized_front_storage_path: normalizedFrontStoragePath,
          },
        },
      },
      missing_requirements: [],
    };
  }

  return buildBlockedWritePlan('Interpreter/action state is not stageable from the current write plan.', [
    'Stageable approved action type',
  ]);
}

function buildFrozenPayload({
  candidate,
  evidenceRows,
  latestNormalizedPackage,
  latestClassificationPackage,
  latestIdentityAuditPackage,
  metadataExtraction,
  interpreterPackage,
  normalizationPackage,
  writePlan,
  stagedAt,
}) {
  const frozenIdentity = buildFrozenIdentity(writePlan, metadataExtraction);
  const approvedActionType = inferApprovedActionType(writePlan);
  return {
    payload_version: STAGING_PAYLOAD_VERSION,
    staging_contract: STAGING_CONTRACT,
    candidate_id: candidate.id,
    approved_action_type: approvedActionType,
    candidate_summary: {
      state: freezeCandidateStateForPayload(candidate.state),
      submission_intent: candidate.submission_intent,
      intake_channel: candidate.intake_channel,
      submission_type: candidate.submission_type,
      notes: candidate.notes,
      tcgplayer_id: candidate.tcgplayer_id,
      proposed_action_type: candidate.proposed_action_type,
      interpreter_decision: candidate.interpreter_decision,
      interpreter_reason_code: candidate.interpreter_reason_code,
      interpreter_explanation: candidate.interpreter_explanation,
      interpreter_resolved_finish_key: candidate.interpreter_resolved_finish_key,
      needs_promotion_review: candidate.needs_promotion_review === true,
      current_review_hold_reason: candidate.current_review_hold_reason,
      identity_resolution: normalizeTextOrNull(latestClassificationPackage?.identity_resolution),
    },
    founder_approval: {
      founder_approved_by_user_id: candidate.founder_approved_by_user_id,
      founder_approved_at: candidate.founder_approved_at,
      founder_approval_notes: candidate.founder_approval_notes,
    },
    evidence_summary: {
      evidence_count: evidenceRows.length,
      evidence_rows: evidenceRows.map((row) => ({
        id: row.id,
        evidence_kind: row.evidence_kind,
        evidence_slot: row.evidence_slot,
        storage_path: row.storage_path,
        identity_snapshot_id: row.identity_snapshot_id,
        condition_snapshot_id: row.condition_snapshot_id,
        identity_scan_event_id: row.identity_scan_event_id,
        created_at: row.created_at,
      })),
    },
    latest_normalized_package: latestNormalizedPackage ?? null,
    latest_classification_package: latestClassificationPackage ?? null,
    latest_identity_audit_package: latestIdentityAuditPackage ?? null,
    latest_identity_resolution_package:
      getLatestIdentityResolutionPackage(latestClassificationPackage, latestIdentityAuditPackage, candidate) ?? null,
    latest_metadata_extraction_package: metadataExtraction?.normalized_metadata_package ?? null,
    latest_interpreter_package: interpreterPackage ?? null,
    write_plan: writePlan,
    frozen_identity: frozenIdentity,
    normalization_asset: {
      front_path: normalizeTextOrNull(normalizationPackage?.outputs?.normalized_front_storage_path),
      back_path: normalizeTextOrNull(normalizationPackage?.outputs?.normalized_back_storage_path),
    },
    staged_context: {
      staged_at: stagedAt,
      candidate_created_at: candidate.created_at,
      candidate_updated_at: candidate.updated_at,
      created_at: stagedAt,
      created_by: candidate.founder_approved_by_user_id,
      staged_via: WORKER_NAME,
      approval_mode: 'MANUAL',
    },
  };
}

function canBuildStagingPayload(artifact, writePlan) {
  const sourceBackedStageableWithoutNormalization =
    getSourceBackedIdentity(artifact?.candidate).is_bridge_candidate &&
    (
      inferApprovedActionType(writePlan) === 'CREATE_CARD_PRINT' ||
      inferApprovedActionType(writePlan) === 'CREATE_CARD_PRINTING'
    );
  return Boolean(
    artifact?.candidate &&
      normalizeTextOrNull(artifact.candidate.founder_approved_by_user_id) &&
      normalizeTextOrNull(artifact.candidate.founder_approved_at) &&
      artifact.latestMetadataExtractionPackage?.normalized_metadata_package &&
      artifact.latestInterpreterPackage?.value &&
      normalizeTextOrNull(artifact.latestInterpreterPackage?.value?.status) === 'READY' &&
      (
        normalizeTextOrNull(artifact.latestNormalizationPackage?.promotion_image_normalization_package?.status) === 'READY' ||
        sourceBackedStageableWithoutNormalization
      ) &&
      writePlan?.status === 'READY',
  );
}

function findIdenticalStagingRow(stagingRows, payload) {
  return stagingRows.find((row) => sameStagePayload(row.frozen_payload, payload)) ?? null;
}

function findCurrentStagingRow(artifact) {
  const currentStagingId = normalizeTextOrNull(artifact?.candidate?.current_staging_id);
  if (!currentStagingId) return null;
  return artifact.stagingRows.find((row) => row.id === currentStagingId) ?? null;
}

async function fetchArtifacts(client, candidateId) {
  const [candidate, evidenceRows, eventRows, stagingRows] = await Promise.all([
    fetchCandidateRow(client, candidateId),
    fetchEvidenceRows(client, candidateId),
    fetchEventRows(client, candidateId),
    fetchStagingRows(client, candidateId),
  ]);

  return {
    candidate,
    evidenceRows,
    eventRows,
    stagingRows,
    latestMetadataExtractionPackage: getLatestMetadataExtraction(eventRows),
    latestNormalizationPackage: getLatestNormalization(eventRows),
    latestInterpreterPackage: getLatestInterpreter(eventRows),
    latestNormalizedPackage: getLatestNormalizedPackage(eventRows),
    latestClassificationPackage: getLatestClassificationPackage(eventRows),
    latestIdentityAuditPackage: getLatestIdentityAuditPackage(eventRows),
  };
}

function validateArtifacts(artifact, writePlan) {
  const candidate = artifact.candidate;
  if (!candidate) {
    return { ok: false, reason: 'candidate_not_found', missing: ['Candidate'] };
  }
  if (candidate.state !== 'APPROVED_BY_FOUNDER') {
    return {
      ok: false,
      reason: `candidate_not_approved_by_founder:${candidate.state}`,
      missing: ['Candidate must be APPROVED_BY_FOUNDER'],
    };
  }
  if (!normalizeTextOrNull(candidate.founder_approved_by_user_id) || !normalizeTextOrNull(candidate.founder_approved_at)) {
    return {
      ok: false,
      reason: 'founder_approval_missing',
      missing: ['Founder approval metadata'],
    };
  }
  if (!artifact.latestMetadataExtractionPackage?.normalized_metadata_package) {
    return {
      ok: false,
      reason: 'metadata_extraction_missing',
      missing: ['Metadata extraction package'],
    };
  }
  if (!artifact.latestInterpreterPackage?.value) {
    return {
      ok: false,
      reason: 'interpreter_package_missing',
      missing: ['Interpreter package'],
    };
  }
  if (normalizeTextOrNull(artifact.latestInterpreterPackage?.value?.status) !== 'READY') {
    return {
      ok: false,
      reason: `interpreter_not_ready:${normalizeTextOrNull(artifact.latestInterpreterPackage?.value?.status) ?? 'null'}`,
      missing: uniqueText(asArray(artifact.latestInterpreterPackage?.value?.missing_fields)),
    };
  }
  const approvedActionType = inferApprovedActionType(writePlan);
  const normalizationStatus = normalizeTextOrNull(
    artifact.latestNormalizationPackage?.promotion_image_normalization_package?.status,
  );
  const sourceBackedStageableWithoutNormalization =
    getSourceBackedIdentity(candidate).is_bridge_candidate &&
    (approvedActionType === 'CREATE_CARD_PRINT' || approvedActionType === 'CREATE_CARD_PRINTING');
  if (normalizationStatus !== 'READY' && !sourceBackedStageableWithoutNormalization) {
    return {
      ok: false,
      reason: `normalization_not_ready:${normalizationStatus ?? 'null'}`,
      missing: ['READY normalization asset'],
    };
  }
  if (!writePlan || writePlan.status !== 'READY') {
    return {
      ok: false,
      reason: `write_plan_not_ready:${normalizeTextOrNull(writePlan?.status) ?? 'null'}`,
      missing: uniqueText(writePlan?.missing_requirements ?? ['READY promotion write plan']),
    };
  }
  if (!approvedActionType || !STAGEABLE_ACTION_TYPES.has(approvedActionType)) {
    return {
      ok: false,
      reason: 'invalid_approved_action_type',
      missing: ['Stageable approved action type'],
    };
  }

  const identityAuditValidation = validateIdentityAuditForAction(
    artifact.latestIdentityAuditPackage?.value ?? null,
    approvedActionType,
  );
  if (!identityAuditValidation.ok) {
    return {
      ok: false,
      reason: identityAuditValidation.reason,
      missing: identityAuditValidation.missing,
    };
  }

  const identityResolutionPackage = getLatestIdentityResolutionPackage(
    artifact.latestClassificationPackage?.value ?? null,
    artifact.latestIdentityAuditPackage?.value ?? null,
    candidate,
  );
  if (identityResolutionPackage) {
    const identityResolutionValidation = validateIdentityResolutionForApprovedActionV1(
      getIdentityResolution(identityResolutionPackage, artifact.latestClassificationPackage?.value ?? null),
      approvedActionType,
    );
    if (!identityResolutionValidation.ok) {
      return {
        ok: false,
        reason: identityResolutionValidation.reason,
        missing: identityResolutionValidation.missing,
      };
    }
  }

  return { ok: true, approvedActionType, sourceBackedStageableWithoutNormalization };
}

async function insertStageEvent(client, payload) {
  await client.query(
    `
      insert into public.canon_warehouse_candidate_events (
        candidate_id,
        staging_id,
        event_type,
        action,
        previous_state,
        next_state,
        actor_user_id,
        actor_type,
        metadata,
        created_at
      )
      values ($1, $2, 'PROMOTION_STAGED_FROM_WRITE_PLAN_V1', 'STAGE', $3, $4, null, 'SYSTEM', $5::jsonb, now())
    `,
    [
      payload.candidateId,
      payload.stagingId,
      payload.previousState,
      payload.nextState,
      JSON.stringify({
        worker: WORKER_NAME,
        approved_action_type: payload.approvedActionType,
        write_plan_snapshot: payload.writePlan,
        normalization_asset_paths: payload.normalizationAsset,
      }),
    ],
  );
}

async function insertWarehouseEvent(client, payload) {
  await client.query(
    `
      insert into public.canon_warehouse_candidate_events (
        candidate_id,
        event_type,
        action,
        previous_state,
        next_state,
        actor_user_id,
        actor_type,
        metadata,
        created_at
      )
      values ($1, $2, $3, $4, $5, null, 'SYSTEM', $6::jsonb, now())
    `,
    [
      payload.candidateId,
      payload.eventType,
      payload.action,
      payload.previousState,
      payload.nextState,
      JSON.stringify({
        worker: WORKER_NAME,
        system_note: payload.notes ?? null,
        ...payload.metadata,
      }),
    ],
  );
}

async function createStageWithinTransaction(client, artifact, writePlan, stagedAt) {
  const validation = validateArtifacts(artifact, writePlan);
  if (!validation.ok) {
    return {
      status: 'blocked',
      reason: validation.reason,
      missing_requirements: validation.missing,
    };
  }

  const payload = buildFrozenPayload({
    candidate: artifact.candidate,
    evidenceRows: artifact.evidenceRows,
    latestNormalizedPackage: artifact.latestNormalizedPackage?.value ?? null,
    latestClassificationPackage: artifact.latestClassificationPackage?.value ?? null,
    latestIdentityAuditPackage: artifact.latestIdentityAuditPackage?.value ?? null,
    metadataExtraction: artifact.latestMetadataExtractionPackage,
    interpreterPackage: artifact.latestInterpreterPackage?.value ?? null,
    normalizationPackage: artifact.latestNormalizationPackage?.promotion_image_normalization_package ?? null,
    writePlan,
    stagedAt,
  });

  const payloadSnapshot = {
    candidate_id: artifact.candidate?.id ?? null,
    approved_action_type: validation.approvedActionType ?? null,
    payload_version: payload.payload_version ?? null,
    staging_contract: payload.staging_contract ?? null,
    staged_at: stagedAt,
    write_plan_preview: payload.write_plan ?? null,
  };

  const identicalExisting = findIdenticalStagingRow(artifact.stagingRows, payload);
  if (identicalExisting) {
    return {
      status: 'skipped',
      reason: 'identical_staging_exists',
      staging_id: identicalExisting.id,
      execution_status: identicalExisting.execution_status,
      payload,
    };
  }

  const activeExisting = artifact.stagingRows.find((row) => ['PENDING', 'RUNNING'].includes(row.execution_status)) ?? null;
  if (activeExisting) {
    return {
      status: 'blocked',
      reason: 'active_staging_exists',
      staging_id: activeExisting.id,
      missing_requirements: ['Only one active staging row is allowed per candidate'],
      payload,
    };
  }

  let stagingId = null;
  await assertExecuteCanonWriteV1({
    execution_name: 'promotion_stage_create_stage_v1',
    payload_snapshot,
    write_target: client,
    audit_target: client,
    ledger_target: client,
    transaction_control: 'external',
    actor_type: 'system_worker',
    actor_id: artifact.candidate?.founder_approved_by_user_id ?? null,
    source_worker: WORKER_NAME,
    source_system: 'warehouse',
    contract_assertions: [
      {
        ok: Boolean(artifact.candidate?.id),
        contract_name: 'INGESTION_PIPELINE_CONTRACT_V1',
        violation_type: 'missing_candidate_id',
        reason: 'promotion_stage_create_stage_v1 requires candidate id.',
      },
      {
        ok: Boolean(validation.approvedActionType),
        contract_name: 'IDENTITY_PRECEDENCE_RULE_V1',
        violation_type: 'missing_approved_action_type',
        reason: 'promotion_stage_create_stage_v1 requires approved action type.',
      },
      {
        ok: payload.staging_contract === STAGING_CONTRACT,
        contract_name: 'GROOKAI_GUARDRAILS',
        violation_type: 'staging_contract_drift',
        reason: `promotion_stage_create_stage_v1 expected ${STAGING_CONTRACT}, found ${payload.staging_contract ?? 'null'}.`,
      },
    ],
    proofs: [
      {
        name: 'active_staging_row_exists',
        contract_name: 'INGESTION_PIPELINE_CONTRACT_V1',
        violation_type: 'post_write_staging_missing',
        query: `
          select execution_status
          from public.canon_warehouse_promotion_staging
          where id = $1
          limit 1
        `,
        params: [stagingId],
        evaluate(result) {
          const status = normalizeTextOrNull(result.rows[0]?.execution_status);
          return {
            ok: status === 'PENDING',
            reason: `promotion_stage_create_stage_v1 expected PENDING staging row ${stagingId}, found ${status ?? 'null'}.`,
          };
        },
      },
      {
        name: 'candidate_points_to_current_staging',
        contract_name: 'IDENTITY_PRECEDENCE_RULE_V1',
        violation_type: 'post_write_candidate_stage_drift',
        query: `
          select current_staging_id, state
          from public.canon_warehouse_candidates
          where id = $1
          limit 1
        `,
        params: [artifact.candidate.id],
        evaluate(result) {
          const row = result.rows[0] ?? null;
          const currentStagingId = normalizeTextOrNull(row?.current_staging_id);
          const state = normalizeTextOrNull(row?.state);
          return {
            ok: currentStagingId === stagingId && state === 'STAGED_FOR_PROMOTION',
            reason:
              `promotion_stage_create_stage_v1 expected candidate ${artifact.candidate.id} -> ${stagingId}/STAGED_FOR_PROMOTION, found ${currentStagingId ?? 'null'}/${state ?? 'null'}.`,
          };
        },
      },
      {
        name: 'single_active_staging_owner',
        contract_name: 'INGESTION_PIPELINE_CONTRACT_V1',
        violation_type: 'post_write_multiple_active_staging_rows',
        query: `
          select count(*)::int as active_count
          from public.canon_warehouse_promotion_staging
          where candidate_id = $1
            and execution_status in ('PENDING', 'RUNNING')
        `,
        params: [artifact.candidate.id],
        evaluate(result) {
          const activeCount = Number(result.rows[0]?.active_count ?? 0);
          return {
            ok: activeCount === 1,
            reason:
              `promotion_stage_create_stage_v1 expected one active staging row for ${artifact.candidate.id}, found ${activeCount}.`,
          };
        },
      },
    ],
    async write(connection) {
      const { rows } = await connection.query(
        `
          insert into public.canon_warehouse_promotion_staging (
            candidate_id,
            approved_action_type,
            frozen_payload,
            founder_approved_by_user_id,
            founder_approved_at,
            staged_by_user_id,
            staged_at,
            execution_status,
            execution_attempts
          )
          values ($1, $2, $3::jsonb, $4, $5, $6, $7, 'PENDING', 0)
          returning id
        `,
        [
          artifact.candidate.id,
          validation.approvedActionType,
          JSON.stringify(payload),
          artifact.candidate.founder_approved_by_user_id,
          artifact.candidate.founder_approved_at,
          artifact.candidate.founder_approved_by_user_id,
          stagedAt,
        ],
      );
      stagingId = rows[0]?.id ?? null;
      if (!stagingId) {
        throw new Error('staging_insert_failed');
      }
      payloadSnapshot.staging_id = stagingId;

      const candidateUpdate = await connection.query(
        `
          update public.canon_warehouse_candidates
          set
            current_staging_id = $2,
            state = 'STAGED_FOR_PROMOTION',
            current_review_hold_reason = null
          where id = $1
            and state = 'APPROVED_BY_FOUNDER'
          returning id
        `,
        [artifact.candidate.id, stagingId],
      );
      if (candidateUpdate.rowCount !== 1) {
        throw new Error('candidate_stage_update_failed');
      }

      await insertStageEvent(connection, {
        candidateId: artifact.candidate.id,
        stagingId,
        previousState: 'APPROVED_BY_FOUNDER',
        nextState: 'STAGED_FOR_PROMOTION',
        approvedActionType: validation.approvedActionType,
        writePlan,
        normalizationAsset: payload.normalization_asset,
      });
    },
  });

  return {
    status: 'applied',
    staging_id: stagingId,
    approved_action_type: validation.approvedActionType,
    payload,
  };
}

async function withCandidateLock(pool, candidateId, fn) {
  const connection = await pool.connect();
  try {
    const lockResult = await connection.query(
      'select pg_try_advisory_lock(hashtext($1)) as locked',
      [candidateId],
    );
    if (!lockResult.rows[0]?.locked) {
      return { status: 'skipped', reason: 'candidate_locked' };
    }
    try {
      return await fn(connection);
    } finally {
      await connection.query('select pg_advisory_unlock(hashtext($1))', [candidateId]);
    }
  } finally {
    connection.release();
  }
}

async function processCandidate(pool, candidateId, opts) {
  return withCandidateLock(pool, candidateId, async (connection) => {
    await connection.query('begin');
    try {
      const artifact = await fetchArtifacts(connection, candidateId);
      const aliasContext = await buildAliasExecutionContext(connection, artifact);

      if (aliasContext.identityResolution === 'MAP_ALIAS') {
        const validation = validateAliasExecutionContext(artifact, aliasContext);
        if (opts.dryRun) {
          await connection.query('rollback');
          return {
            status: validation.ok ? 'dry_run' : 'blocked',
            reason: validation.ok ? 'alias_mapping_ready' : validation.reason,
            candidate_id: candidateId,
            candidate_state: artifact.candidate?.state ?? null,
            identity_resolution: aliasContext.identityResolution,
            mapping_plan: aliasContext.mappingPlan,
            missing_requirements: validation.ok ? [] : validation.missing,
          };
        }

        if (!validation.ok) {
          await connection.query('rollback');
          return {
            status: 'blocked',
            reason: validation.reason,
            candidate_id: candidateId,
            candidate_state: artifact.candidate?.state ?? null,
            identity_resolution: aliasContext.identityResolution,
            mapping_plan: aliasContext.mappingPlan,
            missing_requirements: validation.missing,
          };
        }

        const aliasResult = await executeAliasMappingWithinTransaction(connection, {
          candidate: artifact.candidate,
          identityResolutionPackage: aliasContext.identityResolutionPackage,
          currentStaging: aliasContext.currentStaging,
        });
        await connection.query('commit');
        return {
          ...aliasResult,
          candidate_id: candidateId,
          candidate_state: 'ARCHIVED',
          identity_resolution: aliasContext.identityResolution,
          mapping_plan: aliasContext.mappingPlan,
        };
      }

      const writePlan = await buildPromotionWritePlanSnapshot(connection, {
        candidate: artifact.candidate,
        metadataExtraction: artifact.latestMetadataExtractionPackage,
        interpreterPackage: artifact.latestInterpreterPackage?.value ?? null,
        normalizationPackage: artifact.latestNormalizationPackage?.promotion_image_normalization_package ?? null,
        identityAuditPackage: artifact.latestIdentityAuditPackage?.value ?? null,
        classificationPackage: artifact.latestClassificationPackage?.value ?? null,
      });
      const stagedAt = new Date().toISOString();
      const comparablePayload = canBuildStagingPayload(artifact, writePlan)
        ? buildFrozenPayload({
            candidate: artifact.candidate,
            evidenceRows: artifact.evidenceRows,
            latestNormalizedPackage: artifact.latestNormalizedPackage?.value ?? null,
            latestClassificationPackage: artifact.latestClassificationPackage?.value ?? null,
            latestIdentityAuditPackage: artifact.latestIdentityAuditPackage?.value ?? null,
            metadataExtraction: artifact.latestMetadataExtractionPackage,
            interpreterPackage: artifact.latestInterpreterPackage?.value ?? null,
            normalizationPackage: artifact.latestNormalizationPackage?.promotion_image_normalization_package ?? null,
            writePlan,
            stagedAt,
          })
        : null;
      const identicalExisting = comparablePayload
        ? findIdenticalStagingRow(artifact.stagingRows, comparablePayload)
        : null;
      const currentStaging = findCurrentStagingRow(artifact);

      if (artifact.candidate?.state === 'STAGED_FOR_PROMOTION' && currentStaging) {
        await connection.query('rollback');
        return {
          status: 'skipped',
          reason: identicalExisting?.id === currentStaging.id
            ? 'identical_staging_exists'
            : 'already_staged_for_promotion',
          candidate_id: candidateId,
          candidate_state: artifact.candidate?.state ?? null,
          staging_id: currentStaging.id,
          execution_status: currentStaging.execution_status,
          write_plan: writePlan,
          payload: comparablePayload,
        };
      }

      if (opts.dryRun) {
        const validation = validateArtifacts(artifact, writePlan);
        await connection.query('rollback');
        return {
          status: validation.ok ? 'dry_run' : 'blocked',
          reason: validation.ok ? writePlan.reason : validation.reason,
          candidate_id: candidateId,
          candidate_state: artifact.candidate?.state ?? null,
          write_plan: writePlan,
          payload: validation.ok ? comparablePayload : null,
          missing_requirements: validation.ok ? [] : validation.missing,
        };
      }

      const result = await createStageWithinTransaction(connection, artifact, writePlan, stagedAt);
      if (result.status === 'applied') {
        await connection.query('commit');
        return {
          ...result,
          candidate_id: candidateId,
          candidate_state: 'STAGED_FOR_PROMOTION',
        };
      }

      await connection.query('rollback');
      return {
        ...result,
        candidate_id: candidateId,
        candidate_state: artifact.candidate?.state ?? null,
        write_plan: writePlan,
      };
    } catch (error) {
      await connection.query('rollback');
      throw error;
    }
  });
}

export async function runPromotionStageWorkerV1(input = {}) {
  const opts = {
    candidateId: normalizeTextOrNull(input.candidateId),
    limit:
      Number.isFinite(Number(input.limit)) && Number(input.limit) > 0
        ? Math.trunc(Number(input.limit))
        : 10,
    dryRun: input.apply ? false : input.dryRun === false ? false : true,
    apply: Boolean(input.apply),
    emitLogs: input.emitLogs !== false,
  };

  if (opts.apply) {
    opts.dryRun = false;
  }

  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
  });

  try {
    const connection = await pool.connect();
    let candidateIds;
    try {
      candidateIds = opts.candidateId
        ? [opts.candidateId]
        : await fetchApprovedCandidateIds(connection, opts.limit);
    } finally {
      connection.release();
    }

    if (opts.emitLogs) {
      log('worker_start', {
        mode: opts.apply ? 'apply' : 'dry-run',
        candidate_id: opts.candidateId,
        requested_limit: opts.limit,
        candidate_count: candidateIds.length,
      });
    }

    const results = [];
    for (const candidateId of candidateIds) {
      try {
        const result = await processCandidate(pool, candidateId, opts);
        results.push({ candidateId, ...result });
        if (opts.emitLogs) {
          log('candidate_result', { candidate_id: candidateId, ...result });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ candidateId, status: 'failed', reason: message });
        if (opts.emitLogs) {
          log('candidate_failed', { candidate_id: candidateId, reason: message });
        }
      }
    }

    const summary = {
      mode: opts.apply ? 'apply' : 'dry-run',
      processed: results.length,
      results,
    };

    if (opts.emitLogs) {
      log('worker_complete', summary);
    }

    return summary;
  } finally {
    await pool.end();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  await runPromotionStageWorkerV1(opts);
}

if (process.argv[1] && process.argv[1].includes('promotion_stage_worker_v1.mjs')) {
  main().catch((error) => {
    log('fatal', { error: error.message });
    process.exit(1);
  });
}
