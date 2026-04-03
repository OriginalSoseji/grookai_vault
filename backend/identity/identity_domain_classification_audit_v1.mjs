import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const ROOT = process.cwd();

const INPUT_AUDIT_PATH = path.join(
  ROOT,
  'docs',
  'checkpoints',
  'identity_audit_results_v1.json',
);
const INPUT_DOMAIN_DISTRIBUTION_PATH = path.join(
  ROOT,
  'docs',
  'checkpoints',
  'full_db_audit_v1',
  '11_domain_distribution.json',
);
const INPUT_NUMBER_PROVENANCE_PATH = path.join(
  ROOT,
  'docs',
  'checkpoints',
  'full_db_audit_v1',
  '15_number_field_provenance.json',
);

const OUTPUT_AUDIT_PATH = path.join(
  ROOT,
  'docs',
  'checkpoints',
  'identity_domain_classification_audit_v1.json',
);
const OUTPUT_SET_INVENTORY_PATH = path.join(
  ROOT,
  'docs',
  'checkpoints',
  'identity_domain_classification_set_inventory_v1.json',
);
const OUTPUT_SAMPLES_PATH = path.join(
  ROOT,
  'docs',
  'checkpoints',
  'identity_domain_classification_samples_v1.json',
);
const OUTPUT_SUMMARY_PATH = path.join(
  ROOT,
  'docs',
  'checkpoints',
  'IDENTITY_DOMAIN_CLASSIFICATION_AUDIT_V1.md',
);

const EXCLUDED_NONCANON_DOMAIN = 'EXCLUDED_NONCANON_DOMAIN';
const BLOCKED_UNKNOWN_DOMAIN = 'BLOCKED_UNKNOWN_DOMAIN';
const BLOCKED_CONFLICTING_SIGNALS = 'BLOCKED_CONFLICTING_SIGNALS';
const READY_DOMAIN_CLASSIFIED = 'READY_DOMAIN_CLASSIFIED';

const APPROVED_IDENTITY_DOMAINS = [
  'pokemon_eng_standard',
  'pokemon_eng_special_print',
  'pokemon_ba',
  'pokemon_jpn',
];

const JPN_DOMAIN_TOKENS = new Set([
  'pokemon_jpn',
  'pokemon_japanese',
  'jpn',
  'jp',
  'ja',
  'japanese',
]);

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function writeText(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, value);
}

function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function lowerText(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.toLowerCase() : null;
}

function upperText(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.toUpperCase() : null;
}

function uniqueSorted(values) {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeText(value))
        .filter((value) => value !== null),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

function countBy(items, keyFn) {
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Object.fromEntries(
    Array.from(counts.entries()).sort(([left], [right]) =>
      String(left).localeCompare(String(right)),
    ),
  );
}

function pickFirstParsedCandidate(row) {
  const candidates = Array.isArray(row.parsed_candidates) ? row.parsed_candidates : [];
  return candidates.length > 0 ? candidates[0] : null;
}

function hasExplicitJpnSource(sourceObject, sourceDomain) {
  const explicitValues = [
    sourceDomain,
    sourceObject?.domain,
    sourceObject?.identity_domain,
    sourceObject?.canon_domain,
    sourceObject?.language,
    sourceObject?.lang,
    sourceObject?.locale,
  ]
    .map(lowerText)
    .filter((value) => value !== null);

  return explicitValues.some((value) => JPN_DOMAIN_TOKENS.has(value));
}

function makeEvidence(field, value, reason) {
  return {
    field,
    value,
    reason,
  };
}

function buildAllowedEvidenceRules() {
  return [
    '`pokemon_ba` only when stored set/card evidence explicitly proves BA lineage.',
    '`pokemon_eng_special_print` only when stored evidence explicitly proves promo or special-print family membership.',
    '`pokemon_jpn` only when stored metadata explicitly marks a Japanese domain or language surface.',
    '`pokemon_eng_standard` only when stored evidence affirmatively marks the row as English standard; null or absent domain data is not proof.',
    '`tcg_pocket` is excluded only when stored source-domain evidence explicitly says `tcg_pocket`.',
  ];
}

function buildDisallowedEvidenceRules() {
  return [
    'Null or blank `sets.source->>domain` may not default to `pokemon_eng_standard`.',
    'Historical memory outside stored DB/checkpoint evidence may not assign BA lineage.',
    'Unrecorded promo knowledge may not assign `pokemon_eng_special_print`.',
    'Guessed set-code families may not assign `pokemon_jpn`.',
    'No row may be written to `card_print_identity` in this phase.',
  ];
}

function buildSetSignals(setRow) {
  const setCode = lowerText(setRow.set_code);
  const setName = lowerText(setRow.set_name);
  const setRole = lowerText(setRow.set_role);
  const sourceDomain = lowerText(setRow.source_domain);
  const printedSetAbbrev = upperText(setRow.printed_set_abbrev);
  const sourceObject = setRow.source ?? {};

  const signals = {
    pokemon_ba: [],
    pokemon_eng_special_print: [],
    pokemon_jpn: [],
    pokemon_eng_standard: [],
    excluded_noncanon_domain: [],
  };

  if (sourceDomain === 'tcg_pocket') {
    signals.excluded_noncanon_domain.push(
      makeEvidence("sets.source->>'domain'", 'tcg_pocket', 'explicit excluded non-canon domain'),
    );
  }

  if (setCode && /^ba-\d{4}$/.test(setCode)) {
    signals.pokemon_ba.push(
      makeEvidence('sets.code', setRow.set_code, 'explicit Battle Academy set-code family'),
    );
  }
  if (setName && setName.includes('battle academy')) {
    signals.pokemon_ba.push(
      makeEvidence('sets.name', setRow.set_name, 'explicit Battle Academy set naming'),
    );
  }

  if (hasExplicitJpnSource(sourceObject, sourceDomain)) {
    signals.pokemon_jpn.push(
      makeEvidence(
        'sets.source',
        sourceObject,
        'explicit Japanese domain/language marker in stored source metadata',
      ),
    );
  }

  if (sourceDomain === 'pokemon_eng_special_print') {
    signals.pokemon_eng_special_print.push(
      makeEvidence("sets.source->>'domain'", setRow.source_domain, 'explicit special-print domain'),
    );
  }
  if (setRole === 'promotion_umbrella') {
    signals.pokemon_eng_special_print.push(
      makeEvidence('sets.set_role', setRow.set_role, 'explicit promotion umbrella set role'),
    );
  }
  if (setName && setName.includes('black star promos')) {
    signals.pokemon_eng_special_print.push(
      makeEvidence('sets.name', setRow.set_name, 'explicit Black Star Promos naming'),
    );
  }
  if (printedSetAbbrev && printedSetAbbrev.startsWith('PR-')) {
    signals.pokemon_eng_special_print.push(
      makeEvidence(
        'sets.printed_set_abbrev',
        setRow.printed_set_abbrev,
        'explicit promo printed set abbreviation',
      ),
    );
  }
  if (setCode && setCode.startsWith('tk-')) {
    signals.pokemon_eng_special_print.push(
      makeEvidence('sets.code', setRow.set_code, 'explicit Trainer Kit set-code family'),
    );
  }
  if (setName && setName.includes('trainer kit')) {
    signals.pokemon_eng_special_print.push(
      makeEvidence('sets.name', setRow.set_name, 'explicit Trainer Kit naming'),
    );
  }
  if (printedSetAbbrev === 'TK') {
    signals.pokemon_eng_special_print.push(
      makeEvidence(
        'sets.printed_set_abbrev',
        setRow.printed_set_abbrev,
        'explicit Trainer Kit printed set abbreviation',
      ),
    );
  }

  if (sourceDomain === 'pokemon_eng_standard') {
    signals.pokemon_eng_standard.push(
      makeEvidence("sets.source->>'domain'", setRow.source_domain, 'explicit english standard domain'),
    );
  }
  if (lowerText(sourceObject?.identity_domain) === 'pokemon_eng_standard') {
    signals.pokemon_eng_standard.push(
      makeEvidence(
        'sets.source.identity_domain',
        sourceObject.identity_domain,
        'explicit english standard identity domain',
      ),
    );
  }
  if (lowerText(sourceObject?.canon_domain) === 'pokemon_eng_standard') {
    signals.pokemon_eng_standard.push(
      makeEvidence(
        'sets.source.canon_domain',
        sourceObject.canon_domain,
        'explicit english standard canon domain',
      ),
    );
  }

  return signals;
}

function classifySetFromSignals(signals) {
  if (signals.excluded_noncanon_domain.length > 0) {
    return {
      classification: EXCLUDED_NONCANON_DOMAIN,
      evidence_basis: signals.excluded_noncanon_domain,
      candidate_domains: [],
    };
  }

  const candidateDomains = APPROVED_IDENTITY_DOMAINS.filter(
    (domain) => (signals[domain] ?? []).length > 0,
  );

  if (candidateDomains.length === 1) {
    const domain = candidateDomains[0];
    return {
      classification: domain,
      evidence_basis: signals[domain],
      candidate_domains: candidateDomains,
    };
  }

  if (candidateDomains.length > 1) {
    return {
      classification: BLOCKED_UNKNOWN_DOMAIN,
      evidence_basis: candidateDomains.flatMap((domain) => signals[domain]),
      candidate_domains: candidateDomains,
    };
  }

  return {
    classification: BLOCKED_UNKNOWN_DOMAIN,
    evidence_basis: [],
    candidate_domains: [],
  };
}

function buildRowContradictionSignals(setRow, parsedRow) {
  const contradictionSignals = [];
  const parsedIdentity = parsedRow.parsed_identity;
  const externalId = lowerText(setRow.example_external_id);
  const provenanceRef = lowerText(setRow.example_provenance_ref);

  if (externalId && parsedIdentity && externalId.startsWith('ba-')) {
    contradictionSignals.push(
      makeEvidence(
        'external_mappings.external_id',
        setRow.example_external_id,
        'row-level BA-coded external_id contradicts inherited set classification',
      ),
    );
  }

  if (
    (externalId && externalId.includes('jp')) ||
    (provenanceRef && provenanceRef.includes('jp'))
  ) {
    contradictionSignals.push(
      makeEvidence(
        'external provenance',
        {
          external_id: setRow.example_external_id,
          provenance_ref: setRow.example_provenance_ref,
        },
        'row-level JP token would contradict inherited set classification',
      ),
    );
  }

  return contradictionSignals;
}

function buildSetInventoryItem(setRow, signals, classificationResult) {
  return {
    set_id: setRow.set_id,
    set_code: setRow.set_code,
    set_name: setRow.set_name,
    game: setRow.game,
    printed_set_abbrev: setRow.printed_set_abbrev,
    printed_total: setRow.printed_total,
    set_role: setRow.set_role,
    source: setRow.source,
    source_domain: setRow.source_domain,
    parsed_row_count: setRow.parsed_row_count,
    mapping_sources_present: setRow.mapping_sources_present,
    provenance_sources_present: setRow.provenance_sources_present,
    signal_exists: {
      pokemon_ba: signals.pokemon_ba.length > 0,
      pokemon_eng_special_print: signals.pokemon_eng_special_print.length > 0,
      pokemon_jpn: signals.pokemon_jpn.length > 0,
      pokemon_eng_standard: signals.pokemon_eng_standard.length > 0,
      excluded_noncanon_domain: signals.excluded_noncanon_domain.length > 0,
    },
    signal_evidence: signals,
    classification: classificationResult.classification,
    classification_evidence_basis: classificationResult.evidence_basis,
    candidate_domains: classificationResult.candidate_domains,
  };
}

function buildSamples(rows, targetCount) {
  const readyRows = rows.filter((row) => row.classification_status === READY_DOMAIN_CLASSIFIED);
  const blockedRows = rows.filter(
    (row) =>
      row.classification_status === BLOCKED_UNKNOWN_DOMAIN ||
      row.classification_status === BLOCKED_CONFLICTING_SIGNALS,
  );
  const excludedRows = rows.filter(
    (row) => row.classification_status === EXCLUDED_NONCANON_DOMAIN,
  );
  const promoRows = rows.filter((row) =>
    row.exact_evidence_used.some((evidence) =>
      String(evidence.reason).toLowerCase().includes('promo') ||
      String(evidence.reason).toLowerCase().includes('promotion'),
    ),
  );
  const trainerKitRows = rows.filter((row) => {
    const setCode = lowerText(row.set_code);
    const printedSetAbbrev = upperText(row.printed_set_abbrev);
    return (
      (setCode && setCode.startsWith('tk-')) ||
      printedSetAbbrev === 'TK' ||
      row.exact_evidence_used.some((evidence) =>
        String(evidence.reason).toLowerCase().includes('trainer kit'),
      )
    );
  });

  return {
    generated_at: new Date().toISOString(),
    parsed_row_count: targetCount,
    category_counts: {
      ready_available: readyRows.length,
      blocked_available: blockedRows.length,
      excluded_available: excludedRows.length,
      promo_special_available: promoRows.length,
      trainer_kit_available: trainerKitRows.length,
    },
    ready_rows: readyRows.slice(0, 15),
    blocked_rows: blockedRows.slice(0, 15),
    excluded_rows: excludedRows.slice(0, 10),
    promo_special_rows: promoRows.slice(0, 10),
    trainer_kit_weird_code_rows: trainerKitRows.slice(0, 10),
  };
}

function buildSummaryMarkdown({
  parsedInputCount,
  supportedSurfaceTargetCount,
  setInventory,
  rowResults,
  finalDecision,
  blockedRowCount,
  blockedSetCount,
}) {
  const setCounts = countBy(setInventory.set_inventory, (row) => row.classification);
  const rowCounts = countBy(rowResults, (row) => row.classification_status);
  const readyDomainCounts = countBy(
    rowResults.filter((row) => row.classification_status === READY_DOMAIN_CLASSIFIED),
    (row) => row.identity_domain_candidate,
  );

  const lines = [
    '# IDENTITY_DOMAIN_CLASSIFICATION_AUDIT_V1',
    '',
    '## Why This Audit Exists',
    'This audit tests whether the parsed legacy supported null-parent surface can be assigned to an identity domain using only live stored set/card evidence. It is read-only and classification-only.',
    '',
    '## Input Surfaces Used',
    '- `docs/checkpoints/identity_audit_results_v1.json`',
    '- `docs/checkpoints/full_db_audit_v1/11_domain_distribution.json`',
    '- `docs/checkpoints/full_db_audit_v1/15_number_field_provenance.json`',
    '- live remote `sets`, `card_prints`, `external_mappings`, and `card_printings` read-only queries',
    '',
    '## Allowed Evidence',
    ...buildAllowedEvidenceRules().map((rule) => `- ${rule}`),
    '',
    '## Disallowed Evidence',
    ...buildDisallowedEvidenceRules().map((rule) => `- ${rule}`),
    '',
    '## What Was Provably Classifiable',
    `- parsed input rows: ${parsedInputCount}`,
    `- supported target surface: ${supportedSurfaceTargetCount}`,
    ...Object.entries(readyDomainCounts).map(
      ([domain, count]) => `- ${domain}: ${count}`,
    ),
    '',
    '## What Remains Blocked',
    ...Object.entries(rowCounts)
      .filter(([status]) => status !== READY_DOMAIN_CLASSIFIED)
      .map(([status, count]) => `- ${status}: ${count}`),
    `- blocked set count: ${blockedSetCount}`,
    '',
    '## Whether `pokemon_eng_standard` Can Be Assigned Lawfully On This Legacy Surface',
    'No. The current stored evidence does not affirmatively prove `pokemon_eng_standard` for the unresolved majority. Null or blank source-domain metadata remains insufficient.',
    '',
    '## Set-Level Classification Counts',
    ...Object.entries(setCounts).map(([classification, count]) => `- ${classification}: ${count}`),
    '',
    '## Exact Next Step',
    finalDecision === 'PASS_READY_FOR_DOMAIN_INJECTION'
      ? 'Every non-excluded parsed row is classifiable. Domain injection can proceed under the audited resolver.'
      : 'STOP_DOMAIN_GOVERNANCE_REQUIRED. Governance or stored-domain evidence must be added before any domain injection proceeds on the blocked rows.',
    '',
  ];

  return `${lines.join('\n')}`;
}

async function loadSetInventoryRows(client, cardPrintIds) {
  const sql = `
    with parsed_ids as (
      select unnest($1::uuid[]) as card_print_id
    )
    select
      s.id as set_id,
      s.code as set_code,
      s.name as set_name,
      s.game,
      s.printed_set_abbrev,
      s.printed_total,
      s.set_role,
      s.source,
      coalesce(s.source->>'domain', '') as source_domain,
      count(distinct cp.id)::int as parsed_row_count,
      array_remove(array_agg(distinct em.source), null) as mapping_sources_present,
      array_remove(array_agg(distinct pr.provenance_source), null) as provenance_sources_present
    from parsed_ids pid
    join public.card_prints cp
      on cp.id = pid.card_print_id
    join public.sets s
      on s.id = cp.set_id
    left join public.external_mappings em
      on em.card_print_id = cp.id
     and em.active = true
    left join public.card_printings pr
      on pr.card_print_id = cp.id
    group by
      s.id,
      s.code,
      s.name,
      s.game,
      s.printed_set_abbrev,
      s.printed_total,
      s.set_role,
      s.source,
      coalesce(s.source->>'domain', '')
    order by s.code, s.id
  `;

  const { rows } = await client.query(sql, [cardPrintIds]);
  return rows.map((row) => ({
    ...row,
    source_domain: normalizeText(row.source_domain),
    mapping_sources_present: uniqueSorted(row.mapping_sources_present ?? []),
    provenance_sources_present: uniqueSorted(row.provenance_sources_present ?? []),
  }));
}

async function loadRowEvidenceRows(client, cardPrintIds) {
  const sql = `
    with parsed_ids as (
      select unnest($1::uuid[]) as card_print_id
    )
    select
      cp.id as card_print_id,
      cp.name,
      cp.set_id,
      s.code as set_code,
      s.name as set_name,
      s.game,
      s.printed_set_abbrev,
      s.printed_total,
      s.set_role,
      s.source,
      coalesce(s.source->>'domain', '') as source_domain,
      em.source as mapping_source,
      em.external_id as example_external_id,
      pr.provenance_source,
      pr.provenance_ref as example_provenance_ref
    from parsed_ids pid
    join public.card_prints cp
      on cp.id = pid.card_print_id
    join public.sets s
      on s.id = cp.set_id
    left join lateral (
      select
        em.source,
        em.external_id
      from public.external_mappings em
      where em.card_print_id = cp.id
        and em.active = true
      order by em.id
      limit 1
    ) em on true
    left join lateral (
      select
        pr.provenance_source,
        pr.provenance_ref
      from public.card_printings pr
      where pr.card_print_id = cp.id
      order by pr.id
      limit 1
    ) pr on true
    order by cp.id
  `;

  const { rows } = await client.query(sql, [cardPrintIds]);
  return rows.map((row) => ({
    ...row,
    source_domain: normalizeText(row.source_domain),
  }));
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const auditInput = readJson(INPUT_AUDIT_PATH);
  const domainDistribution = readJson(INPUT_DOMAIN_DISTRIBUTION_PATH);
  const numberProvenance = readJson(INPUT_NUMBER_PROVENANCE_PATH);

  const parsedRows = (auditInput.rows ?? []).filter(
    (row) => Array.isArray(row.parsed_candidates) && row.parsed_candidates.length > 0,
  );
  const parsedInputCount = parsedRows.length;
  const supportedSurfaceTargetCount = Number(numberProvenance.supported_null_parent_count ?? 0);

  if (parsedInputCount === 0) {
    throw new Error('Parsed input surface is empty');
  }
  if (supportedSurfaceTargetCount <= 0) {
    throw new Error('Supported null-parent target count is missing');
  }

  const cardPrintIds = parsedRows.map((row) => row.card_print_id);
  const parsedRowById = new Map(parsedRows.map((row) => [row.card_print_id, row]));

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: 'identity_domain_classification_audit_v1',
  });

  await client.connect();

  try {
    const [setInventoryRows, rowEvidenceRows] = await Promise.all([
      loadSetInventoryRows(client, cardPrintIds),
      loadRowEvidenceRows(client, cardPrintIds),
    ]);

    const setClassificationById = new Map();
    const setInventory = [];
    const observedClassificationSignals = {
      parsed_surface_domain_distribution: domainDistribution.null_parent_surface_counts ?? [],
      explicit_source_domains_present: uniqueSorted(
        setInventoryRows.map((row) => row.source_domain),
      ),
      signal_counts: {
        excluded_noncanon_domain_sets: 0,
        ba_sets: 0,
        special_print_sets: 0,
        jpn_sets: 0,
        eng_standard_sets: 0,
        promotion_umbrella_sets: 0,
        promo_abbrev_sets: 0,
        black_star_promo_named_sets: 0,
        trainer_kit_family_sets: 0,
      },
    };

    for (const setRow of setInventoryRows) {
      const signals = buildSetSignals(setRow);
      const classificationResult = classifySetFromSignals(signals);
      const inventoryItem = buildSetInventoryItem(setRow, signals, classificationResult);
      setInventory.push(inventoryItem);
      setClassificationById.set(setRow.set_id, inventoryItem);

      if (signals.excluded_noncanon_domain.length > 0) {
        observedClassificationSignals.signal_counts.excluded_noncanon_domain_sets += 1;
      }
      if (signals.pokemon_ba.length > 0) {
        observedClassificationSignals.signal_counts.ba_sets += 1;
      }
      if (signals.pokemon_eng_special_print.length > 0) {
        observedClassificationSignals.signal_counts.special_print_sets += 1;
      }
      if (signals.pokemon_jpn.length > 0) {
        observedClassificationSignals.signal_counts.jpn_sets += 1;
      }
      if (signals.pokemon_eng_standard.length > 0) {
        observedClassificationSignals.signal_counts.eng_standard_sets += 1;
      }
      if (lowerText(setRow.set_role) === 'promotion_umbrella') {
        observedClassificationSignals.signal_counts.promotion_umbrella_sets += 1;
      }
      if (upperText(setRow.printed_set_abbrev)?.startsWith('PR-')) {
        observedClassificationSignals.signal_counts.promo_abbrev_sets += 1;
      }
      if (lowerText(setRow.set_name)?.includes('black star promos')) {
        observedClassificationSignals.signal_counts.black_star_promo_named_sets += 1;
      }
      if (
        lowerText(setRow.set_code)?.startsWith('tk-') ||
        lowerText(setRow.set_name)?.includes('trainer kit') ||
        upperText(setRow.printed_set_abbrev) === 'TK'
      ) {
        observedClassificationSignals.signal_counts.trainer_kit_family_sets += 1;
      }
    }

    const setCountsByClassification = countBy(setInventory, (row) => row.classification);
    const blockedSets = setInventory.filter(
      (row) => row.classification === BLOCKED_UNKNOWN_DOMAIN,
    );
    const excludedSets = setInventory.filter(
      (row) => row.classification === EXCLUDED_NONCANON_DOMAIN,
    );

    const rowResults = [];

    for (const evidenceRow of rowEvidenceRows) {
      const parsedRow = parsedRowById.get(evidenceRow.card_print_id);
      if (!parsedRow) continue;

      const setInventoryRow = setClassificationById.get(evidenceRow.set_id);
      if (!setInventoryRow) {
        throw new Error(`Missing set inventory for set_id=${evidenceRow.set_id}`);
      }

      const chosenParsedCandidate = pickFirstParsedCandidate(parsedRow);
      const contradictionSignals = buildRowContradictionSignals(evidenceRow, parsedRow);

      let identityDomainCandidate = setInventoryRow.classification;
      let classificationStatus = BLOCKED_UNKNOWN_DOMAIN;
      let evidenceBasis = setInventoryRow.classification_evidence_basis;

      if (setInventoryRow.classification === EXCLUDED_NONCANON_DOMAIN) {
        classificationStatus = EXCLUDED_NONCANON_DOMAIN;
      } else if (APPROVED_IDENTITY_DOMAINS.includes(setInventoryRow.classification)) {
        if (contradictionSignals.length > 0) {
          classificationStatus = BLOCKED_CONFLICTING_SIGNALS;
          identityDomainCandidate = BLOCKED_CONFLICTING_SIGNALS;
          evidenceBasis = contradictionSignals;
        } else {
          classificationStatus = READY_DOMAIN_CLASSIFIED;
        }
      } else {
        classificationStatus = BLOCKED_UNKNOWN_DOMAIN;
        identityDomainCandidate = BLOCKED_UNKNOWN_DOMAIN;
      }

      rowResults.push({
        card_print_id: evidenceRow.card_print_id,
        name: evidenceRow.name,
        set_id: evidenceRow.set_id,
        set_code: evidenceRow.set_code,
        set_name: evidenceRow.set_name,
        printed_set_abbrev: evidenceRow.printed_set_abbrev,
        source_domain: evidenceRow.source_domain,
        mapping_source: evidenceRow.mapping_source,
        example_external_id: evidenceRow.example_external_id,
        example_provenance_ref: evidenceRow.example_provenance_ref,
        parsed_identity: chosenParsedCandidate?.printed_identity ?? null,
        parse_source: chosenParsedCandidate?.source ?? null,
        parsed_identity_sources: uniqueSorted(
          (parsedRow.parsed_candidates ?? []).map((candidate) => candidate.source),
        ),
        identity_domain_candidate: identityDomainCandidate,
        classification_status: classificationStatus,
        evidence_basis: evidenceBasis,
        exact_evidence_used: evidenceBasis,
      });
    }

    const readyCount = rowResults.filter(
      (row) => row.classification_status === READY_DOMAIN_CLASSIFIED,
    ).length;
    const blockedUnknownDomainCount = rowResults.filter(
      (row) => row.classification_status === BLOCKED_UNKNOWN_DOMAIN,
    ).length;
    const blockedConflictingSignalsCount = rowResults.filter(
      (row) => row.classification_status === BLOCKED_CONFLICTING_SIGNALS,
    ).length;
    const excludedNoncanonCount = rowResults.filter(
      (row) => row.classification_status === EXCLUDED_NONCANON_DOMAIN,
    ).length;
    const blockedRowCount = blockedUnknownDomainCount + blockedConflictingSignalsCount;
    const blockedSetCount = blockedSets.length;

    const auditOutput = {
      phase: 'IDENTITY_DOMAIN_CLASSIFICATION_AUDIT_V1',
      generated_at: new Date().toISOString(),
      parsed_input_count: parsedInputCount,
      supported_surface_target_count: supportedSurfaceTargetCount,
      row_level_results_count: rowResults.length,
      ready_count: readyCount,
      blocked_unknown_domain_count: blockedUnknownDomainCount,
      blocked_conflicting_signals_count: blockedConflictingSignalsCount,
      excluded_noncanon_count: excludedNoncanonCount,
      counts_by_identity_domain_candidate: countBy(
        rowResults,
        (row) => row.identity_domain_candidate,
      ),
      row_level_results_sample: rowResults.slice(0, 50),
      final_status: {
        decision:
          blockedRowCount === 0
            ? 'PASS_READY_FOR_DOMAIN_INJECTION'
            : 'STOP_DOMAIN_GOVERNANCE_REQUIRED',
        exact_blocked_row_count: blockedRowCount,
        exact_blocked_set_count: blockedSetCount,
        pipeline_may_proceed_unchanged_after_adding_domain_resolver: blockedRowCount === 0,
        contract_or_governance_work_required_first: blockedRowCount > 0,
      },
    };

    const setInventoryOutput = {
      phase: 'IDENTITY_DOMAIN_CLASSIFICATION_AUDIT_V1',
      generated_at: new Date().toISOString(),
      parsed_input_count: parsedInputCount,
      supported_surface_target_count: supportedSurfaceTargetCount,
      parsed_set_count: setInventory.length,
      set_inventory: setInventory,
      observed_classification_signals: observedClassificationSignals,
      unresolved_set_count: blockedSets.length,
      set_level_classification_results: setInventory.map((row) => ({
        set_id: row.set_id,
        set_code: row.set_code,
        set_name: row.set_name,
        classification: row.classification,
        classification_evidence_basis: row.classification_evidence_basis,
        candidate_domains: row.candidate_domains,
      })),
      counts_by_classification: setCountsByClassification,
      blocked_sets: blockedSets.map((row) => ({
        set_id: row.set_id,
        set_code: row.set_code,
        set_name: row.set_name,
        evidence_basis: row.classification_evidence_basis,
      })),
      excluded_sets: excludedSets.map((row) => ({
        set_id: row.set_id,
        set_code: row.set_code,
        set_name: row.set_name,
        evidence_basis: row.classification_evidence_basis,
      })),
    };

    const sampleOutput = buildSamples(rowResults, parsedInputCount);
    const summaryMarkdown = buildSummaryMarkdown({
      parsedInputCount,
      supportedSurfaceTargetCount,
      setInventory: setInventoryOutput,
      rowResults,
      finalDecision: auditOutput.final_status.decision,
      blockedRowCount,
      blockedSetCount,
    });

    writeJson(OUTPUT_SET_INVENTORY_PATH, setInventoryOutput);
    writeJson(OUTPUT_AUDIT_PATH, auditOutput);
    writeJson(OUTPUT_SAMPLES_PATH, sampleOutput);
    writeText(OUTPUT_SUMMARY_PATH, summaryMarkdown);

    console.log(
      JSON.stringify(
        {
          phase: 'IDENTITY_DOMAIN_CLASSIFICATION_AUDIT_V1',
          parsed_input_count: parsedInputCount,
          supported_surface_target_count: supportedSurfaceTargetCount,
          ready_count: readyCount,
          blocked_unknown_domain_count: blockedUnknownDomainCount,
          blocked_conflicting_signals_count: blockedConflictingSignalsCount,
          excluded_noncanon_count: excludedNoncanonCount,
          final_decision: auditOutput.final_status.decision,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
