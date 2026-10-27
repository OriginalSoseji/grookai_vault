import crypto from 'node:crypto';

export const POKEMON_SPECIAL_PRINTING_REFERENCE_PROPOSAL_V1 =
  'POKEMON_SPECIAL_PRINTING_REFERENCE_PROPOSAL_V1';

const COUNTDOWN_GROUP_ID = 2155;
const COUNTDOWN_GROUP_NAME = 'Countdown Calendar Promos';
const COUNTDOWN_SET_URL =
  'https://www.tcgplayer.com/categories/trading-and-collectible-card-games/pokemon/price-guides/countdown-calendar-promos';
const COUNTDOWN_PHYSICAL_REFERENCE_URL =
  'https://bulbapedia.bulbagarden.net/wiki/Countdown_Calendar';

function text(value) {
  return String(value ?? '').trim();
}

function normalize(value) {
  return text(value)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function pokemonPrintedDenominatorV1(value) {
  const match = text(value).match(/\/\s*0*(\d+)\s*$/);
  return match ? Number(match[1]) : null;
}

function verifiedSetTotals(set) {
  const totals = [];
  for (const source of Object.values(set?.source_totals ?? {})) {
    for (const key of ['printed_total', 'official']) {
      const value = Number(source?.[key]);
      if (Number.isInteger(value) && value > 0) totals.push(value);
    }
  }
  return [...new Set(totals)].sort((left, right) => left - right);
}

export function buildPokemonVerifiedSetDenominatorIndexV1(setRegistry) {
  return new Map((setRegistry?.sets ?? []).map((set) => [
    text(set.key),
    verifiedSetTotals(set),
  ]));
}

function exactMappedBaseReferences(row) {
  return (row?.candidate_search?.diagnostic_reference_targets ?? []).filter((target) => (
    target?.diagnostic_reference_evidence?.name_exact === true
    && target?.diagnostic_reference_evidence?.number_exact === true
    && Number(target?.active_standard_identity_count) === 1
    && Number(target?.active_tcgplayer_mapping_count) === 1
    && !text(target?.variant_key)
  ));
}

function resolveBaseReference(row, setDenominators) {
  const denominator = pokemonPrintedDenominatorV1(row?.printed_number);
  const exact = exactMappedBaseReferences(row);
  const routed = denominator === null
    ? exact
    : exact.filter((target) => (
      setDenominators.get(text(target?.set_code)) ?? []
    ).includes(denominator));
  const unique = [...new Map(routed.map((target) => [text(target.card_print_id), target])).values()];
  if (unique.length === 1) {
    return {
      status: 'unique_base_reference',
      denominator,
      target: unique[0],
      blockers: [],
    };
  }
  return {
    status: unique.length === 0 ? 'base_reference_missing' : 'base_reference_ambiguous',
    denominator,
    target: null,
    blockers: [unique.length === 0
      ? 'unique_exact_mapped_base_reference_missing'
      : 'multiple_exact_mapped_base_references'],
  };
}

function exactMasterStampedFacts(masterPrintings, target) {
  return (masterPrintings ?? []).filter((fact) => (
    ['master_verified', 'human_source_verified'].includes(text(fact?.status))
    && text(fact?.finish_key) === 'stamped'
    && text(fact?.set_key) === text(target?.set_code)
    && normalize(fact?.card_name) === normalize(target?.canonical_name)
    && normalize(fact?.card_number) === normalize(target?.canonical_number)
  ));
}

function treatmentForRow(row) {
  const silver = Number(row?.source_product_id) === 153100
    && normalize(row?.source_product_name).startsWith('pikachu dp16');
  return {
    variant_key: silver
      ? 'countdown_calendar_2008_silver_snowflake_stamp'
      : 'countdown_calendar_2008_gold_snowflake_stamp',
    stamp_color: silver ? 'silver' : 'gold',
    proposed_finish_key: silver ? 'holo' : 'normal',
    expected_source_subtype: silver ? 'Holofoil' : 'Normal',
  };
}

function gvSuffix(value) {
  return text(value).toUpperCase().replaceAll('_', '-');
}

export function buildPokemonSpecialPrintingReferenceProposalV1({
  diagnosticRows = [],
  setRegistry = { sets: [] },
  masterPrintings = [],
} = {}) {
  const setDenominators = buildPokemonVerifiedSetDenominatorIndexV1(setRegistry);
  const sourceRows = diagnosticRows.filter((row) => (
    Number(row?.source_group_id) === COUNTDOWN_GROUP_ID
    && text(row?.source_group_name) === COUNTDOWN_GROUP_NAME
  ));
  const rows = sourceRows.map((row) => {
    const route = resolveBaseReference(row, setDenominators);
    const treatment = treatmentForRow(row);
    const masterFacts = route.target
      ? exactMasterStampedFacts(masterPrintings, route.target)
      : [];
    const subtypeExact = (row?.source_subtypes ?? []).length === 1
      && text(row.source_subtypes[0]) === treatment.expected_source_subtype;
    const blockers = [
      ...route.blockers,
      route.target && masterFacts.length === 0 ? 'master_stamped_fact_missing' : null,
      route.target && masterFacts.length > 1 ? 'master_stamped_fact_not_unique' : null,
      !subtypeExact ? 'source_subtype_conflicts_with_countdown_treatment' : null,
    ].filter(Boolean);
    const proposedParentGvId = route.target
      ? `${route.target.gv_id}-${gvSuffix(treatment.variant_key)}`
      : null;
    return {
      source_product_id: Number(row.source_product_id),
      source_product_name: text(row.source_product_name),
      source_group_id: COUNTDOWN_GROUP_ID,
      source_group_name: COUNTDOWN_GROUP_NAME,
      source_subtypes: [...(row.source_subtypes ?? [])],
      printed_number: text(row.printed_number),
      printed_denominator: route.denominator,
      base_route_status: route.status,
      base_card_print_id: route.target?.card_print_id ?? null,
      base_gv_id: route.target?.gv_id ?? null,
      base_set_code: route.target?.set_code ?? null,
      base_set_name: route.target?.set_name ?? null,
      base_name: route.target?.canonical_name ?? null,
      base_number: route.target?.canonical_number ?? null,
      proposed_variant_key: treatment.variant_key,
      proposed_stamp_color: treatment.stamp_color,
      proposed_finish_key: treatment.proposed_finish_key,
      proposed_parent_gv_id: proposedParentGvId,
      proposed_printing_gv_id: proposedParentGvId
        ? `${proposedParentGvId}-${gvSuffix(treatment.proposed_finish_key)}`
        : null,
      master_stamped_fact_count: masterFacts.length,
      master_stamped_evidence: masterFacts.flatMap((fact) => fact.source_evidence ?? []),
      source_evidence: [
        {
          source: 'tcgplayer_catalog_group',
          url: COUNTDOWN_SET_URL,
          role: 'source_product_and_market_finish_reference',
        },
        {
          source: 'bulbapedia_countdown_calendar',
          url: COUNTDOWN_PHYSICAL_REFERENCE_URL,
          role: 'group_physical_stamp_reference',
        },
      ],
      status: blockers.length === 0
        ? 'ready_for_guarded_variant_parent_plan'
        : 'blocked_before_guarded_plan',
      blockers,
      review_only: true,
      mapping_authority: false,
      canonical_write_authority: false,
      publication_authority: false,
    };
  }).sort((left, right) => left.source_product_id - right.source_product_id);

  const fingerprintPayload = {
    version: POKEMON_SPECIAL_PRINTING_REFERENCE_PROPOSAL_V1,
    source_group_id: COUNTDOWN_GROUP_ID,
    rows,
  };
  const readyCount = rows.filter((row) => (
    row.status === 'ready_for_guarded_variant_parent_plan'
  )).length;
  return {
    version: POKEMON_SPECIAL_PRINTING_REFERENCE_PROPOSAL_V1,
    database_reads_only: true,
    database_writes_performed: false,
    approvals_performed: false,
    public_visibility_changed: false,
    scope: {
      source_group_id: COUNTDOWN_GROUP_ID,
      source_group_name: COUNTDOWN_GROUP_NAME,
      queued_products_only: true,
    },
    summary: {
      source_rows: rows.length,
      ready_for_guarded_variant_parent_plan: readyCount,
      blocked_before_guarded_plan: rows.length - readyCount,
    },
    rows,
    fingerprint_sha256: sha256(stableJson(fingerprintPayload)),
  };
}
