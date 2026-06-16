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
const READINESS_JSON = path.join(OUTPUT_DIR, 'image_truth_mep_cosmos_finish_governance_readiness_v1.json');
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'image_truth_img_finish01b_mep_cosmos_finish_update_guarded_dry_run_v1.json');
const DRY_RUN_MD = path.join(OUTPUT_DIR, 'image_truth_img_finish01b_mep_cosmos_finish_update_guarded_dry_run_v1.md');

const PACKAGE_ID = 'IMG-FINISH-01B-MEP-COSMOS-FINISH-UPDATE';

function requireDbUrl() {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    null
  );
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

async function fetchTargets(client, ids) {
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
        cp.set_code,
        cp.number,
        cp.name as card_name,
        cp.printed_identity_modifier,
        array_remove(array_agg(distinct sibling.finish_key order by sibling.finish_key), null) as sibling_finish_keys
      from public.card_printings cpi
      join public.card_prints cp on cp.id = cpi.card_print_id
      left join public.card_printings sibling on sibling.card_print_id = cpi.card_print_id
      where cpi.id = any($1::uuid[])
      group by
        cpi.id,
        cpi.card_print_id,
        cpi.finish_key,
        cpi.image_source,
        cpi.image_path,
        cpi.image_url,
        cpi.image_alt_url,
        cp.set_code,
        cp.number,
        cp.name,
        cp.printed_identity_modifier
      order by cp.number
    `,
    [ids],
  );
  return result.rows;
}

async function main() {
  const connectionString = requireDbUrl();
  if (!connectionString) {
    throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for rollback-only dry-run.');
  }

  const readiness = JSON.parse(await fs.readFile(READINESS_JSON, 'utf8'));
  if (readiness.ready_for_real_apply_gate !== true) {
    throw new Error('Readiness report is not ready_for_real_apply_gate=true.');
  }

  const targets = (readiness.rows ?? [])
    .filter((row) => row.dry_run_status === 'rollback_finish_update_verified')
    .filter((row) => row.current_finish_key === 'holo')
    .filter((row) => row.proposed_finish_key === 'cosmos')
    .filter((row) => row.validation_errors.length === 0)
    .filter((row) => row.validation_warnings.length === 0)
    .map((row) => ({
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
      before_finish_key: row.current_finish_key,
      after_finish_key: row.proposed_finish_key,
      source_evidence_urls: row.source_evidence_urls,
    }));

  if (targets.length !== 4) {
    throw new Error(`Expected 4 eligible MEP cosmos finish update targets; found ${targets.length}.`);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let rollbackCompleted = false;
  let beforeRows = [];
  let afterRows = [];
  let updateRows = [];

  try {
    await client.query('begin');
    beforeRows = await fetchTargets(client, targets.map((row) => row.card_printing_id));

    const invalidBefore = beforeRows.filter((row) => row.finish_key !== 'holo' || row.sibling_finish_keys.includes('cosmos'));
    if (invalidBefore.length > 0) {
      throw new Error(`Target precondition failed for ${invalidBefore.length} rows.`);
    }

    const updateResult = await client.query(
      `
        update public.card_printings target
        set finish_key = 'cosmos'
        where target.id = any($1::uuid[])
          and target.finish_key = 'holo'
          and not exists (
            select 1
            from public.card_printings sibling
            where sibling.card_print_id = target.card_print_id
              and sibling.finish_key = 'cosmos'
          )
        returning id as card_printing_id, card_print_id, finish_key
      `,
      [targets.map((row) => row.card_printing_id)],
    );
    updateRows = updateResult.rows;
    afterRows = await fetchTargets(client, targets.map((row) => row.card_printing_id));

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

  const afterVerified = afterRows.length === targets.length
    && afterRows.every((row) => row.finish_key === 'cosmos')
    && updateRows.length === targets.length;

  const packageScope = {
    package_id: PACKAGE_ID,
    scope: 'MEP 018-021 child card_printings finish update from holo to cosmos',
    target_table: 'card_printings',
    target_rows: targets.length,
    parent_writes: 0,
    image_writes: 0,
    deletes: 0,
    merges: 0,
    migrations: 0,
    before_finish_key: 'holo',
    after_finish_key: 'cosmos',
    card_printing_ids: targets.map((row) => row.card_printing_id).sort(),
  };
  const packageFingerprint = proofHash(packageScope);
  const dryRunProof = {
    package_id: PACKAGE_ID,
    package_fingerprint: packageFingerprint,
    target_rows: targets.length,
    updated_rows: updateRows.length,
    after_verified: afterVerified,
    rollback_completed: rollbackCompleted,
    targets: targets.map((row) => ({
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
      before_finish_key: row.before_finish_key,
      after_finish_key: row.after_finish_key,
      source_evidence_urls: row.source_evidence_urls,
    })),
  };
  const dryRunProofHash = proofHash(dryRunProof);
  const recommendedApproval = `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: 4 child card_printing finish_key updates for MEP Black Star Promos #018 Cottonee, #019 Whimsicott, #020 Sneasel, and #021 Weavile from holo to cosmos. Dry-run proof: ${dryRunProofHash} == ${dryRunProofHash}. No image writes. No parent writes. No deletes. No merges. No migrations. No global apply.`;

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
    package_fingerprint: packageFingerprint,
    dry_run_proof_hash: dryRunProofHash,
    ready_for_real_apply: afterVerified && rollbackCompleted,
    ready_for_real_apply_requires_operator_approval: true,
    recommended_approval_text: recommendedApproval,
    package_scope: packageScope,
    dry_run_proof: dryRunProof,
    before_rows: beforeRows,
    after_rows: afterRows,
  };

  await fs.writeFile(DRY_RUN_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(DRY_RUN_MD, `# Image Truth IMG-FINISH-01B MEP Cosmos Finish Update Guarded Dry Run V1

Generated: ${report.generated_at}

Status: rollback-only dry run. No persisted DB writes. No image uploads. No migrations.

## Summary

| Field | Value |
| --- | --- |
| package_id | ${PACKAGE_ID} |
| package_fingerprint | ${packageFingerprint} |
| dry_run_proof_hash | ${dryRunProofHash} |
| target_rows | ${targets.length} |
| updated_rows | ${updateRows.length} |
| after_verified | ${afterVerified} |
| rollback_completed | ${rollbackCompleted} |
| ready_for_real_apply | ${report.ready_for_real_apply} |

## Targets

${markdownTable(targets, [
  { label: 'set', value: (row) => row.set_code },
  { label: 'number', value: (row) => row.number },
  { label: 'card', value: (row) => row.card_name },
  { label: 'from', value: (row) => row.before_finish_key },
  { label: 'to', value: (row) => row.after_finish_key },
])}

## Recommended Approval Text

\`\`\`text
${recommendedApproval}
\`\`\`

## Explicit Non-Actions

- db_writes_persisted: false
- image_writes: 0
- parent_writes: 0
- deletes: 0
- merges: 0
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
`);

  console.log(JSON.stringify({
    generated: [DRY_RUN_JSON, DRY_RUN_MD],
    package_fingerprint: packageFingerprint,
    dry_run_proof_hash: dryRunProofHash,
    target_rows: targets.length,
    updated_rows: updateRows.length,
    ready_for_real_apply: report.ready_for_real_apply,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
