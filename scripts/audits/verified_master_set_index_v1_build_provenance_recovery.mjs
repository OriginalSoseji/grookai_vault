import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
} from './verified_master_set_index_v1/shared.mjs';

const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const pg = require('pg');

const ROOT = process.cwd();
for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false, quiet: true });
}

const OUTPUT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const GENERATED_FILES = [
  'english_master_index_provenance_recovery_v1.json',
  'english_master_index_provenance_recovery_v1.md',
  'english_master_index_missing_set_code_provenance_queue_v1.json',
  'english_master_index_missing_set_code_provenance_queue_v1.md',
];

function normalizeKey(value) {
  return String(value ?? '').trim() || 'unknown';
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function addCount(target, key, count = 1) {
  target[normalizeKey(key)] = (target[normalizeKey(key)] ?? 0) + Number(count ?? 0);
}

function topEntries(object, limit = 30) {
  return Object.entries(object ?? {})
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit);
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))]
    .sort((left, right) => left.localeCompare(right));
}

async function readJson(fileName) {
  return JSON.parse(await fs.readFile(path.join(OUTPUT_DIR, fileName), 'utf8'));
}

async function writeJson(fileName, data) {
  await fs.writeFile(path.join(OUTPUT_DIR, fileName), `${JSON.stringify(data, null, 2)}\n`);
}

async function writeMarkdown(fileName, text) {
  await fs.writeFile(path.join(OUTPUT_DIR, fileName), text);
}

function sslForConnectionString(connectionString) {
  if (/sslmode=(disable|allow|prefer)/i.test(connectionString)) return false;
  if (/localhost|127\.0\.0\.1|host\.docker\.internal/i.test(connectionString)) return false;
  return { rejectUnauthorized: false };
}

function assertReadOnlySql(sql) {
  const normalized = sql.trim().toLowerCase();
  if (!normalized.startsWith('select') && !normalized.startsWith('with')) {
    throw new Error(`READ_ONLY_GUARD: SQL must be SELECT/CTE only: ${sql.slice(0, 80)}`);
  }
  if (/\b(insert|update|delete|merge|alter|drop|truncate|create|grant|revoke|copy)\b/i.test(sql)) {
    throw new Error('READ_ONLY_GUARD: write-capable SQL keyword detected.');
  }
}

async function queryReadOnly(client, sql, params = []) {
  assertReadOnlySql(sql);
  const result = await client.query(sql, params);
  return result.rows;
}

function chunks(values, size) {
  const output = [];
  for (let index = 0; index < values.length; index += size) {
    output.push(values.slice(index, index + size));
  }
  return output;
}

async function withDbClient(callback) {
  const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) {
    return {
      executed: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL is not configured.',
      cardPrintRows: [],
      externalMappingRows: [],
    };
  }

  const client = new pg.Client({
    connectionString,
    ssl: sslForConnectionString(connectionString),
  });

  await client.connect();
  try {
    const result = await callback(client);
    return { executed: true, reason: null, ...result };
  } finally {
    await client.end();
  }
}

async function loadDbProvenance(cardPrintIds) {
  if (!cardPrintIds.length) {
    return {
      executed: false,
      reason: 'No missing-set card_print_id values were present in the audit.',
      cardPrintRows: [],
      externalMappingRows: [],
    };
  }

  return withDbClient(async (client) => {
    const cardPrintRows = [];
    const externalMappingRows = [];

    for (const idChunk of chunks(cardPrintIds, 500)) {
      cardPrintRows.push(...await queryReadOnly(
        client,
        `select
           cp.id::text as card_print_id,
           cp.set_code,
           cp.number,
           cp.number_plain,
           cp.name as card_name,
           cp.gv_id,
           cp.tcgplayer_id,
           cp.external_ids,
           cp.image_source,
           cp.image_url,
           cp.image_alt_url,
           cp.representative_image_url,
           cp.print_identity_key,
           cp.identity_domain,
           cp.printed_identity_modifier,
           cp.set_identity_model,
           cp.ai_metadata,
           cp.data_quality_flags,
           cp.created_at,
           cp.last_synced_at,
           p.id::text as card_printing_id,
           p.finish_key,
           p.provenance_source,
           p.provenance_ref,
           p.created_by,
           p.printing_gv_id,
           p.image_source as printing_image_source,
           p.image_url as printing_image_url,
           p.image_alt_url as printing_image_alt_url
         from public.card_prints cp
         left join public.card_printings p
           on p.card_print_id = cp.id
         where cp.id = any($1::uuid[])`,
        [idChunk],
      ));

      externalMappingRows.push(...await queryReadOnly(
        client,
        `select
           card_print_id::text as card_print_id,
           source,
           external_id,
           meta,
           synced_at,
           active
         from public.external_mappings
         where card_print_id = any($1::uuid[])`,
        [idChunk],
      ));
    }

    return { cardPrintRows, externalMappingRows };
  });
}

function hasObjectContent(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).length > 0;
}

function extractMappingHints(mappingRows) {
  return mappingRows.map((row) => ({
    source: row.source ?? null,
    external_id: row.external_id ?? null,
    external_id_pattern: externalIdPattern(row),
    active: row.active ?? null,
    meta_keys: hasObjectContent(row.meta) ? Object.keys(row.meta).sort() : [],
    synced_at: row.synced_at ?? null,
  }));
}

function externalIdPattern(row) {
  const source = normalizeText(row?.source);
  const externalId = String(row?.external_id ?? '').trim();
  if (source === 'tcgdex' && /^A\d+-\d+/i.test(externalId)) return 'possible_pocket_a_series';
  if (source === 'tcgdex' && /^P-A-\d+/i.test(externalId)) return 'possible_pocket_promo_a';
  if (/^[a-z]+\d+[a-z]*-\d+/i.test(externalId)) return 'physical_tcg_set_dash_number';
  if (/^\d+$/.test(externalId)) return 'numeric_marketplace_id';
  if (externalId) return 'other_external_id';
  return 'none';
}

function classifyRecovery({ cardPrintRows, mappingRows }) {
  const activeMappings = mappingRows.filter((row) => row.active !== false && row.source && row.external_id);
  const mappingPatterns = uniqueSorted(activeMappings.map((row) => externalIdPattern(row)));
  const anyCardPrintRow = cardPrintRows[0] ?? {};
  const provenanceRows = cardPrintRows.filter((row) => row.provenance_source || row.provenance_ref || row.created_by || row.printing_gv_id);
  const imageRows = cardPrintRows.filter((row) => row.image_source || row.image_url || row.image_alt_url || row.representative_image_url || row.printing_image_source || row.printing_image_url || row.printing_image_alt_url);

  if (
    activeMappings.length
    && mappingPatterns.length
    && mappingPatterns.every((pattern) => pattern === 'possible_pocket_a_series' || pattern === 'possible_pocket_promo_a')
  ) {
    return {
      classification: 'possible_pocket_provenance_lead',
      recommended_next_action: 'Treat this as a likely Pocket/digital provenance lead and keep it out of the English physical TCG master index unless scope is explicitly expanded.',
    };
  }
  if (activeMappings.length) {
    return {
      classification: 'external_mapping_recoverable',
      recommended_next_action: 'Use active external mapping IDs as source-acquisition leads, then confirm exact set/card identity against external sources before any alias proposal.',
    };
  }
  if (anyCardPrintRow.tcgplayer_id) {
    return {
      classification: 'tcgplayer_id_recoverable',
      recommended_next_action: 'Resolve the TCGplayer ID to a source URL and confirm the exact English set/card identity with a second source.',
    };
  }
  if (hasObjectContent(anyCardPrintRow.external_ids)) {
    return {
      classification: 'external_ids_recoverable',
      recommended_next_action: 'Resolve stored external_ids to source URLs and confirm exact set/card identity with a second source.',
    };
  }
  if (provenanceRows.length) {
    return {
      classification: 'provenance_field_recoverable',
      recommended_next_action: 'Inspect provenance_source/provenance_ref as recovery leads, then convert only source-backed findings into alias fixture candidates.',
    };
  }
  if (imageRows.length) {
    return {
      classification: 'image_source_hint_only',
      recommended_next_action: 'Treat image source fields as weak leads only; image URLs are not set identity authority without source-backed card evidence.',
    };
  }
  if (hasObjectContent(anyCardPrintRow.ai_metadata) || hasObjectContent(anyCardPrintRow.data_quality_flags)) {
    return {
      classification: 'metadata_hint_only',
      recommended_next_action: 'Review metadata fields as weak leads only; do not infer set identity without external source confirmation.',
    };
  }
  return {
    classification: 'no_machine_provenance',
    recommended_next_action: 'Manual source acquisition is required because current machine-readable provenance does not identify a source set.',
  };
}

function finishProfile(rows) {
  return uniqueSorted(rows.map((row) => row.finish_key)).join('|') || 'unknown';
}

function makeQueue({ missingRows, dbResult }) {
  const auditByCardPrintId = new Map();
  for (const row of missingRows) {
    const cardPrintId = row.grookai_card_print_id;
    if (!cardPrintId) continue;
    if (!auditByCardPrintId.has(cardPrintId)) auditByCardPrintId.set(cardPrintId, []);
    auditByCardPrintId.get(cardPrintId).push(row);
  }

  const dbByCardPrintId = new Map();
  for (const row of dbResult.cardPrintRows ?? []) {
    if (!dbByCardPrintId.has(row.card_print_id)) dbByCardPrintId.set(row.card_print_id, []);
    dbByCardPrintId.get(row.card_print_id).push(row);
  }

  const mappingsByCardPrintId = new Map();
  for (const row of dbResult.externalMappingRows ?? []) {
    if (!mappingsByCardPrintId.has(row.card_print_id)) mappingsByCardPrintId.set(row.card_print_id, []);
    mappingsByCardPrintId.get(row.card_print_id).push(row);
  }

  const classificationRank = {
    external_mapping_recoverable: 1,
    tcgplayer_id_recoverable: 2,
    external_ids_recoverable: 3,
    possible_pocket_provenance_lead: 4,
    provenance_field_recoverable: 5,
    image_source_hint_only: 6,
    metadata_hint_only: 7,
    no_machine_provenance: 8,
  };

  return [...auditByCardPrintId.entries()].map(([cardPrintId, auditRows]) => {
    const dbRows = dbByCardPrintId.get(cardPrintId) ?? [];
    const mappingRows = mappingsByCardPrintId.get(cardPrintId) ?? [];
    const recovery = dbResult.executed
      ? classifyRecovery({ cardPrintRows: dbRows, mappingRows })
      : {
        classification: 'db_enrichment_not_executed',
        recommended_next_action: 'Run with database read credentials to inspect external mappings and stored provenance fields.',
      };
    const firstDbRow = dbRows[0] ?? {};
    const firstAuditRow = auditRows[0] ?? {};
    const evidenceFields = [];
    if (mappingRows.length) evidenceFields.push('external_mappings');
    if (firstDbRow.tcgplayer_id) evidenceFields.push('tcgplayer_id');
    if (hasObjectContent(firstDbRow.external_ids)) evidenceFields.push('external_ids');
    if (dbRows.some((row) => row.provenance_source || row.provenance_ref || row.created_by || row.printing_gv_id)) evidenceFields.push('printing_provenance');
    if (dbRows.some((row) => row.image_source || row.image_url || row.representative_image_url || row.printing_image_source || row.printing_image_url)) evidenceFields.push('image_fields');
    if (hasObjectContent(firstDbRow.ai_metadata)) evidenceFields.push('ai_metadata');
    if (hasObjectContent(firstDbRow.data_quality_flags)) evidenceFields.push('data_quality_flags');
    const externalMappingHints = extractMappingHints(mappingRows);

    return {
      card_print_id: cardPrintId,
      card_name: firstDbRow.card_name ?? firstAuditRow.grookai_card_name ?? null,
      number: firstDbRow.number_plain ?? firstDbRow.number ?? firstAuditRow.card_number ?? null,
      current_set_code: firstDbRow.set_code ?? firstAuditRow.set_code ?? null,
      finish_profile: finishProfile(auditRows),
      printing_count: auditRows.length,
      recovery_classification: recovery.classification,
      evidence_fields_present: uniqueSorted(evidenceFields),
      external_mappings: externalMappingHints,
      external_mapping_sources: uniqueSorted(externalMappingHints.map((row) => row.source)),
      external_id_patterns: uniqueSorted(externalMappingHints.map((row) => row.external_id_pattern)),
      tcgplayer_id_present: Boolean(firstDbRow.tcgplayer_id),
      external_ids_keys: hasObjectContent(firstDbRow.external_ids) ? Object.keys(firstDbRow.external_ids).sort() : [],
      provenance_sources: uniqueSorted(dbRows.map((row) => row.provenance_source)),
      provenance_refs_present: dbRows.some((row) => row.provenance_ref),
      image_sources: uniqueSorted(dbRows.flatMap((row) => [row.image_source, row.printing_image_source])),
      created_by_values: uniqueSorted(dbRows.map((row) => row.created_by)),
      recommended_next_action: recovery.recommended_next_action,
      mutation_authority: 'not mutation authority',
      alias_authority: 'not alias authority',
      note: 'This row is a provenance recovery lead only. It does not infer source set identity.',
      sort_rank: classificationRank[recovery.classification] ?? 99,
    };
  }).sort((left, right) => left.sort_rank - right.sort_rank || right.printing_count - left.printing_count || String(left.card_name).localeCompare(String(right.card_name)));
}

function summarizeQueue(queue, missingRows, dbResult) {
  const byClassification = {};
  const byFinish = {};
  const byFinishProfile = {};
  const byEvidenceField = {};
  const byExternalMappingSource = {};
  const byExternalIdPattern = {};
  const byCardName = {};
  const rowsWithCardNumber = missingRows.filter((row) => row.card_number).length;
  const rowsWithSetCode = missingRows.filter((row) => row.set_code).length;

  for (const row of missingRows) {
    addCount(byFinish, row.finish_key);
    addCount(byCardName, row.grookai_card_name);
  }

  for (const item of queue) {
    addCount(byClassification, item.recovery_classification);
    addCount(byFinishProfile, item.finish_profile);
    if (!item.evidence_fields_present.length) addCount(byEvidenceField, 'none');
    for (const field of item.evidence_fields_present) addCount(byEvidenceField, field);
    if (!item.external_mapping_sources.length) addCount(byExternalMappingSource, 'none');
    for (const source of item.external_mapping_sources) addCount(byExternalMappingSource, source);
    if (!item.external_id_patterns.length) addCount(byExternalIdPattern, 'none');
    for (const pattern of item.external_id_patterns) addCount(byExternalIdPattern, pattern);
  }

  return {
    missing_set_code_printing_rows: missingRows.length,
    unique_card_prints: queue.length,
    rows_with_card_number: rowsWithCardNumber,
    rows_with_set_code: rowsWithSetCode,
    db_enrichment_executed: dbResult.executed,
    db_enrichment_reason: dbResult.reason,
    db_card_print_rows_loaded: dbResult.cardPrintRows?.length ?? 0,
    db_external_mapping_rows_loaded: dbResult.externalMappingRows?.length ?? 0,
    by_recovery_classification: byClassification,
    by_finish: byFinish,
    by_finish_profile: byFinishProfile,
    by_evidence_field: byEvidenceField,
    by_external_mapping_source: byExternalMappingSource,
    by_external_id_pattern: byExternalIdPattern,
    top_card_names: Object.fromEntries(topEntries(byCardName, 25)),
  };
}

function buildRecoveryArtifact({ summary, queue }) {
  const mutationSafe = false;
  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_provenance_recovery_v1',
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    mutation_safe: mutationSafe,
    scope: {
      input_bucket: 'set_unmapped / missing_set_code',
      english_only: true,
      assignment_policy: 'This pass does not infer set identity. It only classifies provenance recovery leads.',
    },
    summary,
    guardrails: [
      'missing_set_code is not alias evidence',
      'name and finish are not source set authority',
      'external IDs and image URLs are recovery leads only',
      'no row is mutation-safe from this report',
      'no database writes, cleanup, quarantine, migrations, or apply paths are allowed',
    ],
    top_recoverable_items: queue.slice(0, 100).map(({ sort_rank, ...row }) => row),
  };
}

function buildQueueArtifact({ summary, queue }) {
  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_missing_set_code_provenance_queue_v1',
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    summary,
    queues: queue.map(({ sort_rank, ...row }) => row),
  };
}

function buildRecoveryMarkdown(artifact) {
  const rows = topEntries(artifact.summary.by_recovery_classification, 20)
    .map(([classification, count]) => [classification, count]);
  const evidenceRows = topEntries(artifact.summary.by_evidence_field, 20)
    .map(([field, count]) => [field, count]);
  const finishRows = topEntries(artifact.summary.by_finish, 20)
    .map(([finish, count]) => [finish, count]);
  const sourceRows = topEntries(artifact.summary.by_external_mapping_source, 20)
    .map(([source, count]) => [source, count]);
  const patternRows = topEntries(artifact.summary.by_external_id_pattern, 20)
    .map(([pattern, count]) => [pattern, count]);

  return `# English Master Index Provenance Recovery V1

This is an audit-only recovery map for Grookai rows in the \`missing_set_code\` bucket.

It does not infer set identity, does not create aliases, and does not authorize mutation. Rows with no set code cannot be mapped from name/finish alone.

## Safety

- audit_only: ${artifact.audit_only}
- db_writes_performed: ${artifact.db_writes_performed}
- migrations_created: ${artifact.migrations_created}
- cleanup_performed: ${artifact.cleanup_performed}
- quarantine_performed: ${artifact.quarantine_performed}
- mutation_safe: ${artifact.mutation_safe}

## Summary

- missing_set_code_printing_rows: ${artifact.summary.missing_set_code_printing_rows}
- unique_card_prints: ${artifact.summary.unique_card_prints}
- rows_with_card_number: ${artifact.summary.rows_with_card_number}
- rows_with_set_code: ${artifact.summary.rows_with_set_code}
- db_enrichment_executed: ${artifact.summary.db_enrichment_executed}
- db_card_print_rows_loaded: ${artifact.summary.db_card_print_rows_loaded}
- db_external_mapping_rows_loaded: ${artifact.summary.db_external_mapping_rows_loaded}

## Recovery Classification

${markdownTable(['classification', 'unique card prints'], rows)}

## Evidence Fields

${markdownTable(['field', 'unique card prints'], evidenceRows)}

## External Mapping Sources

${markdownTable(['source', 'unique card prints'], sourceRows)}

## External ID Patterns

${markdownTable(['pattern', 'unique card prints'], patternRows)}

## Finish Rows

${markdownTable(['finish', 'printing rows'], finishRows)}

## Guardrails

${artifact.guardrails.map((guardrail) => `- ${guardrail}`).join('\n')}

## Top Recovery Leads

${markdownTable(
    ['card_print_id', 'card_name', 'finish_profile', 'classification', 'evidence_fields', 'printing_count'],
    artifact.top_recoverable_items.slice(0, 40).map((row) => [
      row.card_print_id,
      row.card_name,
      row.finish_profile,
      row.recovery_classification,
      row.evidence_fields_present.join(', ') || 'none',
      row.printing_count,
    ]),
  )}
`;
}

function buildQueueMarkdown(artifact) {
  const rows = artifact.queues.slice(0, 100).map((row) => [
    row.card_print_id,
    row.card_name,
    row.finish_profile,
    row.recovery_classification,
    row.evidence_fields_present.join(', ') || 'none',
    row.recommended_next_action,
  ]);

  return `# Missing Set Code Provenance Queue V1

This queue ranks \`missing_set_code\` rows by available recovery evidence. Every row remains read-only and not mutation-safe.

## Safety

- audit_only: ${artifact.audit_only}
- db_writes_performed: ${artifact.db_writes_performed}
- migrations_created: ${artifact.migrations_created}
- cleanup_performed: ${artifact.cleanup_performed}
- quarantine_performed: ${artifact.quarantine_performed}

## Queue Summary

- queue_items: ${artifact.queues.length}
- missing_set_code_printing_rows: ${artifact.summary.missing_set_code_printing_rows}
- db_enrichment_executed: ${artifact.summary.db_enrichment_executed}

## Top Queue Items

${markdownTable(
    ['card_print_id', 'card_name', 'finish_profile', 'classification', 'evidence_fields', 'next_action'],
    rows,
  )}
`;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const grookaiAudit = await readJson('english_master_index_grookai_audit_v1.json');
  const missingRows = (grookaiAudit.rows ?? []).filter((row) => (
    row.status === 'set_unmapped'
    && !normalizeText(row.set_code)
  ));
  const cardPrintIds = uniqueSorted(missingRows.map((row) => row.grookai_card_print_id));
  const dbResult = await loadDbProvenance(cardPrintIds);
  const queue = makeQueue({ missingRows, dbResult });
  const summary = summarizeQueue(queue, missingRows, dbResult);
  const recoveryArtifact = buildRecoveryArtifact({ summary, queue });
  const queueArtifact = buildQueueArtifact({ summary, queue });

  await writeJson('english_master_index_provenance_recovery_v1.json', recoveryArtifact);
  await writeMarkdown('english_master_index_provenance_recovery_v1.md', buildRecoveryMarkdown(recoveryArtifact));
  await writeJson('english_master_index_missing_set_code_provenance_queue_v1.json', queueArtifact);
  await writeMarkdown('english_master_index_missing_set_code_provenance_queue_v1.md', buildQueueMarkdown(queueArtifact));

  console.log(JSON.stringify({
    generated_files: GENERATED_FILES,
    missing_set_code_printing_rows: summary.missing_set_code_printing_rows,
    unique_card_prints: summary.unique_card_prints,
    db_enrichment_executed: summary.db_enrichment_executed,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
