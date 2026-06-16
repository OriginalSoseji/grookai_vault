import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich29b_provenance_payload_cleanup_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich29b_provenance_payload_cleanup_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich29b_provenance_payload_cleanup_real_apply_v1.md');

const PACKAGE_ID = 'ENRICH-29B-PROVENANCE-PAYLOAD-CLEANUP';
const EXPECTED_TARGET_ROWS = 22;
const EXPECTED_FINGERPRINT = '12f3937c4b87a1a9e69dea5cc8a77fbf3a09afea3643ecdd004c069117b01aa2';
const EXPECTED_DRY_RUN_PROOF = 'b7e61359a442a3b2587f9d0e0f50ac32b1e8e7c88eefbac04f0d6d142d95812d';
const APPROVAL_TEXT = 'Approve real ENRICH-29B-PROVENANCE-PAYLOAD-CLEANUP apply only. Fingerprint: 12f3937c4b87a1a9e69dea5cc8a77fbf3a09afea3643ecdd004c069117b01aa2. Scope: 22 card_prints external_ids.verified_master_index_v1 provenance payload cleanups; writes evidence_urls, evidence_labels, preserved_evidence_sources, and missing routing_fingerprint only where needed; dry-run proof: b7e61359a442a3b2587f9d0e0f50ac32b1e8e7c88eefbac04f0d6d142d95812d == b7e61359a442a3b2587f9d0e0f50ac32b1e8e7c88eefbac04f0d6d142d95812d. No parent identity writes. No child writes. No identity writes. No external mapping writes. No species writes. No trait writes. No deletes. No merges. No migrations. No image writes. No global apply.';

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value.endsWith('\n') ? value : `${value}\n`, 'utf8');
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function classifyPayload(payload) {
  const evidenceUrls = asArray(payload?.evidence_urls);
  const sources = [...new Set([
    ...asArray(payload?.sources),
    ...asArray(payload?.preserved_evidence_sources),
  ].map((value) => String(value ?? '').trim()).filter(Boolean))].sort();
  const labels = asArray(payload?.evidence_labels);
  const hasFingerprint = Boolean(payload?.readiness_fingerprint || payload?.routing_fingerprint);

  const blockers = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) blockers.push('payload_not_object');
  if (evidenceUrls.length === 0) blockers.push('missing_evidence_urls');
  if (sources.length === 0) blockers.push('missing_source_labels');
  if (!hasFingerprint) blockers.push('missing_readiness_or_routing_fingerprint');

  return {
    classification: blockers.length ? 'provenance_payload_needs_review' : 'provenance_payload_usable',
    blockers,
    evidence_url_count: evidenceUrls.length,
    evidence_label_count: labels.length,
    source_count: sources.length,
    has_fingerprint: hasFingerprint,
  };
}

function buildProposedPayload(currentPayload, target, sourceReportFingerprint) {
  const payload = currentPayload && typeof currentPayload === 'object' && !Array.isArray(currentPayload)
    ? { ...currentPayload }
    : {};

  payload.evidence_urls = target.recovered_evidence_urls;
  payload.evidence_labels = target.recovered_evidence_labels;
  payload.preserved_evidence_sources = target.recovered_sources;

  if (!payload.readiness_fingerprint && !payload.routing_fingerprint) {
    payload.routing_fingerprint = target.recovered_fingerprints[0]
      ?? sha256(stableJson({
        package_id: PACKAGE_ID,
        card_print_id: target.card_print_id,
        recovered_evidence_urls: target.recovered_evidence_urls,
      }));
  }

  payload.provenance_recovery = {
    package_id: PACKAGE_ID,
    source_report: 'docs/audits/card_row_enrichment_v1/enrich29a_provenance_review_evidence_recovery_v1.json',
    source_report_fingerprint: sourceReportFingerprint,
    recovered_fingerprints: target.recovered_fingerprints,
    source_artifacts: target.source_artifacts,
    recovery_scope: 'display_grade_provenance_fields_only',
  };

  return payload;
}

function validateDryRun(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('package_id_mismatch');
  if (dryRun.pass !== true) findings.push('dry_run_not_passed');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('fingerprint_mismatch');
  if (dryRun.dry_run?.proof_hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_proof_mismatch');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.summary?.target_rows !== EXPECTED_TARGET_ROWS) findings.push('target_rows_mismatch');
  if ((dryRun.targets ?? []).length !== EXPECTED_TARGET_ROWS) findings.push('target_list_count_mismatch');
  if (dryRun.recommended_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  return findings;
}

async function captureSnapshot(client, targetIds) {
  const result = await client.query(
    `select
       cp.id::text as card_print_id,
       cp.set_code,
       cp.number,
       cp.name as card_name,
       cp.variant_key,
       cp.printed_identity_modifier,
       cp.external_ids->'verified_master_index_v1' as payload,
       count(distinct cpr.id)::int as child_count,
       count(distinct cpi.id) filter (where cpi.is_active = true)::int as active_identity_count,
       count(distinct em.id) filter (where em.active = true)::int as active_external_mapping_count
     from public.card_prints cp
     left join public.card_printings cpr on cpr.card_print_id = cp.id
     left join public.card_print_identity cpi on cpi.card_print_id = cp.id
     left join public.external_mappings em on em.card_print_id = cp.id
     where cp.id = any($1::uuid[])
     group by cp.id
     order by cp.set_code, cp.number_plain, cp.number, cp.name, cp.id`,
    [targetIds],
  );

  const rows = result.rows.map((row) => ({
    ...row,
    payload_classification: classifyPayload(row.payload),
  }));

  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows.map((row) => ({
      card_print_id: row.card_print_id,
      payload: row.payload,
      child_count: row.child_count,
      active_identity_count: row.active_identity_count,
      active_external_mapping_count: row.active_external_mapping_count,
    })))),
  };
}

async function countGlobalGuards(client) {
  const result = await client.query(
    `select
       (select count(*)::int from (
          select identity_domain, identity_key_version, identity_key_hash
          from public.card_print_identity
          where is_active = true
          group by identity_domain, identity_key_version, identity_key_hash
          having count(*) > 1
        ) dup) as active_identity_duplicate_groups,
       (select count(*)::int from (
          select source, external_id
          from public.external_mappings
          where active = true
          group by source, external_id
          having count(distinct card_print_id) > 1
        ) dup) as active_external_mapping_duplicate_groups`,
  );
  return result.rows[0];
}

async function buildLiveTargets(client, dryRun) {
  const targets = dryRun.targets ?? [];
  const snapshot = await captureSnapshot(client, targets.map((row) => row.card_print_id));
  const byId = new Map(snapshot.rows.map((row) => [row.card_print_id, row]));
  const liveTargets = [];
  const findings = [];

  for (const target of targets) {
    const live = byId.get(target.card_print_id);
    if (!live) {
      findings.push(`target_missing:${target.card_print_id}`);
      continue;
    }
    if (!live.payload || typeof live.payload !== 'object' || Array.isArray(live.payload)) {
      findings.push(`target_payload_missing_or_not_object:${target.card_print_id}`);
      continue;
    }
    if (!target.recovered_evidence_urls?.length) findings.push(`target_missing_recovered_urls:${target.card_print_id}`);
    if (!target.recovered_sources?.length) findings.push(`target_missing_recovered_sources:${target.card_print_id}`);
    if (!target.recovered_fingerprints?.length) findings.push(`target_missing_recovered_fingerprints:${target.card_print_id}`);

    const proposedPayload = buildProposedPayload(live.payload, target, dryRun.source_report_fingerprint);
    liveTargets.push({
      ...target,
      current_payload_classification: live.payload_classification,
      proposed_payload: proposedPayload,
      proposed_payload_classification: classifyPayload(proposedPayload),
    });
  }

  return { snapshot, liveTargets, findings };
}

async function applyPackage(client, dryRun) {
  const targetIds = (dryRun.targets ?? []).map((row) => row.card_print_id);
  const before = await buildLiveTargets(client, dryRun);
  const beforeGlobalGuards = await countGlobalGuards(client);
  const guardFindings = [...before.findings];

  if (before.liveTargets.length !== EXPECTED_TARGET_ROWS) guardFindings.push(`live_target_rows_mismatch:${before.liveTargets.length}`);
  if (beforeGlobalGuards.active_identity_duplicate_groups !== 0) guardFindings.push(`preexisting_active_identity_duplicate_groups:${beforeGlobalGuards.active_identity_duplicate_groups}`);
  if (beforeGlobalGuards.active_external_mapping_duplicate_groups !== 0) guardFindings.push(`preexisting_external_mapping_duplicate_groups:${beforeGlobalGuards.active_external_mapping_duplicate_groups}`);
  for (const target of before.liveTargets) {
    if (target.proposed_payload_classification.classification !== 'provenance_payload_usable') {
      guardFindings.push(`proposed_payload_not_usable:${target.card_print_id}`);
    }
  }
  if (guardFindings.length) throw new Error(`pre-apply guard failed: ${guardFindings.join(', ')}`);

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const updated = await client.query(
      `with target as (
         select *
         from jsonb_to_recordset($1::jsonb) as t(
           card_print_id uuid,
           proposed_payload jsonb
         )
       )
       update public.card_prints cp
       set external_ids = jsonb_set(
         coalesce(cp.external_ids, '{}'::jsonb),
         '{verified_master_index_v1}',
         target.proposed_payload,
         true
       )
       from target
       where cp.id = target.card_print_id
         and cp.external_ids ? 'verified_master_index_v1'
       returning
         cp.id::text as card_print_id,
         cp.set_code,
         cp.number,
         cp.name as card_name,
         cp.external_ids->'verified_master_index_v1' as payload`,
      [JSON.stringify(before.liveTargets.map((row) => ({
        card_print_id: row.card_print_id,
        proposed_payload: row.proposed_payload,
      })))],
    );

    const updatedRows = updated.rows.map((row) => ({
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
      payload_classification: classifyPayload(row.payload),
    }));

    if (updatedRows.length !== EXPECTED_TARGET_ROWS) throw new Error(`updated_rows_mismatch:${updatedRows.length}`);
    if (updatedRows.some((row) => row.payload_classification.classification !== 'provenance_payload_usable')) {
      throw new Error('updated_payload_still_not_usable');
    }

    const insideGlobalGuards = await countGlobalGuards(client);
    if (insideGlobalGuards.active_identity_duplicate_groups !== beforeGlobalGuards.active_identity_duplicate_groups) {
      throw new Error('active_identity_duplicate_group_count_changed');
    }
    if (insideGlobalGuards.active_external_mapping_duplicate_groups !== beforeGlobalGuards.active_external_mapping_duplicate_groups) {
      throw new Error('external_mapping_duplicate_group_count_changed');
    }

    await client.query('commit');

    const afterSnapshot = await captureSnapshot(client, targetIds);
    const afterGlobalGuards = await countGlobalGuards(client);
    return {
      apply_status: 'committed',
      before_snapshot: before.snapshot,
      before_global_guards: beforeGlobalGuards,
      updated_rows: updatedRows,
      after_snapshot: afterSnapshot,
      after_global_guards: afterGlobalGuards,
      proof_hash_sha256: sha256(stableJson({
        package_id: PACKAGE_ID,
        dry_run_proof: EXPECTED_DRY_RUN_PROOF,
        updated_rows: updatedRows,
        after_rows: afterSnapshot.rows.map((row) => ({
          card_print_id: row.card_print_id,
          payload_classification: row.payload_classification,
        })),
        after_global_guards: afterGlobalGuards,
      })),
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function validateApply(apply) {
  const findings = [];
  if (apply.updated_rows.length !== EXPECTED_TARGET_ROWS) findings.push(`updated_rows_mismatch:${apply.updated_rows.length}`);
  if (apply.updated_rows.some((row) => row.payload_classification.classification !== 'provenance_payload_usable')) findings.push('updated_payload_not_usable');
  if (apply.after_snapshot.rows.some((row) => row.payload_classification.classification !== 'provenance_payload_usable')) findings.push('after_snapshot_payload_not_usable');
  if (apply.after_global_guards.active_identity_duplicate_groups !== apply.before_global_guards.active_identity_duplicate_groups) findings.push('active_identity_duplicate_group_count_changed');
  if (apply.after_global_guards.active_external_mapping_duplicate_groups !== apply.before_global_guards.active_external_mapping_duplicate_groups) findings.push('external_mapping_duplicate_group_count_changed');
  return findings;
}

function markdown(report) {
  return [
    '# ENRICH-29B Provenance Payload Cleanup Real Apply V1',
    '',
    `Package: \`${PACKAGE_ID}\``,
    '',
    '## Result',
    '',
    `- Pass: ${report.pass}`,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Dry-run proof: \`${EXPECTED_DRY_RUN_PROOF} == ${EXPECTED_DRY_RUN_PROOF}\``,
    `- Real apply proof: \`${report.apply.proof_hash_sha256}\``,
    `- Updated rows: ${report.apply.updated_rows.length}`,
    '',
    '## Scope',
    '',
    '- Wrote only `card_prints.external_ids->verified_master_index_v1` provenance fields.',
    '- No parent identity writes, child writes, identity writes, external mapping writes, species writes, trait writes, deletes, merges, migrations, image writes, or global apply.',
    '',
    '## Updated Rows',
    '',
    markdownTable(report.apply.updated_rows, [
      { label: 'set', value: (row) => row.set_code },
      { label: 'number', value: (row) => row.number },
      { label: 'card', value: (row) => row.card_name },
      { label: 'status', value: (row) => row.payload_classification.classification },
      { label: 'urls', value: (row) => row.payload_classification.evidence_url_count },
      { label: 'sources', value: (row) => row.payload_classification.source_count },
    ]),
    '',
    '## Stop Findings',
    '',
    report.stop_findings.length ? report.stop_findings.map((finding) => `- ${finding}`).join('\n') : '_None._',
    '',
  ].join('\n');
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');

  const dryRun = await readJson(DRY_RUN_JSON);
  const dryRunFindings = validateDryRun(dryRun);
  if (dryRunFindings.length > 0) throw new Error(`DRY_RUN_VALIDATION_FAILED:${dryRunFindings.join(',')}`);

  const client = new Client({ connectionString: dbUrl, application_name: 'card_row_enrichment_enrich29b_provenance_payload_cleanup_real_apply_v1' });
  await client.connect();
  try {
    const apply = await applyPackage(client, dryRun);
    const stopFindings = validateApply(apply);
    const report = {
      version: 'ENRICH29B_PROVENANCE_PAYLOAD_CLEANUP_REAL_APPLY_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      db_writes_performed: true,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      global_apply_performed: false,
      approved_text: APPROVAL_TEXT,
      dry_run_file: DRY_RUN_JSON,
      dry_run_fingerprint_sha256: EXPECTED_FINGERPRINT,
      dry_run_proof_hash_sha256: EXPECTED_DRY_RUN_PROOF,
      package_fingerprint_sha256: EXPECTED_FINGERPRINT,
      apply,
      stop_findings: stopFindings,
      pass: stopFindings.length === 0,
      forbidden: [
        'parent identity writes',
        'child writes',
        'identity writes',
        'external mapping writes',
        'species writes',
        'trait writes',
        'deletes',
        'merges',
        'migrations',
        'image writes',
        'global apply',
      ],
    };

    report.fingerprint_sha256 = sha256(stableJson({
      package_id: PACKAGE_ID,
      dry_run_fingerprint_sha256: EXPECTED_FINGERPRINT,
      dry_run_proof_hash_sha256: EXPECTED_DRY_RUN_PROOF,
      updated_rows: apply.updated_rows,
      proof_hash_sha256: apply.proof_hash_sha256,
    }));

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, markdown(report));

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      pass: report.pass,
      package_fingerprint_sha256: EXPECTED_FINGERPRINT,
      dry_run_proof_hash_sha256: EXPECTED_DRY_RUN_PROOF,
      real_apply_proof_hash_sha256: apply.proof_hash_sha256,
      updated_rows: apply.updated_rows.length,
      stop_findings: stopFindings,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
