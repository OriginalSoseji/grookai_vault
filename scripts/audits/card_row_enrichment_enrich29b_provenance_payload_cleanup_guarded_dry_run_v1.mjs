import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const RECOVERY_JSON = path.join(OUTPUT_DIR, 'enrich29a_provenance_review_evidence_recovery_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich29b_provenance_payload_cleanup_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich29b_provenance_payload_cleanup_guarded_dry_run_v1.md');

const PACKAGE_ID = 'ENRICH-29B-PROVENANCE-PAYLOAD-CLEANUP';
const EXPECTED_TARGET_ROWS = 22;

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

function buildTargets(recovery) {
  return asArray(recovery.rows)
    .filter((row) => row.recovery_status === 'fully_recoverable_from_existing_artifacts')
    .map((row) => ({
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      recovered_sources: row.recovered_sources,
      recovered_evidence_urls: row.recovered_evidence_urls,
      recovered_evidence_labels: row.recovered_evidence_labels,
      recovered_fingerprints: row.recovered_fingerprints,
      source_artifacts: row.source_artifacts,
    }))
    .sort((a, b) => `${a.set_code}|${a.number}|${a.card_name}|${a.variant_key}`.localeCompare(`${b.set_code}|${b.number}|${b.card_name}|${b.variant_key}`));
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

function buildProposedPayload(currentPayload, target, recoveryFingerprint) {
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
    source_report: RECOVERY_JSON,
    source_report_fingerprint: recoveryFingerprint,
    recovered_fingerprints: target.recovered_fingerprints,
    source_artifacts: target.source_artifacts,
    recovery_scope: 'display_grade_provenance_fields_only',
  };

  return payload;
}

async function buildLiveTargets(client, targets, recoveryFingerprint) {
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
    if (target.recovered_evidence_urls.length === 0) findings.push(`target_missing_recovered_urls:${target.card_print_id}`);
    if (target.recovered_sources.length === 0) findings.push(`target_missing_recovered_sources:${target.card_print_id}`);
    if (target.recovered_fingerprints.length === 0) findings.push(`target_missing_recovered_fingerprints:${target.card_print_id}`);

    liveTargets.push({
      ...target,
      current_payload_classification: live.payload_classification,
      proposed_payload: buildProposedPayload(live.payload, target, recoveryFingerprint),
    });
  }

  return { snapshot, liveTargets, findings };
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

async function runRollbackDryRun(client, targets, recoveryFingerprint) {
  const preflight = await buildLiveTargets(client, targets, recoveryFingerprint);
  const beforeSnapshot = preflight.snapshot;
  const beforeGlobalGuards = await countGlobalGuards(client);
  const guardFindings = [...preflight.findings];

  if (targets.length !== EXPECTED_TARGET_ROWS) guardFindings.push(`target_rows_mismatch:${targets.length}`);
  if (preflight.liveTargets.length !== EXPECTED_TARGET_ROWS) guardFindings.push(`live_target_rows_mismatch:${preflight.liveTargets.length}`);
  if (beforeGlobalGuards.active_identity_duplicate_groups !== 0) guardFindings.push(`preexisting_active_identity_duplicate_groups:${beforeGlobalGuards.active_identity_duplicate_groups}`);
  if (beforeGlobalGuards.active_external_mapping_duplicate_groups !== 0) guardFindings.push(`preexisting_external_mapping_duplicate_groups:${beforeGlobalGuards.active_external_mapping_duplicate_groups}`);

  if (guardFindings.length > 0) {
    return {
      pass: false,
      guard_findings: guardFindings,
      before_snapshot: beforeSnapshot,
      before_global_guards: beforeGlobalGuards,
      updated_rows: [],
      after_inside_snapshot: null,
      after_rollback_snapshot: beforeSnapshot,
      rollback_verified: false,
      proof_hash_sha256: null,
    };
  }

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
      [JSON.stringify(preflight.liveTargets.map((row) => ({
        card_print_id: row.card_print_id,
        proposed_payload: row.proposed_payload,
      })))],
    );

    const afterInsideSnapshot = await captureSnapshot(client, targets.map((row) => row.card_print_id));
    const afterInsideGuards = await countGlobalGuards(client);

    await client.query('rollback');

    const afterRollbackSnapshot = await captureSnapshot(client, targets.map((row) => row.card_print_id));
    const afterRollbackGuards = await countGlobalGuards(client);
    const updatedRows = updated.rows.map((row) => ({
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
      payload_classification: classifyPayload(row.payload),
    }));

    const stopFindings = [];
    if (updatedRows.length !== EXPECTED_TARGET_ROWS) stopFindings.push(`updated_rows_mismatch:${updatedRows.length}`);
    if (updatedRows.some((row) => row.payload_classification.classification !== 'provenance_payload_usable')) stopFindings.push('updated_payload_still_not_usable');
    if (afterInsideGuards.active_identity_duplicate_groups !== beforeGlobalGuards.active_identity_duplicate_groups) stopFindings.push('active_identity_duplicate_group_count_changed');
    if (afterInsideGuards.active_external_mapping_duplicate_groups !== beforeGlobalGuards.active_external_mapping_duplicate_groups) stopFindings.push('external_mapping_duplicate_group_count_changed');
    if (beforeSnapshot.hash_sha256 !== afterRollbackSnapshot.hash_sha256) stopFindings.push('rollback_snapshot_hash_mismatch');

    return {
      pass: stopFindings.length === 0,
      guard_findings: [],
      stop_findings: stopFindings,
      before_snapshot: beforeSnapshot,
      before_global_guards: beforeGlobalGuards,
      updated_rows: updatedRows,
      after_inside_snapshot: afterInsideSnapshot,
      after_inside_global_guards: afterInsideGuards,
      after_rollback_snapshot: afterRollbackSnapshot,
      after_rollback_global_guards: afterRollbackGuards,
      rollback_verified: beforeSnapshot.hash_sha256 === afterRollbackSnapshot.hash_sha256,
      proof_hash_sha256: sha256(stableJson({
        package_id: PACKAGE_ID,
        target_rows: targets.map((row) => row.card_print_id).sort(),
        updated_rows: updatedRows,
        before_hash: beforeSnapshot.hash_sha256,
        after_rollback_hash: afterRollbackSnapshot.hash_sha256,
      })),
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function markdown(report) {
  return [
    '# ENRICH-29B Provenance Payload Cleanup Guarded Dry-Run V1',
    '',
    `Package: \`${PACKAGE_ID}\``,
    '',
    '## Result',
    '',
    `- Pass: ${report.pass}`,
    `- DB writes performed: ${report.db_writes_performed}`,
    `- Transaction writes rolled back: ${report.transaction_writes_rolled_back}`,
    `- Migrations created: ${report.migrations_created}`,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Dry-run proof: \`${report.dry_run.proof_hash_sha256}\``,
    '',
    '## Scope',
    '',
    `- Target rows: ${report.summary.target_rows}`,
    '- Writes simulated: `card_prints.external_ids->verified_master_index_v1` provenance fields only',
    '- No parent identity fields, child printings, identities, mappings, species, traits, deletes, merges, images, migrations, or global apply.',
    '',
    '## Updated Rows',
    '',
    markdownTable(report.dry_run.updated_rows, [
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
    '## Approval Text If Accepted',
    '',
    report.recommended_approval_text ? `\`\`\`text\n${report.recommended_approval_text}\n\`\`\`` : '_Not available because dry-run failed._',
    '',
  ].join('\n');
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for guarded dry-run.');

  const recovery = await readJson(RECOVERY_JSON);
  const targets = buildTargets(recovery);
  const recoveryFingerprint = recovery.fingerprint_sha256;

  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    source_report: RECOVERY_JSON,
    source_report_fingerprint: recoveryFingerprint,
    target_rows: targets.map((row) => ({
      card_print_id: row.card_print_id,
      recovered_sources: row.recovered_sources,
      recovered_evidence_urls: row.recovered_evidence_urls,
      recovered_evidence_labels: row.recovered_evidence_labels,
      recovered_fingerprints: row.recovered_fingerprints,
    })),
    write_shape: 'card_prints.external_ids.verified_master_index_v1 provenance payload fields only',
  }));

  const client = new Client({ connectionString: dbUrl, application_name: 'card_row_enrichment_enrich29b_provenance_payload_cleanup_guarded_dry_run_v1' });
  await client.connect();
  try {
    const dryRun = await runRollbackDryRun(client, targets, recoveryFingerprint);
    const stopFindings = [
      ...(dryRun.guard_findings ?? []),
      ...(dryRun.stop_findings ?? []),
    ];

    const report = {
      version: 'ENRICH29B_PROVENANCE_PAYLOAD_CLEANUP_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      mode: 'guarded_dry_run_rollback_only',
      db_writes_performed: false,
      transaction_writes_rolled_back: true,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      global_apply_performed: false,
      source_report: RECOVERY_JSON,
      source_report_fingerprint: recoveryFingerprint,
      package_fingerprint_sha256: packageFingerprint,
      pass: dryRun.pass && stopFindings.length === 0,
      summary: {
        target_rows: targets.length,
        target_sets: [...new Set(targets.map((row) => row.set_code))].sort().length,
        recovered_url_rows: targets.filter((row) => row.recovered_evidence_urls.length > 0).length,
        recovered_source_rows: targets.filter((row) => row.recovered_sources.length > 0).length,
        recovered_fingerprint_rows: targets.filter((row) => row.recovered_fingerprints.length > 0).length,
      },
      targets,
      dry_run: dryRun,
      stop_findings: stopFindings,
      forbidden: [
        'card_prints.set_code writes',
        'card_prints.number writes',
        'card_prints.gv_id writes',
        'card_printings writes',
        'card_print_identity writes',
        'external_mappings writes',
        'card_print_species writes',
        'card_print_traits writes',
        'deletes',
        'merges',
        'migrations',
        'image writes',
        'global apply',
      ],
    };

    report.recommended_approval_text = report.pass
      ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} card_prints external_ids.verified_master_index_v1 provenance payload cleanups; writes evidence_urls, evidence_labels, preserved_evidence_sources, and missing routing_fingerprint only where needed; dry-run proof: ${dryRun.proof_hash_sha256} == ${dryRun.proof_hash_sha256}. No parent identity writes. No child writes. No identity writes. No external mapping writes. No species writes. No trait writes. No deletes. No merges. No migrations. No image writes. No global apply.`
      : null;

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, markdown(report));

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      pass: report.pass,
      package_fingerprint_sha256: packageFingerprint,
      dry_run_proof_hash_sha256: dryRun.proof_hash_sha256,
      summary: report.summary,
      stop_findings: stopFindings,
      recommended_approval_text: report.recommended_approval_text,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
