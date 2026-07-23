const PHANTOM_NORMAL_IDENTITIES = [
  ['003', 'Beedrill ex'],
  ['015', 'Mega Pyroar ex'],
  ['022', 'Mega Greninja ex'],
  ['035', 'Mega Floette ex'],
  ['041', 'Gourgeist ex'],
  ['048', 'Mega Gallade ex'],
  ['055', 'Krookodile ex'],
  ['064', 'Cobalion ex'],
  ['065', 'Mega Dragalge ex'],
  ['073', 'Cinccino ex'],
  ['087', 'Chespin'],
  ['088', 'Froakie'],
  ['089', 'Frogadier'],
  ['090', 'Ampharos'],
  ['091', 'Xerneas'],
  ['092', 'Claydol'],
  ['093', 'Crobat'],
  ['094', 'Metang'],
  ['095', 'Sliggoo'],
  ['096', 'Tauros'],
  ['097', 'Watchog'],
  ['098', 'Beedrill ex'],
  ['099', 'Mega Pyroar ex'],
  ['100', 'Mega Greninja ex'],
  ['101', 'Mega Floette ex'],
  ['102', 'Gourgeist ex'],
  ['103', 'Cobalion ex'],
  ['104', 'Mega Dragalge ex'],
  ['105', 'Cinccino ex'],
  ['106', "AZ's Tranquility"],
  ['107', 'Emma'],
  ['108', 'Energy Retrieval'],
  ['110', 'Philippe'],
  ['111', 'Prism Tower'],
  ['112', "Roxie's Performance"],
  ['113', 'Special Red Card'],
  ['114', 'Surfing Beach'],
  ['115', 'Tool Scrapper'],
  ['116', 'Mega Greninja ex'],
  ['117', 'Mega Floette ex'],
  ['118', 'Mega Dragalge ex'],
  ['119', 'Cinccino ex'],
  ['120', "AZ's Tranquility"],
  ['121', "Roxie's Performance"],
  ['122', 'Mega Greninja ex'],
];

const ADDITIONAL_FORBIDDEN_NORMAL_IDENTITIES = [
  ['109', 'Jumbo Ice Cream'],
];

export const ME04_EXPECTED_FINISH_COUNTS_V1 = Object.freeze({
  normal: 68,
  holo: 58,
  reverse: 76,
});

export const ME04_EXPECTED_PRINTING_COUNT_V1 = 202;
export const ME04_EXPECTED_PARENT_COUNT_V1 = 122;
export const ME04_VALID_BUILD_BATTLE_NORMAL_NUMBERS_V1 = Object.freeze([
  '013',
  '029',
  '051',
  '068',
]);

function normalizeSetKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function normalizeMe04CardNumberV1(value) {
  const normalized = String(value ?? '').trim();
  if (!/^\d+$/.test(normalized)) return normalized.toUpperCase();
  return String(Number(normalized)).padStart(3, '0');
}

function normalizeCardName(value) {
  return String(value ?? '')
    .trim()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function identityKey(number, name) {
  return `${normalizeMe04CardNumberV1(number)}|${normalizeCardName(name)}`;
}

const PHANTOM_NORMAL_KEYS = new Set(
  PHANTOM_NORMAL_IDENTITIES.map(([number, name]) => identityKey(number, name)),
);

export const ME04_PHANTOM_NORMAL_IDENTITIES_V1 = Object.freeze(
  PHANTOM_NORMAL_IDENTITIES.map(([cardNumber, cardName]) => Object.freeze({
    set_key: 'me04',
    card_number: cardNumber,
    card_name: cardName,
    finish_key: 'normal',
  })),
);

export const ME04_FORBIDDEN_NORMAL_IDENTITIES_V1 = Object.freeze(
  [...PHANTOM_NORMAL_IDENTITIES, ...ADDITIONAL_FORBIDDEN_NORMAL_IDENTITIES].map(
    ([cardNumber, cardName]) => Object.freeze({
      set_key: 'me04',
      card_number: cardNumber,
      card_name: cardName,
      finish_key: 'normal',
    }),
  ),
);

export const ME04_PROTECTED_PRINTING_FACTS_V1 = Object.freeze([
  Object.freeze({ set_key: 'me04', card_number: '013', card_name: 'Delphox', finish_key: 'normal' }),
  Object.freeze({ set_key: 'me04', card_number: '029', card_name: 'Ampharos', finish_key: 'normal' }),
  Object.freeze({ set_key: 'me04', card_number: '051', card_name: 'Crobat', finish_key: 'normal' }),
  Object.freeze({ set_key: 'me04', card_number: '068', card_name: 'Goodra', finish_key: 'normal' }),
  Object.freeze({ set_key: 'me04', card_number: '109', card_name: 'Jumbo Ice Cream', finish_key: 'holo' }),
]);

const FORBIDDEN_NORMAL_KEYS = new Set(
  ME04_FORBIDDEN_NORMAL_IDENTITIES_V1.map((row) => identityKey(row.card_number, row.card_name)),
);

export const ME04_INGESTION_TRUTH_PROFILE_V1 = Object.freeze({
  contract_version: 'INGESTION_PIPELINE_CONTRACT_V1:ME04_FINISH_TRUTH_V1',
  set_key: 'me04',
  expected_parent_count: ME04_EXPECTED_PARENT_COUNT_V1,
  expected_printing_count: ME04_EXPECTED_PRINTING_COUNT_V1,
  expected_finish_counts: ME04_EXPECTED_FINISH_COUNTS_V1,
  suppressed_printing_facts: ME04_PHANTOM_NORMAL_IDENTITIES_V1,
  forbidden_printing_facts: ME04_FORBIDDEN_NORMAL_IDENTITIES_V1,
  protected_printing_facts: ME04_PROTECTED_PRINTING_FACTS_V1,
  historical_suppressed_printing_fact_count: ME04_PHANTOM_NORMAL_IDENTITIES_V1.length,
  forbidden_normal_printing_fact_count: ME04_FORBIDDEN_NORMAL_IDENTITIES_V1.length,
  protected_normal_numbers: ME04_VALID_BUILD_BATTLE_NORMAL_NUMBERS_V1,
  holo_only_numbers: Object.freeze(['109']),
  source_evidence_refs: Object.freeze([
    'docs/audits/verified_master_set_index_v1/source_fixtures/generated_me04_finish_governance_v1/me04.json',
  ]),
});

export function me04PrintingIdentityV1(row) {
  return {
    set_key: normalizeSetKey(row?.set_key ?? row?.set_code),
    card_number: normalizeMe04CardNumberV1(
      row?.card_number ?? row?.number_plain ?? row?.number,
    ),
    card_name: String(row?.card_name ?? row?.index_card_name ?? row?.name ?? '').trim(),
    finish_key: String(row?.finish_key ?? '').trim().toLowerCase(),
  };
}

export function isMe04PhantomNormalV1(row) {
  const identity = me04PrintingIdentityV1(row);
  return ['me04', 'me4'].includes(identity.set_key)
    && identity.finish_key === 'normal'
    && PHANTOM_NORMAL_KEYS.has(identityKey(identity.card_number, identity.card_name));
}

export function isMe04ForbiddenNormalV1(row) {
  const identity = me04PrintingIdentityV1(row);
  return ['me04', 'me4'].includes(identity.set_key)
    && identity.finish_key === 'normal'
    && FORBIDDEN_NORMAL_KEYS.has(identityKey(identity.card_number, identity.card_name));
}

export function applyMe04FinishTruthV1(rows) {
  const retained = [];
  const removed = [];
  for (const row of rows ?? []) {
    if (isMe04PhantomNormalV1(row)) removed.push(row);
    else retained.push(row);
  }
  return { retained, removed };
}

export function summarizeMe04PrintingsV1(rows) {
  const byFinish = {};
  const me04Rows = [];
  for (const row of rows ?? []) {
    const identity = me04PrintingIdentityV1(row);
    if (!['me04', 'me4'].includes(identity.set_key)) continue;
    me04Rows.push(row);
    byFinish[identity.finish_key] = (byFinish[identity.finish_key] ?? 0) + 1;
  }
  return { total: me04Rows.length, by_finish: byFinish, rows: me04Rows };
}

export function assertMe04FinishTruthV1(rows, label = 'ME04 printing rows') {
  const summary = summarizeMe04PrintingsV1(rows);
  const forbiddenNormalRows = summary.rows.filter(isMe04ForbiddenNormalV1);
  if (forbiddenNormalRows.length > 0) {
    throw new Error(`${label} contains ${forbiddenNormalRows.length} forbidden Normal rows.`);
  }
  if (summary.total !== ME04_EXPECTED_PRINTING_COUNT_V1) {
    throw new Error(`${label} must contain exactly ${ME04_EXPECTED_PRINTING_COUNT_V1} rows; found ${summary.total}.`);
  }
  for (const [finishKey, expectedCount] of Object.entries(ME04_EXPECTED_FINISH_COUNTS_V1)) {
    const actualCount = summary.by_finish[finishKey] ?? 0;
    if (actualCount !== expectedCount) {
      throw new Error(`${label} must contain ${expectedCount} ${finishKey} rows; found ${actualCount}.`);
    }
  }
  const exactPrintingKeys = summary.rows.map((row) => {
    const identity = me04PrintingIdentityV1(row);
    return `${identity.card_number}|${normalizeCardName(identity.card_name)}|${identity.finish_key}`;
  });
  if (new Set(exactPrintingKeys).size !== exactPrintingKeys.length) {
    throw new Error(`${label} contains duplicate exact printing identities.`);
  }
  const exactPrintingKeySet = new Set(exactPrintingKeys);
  for (const protectedFact of ME04_PROTECTED_PRINTING_FACTS_V1) {
    const identity = me04PrintingIdentityV1(protectedFact);
    const protectedKey = `${identity.card_number}|${normalizeCardName(identity.card_name)}|${identity.finish_key}`;
    if (!exactPrintingKeySet.has(protectedKey)) {
      throw new Error(
        `${label} is missing protected ${identity.finish_key} #${identity.card_number} ${identity.card_name}.`,
      );
    }
  }
  const exactParentKeys = new Set(summary.rows.map((row) => {
    const identity = me04PrintingIdentityV1(row);
    return `${identity.card_number}|${normalizeCardName(identity.card_name)}`;
  }));
  if (exactParentKeys.size !== ME04_EXPECTED_PARENT_COUNT_V1) {
    throw new Error(
      `${label} must contain exactly ${ME04_EXPECTED_PARENT_COUNT_V1} parent identities; found ${exactParentKeys.size}.`,
    );
  }
  const jumboIceCreamRows = summary.rows.filter((row) => {
    const identity = me04PrintingIdentityV1(row);
    return identity.card_number === '109' && normalizeCardName(identity.card_name) === 'jumbo ice cream';
  });
  if (jumboIceCreamRows.length !== 1 || me04PrintingIdentityV1(jumboIceCreamRows[0]).finish_key !== 'holo') {
    throw new Error(`${label} must contain Holo-only #109 Jumbo Ice Cream exactly once.`);
  }
  const normalNumbers = new Set(
    summary.rows
      .filter((row) => me04PrintingIdentityV1(row).finish_key === 'normal')
      .map((row) => me04PrintingIdentityV1(row).card_number),
  );
  for (const number of ME04_VALID_BUILD_BATTLE_NORMAL_NUMBERS_V1) {
    if (!normalNumbers.has(number)) {
      throw new Error(`${label} is missing valid Build & Battle Normal #${number}.`);
    }
  }
  return summary;
}
