import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const BLOCKER_AUDIT_JSON = path.join(OUTPUT_DIR, 'image_truth_mep_blocker_governance_audit_v1.json');
const SOURCE_EVIDENCE_JSON = path.join(OUTPUT_DIR, 'image_truth_mep_cosmos_source_evidence_v1.json');
const MASTER_GOVERNANCE_PROBE_PRINTINGS_JSON = path.join(OUTPUT_DIR, 'mep_master_index_governance_probe_v1', 'english_master_index_printings_v1.json');
const REPORT_JSON = path.join(OUTPUT_DIR, 'image_truth_mep_cosmos_finish_governance_readiness_v1.json');
const REPORT_MD = path.join(OUTPUT_DIR, 'image_truth_mep_cosmos_finish_governance_readiness_v1.md');

const PACKAGE_ID = 'IMG-FINISH-01A-MEP-COSMOS-FINISH-GOVERNANCE-READINESS';

function requireDbUrl() {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    null
  );
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeNumber(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^0+(?=\d)/, '');
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
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

function proofHash(value) {
  return sha256Hex(JSON.stringify(canonicalizeJson(value)));
}

function countBy(rows, getKey) {
  return rows.reduce((acc, row) => {
    const key = getKey(row);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function markdownTable(rows, columns) {
  if (rows.length === 0) return '_None._';
  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => {
    const cells = columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|'));
    return `| ${cells.join(' | ')} |`;
  });
  return [header, divider, ...body].join('\n');
}

async function fetchTarget(client, target) {
  const result = await client.query(
    `
      select
        cpi.id as card_printing_id,
        cpi.card_print_id,
        cpi.finish_key,
        cpi.image_source,
        cpi.image_path,
        cpi.image_url,
        cpi.image_alt_url,
        cpi.image_status,
        cpi.image_note,
        cp.set_code,
        cp.number,
        cp.name as card_name,
        cp.printed_identity_modifier,
        array_remove(array_agg(distinct sibling.finish_key order by sibling.finish_key), null) as sibling_finish_keys
      from public.card_printings cpi
      join public.card_prints cp on cp.id = cpi.card_print_id
      left join public.card_printings sibling on sibling.card_print_id = cpi.card_print_id
      where cpi.id = $1
      group by
        cpi.id,
        cpi.card_print_id,
        cpi.finish_key,
        cpi.image_source,
        cpi.image_path,
        cpi.image_url,
        cpi.image_alt_url,
        cpi.image_status,
        cpi.image_note,
        cp.set_code,
        cp.number,
        cp.name,
        cp.printed_identity_modifier
      limit 1
    `,
    [target.card_printing_id],
  );
  return result.rows[0] ?? null;
}

function validateTarget(target, current, evidenceRow, cosmosActive) {
  const errors = [];
  const warnings = [];

  if (!current) {
    errors.push('target_card_printing_not_found');
    return { errors, warnings };
  }

  if (current.card_print_id !== target.card_print_id) errors.push('card_print_id_mismatch');
  if (normalizeText(current.set_code) !== normalizeText(target.set_code)) errors.push('set_code_mismatch');
  if (normalizeNumber(current.number) !== normalizeNumber(target.number)) errors.push('number_mismatch');
  if (normalizeText(current.card_name) !== normalizeText(target.card_name)) errors.push('card_name_mismatch');
  if (normalizeText(current.finish_key) !== 'holo') errors.push('current_finish_not_holo');
  if (!cosmosActive) errors.push('cosmos_finish_key_not_active');
  if (!evidenceRow) errors.push('missing_preserved_cosmos_source_evidence');
  if ((evidenceRow?.evidence ?? []).length < 2) errors.push('source_evidence_count_below_2');
  if (normalizeText(evidenceRow?.source_supported_finish_label) !== 'cosmos holo') errors.push('source_supported_finish_not_cosmos_holo');

  if (clean(current.image_path)) errors.push('child_image_path_already_present');
  if (clean(current.image_url)) errors.push('child_image_url_already_present');
  if (clean(current.image_alt_url)) errors.push('child_image_alt_url_already_present');
  if (clean(current.image_status)) warnings.push('child_image_status_already_present');
  if (clean(current.image_note)) warnings.push('child_image_note_already_present');

  const siblingFinishKeys = current.sibling_finish_keys ?? [];
  if (siblingFinishKeys.includes('cosmos')) errors.push('blocked_unique_finish_collision_existing_cosmos_child');

  const masterFinishes = target.master_index_finishes ?? [];
  if (!target.master_governance_probe?.cosmos_master_verified) {
    warnings.push('master_index_governance_probe_lacks_cosmos_master_verified');
  }
  if (target.master_governance_probe?.holo_still_promoted) {
    warnings.push('master_index_governance_probe_still_promotes_holo');
  }
  if (!target.master_governance_probe) {
    if (!masterFinishes.includes('cosmos')) warnings.push('master_index_currently_lacks_cosmos_for_target');
    if (masterFinishes.includes('holo')) warnings.push('master_index_currently_still_supports_holo_for_target');
  }

  return { errors, warnings };
}

async function main() {
  const connectionString = requireDbUrl();
  if (!connectionString) {
    throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for rollback-only dry-run.');
  }

  const blockerAudit = JSON.parse(await fs.readFile(BLOCKER_AUDIT_JSON, 'utf8'));
  const sourceEvidence = JSON.parse(await fs.readFile(SOURCE_EVIDENCE_JSON, 'utf8'));
  let masterGovernanceProbe = null;
  try {
    masterGovernanceProbe = JSON.parse(await fs.readFile(MASTER_GOVERNANCE_PROBE_PRINTINGS_JSON, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const probeRowsByCard = new Map();
  for (const row of masterGovernanceProbe?.printings ?? []) {
    const key = `${normalizeText(row.set_key)}|${normalizeNumber(row.card_number)}|${normalizeText(row.card_name)}`;
    if (!probeRowsByCard.has(key)) probeRowsByCard.set(key, []);
    probeRowsByCard.get(key).push(row);
  }
  const evidenceByCard = new Map(
    (sourceEvidence.rows ?? []).map((row) => [`${normalizeText(row.set_code)}|${normalizeNumber(row.number)}|${normalizeText(row.card_name)}`, row]),
  );

  const sourceTargets = (blockerAudit.rows ?? [])
    .filter((row) => row.governance_status === 'finish_governance_required')
    .filter((row) => row.status === 'finish_label_conflict_cosmos_vs_holo')
    .filter((row) => normalizeText(row.finish_key) === 'holo')
    .map((row) => ({
      ...row,
      proposed_finish_key: 'cosmos',
      target_table: 'card_printings',
      parent_overwrite_allowed: false,
      source_evidence: evidenceByCard.get(`${normalizeText(row.set_code)}|${normalizeNumber(row.number)}|${normalizeText(row.card_name)}`) ?? null,
      master_governance_probe: (() => {
        const probeRows = probeRowsByCard.get(`${normalizeText(row.set_code)}|${normalizeNumber(row.number)}|${normalizeText(row.card_name)}`) ?? [];
        if (probeRows.length === 0) return null;
        return {
          cosmos_master_verified: probeRows.some((probeRow) => probeRow.finish_key === 'cosmos' && probeRow.status === 'master_verified'),
          holo_still_promoted: probeRows.some((probeRow) => probeRow.finish_key === 'holo' && ['master_verified', 'human_source_verified', 'api_agreed'].includes(probeRow.status)),
          rows: probeRows
            .filter((probeRow) => ['cosmos', 'holo'].includes(probeRow.finish_key))
            .map((probeRow) => ({
              finish_key: probeRow.finish_key,
              status: probeRow.status,
              sources: probeRow.sources ?? [],
            })),
        };
      })(),
    }));

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const rows = [];
  let rollbackCompleted = false;
  let cosmosActive = false;

  try {
    await client.query('begin');

    const finishKeyResult = await client.query(
      `select key, label, is_active from public.finish_keys where key = 'cosmos' limit 1`,
    );
    cosmosActive = finishKeyResult.rows.some((row) => row.key === 'cosmos' && row.is_active === true);

    for (const target of sourceTargets) {
      const before = await fetchTarget(client, target);
      const validation = validateTarget(target, before, target.source_evidence, cosmosActive);
      const row = {
        card_printing_id: target.card_printing_id,
        card_print_id: target.card_print_id,
        set_code: target.set_code,
        set_name: target.set_name,
        number: target.number,
        card_name: target.card_name,
        current_finish_key: target.finish_key,
        proposed_finish_key: target.proposed_finish_key,
        source_supported_finish_label: target.source_evidence?.source_supported_finish_label ?? null,
        source_evidence_count: target.source_evidence?.evidence?.length ?? 0,
        source_evidence_urls: (target.source_evidence?.evidence ?? []).map((entry) => entry.source_url),
        master_index_finishes_before: target.master_index_finishes ?? [],
        db_sibling_finish_keys_before: before?.sibling_finish_keys ?? [],
        validation_errors: validation.errors,
        validation_warnings: validation.warnings,
        parent_overwrite_allowed: false,
        target_table: 'card_printings',
      };

      if (validation.errors.length > 0) {
        rows.push({
          ...row,
          dry_run_status: 'blocked',
          dry_run_reason: validation.errors.join('; '),
          mutation_preview: null,
        });
        continue;
      }

      const updateResult = await client.query(
        `
          update public.card_printings target
          set finish_key = 'cosmos'
          where target.id = $1
            and target.finish_key = 'holo'
            and not exists (
              select 1
              from public.card_printings sibling
              where sibling.card_print_id = target.card_print_id
                and sibling.finish_key = 'cosmos'
            )
          returning id, card_print_id, finish_key
        `,
        [target.card_printing_id],
      );

      const after = await fetchTarget(client, target);
      const updated = updateResult.rows[0] ?? null;
      const dryRunVerified = updated?.finish_key === 'cosmos'
        && after?.finish_key === 'cosmos'
        && (after?.sibling_finish_keys ?? []).includes('cosmos')
        && !(after?.sibling_finish_keys ?? []).includes('holo');

      rows.push({
        ...row,
        dry_run_status: dryRunVerified ? 'rollback_finish_update_verified' : 'blocked',
        dry_run_reason: dryRunVerified ? null : 'rollback_update_not_verified',
        mutation_preview: dryRunVerified
          ? {
              type: 'update_card_printing_finish_key',
              card_printing_id: target.card_printing_id,
              card_print_id: target.card_print_id,
              before_finish_key: 'holo',
              after_finish_key: 'cosmos',
              parent_writes: 0,
              image_writes: 0,
              deletes: 0,
              merges: 0,
            }
          : null,
      });
    }

    await client.query('rollback');
    rollbackCompleted = true;
  } catch (error) {
    try {
      await client.query('rollback');
      rollbackCompleted = true;
    } catch (_) {}
    throw error;
  } finally {
    await client.end();
  }

  const verifiedRows = rows.filter((row) => row.dry_run_status === 'rollback_finish_update_verified');
  const blockedRows = rows.filter((row) => row.dry_run_status !== 'rollback_finish_update_verified');
  const masterIndexGovernanceRequiredRows = verifiedRows.filter((row) => row.validation_warnings.some((warning) => warning.startsWith('master_index_')));
  const gateReadyRows = verifiedRows.filter((row) => row.validation_warnings.length === 0);
  const allowedBlockedRows = blockedRows.filter((row) => row.validation_errors.length === 1 && row.validation_errors[0] === 'blocked_unique_finish_collision_existing_cosmos_child');

  const proof = {
    package_id: PACKAGE_ID,
    target_table: 'card_printings',
    parent_overwrite_allowed: false,
    rollback_completed: rollbackCompleted,
    cosmos_finish_key_active: cosmosActive,
    source_row_count: sourceTargets.length,
    rollback_finish_update_verified_rows: verifiedRows.length,
    blocked_rows: blockedRows.length,
    rows: verifiedRows.map((row) => ({
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
      before_finish_key: row.current_finish_key,
      after_finish_key: row.proposed_finish_key,
      source_evidence_urls: row.source_evidence_urls,
      mutation_preview: row.mutation_preview,
    })),
  };

  const report = {
    generated_at: new Date().toISOString(),
    audit_only: true,
    rollback_only_dry_run: true,
    db_writes_persisted: false,
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    package_id: PACKAGE_ID,
    target_table: 'card_printings',
    parent_overwrite_allowed: false,
    source_reports: {
      blocker_audit: BLOCKER_AUDIT_JSON,
      source_evidence: SOURCE_EVIDENCE_JSON,
    },
    source_rows: sourceTargets.length,
    cosmos_finish_key_active: cosmosActive,
    rollback_finish_update_verified_rows: verifiedRows.length,
    blocked_rows: blockedRows.length,
    blocked_by_reason: countBy(blockedRows.flatMap((row) => row.validation_errors), (reason) => reason),
    governance_warnings_by_reason: countBy(rows.flatMap((row) => row.validation_warnings), (reason) => reason),
    master_index_governance_required_rows: masterIndexGovernanceRequiredRows.length,
    dry_run_ready_for_real_apply: false,
    ready_for_real_apply_gate: gateReadyRows.length === 4 && allowedBlockedRows.length === 1 && masterIndexGovernanceRequiredRows.length === 0,
    dry_run_ready_for_real_apply_reason: 'This readiness report does not authorize real apply. It can only make a separate fingerprinted four-row real-apply gate eligible.',
    rollback_completed: rollbackCompleted,
    proof_hash: proofHash(proof),
    proof,
    rows,
    recommended_next_steps: [
      'Prepare a separate fingerprinted real-apply gate for the four non-colliding MEP 018-021 child finish updates.',
      'Keep Chikorita MEP 069 out of a finish-update package because a cosmos child already exists; resolve the extra holo child separately if later classified unsupported.',
      'Then run image fill against the resulting cosmos child rows, not against stale holo targets.',
    ],
  };

  await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(REPORT_MD, `# Image Truth MEP Cosmos Finish Governance Readiness V1

Generated: ${report.generated_at}

Status: rollback-only finish-governance dry run. No persisted DB writes. No image uploads. No migrations.

This report handles MEP rows where image acquisition found source evidence for \`Cosmos Holo\` but the current missing-display child target is \`holo\`. The package intentionally does not image-fill those rows because that would hide a finish-governance problem.

## Summary

| Field | Value |
| --- | --- |
| package_id | ${PACKAGE_ID} |
| target_table | ${report.target_table} |
| parent_overwrite_allowed | ${report.parent_overwrite_allowed} |
| source_rows | ${report.source_rows} |
| cosmos_finish_key_active | ${report.cosmos_finish_key_active} |
| rollback_finish_update_verified_rows | ${report.rollback_finish_update_verified_rows} |
| blocked_rows | ${report.blocked_rows} |
| master_index_governance_required_rows | ${report.master_index_governance_required_rows} |
| ready_for_real_apply_gate | ${report.ready_for_real_apply_gate} |
| rollback_completed | ${report.rollback_completed} |
| dry_run_ready_for_real_apply | ${report.dry_run_ready_for_real_apply} |
| proof_hash | ${report.proof_hash} |

Real apply is intentionally not ready yet: ${report.dry_run_ready_for_real_apply_reason}

## Rows

${markdownTable(rows, [
  { label: 'status', value: (row) => row.dry_run_status },
  { label: 'set', value: (row) => row.set_code },
  { label: 'card', value: (row) => row.card_name },
  { label: 'number', value: (row) => row.number },
  { label: 'from', value: (row) => row.current_finish_key },
  { label: 'to', value: (row) => row.proposed_finish_key },
  { label: 'sources', value: (row) => row.source_evidence_count },
  { label: 'siblings before', value: (row) => row.db_sibling_finish_keys_before.join(', ') },
  { label: 'errors', value: (row) => row.validation_errors.join('; ') || '-' },
  { label: 'warnings', value: (row) => row.validation_warnings.join('; ') || '-' },
])}

## Recommended Next Steps

${report.recommended_next_steps.map((step) => `- ${step}`).join('\n')}

## Explicit Non-Actions

- db_writes_persisted: false
- storage_uploads_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- parent image fields changed: false
`);

  console.log(JSON.stringify({
    generated: [REPORT_JSON, REPORT_MD],
    source_rows: report.source_rows,
    rollback_finish_update_verified_rows: report.rollback_finish_update_verified_rows,
    blocked_rows: report.blocked_rows,
    master_index_governance_required_rows: report.master_index_governance_required_rows,
    dry_run_ready_for_real_apply: report.dry_run_ready_for_real_apply,
    proof_hash: report.proof_hash,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
