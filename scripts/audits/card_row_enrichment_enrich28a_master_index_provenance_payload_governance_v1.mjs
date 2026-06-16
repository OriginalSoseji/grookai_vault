import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich28a_master_index_provenance_payload_governance_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich28a_master_index_provenance_payload_governance_v1.md');

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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
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

function classifyPayload(row) {
  const payload = row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload) ? row.payload : {};
  const evidenceUrls = asArray(payload.evidence_urls);
  const sources = [...new Set([
    ...asArray(payload.sources),
    ...asArray(payload.preserved_evidence_sources),
  ].map((value) => String(value ?? '').trim()).filter(Boolean))].sort();
  const finishClaims = asArray(payload.finish_claims);
  const labels = asArray(payload.evidence_labels);
  const hasFingerprint = Boolean(payload.readiness_fingerprint || payload.routing_fingerprint);

  let classification = 'provenance_payload_usable';
  const blockers = [];
  if (row.value_type !== 'object') blockers.push('payload_not_object');
  if (evidenceUrls.length === 0) blockers.push('missing_evidence_urls');
  if (sources.length === 0) blockers.push('missing_source_labels');
  if (!hasFingerprint) blockers.push('missing_readiness_or_routing_fingerprint');
  if (blockers.length > 0) classification = 'provenance_payload_needs_review';

  return {
    classification,
    blockers,
    evidence_url_count: evidenceUrls.length,
    sources,
    source_count: sources.length,
    evidence_label_count: labels.length,
    finish_claim_count: finishClaims.length,
    stamp_confidence: payload.stamp_confidence ?? null,
    routing_status: payload.routing_status ?? null,
    has_readiness_fingerprint: Boolean(payload.readiness_fingerprint),
    has_routing_fingerprint: Boolean(payload.routing_fingerprint),
    routing_fingerprint: payload.routing_fingerprint ?? null,
    readiness_fingerprint: payload.readiness_fingerprint ?? null,
  };
}

async function loadRows(client) {
  const result = await client.query(`
    select
      cp.id::text as card_print_id,
      cp.gv_id,
      cp.set_code,
      s.name as set_name,
      cp.number,
      cp.number_plain,
      cp.name as card_name,
      cp.printed_identity_modifier,
      cp.variant_key,
      jsonb_typeof(cp.external_ids->'verified_master_index_v1') as value_type,
      cp.external_ids->'verified_master_index_v1' as payload,
      count(distinct cpr.id)::int as child_printing_count,
      count(distinct cpi.id) filter (where cpi.is_active = true)::int as active_identity_count,
      count(distinct em.id) filter (where em.active = true)::int as active_external_mapping_count
    from public.card_prints cp
    join public.sets s on s.id = cp.set_id
    left join public.card_printings cpr on cpr.card_print_id = cp.id
    left join public.card_print_identity cpi on cpi.card_print_id = cp.id
    left join public.external_mappings em on em.card_print_id = cp.id
    where s.identity_domain_default like 'pokemon_eng%'
      and cp.external_ids ? 'verified_master_index_v1'
    group by cp.id, s.name
    order by cp.set_code nulls last, cp.number_plain nulls last, cp.number nulls last, cp.name nulls last, cp.id
  `);
  return result.rows;
}

function sampleRow(row) {
  return {
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    set_code: row.set_code,
    set_name: row.set_name,
    number: row.number,
    card_name: row.card_name,
    printed_identity_modifier: row.printed_identity_modifier,
    variant_key: row.variant_key,
    classification: row.classification,
    blockers: row.blockers,
    source_count: row.source_count,
    sources: row.sources,
    evidence_url_count: row.evidence_url_count,
    evidence_label_count: row.evidence_label_count,
    finish_claim_count: row.finish_claim_count,
    routing_status: row.routing_status,
    stamp_confidence: row.stamp_confidence,
    child_printing_count: Number(row.child_printing_count ?? 0),
    active_identity_count: Number(row.active_identity_count ?? 0),
    active_external_mapping_count: Number(row.active_external_mapping_count ?? 0),
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only audit.');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query('set default_transaction_read_only = on');
    const rows = await loadRows(client);
    const classifiedRows = rows.map((row) => ({ ...row, ...classifyPayload(row) }));
    const reviewRows = classifiedRows.filter((row) => row.classification !== 'provenance_payload_usable');
    const usableRows = classifiedRows.filter((row) => row.classification === 'provenance_payload_usable');

    const sourceMentions = classifiedRows.flatMap((row) => row.sources.map((source) => ({
      source,
      set_code: row.set_code,
      classification: row.classification,
    })));

    const report = {
      version: 'ENRICH28A_MASTER_INDEX_PROVENANCE_PAYLOAD_GOVERNANCE_V1',
      generated_at: new Date().toISOString(),
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      scope: {
        target: 'card_prints.external_ids.verified_master_index_v1 payloads on English physical rows',
        purpose: 'Govern Master Index evidence payloads as provenance, not direct external_mappings.',
        forbidden: ['DB writes', 'external_mappings inserts', 'external_mappings transfers', 'parent writes', 'child writes', 'identity writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
      },
      totals: {
        payload_rows: classifiedRows.length,
        usable_provenance_payload_rows: usableRows.length,
        review_payload_rows: reviewRows.length,
        rows_missing_gv_id: classifiedRows.filter((row) => !row.gv_id).length,
        rows_without_active_external_mapping: classifiedRows.filter((row) => Number(row.active_external_mapping_count ?? 0) === 0).length,
        rows_with_child_printings: classifiedRows.filter((row) => Number(row.child_printing_count ?? 0) > 0).length,
        rows_with_active_identity: classifiedRows.filter((row) => Number(row.active_identity_count ?? 0) > 0).length,
      },
      by_classification: countBy(classifiedRows, (row) => row.classification),
      by_set_top_50: Object.fromEntries(Object.entries(countBy(classifiedRows, (row) => row.set_code ?? 'missing_set_code')).slice(0, 50)),
      by_source: countBy(sourceMentions, (row) => row.source),
      by_routing_status: countBy(classifiedRows, (row) => row.routing_status ?? 'none'),
      by_stamp_confidence: countBy(classifiedRows, (row) => row.stamp_confidence ?? 'none'),
      review_samples: reviewRows.slice(0, 100).map(sampleRow),
      usable_samples: usableRows.slice(0, 100).map(sampleRow),
      governance_decision: {
        decision: 'Do not convert verified_master_index_v1 payloads into external_mappings.',
        reason: 'These payloads are multi-source evidence bundles and routing/proof metadata. They are not unique external catalog identifiers and cannot satisfy source/external_id uniqueness semantics.',
        allowed_use: [
          'display provenance in internal/admin review surfaces',
          'support audit traceability for Master Index promoted rows',
          'support future evidence detail pages if surfaced as provenance, not source ownership',
        ],
        disallowed_use: [
          'external_mappings inserts',
          'external_mappings ownership transfer',
          'identity resolution by payload presence alone',
          'finish truth promotion without Master Index guardrails',
        ],
        future_schema_recommendation: 'If this evidence needs first-class querying, create a separate append-only provenance/evidence table rather than overloading external_mappings.',
      },
      next_recommended_package: {
        package_id: 'ENRICH-28B-MASTER-INDEX-PROVENANCE-SURFACE-PLAN',
        status: reviewRows.length === 0 ? 'ready_for_product_or_schema_design_only' : 'needs_payload_shape_review_before_schema_design',
        write_ready_rows: 0,
        candidate_payload_rows: classifiedRows.length,
        writes_if_later_approved: ['none in current phase'],
      },
    };

    report.fingerprint_sha256 = sha256(stableJson({
      version: report.version,
      totals: report.totals,
      by_classification: report.by_classification,
      by_source: report.by_source,
      governance_decision: report.governance_decision,
    }));

    await writeJson(OUTPUT_JSON, report);

    const md = [
      '# ENRICH-28A Master Index Provenance Payload Governance V1',
      '',
      '## Result',
      '',
      `- Audit only: ${report.audit_only}`,
      `- DB writes performed: ${report.db_writes_performed}`,
      `- Migrations created: ${report.migrations_created}`,
      `- Fingerprint: \`${report.fingerprint_sha256}\``,
      '',
      '## Decision',
      '',
      report.governance_decision.decision,
      '',
      report.governance_decision.reason,
      '',
      '## Totals',
      '',
      markdownTable(Object.entries(report.totals).map(([metric, rows]) => ({ metric, rows })), [
        { label: 'metric', value: (row) => row.metric },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Classification',
      '',
      markdownTable(Object.entries(report.by_classification).map(([classification, rows]) => ({ classification, rows })), [
        { label: 'classification', value: (row) => row.classification },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Evidence Sources',
      '',
      markdownTable(Object.entries(report.by_source).slice(0, 40).map(([source, rows]) => ({ source, rows })), [
        { label: 'source', value: (row) => row.source },
        { label: 'mentions', value: (row) => row.rows },
      ]),
      '',
      '## Allowed Use',
      '',
      report.governance_decision.allowed_use.map((item) => `- ${item}`).join('\n'),
      '',
      '## Disallowed Use',
      '',
      report.governance_decision.disallowed_use.map((item) => `- ${item}`).join('\n'),
      '',
      '## Next',
      '',
      `- ${report.governance_decision.future_schema_recommendation}`,
      `- Next package: \`${report.next_recommended_package.package_id}\` (${report.next_recommended_package.status})`,
      '',
    ].join('\n');

    await writeText(OUTPUT_MD, md);

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      fingerprint_sha256: report.fingerprint_sha256,
      totals: report.totals,
      by_classification: report.by_classification,
      next_recommended_package: report.next_recommended_package,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
