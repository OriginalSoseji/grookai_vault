import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const pg = require('pg');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false, quiet: true });
}

const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'printing_truth_v1');
const GLOBAL_JSON = path.join(OUT_DIR, 'printing_truth_global_audit_v1.json');
const GLOBAL_MD = path.join(OUT_DIR, 'printing_truth_global_audit_v1.md');
const UNSUPPORTED_JSON = path.join(OUT_DIR, 'unsupported_printings_v1.json');
const UNSUPPORTED_MD = path.join(OUT_DIR, 'unsupported_printings_v1.md');
const REVERSE_JSON = path.join(OUT_DIR, 'reverse_holo_integrity_v1.json');
const REVERSE_MD = path.join(OUT_DIR, 'reverse_holo_integrity_v1.md');
const SOURCE_AUDIT_MD = path.join(OUT_DIR, 'printing_generation_source_audit_v1.md');

const FINISH_LABELS = new Map([
  ['normal', 'Normal'],
  ['holo', 'Holo'],
  ['reverse', 'Reverse Holo'],
  ['pokeball', 'Poke Ball'],
  ['masterball', 'Master Ball'],
]);

const SOURCE_NAMES = ['tcgdex', 'pokemonapi', 'justtcg'];

function sslForConnectionString(connectionString) {
  if (/sslmode=(disable|allow|prefer)/i.test(connectionString)) return false;
  if (/localhost|127\.0\.0\.1|host\.docker\.internal/i.test(connectionString)) return false;
  return { rejectUnauthorized: false };
}

function clean(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeKey(value) {
  return clean(value)?.toLowerCase().replace(/[_\s]+/g, '-') ?? '';
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function finishFromPriceKey(key) {
  const normalized = normalizeKey(key);
  if (normalized === 'normal' || normalized === 'unlimited-normal') return 'normal';
  if (
    normalized === 'holofoil' ||
    normalized === 'holo' ||
    normalized === '1steditionholofoil' ||
    normalized === '1st-edition-holofoil' ||
    normalized === 'unlimited-holofoil'
  ) {
    return 'holo';
  }
  if (
    normalized === 'reverse-holofoil' ||
    normalized === 'reverse-holo' ||
    normalized === 'reverseholofoil' ||
    normalized === 'reverse'
  ) {
    return 'reverse';
  }
  return null;
}

function finishFromPrintingLabel(value) {
  const normalized = normalizeKey(value);
  if (!normalized) return null;
  if (normalized === 'normal' || normalized === 'regular') return 'normal';
  if (normalized === 'holo' || normalized === 'holofoil' || normalized === 'foil') return 'holo';
  if (normalized === 'reverse' || normalized === 'reverse-holo' || normalized === 'reverse-holofoil') {
    return 'reverse';
  }
  if (normalized === 'pokeball' || normalized === 'poke-ball' || normalized === 'poke-ball-pattern') {
    return 'pokeball';
  }
  if (normalized === 'masterball' || normalized === 'master-ball' || normalized === 'master-ball-pattern') {
    return 'masterball';
  }
  return null;
}

function addPriceEvidence(evidence, source, pricing) {
  if (!pricing || typeof pricing !== 'object') return;
  for (const key of Object.keys(pricing)) {
    const finish = finishFromPriceKey(key);
    if (finish) {
      evidence.push({
        source,
        finish_key: finish,
        evidence_type: 'price_printing_key',
        evidence_ref: key,
      });
    }
  }
}

function addVariantFlagEvidence(evidence, source, variants) {
  if (!variants || typeof variants !== 'object' || Array.isArray(variants)) return;
  for (const [key, value] of Object.entries(variants)) {
    if (value !== true) continue;
    const finish = finishFromPrintingLabel(key);
    if (finish) {
      evidence.push({
        source,
        finish_key: finish,
        evidence_type: 'variant_boolean_flag',
        evidence_ref: key,
      });
    }
  }
}

function addJustTcgVariantEvidence(evidence, payload) {
  const card = payload?.card ?? payload?.data ?? payload;
  const variants = Array.isArray(card?.variants) ? card.variants : [];
  for (const variant of variants) {
    const finish = finishFromPrintingLabel(
      variant?.printing ?? variant?.finish ?? variant?.name ?? variant?.title,
    );
    if (finish) {
      evidence.push({
        source: 'justtcg',
        finish_key: finish,
        evidence_type: 'variant_printing_label',
        evidence_ref: clean(variant?.printing ?? variant?.finish ?? variant?.name ?? variant?.title),
      });
    }
  }
}

function extractEvidenceFromPayload(source, payload) {
  const evidence = [];
  const card = payload?.card ?? payload?.data ?? payload;
  if (!card || typeof card !== 'object') return evidence;

  if (source === 'tcgdex') {
    addPriceEvidence(evidence, source, card?.pricing?.tcgplayer);
    addVariantFlagEvidence(evidence, source, card?.variants);
  } else if (source === 'pokemonapi') {
    addPriceEvidence(evidence, source, card?.tcgplayer?.prices);
    addVariantFlagEvidence(evidence, source, card?.variants);
  } else if (source === 'justtcg') {
    addJustTcgVariantEvidence(evidence, payload);
    addPriceEvidence(evidence, source, card?.pricing?.tcgplayer ?? card?.tcgplayer?.prices);
  }

  return evidence;
}

function expectedFinishesFromEvidence(evidence) {
  return unique(evidence.map((item) => item.finish_key));
}

function sourceNamesFromEvidence(evidence, finishKey = null) {
  return unique(
    evidence
      .filter((item) => finishKey === null || item.finish_key === finishKey)
      .map((item) => item.source),
  );
}

function hasMappedPrinting(row) {
  return Array.isArray(row.external_printing_mappings) && row.external_printing_mappings.length > 0;
}

function classifyPrinting(row, expectedFinishes, evidence) {
  const finishKey = clean(row.finish_key);
  const provenanceSource = clean(row.provenance_source);
  const provenanceRef = clean(row.provenance_ref);
  const mapped = hasMappedPrinting(row);
  const sourcesForFinish = sourceNamesFromEvidence(evidence, finishKey);
  const hasSourceEvidence = sourcesForFinish.length > 0;

  if (!finishKey || !FINISH_LABELS.has(finishKey)) {
    return {
      status: 'unsupported',
      reason: 'finish_key is outside Grookai bounded finish vocabulary',
      confidence: 'high',
    };
  }

  if (mapped) {
    return {
      status: 'verified',
      reason: 'active external_printing_mappings row exists for this exact child printing',
      confidence: 'high',
    };
  }

  if (hasSourceEvidence) {
    return {
      status: sourceNamesFromEvidence(evidence).length >= 2 ? 'verified' : 'verified',
      reason:
        sourcesForFinish.length >= 2
          ? 'multiple parent-card source payloads expose this finish'
          : `${sourcesForFinish[0]} parent-card source payload exposes this finish`,
      confidence: sourcesForFinish.length >= 2 ? 'high' : 'medium',
    };
  }

  if (expectedFinishes.length > 0 && !expectedFinishes.includes(finishKey)) {
    return {
      status: 'unsupported',
      reason: 'finish exists in Grookai but no checked source payload exposes this finish for the parent card',
      confidence: 'medium',
    };
  }

  if (provenanceSource || provenanceRef) {
    return {
      status: 'unverifiable',
      reason: 'row has provenance metadata but no checked payload or exact external printing mapping proves the finish',
      confidence: 'low',
    };
  }

  return {
    status: 'quarantined_candidate',
    reason: 'legacy/unproven row lacks provenance and checked source evidence',
    confidence: 'medium',
  };
}

function buildUnsupportedRow(row, expectedFinishes, evidence, classification) {
  return {
    card_printing_id: row.card_printing_id,
    card_print_id: row.card_print_id,
    printing_gv_id: row.printing_gv_id,
    set_code: row.set_code,
    card_name: row.card_name,
    card_number: row.number_plain ?? row.number,
    variant_key: row.variant_key,
    finish_key: row.finish_key,
    finish_label: FINISH_LABELS.get(row.finish_key) ?? row.finish_key,
    status: classification.status,
    why_unsupported: classification.reason,
    expected_valid_printings: expectedFinishes,
    evidence_sources_checked: SOURCE_NAMES,
    evidence_sources_for_this_finish: sourceNamesFromEvidence(evidence, row.finish_key),
    parent_external_ids: row.external_ids ?? {},
    provenance_source: row.provenance_source,
    provenance_ref: row.provenance_ref,
    created_by: row.created_by,
    ownership_ref_count: Number(row.ownership_ref_count ?? 0),
  };
}

function buildMarkdownTable(rows, columns, limit = 250) {
  const visible = rows.slice(0, limit);
  const header = `| ${columns.map((column) => column.label).join(' |')} |`;
  const separator = `| ${columns.map(() => '---').join(' |')} |`;
  const body = visible.map((row) => {
    const values = columns.map((column) => {
      const value = column.value(row);
      return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
    });
    return `| ${values.join(' |')} |`;
  });
  return [header, separator, ...body].join('\n');
}

function buildGlobalMarkdown(report) {
  const lines = [
    '# Printing Truth Global Audit V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    '## Scope',
    '',
    'Read-only Phase 1 audit of `public.card_printings`. No database writes, deletes, updates, or migration repairs were performed.',
    '',
    '## Totals',
    '',
    `- total printings: ${report.totals.total_printings}`,
    `- verified printings: ${report.totals.verified_printings}`,
    `- unsupported printings: ${report.totals.unsupported_printings}`,
    `- conflicting printings: ${report.totals.conflicting_printings}`,
    `- unverifiable rows: ${report.totals.unverifiable_rows}`,
    `- quarantine candidates: ${report.totals.quarantine_candidates}`,
    `- reverse holo discrepancies: ${report.totals.reverse_holo_discrepancies}`,
    `- source disagreement count: ${report.totals.source_disagreement_count}`,
    '',
    '## Finish Distribution',
    '',
    buildMarkdownTable(report.finish_distribution, [
      { label: 'finish', value: (row) => row.finish_key },
      { label: 'rows', value: (row) => row.rows },
      { label: 'verified', value: (row) => row.verified },
      { label: 'unsupported', value: (row) => row.unsupported },
      { label: 'unverifiable', value: (row) => row.unverifiable },
      { label: 'quarantine', value: (row) => row.quarantined_candidate },
    ]),
    '',
    '## Stop-Rule Findings',
    '',
    ...report.stop_rule_findings.map((finding) => `- ${finding}`),
    '',
    '## Quarantine Strategy',
    '',
    ...report.quarantine_strategy.map((item) => `- ${item}`),
  ];
  return `${lines.join('\n')}\n`;
}

function buildUnsupportedMarkdown(report) {
  const rows = report.rows;
  const lines = [
    '# Unsupported Printings V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    `Rows requiring quarantine/remediation review: ${rows.length}`,
    '',
    'This is a proof report only. Rows listed here are not deleted by this phase.',
    '',
    buildMarkdownTable(rows, [
      { label: 'status', value: (row) => row.status },
      { label: 'set', value: (row) => row.set_code },
      { label: 'card', value: (row) => row.card_name },
      { label: 'number', value: (row) => row.card_number },
      { label: 'finish', value: (row) => row.finish_key },
      { label: 'reason', value: (row) => row.why_unsupported },
      { label: 'expected', value: (row) => row.expected_valid_printings.join(', ') },
      { label: 'checked', value: (row) => row.evidence_sources_checked.join(', ') },
    ], 500),
    '',
    rows.length > 500 ? `Only first 500 rows are shown here. Full rows are in ${path.basename(UNSUPPORTED_JSON)}.` : '',
  ];
  return `${lines.filter((line) => line !== '').join('\n')}\n`;
}

function buildReverseMarkdown(report) {
  const lines = [
    '# Reverse Holo Integrity V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    `- reverse holo rows: ${report.totals.reverse_rows}`,
    `- verified reverse holo rows: ${report.totals.verified_reverse_rows}`,
    `- false reverse holo rows: ${report.totals.false_reverse_rows}`,
    `- ambiguous reverse holo rows: ${report.totals.ambiguous_reverse_rows}`,
    `- missing reverse holo rows from checked source evidence: ${report.totals.missing_reverse_rows}`,
    `- source conflicts: ${report.totals.source_conflicts}`,
    '',
    '## False / Unsupported Reverse Holo Rows',
    '',
    buildMarkdownTable(report.false_reverse_rows, [
      { label: 'set', value: (row) => row.set_code },
      { label: 'card', value: (row) => row.card_name },
      { label: 'number', value: (row) => row.card_number },
      { label: 'reason', value: (row) => row.why_unsupported },
      { label: 'expected', value: (row) => row.expected_valid_printings.join(', ') },
    ], 500),
    '',
    '## Missing Reverse Holo Candidates',
    '',
    buildMarkdownTable(report.missing_reverse_rows, [
      { label: 'set', value: (row) => row.set_code },
      { label: 'card', value: (row) => row.card_name },
      { label: 'number', value: (row) => row.card_number },
      { label: 'source evidence', value: (row) => row.evidence_sources_for_reverse.join(', ') },
    ], 250),
  ];
  return `${lines.join('\n')}\n`;
}

function buildSourceAuditMarkdown(report) {
  const lines = [
    '# Printing Generation Source Audit V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    '## Origin Summary',
    '',
    buildMarkdownTable(report.provenance_distribution, [
      { label: 'provenance_source', value: (row) => row.provenance_source },
      { label: 'created_by', value: (row) => row.created_by },
      { label: 'rows', value: (row) => row.rows },
    ], 100),
    '',
    '## Unsafe Generation Paths',
    '',
    ...report.unsafe_generation_paths.map((item) => `- ${item}`),
    '',
    '## Required Engineering Follow-Up',
    '',
    ...report.required_engineering_follow_up.map((item) => `- ${item}`),
  ];
  return `${lines.join('\n')}\n`;
}

async function loadRows(client) {
  const result = await client.query(`
    with printing_maps as (
      select
        epm.card_printing_id,
        jsonb_agg(jsonb_build_object(
          'source', epm.source,
          'external_id', epm.external_id,
          'meta', epm.meta
        ) order by epm.source, epm.external_id) filter (where epm.active) as mappings
      from public.external_printing_mappings epm
      where epm.active
      group by epm.card_printing_id
    ),
    parent_maps as (
      select
        em.card_print_id,
        jsonb_object_agg(em.source, em.external_id) filter (where em.active) as source_external_ids
      from public.external_mappings em
      where em.active
        and em.source in ('tcgdex', 'pokemonapi', 'justtcg')
      group by em.card_print_id
    ),
    ownership_refs as (
      select
        vii.card_printing_id,
        count(*)::int as ownership_ref_count
      from public.vault_item_instances vii
      where vii.card_printing_id is not null
      group by vii.card_printing_id
    )
    select
      cpr.id::text as card_printing_id,
      cpr.card_print_id::text,
      cpr.finish_key,
      cpr.printing_gv_id,
      cpr.provenance_source,
      cpr.provenance_ref,
      cpr.created_by,
      cpr.is_provisional,
      cp.name as card_name,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.variant_key,
      cp.printed_identity_modifier,
      cp.gv_id,
      cp.external_ids,
      coalesce(pm.mappings, '[]'::jsonb) as external_printing_mappings,
      coalesce(parent_maps.source_external_ids, '{}'::jsonb) as source_external_ids,
      coalesce(ownership_refs.ownership_ref_count, 0)::int as ownership_ref_count,
      tcgdex.payload as tcgdex_payload,
      pokemonapi.payload as pokemonapi_payload,
      justtcg.payload as justtcg_payload
    from public.card_printings cpr
    join public.card_prints cp on cp.id = cpr.card_print_id
    left join printing_maps pm on pm.card_printing_id = cpr.id
    left join parent_maps on parent_maps.card_print_id = cp.id
    left join ownership_refs on ownership_refs.card_printing_id = cpr.id
    left join public.raw_imports tcgdex
      on tcgdex.source = 'tcgdex'
     and tcgdex.payload->>'_kind' = 'card'
     and tcgdex.payload->>'_external_id' = parent_maps.source_external_ids->>'tcgdex'
    left join public.raw_imports pokemonapi
      on pokemonapi.source = 'pokemonapi'
     and pokemonapi.payload->>'_kind' = 'card'
     and pokemonapi.payload->>'_external_id' = parent_maps.source_external_ids->>'pokemonapi'
    left join public.raw_imports justtcg
      on justtcg.source = 'justtcg'
     and justtcg.payload->>'_kind' = 'card'
     and justtcg.payload->>'_external_id' = parent_maps.source_external_ids->>'justtcg'
    order by cp.set_code nulls last, cp.number_plain nulls last, cp.number nulls last, cp.name, cpr.finish_key
  `);

  return result.rows;
}

async function loadMetadata(client) {
  const [provenance, rawSources] = await Promise.all([
    client.query(`
      select
        coalesce(provenance_source, '(null)') as provenance_source,
        coalesce(created_by, '(null)') as created_by,
        count(*)::int as rows
      from public.card_printings
      group by 1, 2
      order by rows desc
    `),
    client.query(`
      select
        source,
        payload->>'_kind' as kind,
        count(*)::int as rows
      from public.raw_imports
      group by source, payload->>'_kind'
      order by rows desc
    `),
  ]);

  return {
    provenance_distribution: provenance.rows,
    raw_source_distribution: rawSources.rows,
  };
}

function analyzeRows(rows, metadata) {
  const classifiedRows = [];
  const unsupportedRows = [];
  const reverseRows = [];
  const missingReverseRowsByParent = new Map();
  const sourceConflictParents = new Map();
  const finishDistribution = new Map();

  for (const row of rows) {
    const evidence = [
      ...extractEvidenceFromPayload('tcgdex', row.tcgdex_payload),
      ...extractEvidenceFromPayload('pokemonapi', row.pokemonapi_payload),
      ...extractEvidenceFromPayload('justtcg', row.justtcg_payload),
    ];
    const expectedFinishes = expectedFinishesFromEvidence(evidence);
    const classification = classifyPrinting(row, expectedFinishes, evidence);
    const classified = {
      ...row,
      expected_valid_printings: expectedFinishes,
      evidence,
      classification,
    };
    classifiedRows.push(classified);

    if (!finishDistribution.has(row.finish_key)) {
      finishDistribution.set(row.finish_key, {
        finish_key: row.finish_key,
        rows: 0,
        verified: 0,
        unsupported: 0,
        conflicting: 0,
        unverifiable: 0,
        quarantined_candidate: 0,
      });
    }
    const finishBucket = finishDistribution.get(row.finish_key);
    finishBucket.rows += 1;
    if (classification.status in finishBucket) {
      finishBucket[classification.status] += 1;
    }

    const unsupportedLike = ['unsupported', 'unverifiable', 'quarantined_candidate', 'conflicting'].includes(
      classification.status,
    );
    if (unsupportedLike) {
      unsupportedRows.push(buildUnsupportedRow(row, expectedFinishes, evidence, classification));
    }
    if (row.finish_key === 'reverse') {
      reverseRows.push(buildUnsupportedRow(row, expectedFinishes, evidence, classification));
    }

    const sourceToFinishes = new Map();
    for (const item of evidence) {
      if (!sourceToFinishes.has(item.source)) sourceToFinishes.set(item.source, new Set());
      sourceToFinishes.get(item.source).add(item.finish_key);
    }
    if (sourceToFinishes.size >= 2) {
      const signatures = unique([...sourceToFinishes.entries()].map(([source, finishes]) => `${source}:${[...finishes].sort().join(',')}`));
      if (signatures.length > 1) {
        sourceConflictParents.set(row.card_print_id, {
          card_print_id: row.card_print_id,
          set_code: row.set_code,
          card_name: row.card_name,
          card_number: row.number_plain ?? row.number,
          signatures,
        });
      }
    }

    if (expectedFinishes.includes('reverse') && row.finish_key !== 'reverse') {
      const key = row.card_print_id;
      if (!missingReverseRowsByParent.has(key)) {
        missingReverseRowsByParent.set(key, {
          card_print_id: row.card_print_id,
          set_code: row.set_code,
          card_name: row.card_name,
          card_number: row.number_plain ?? row.number,
          evidence_sources_for_reverse: sourceNamesFromEvidence(evidence, 'reverse'),
        });
      }
    }
  }

  const parentHasReverse = new Set(rows.filter((row) => row.finish_key === 'reverse').map((row) => row.card_print_id));
  const missingReverseRows = [...missingReverseRowsByParent.values()].filter(
    (row) => !parentHasReverse.has(row.card_print_id),
  );
  const falseReverseRows = reverseRows.filter((row) => ['unsupported', 'quarantined_candidate'].includes(row.status));
  const ambiguousReverseRows = reverseRows.filter((row) => row.status === 'unverifiable');
  const verifiedReverseRows = reverseRows.filter((row) => row.status === 'verified');
  const sourceConflicts = [...sourceConflictParents.values()];

  const statusCounts = classifiedRows.reduce((acc, row) => {
    acc[row.classification.status] = (acc[row.classification.status] ?? 0) + 1;
    return acc;
  }, {});

  const globalReport = {
    generated_at: new Date().toISOString(),
    mode: 'READ_ONLY_PHASE_1_AUDIT',
    evidence_policy: {
      verified:
        'Exact external_printing_mappings or checked parent-card source payload evidence exposes the same finish.',
      unsupported:
        'Grookai row finish is outside bounded vocabulary or absent from checked source payloads where checked source payloads have finish evidence.',
      unverifiable:
        'Provenance exists but checked sources did not prove the child finish.',
      quarantined_candidate:
        'No provenance, exact mapping, or checked source proof. Candidate for isolation before destructive cleanup.',
    },
    totals: {
      total_printings: rows.length,
      verified_printings: statusCounts.verified ?? 0,
      unsupported_printings: statusCounts.unsupported ?? 0,
      conflicting_printings: statusCounts.conflicting ?? 0,
      unverifiable_rows: statusCounts.unverifiable ?? 0,
      quarantine_candidates: statusCounts.quarantined_candidate ?? 0,
      reverse_holo_discrepancies: falseReverseRows.length + missingReverseRows.length,
      source_disagreement_count: sourceConflicts.length,
    },
    finish_distribution: [...finishDistribution.values()].sort((a, b) => b.rows - a.rows),
    source_conflicts: sourceConflicts.slice(0, 1000),
    raw_source_distribution: metadata.raw_source_distribution,
    stop_rule_findings: [
      'Potentially invalid printings are tied to legacy/generated rows with no provenance; quarantine must precede removal.',
      'Some card_printings are referenced by vault_item_instances; cleanup must not delete rows before ownership migration/retarget proof.',
      'Source disagreements exist and cannot be resolved deterministically in Phase 1.',
      'Generator code previously allowed finish rows from upstream boolean flags; this pass hardens that path to fail closed.',
    ],
    quarantine_strategy: [
      'Add a non-destructive quarantine/status layer for card_printings before any deletion.',
      'Mark unsupported/unverifiable/quarantined_candidate rows invisible to public checklists only after ownership/provenance impact audit.',
      'Retain row IDs during quarantine so vault ownership and historical references remain stable.',
      'Require exact source evidence or manual proof artifact before restoring a quarantined printing.',
      'Use forward-only migrations only after audit approval.',
    ],
  };

  const unsupportedReport = {
    generated_at: globalReport.generated_at,
    mode: 'READ_ONLY_PHASE_1_AUDIT',
    rows: unsupportedRows,
  };

  const reverseReport = {
    generated_at: globalReport.generated_at,
    mode: 'READ_ONLY_PHASE_1_AUDIT',
    totals: {
      reverse_rows: reverseRows.length,
      verified_reverse_rows: verifiedReverseRows.length,
      false_reverse_rows: falseReverseRows.length,
      ambiguous_reverse_rows: ambiguousReverseRows.length,
      missing_reverse_rows: missingReverseRows.length,
      source_conflicts: sourceConflicts.filter((row) => row.signatures.some((signature) => signature.includes('reverse'))).length,
    },
    false_reverse_rows: falseReverseRows,
    ambiguous_reverse_rows: ambiguousReverseRows,
    missing_reverse_rows: missingReverseRows,
    source_conflicts: sourceConflicts.filter((row) => row.signatures.some((signature) => signature.includes('reverse'))),
  };

  const sourceAudit = {
    generated_at: globalReport.generated_at,
    provenance_distribution: metadata.provenance_distribution,
    raw_source_distribution: metadata.raw_source_distribution,
    unsafe_generation_paths: [
      '`backend/printing/finish_normalizer_v1.mjs` previously mapped upstream boolean flags directly into child finish rows; now returns no writeable finishes.',
      '`backend/printing/printing_upsert_v1.mjs` previously allowed `normal`, `holo`, and `reverse` writes without proof metadata; now requires explicit proof evidence.',
      'Historical identity normalization apply scripts move/delete `card_printings` by finish_key during row collapses.',
      'Legacy rows with null provenance/created_by remain in production and cannot be externally verified from row metadata alone.',
    ],
    required_engineering_follow_up: [
      'Wire future approved printing ingestion through explicit proof/evidence payloads.',
      'Block reverse-holo creation unless checked source evidence names reverse/reverse-holofoil for that exact parent card.',
      'Add quarantine/status columns or a sidecar table before any cleanup.',
      'Run an ownership/provenance impact audit before quarantining or removing referenced rows.',
    ],
  };

  return { globalReport, unsupportedReport, reverseReport, sourceAudit };
}

async function writeReports(reports) {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(GLOBAL_JSON, `${JSON.stringify(reports.globalReport, null, 2)}\n`);
  await fs.writeFile(GLOBAL_MD, buildGlobalMarkdown(reports.globalReport));
  await fs.writeFile(UNSUPPORTED_JSON, `${JSON.stringify(reports.unsupportedReport, null, 2)}\n`);
  await fs.writeFile(UNSUPPORTED_MD, buildUnsupportedMarkdown(reports.unsupportedReport));
  await fs.writeFile(REVERSE_JSON, `${JSON.stringify(reports.reverseReport, null, 2)}\n`);
  await fs.writeFile(REVERSE_MD, buildReverseMarkdown(reports.reverseReport));
  await fs.writeFile(SOURCE_AUDIT_MD, buildSourceAuditMarkdown(reports.sourceAudit));
}

async function main() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error('SUPABASE_DB_URL is required for read-only printing truth audit.');
  }

  const client = new pg.Client({
    connectionString,
    ssl: sslForConnectionString(connectionString),
    application_name: 'printing_truth_v1_read_only_audit',
    statement_timeout: 180000,
  });

  await client.connect();
  try {
    await client.query('begin transaction read only');
    const rows = await loadRows(client);
    const metadata = await loadMetadata(client);
    await client.query('commit');

    const reports = analyzeRows(rows, metadata);
    await writeReports(reports);

    console.log(JSON.stringify({
      status: 'pass',
      mode: 'READ_ONLY_PHASE_1_AUDIT',
      totals: reports.globalReport.totals,
      output_dir: path.relative(ROOT, OUT_DIR),
    }, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // ignore rollback errors
    }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
