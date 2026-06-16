import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const INPUT_JSON = path.join(OUTPUT_DIR, 'enrich28a_master_index_provenance_payload_governance_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich29a_provenance_review_evidence_recovery_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich29a_provenance_review_evidence_recovery_v1.md');

const SOURCE_FILES = [
  'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg15a_stamped_explicit_finish_guarded_dry_run_v1.json',
  'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg15c_stamped_reverse_burger_king_guarded_dry_run_v1.json',
  'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg11b_stamped_finish_routing_readiness_v1.json',
  'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg15b_stamped_generic_variant_adjudication_v1.json',
  'docs/audits/english_master_index_source_exhaustion_v1/tcgcsv_stamped_subtype_acquisition_v1/tcgcsv_stamped_subtype_acquisition_v1.json',
];

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

async function readJsonIfExists(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
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

function compact(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/pokemon/g, 'pokemon')
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeSet(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeNumber(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  const match = raw.match(/^0*([0-9]+)([a-z]*)$/);
  if (match) return `${Number(match[1])}${match[2]}`;
  return raw.replace(/\s+/g, '');
}

function normalizeVariant(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function rowKey({ set_code, set_key, card_number, number, card_name, name, variant_key, printed_identity_modifier, proposed_variant_key, target_variant_key }) {
  return [
    normalizeSet(set_code ?? set_key),
    normalizeNumber(number ?? card_number),
    compact(card_name ?? name),
    normalizeVariant(variant_key ?? printed_identity_modifier ?? proposed_variant_key ?? target_variant_key),
  ].join('|');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function uniqueEvidence(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = stableJson({
      source_key: row.source_key,
      source_kind: row.source_kind,
      source_url: row.source_url,
      evidence_label: row.evidence_label,
    });
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function evidenceFromPreserved(evidenceLike) {
  const sources = asArray(evidenceLike?.preserved_evidence_sources);
  const urls = asArray(evidenceLike?.preserved_evidence_urls);
  const labels = asArray(evidenceLike?.preserved_evidence_labels);
  const max = Math.max(sources.length, urls.length, labels.length);
  const rows = [];
  for (let i = 0; i < max; i += 1) {
    rows.push({
      source_key: sources[i] ?? sources[0] ?? null,
      source_kind: null,
      source_url: urls[i] ?? urls[0] ?? null,
      evidence_label: labels[i] ?? labels[0] ?? null,
      supports: [],
    });
  }
  return rows.filter((row) => row.source_key || row.source_url || row.evidence_label);
}

function evidenceFromNested(evidenceLike) {
  return asArray(evidenceLike?.evidence).map((row) => ({
    source_key: row.source_key ?? null,
    source_kind: row.source_kind ?? null,
    source_url: row.source_url ?? null,
    evidence_label: row.evidence_label ?? row.evidence_text ?? null,
    supports: asArray(row.supports),
  })).filter((row) => row.source_key || row.source_url || row.evidence_label);
}

function fingerprintsFrom(evidenceLike, sourceDoc) {
  return [
    evidenceLike?.readiness_fingerprint,
    evidenceLike?.routing_fingerprint,
    evidenceLike?.adjudication_fingerprint,
    evidenceLike?.fingerprint_sha256,
    sourceDoc?.package_fingerprint_sha256,
    sourceDoc?.fingerprint_sha256,
  ].filter(Boolean);
}

function addCandidate(index, key, candidate) {
  if (!key.includes('||') && !key.endsWith('|')) {
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(candidate);
  }
}

function indexTargets(index, sourcePath, sourceDoc) {
  for (const target of asArray(sourceDoc?.scope?.targets)) {
    const evidenceLike = target.evidence ?? {};
    const key = rowKey(target);
    addCandidate(index, key, {
      source_artifact: sourcePath,
      source_package_id: evidenceLike.source_package_id ?? sourceDoc.package_id ?? null,
      match_source: 'scope.targets',
      target_finish_key: target.target_finish_key ?? null,
      evidence: uniqueEvidence([
        ...evidenceFromNested(evidenceLike),
        ...evidenceFromPreserved(evidenceLike),
      ]),
      finish_claims: asArray(evidenceLike.finish_claims),
      fingerprints: [...new Set(fingerprintsFrom(evidenceLike, sourceDoc))],
    });
  }
}

function indexRows(index, sourcePath, sourceDoc) {
  for (const row of asArray(sourceDoc?.rows)) {
    const key = rowKey(row);
    addCandidate(index, key, {
      source_artifact: sourcePath,
      source_package_id: row.source_package_id ?? sourceDoc.package_id ?? null,
      match_source: 'rows',
      target_finish_key: row.target_finish_key ?? null,
      routing_status: row.routing_status ?? null,
      evidence: uniqueEvidence(evidenceFromPreserved(row)),
      finish_claims: [
        ...asArray(row.finish_claims),
        ...asArray(row.supporting_finish_claims),
      ],
      fingerprints: [...new Set(fingerprintsFrom(row, sourceDoc))],
    });
  }
}

function indexResults(index, sourcePath, sourceDoc) {
  for (const row of asArray(sourceDoc?.results)) {
    const key = rowKey(row);
    addCandidate(index, key, {
      source_artifact: sourcePath,
      source_package_id: row.source_package_id ?? sourceDoc.package_id ?? null,
      match_source: 'results',
      target_finish_key: row.target_finish_key ?? null,
      routing_status: row.routing_status ?? null,
      evidence: uniqueEvidence([
        ...evidenceFromPreserved(row),
        {
          source_key: row.source_key ?? sourceDoc.source_key ?? null,
          source_kind: row.source_kind ?? null,
          source_url: row.source_url ?? row.source_reference ?? null,
          evidence_label: row.evidence_label ?? row.evidence_text ?? null,
          supports: [],
        },
      ].filter((evidence) => evidence.source_key || evidence.source_url || evidence.evidence_label)),
      finish_claims: [
        ...asArray(row.finish_claims),
        ...asArray(row.supporting_finish_claims),
      ],
      fingerprints: [...new Set(fingerprintsFrom(row, sourceDoc))],
    });
  }
}

function flattenMatches(matches) {
  const evidence = uniqueEvidence(matches.flatMap((match) => match.evidence ?? []));
  const fingerprints = [...new Set(matches.flatMap((match) => match.fingerprints ?? []))];
  const sources = [...new Set(evidence.map((row) => row.source_key).filter(Boolean))].sort();
  const urls = [...new Set(evidence.map((row) => row.source_url).filter(Boolean))].sort();
  const labels = [...new Set(evidence.map((row) => row.evidence_label).filter(Boolean))].sort();
  const finishClaims = matches.flatMap((match) => match.finish_claims ?? []);
  return {
    evidence,
    fingerprints,
    sources,
    urls,
    labels,
    finish_claims: finishClaims,
    source_artifacts: [...new Set(matches.map((match) => match.source_artifact).filter(Boolean))].sort(),
  };
}

function classifyRecovery(row, flattened) {
  const recovered = [];
  const remaining = new Set(row.blockers ?? []);

  if (flattened.urls.length > 0) {
    recovered.push('evidence_urls');
    remaining.delete('missing_evidence_urls');
  }
  if (flattened.sources.length > 0 || flattened.labels.length > 0) {
    recovered.push('source_labels');
    remaining.delete('missing_source_labels');
  }
  if (flattened.fingerprints.length > 0) {
    recovered.push('readiness_or_routing_fingerprint');
    remaining.delete('missing_readiness_or_routing_fingerprint');
  }

  if (recovered.length === 0) return { recovery_status: 'not_recovered', recovered_fields: [], remaining_blockers: [...remaining] };
  if (remaining.size === 0) return { recovery_status: 'fully_recoverable_from_existing_artifacts', recovered_fields: recovered, remaining_blockers: [] };
  return { recovery_status: 'partially_recoverable_from_existing_artifacts', recovered_fields: recovered, remaining_blockers: [...remaining] };
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

async function main() {
  const governance = await readJson(INPUT_JSON);
  const reviewRows = asArray(governance.review_samples);

  const index = new Map();
  const loadedSources = [];
  for (const sourcePath of SOURCE_FILES) {
    const sourceDoc = await readJsonIfExists(sourcePath);
    if (!sourceDoc) {
      loadedSources.push({ source_artifact: sourcePath, status: 'missing' });
      continue;
    }
    loadedSources.push({ source_artifact: sourcePath, status: 'loaded' });
    indexTargets(index, sourcePath, sourceDoc);
    indexRows(index, sourcePath, sourceDoc);
    indexResults(index, sourcePath, sourceDoc);
  }

  const rows = reviewRows.map((row) => {
    const key = rowKey(row);
    const matches = index.get(key) ?? [];
    const flattened = flattenMatches(matches);
    const recovery = classifyRecovery(row, flattened);
    return {
      card_print_id: row.card_print_id,
      gv_id: row.gv_id,
      set_code: row.set_code,
      set_name: row.set_name,
      number: row.number,
      card_name: row.card_name,
      variant_key: row.variant_key ?? row.printed_identity_modifier ?? null,
      original_blockers: row.blockers ?? [],
      match_key: key,
      match_count: matches.length,
      recovery_status: recovery.recovery_status,
      recovered_fields: recovery.recovered_fields,
      remaining_blockers: recovery.remaining_blockers,
      recovered_sources: flattened.sources,
      recovered_evidence_urls: flattened.urls,
      recovered_evidence_labels: flattened.labels,
      recovered_fingerprints: flattened.fingerprints,
      source_artifacts: flattened.source_artifacts,
    };
  });

  const report = {
    version: 'ENRICH29A_PROVENANCE_REVIEW_EVIDENCE_RECOVERY_V1',
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    scope: {
      target: 'Recover display-grade Master Index provenance for ENRICH-28A review rows from existing audit artifacts.',
      forbidden: ['DB writes', 'parent writes', 'child writes', 'identity writes', 'external_mappings inserts', 'external_mappings transfers', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
    },
    source_files: loadedSources,
    totals: {
      review_rows: rows.length,
      fully_recoverable_rows: rows.filter((row) => row.recovery_status === 'fully_recoverable_from_existing_artifacts').length,
      partially_recoverable_rows: rows.filter((row) => row.recovery_status === 'partially_recoverable_from_existing_artifacts').length,
      not_recovered_rows: rows.filter((row) => row.recovery_status === 'not_recovered').length,
      rows_with_recovered_urls: rows.filter((row) => row.recovered_evidence_urls.length > 0).length,
      rows_with_recovered_sources: rows.filter((row) => row.recovered_sources.length > 0).length,
      rows_with_recovered_fingerprints: rows.filter((row) => row.recovered_fingerprints.length > 0).length,
      write_ready_rows: 0,
    },
    by_recovery_status: countBy(rows, (row) => row.recovery_status),
    by_remaining_blocker: countBy(rows.flatMap((row) => row.remaining_blockers.map((blocker) => ({ blocker }))), (row) => row.blocker),
    rows,
    governance_decision: {
      decision: 'Recovered provenance remains audit/display metadata, not external mapping truth.',
      allowed_next_step: 'If desired, build a guarded dry-run payload cleanup package that patches only external_ids.verified_master_index_v1 provenance fields for fully recoverable rows.',
      blocked_next_step: 'Do not create external_mappings from these payloads and do not mutate canonical card identity from recovered provenance alone.',
    },
  };

  report.fingerprint_sha256 = sha256(stableJson({
    version: report.version,
    totals: report.totals,
    by_recovery_status: report.by_recovery_status,
    by_remaining_blocker: report.by_remaining_blocker,
    rows: rows.map((row) => ({
      card_print_id: row.card_print_id,
      recovery_status: row.recovery_status,
      remaining_blockers: row.remaining_blockers,
      recovered_sources: row.recovered_sources,
      recovered_evidence_urls: row.recovered_evidence_urls,
      recovered_fingerprints: row.recovered_fingerprints,
    })),
  }));

  await writeJson(OUTPUT_JSON, report);

  const md = [
    '# ENRICH-29A Provenance Review Evidence Recovery V1',
    '',
    '## Result',
    '',
    `- Audit only: ${report.audit_only}`,
    `- DB writes performed: ${report.db_writes_performed}`,
    `- Migrations created: ${report.migrations_created}`,
    `- Fingerprint: \`${report.fingerprint_sha256}\``,
    '',
    '## Totals',
    '',
    markdownTable(Object.entries(report.totals).map(([metric, rows]) => ({ metric, rows })), [
      { label: 'metric', value: (row) => row.metric },
      { label: 'rows', value: (row) => row.rows },
    ]),
    '',
    '## Recovery Status',
    '',
    markdownTable(Object.entries(report.by_recovery_status).map(([status, rows]) => ({ status, rows })), [
      { label: 'status', value: (row) => row.status },
      { label: 'rows', value: (row) => row.rows },
    ]),
    '',
    '## Remaining Blockers',
    '',
    markdownTable(Object.entries(report.by_remaining_blocker).map(([blocker, rows]) => ({ blocker, rows })), [
      { label: 'blocker', value: (row) => row.blocker },
      { label: 'rows', value: (row) => row.rows },
    ]),
    '',
    '## Fully Recoverable Rows',
    '',
    markdownTable(rows.filter((row) => row.recovery_status === 'fully_recoverable_from_existing_artifacts'), [
      { label: 'set', value: (row) => row.set_code },
      { label: 'number', value: (row) => row.number },
      { label: 'card', value: (row) => row.card_name },
      { label: 'variant', value: (row) => row.variant_key },
      { label: 'sources', value: (row) => row.recovered_sources.join(', ') },
    ]),
    '',
    '## Governance',
    '',
    `- ${report.governance_decision.decision}`,
    `- Allowed next step: ${report.governance_decision.allowed_next_step}`,
    `- Blocked next step: ${report.governance_decision.blocked_next_step}`,
    '',
  ].join('\n');

  await writeText(OUTPUT_MD, md);

  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    fingerprint_sha256: report.fingerprint_sha256,
    totals: report.totals,
    by_recovery_status: report.by_recovery_status,
    by_remaining_blocker: report.by_remaining_blocker,
  }, null, 2));
}

await main();
