import '../env.mjs';

import fs from 'node:fs/promises';
import pg from 'pg';
import { createTcgdexClient } from '../clients/tcgdex.mjs';

const { Client } = pg;

const WORKER_NAME = 'source_image_enrichment_worker_v1';
const SOURCE_NAME = 'tcgdex';
const ALLOWED_SET_CODE = 'me03';
const COLLISION_REPRESENTATIVE_NOTE =
  'Identity is confirmed. Displayed image is a shared representative image until the exact variant image is available.';
const STAMP_REPRESENTATIVE_NOTE =
  'Identity is confirmed. Displayed image is a representative image until the exact stamped image is available.';

const VARIANT_KEY_TO_RARITY = new Map([
  ['illustration_rare', 'illustration rare'],
  ['shiny_rare', 'shiny rare'],
  ['special_illustration_rare', 'special illustration rare'],
  ['double_rare', 'double rare'],
  ['ultra_rare', 'ultra rare'],
  ['hyper_rare', 'hyper rare'],
]);

function log(event, payload = {}) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      worker: WORKER_NAME,
      event,
      ...payload,
    }),
  );
}

function parseArgs(argv) {
  const options = {
    setCode: null,
    inputJson: null,
    apply: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--apply') {
      options.apply = true;
    } else if (token === '--set-code' && argv[index + 1]) {
      options.setCode = String(argv[index + 1]).trim().toLowerCase() || null;
      index += 1;
    } else if (token.startsWith('--set-code=')) {
      options.setCode = String(token.split('=').slice(1).join('=')).trim().toLowerCase() || null;
    } else if (token === '--input-json' && argv[index + 1]) {
      options.inputJson = String(argv[index + 1]).trim() || null;
      index += 1;
    } else if (token.startsWith('--input-json=')) {
      options.inputJson = String(token.split('=').slice(1).join('=')).trim() || null;
    }
  }

  if ((options.setCode && options.inputJson) || (!options.setCode && !options.inputJson)) {
    throw new Error('[source-image-enrichment] provide exactly one of --set-code or --input-json.');
  }

  if (options.setCode && options.setCode !== ALLOWED_SET_CODE) {
    throw new Error(
      `[source-image-enrichment] V1 is scoped to ${ALLOWED_SET_CODE} only; received ${options.setCode}.`,
    );
  }

  return options;
}

function normalizeTextOrNull(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLowerOrNull(value) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeName(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  return normalized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeNumberPlainKey(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  const digits = normalized.replace(/[^0-9]/g, '');
  if (digits.length === 0) return null;
  return digits.replace(/^0+(?=\d)/, '');
}

function normalizeVariantKey(value) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeRarity(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  return normalized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function mapVariantKeyToExpectedRarity(variantKey) {
  return VARIANT_KEY_TO_RARITY.get(normalizeVariantKey(variantKey)) ?? null;
}

function normalizeTcgdexAssetImageUrl(url, printedNumber) {
  const normalizedUrl = normalizeTextOrNull(url);
  if (!normalizedUrl) return null;

  if (!printedNumber) {
    return normalizedUrl.startsWith('https://assets.tcgdex.net/')
      && !/\/(?:high|low)\.webp$/i.test(normalizedUrl)
      ? `${normalizedUrl.replace(/\/+$/, '')}/high.webp`
      : normalizedUrl;
  }

  const normalizedNumber = String(printedNumber).trim();
  if (!normalizedNumber || /^RC/i.test(normalizedNumber)) {
    return normalizedUrl.startsWith('https://assets.tcgdex.net/')
      && !/\/(?:high|low)\.webp$/i.test(normalizedUrl)
      ? `${normalizedUrl.replace(/\/+$/, '')}/high.webp`
      : normalizedUrl;
  }

  const match = normalizedUrl.match(
    /^(https:\/\/assets\.tcgdex\.net\/[^/]+\/[^/]+\/[^/]+\/)([^/]+)(\/(?:high|low)\.webp)?$/i,
  );
  if (!match) {
    return normalizedUrl;
  }

  const [, prefix, assetNumber, suffix = ''] = match;
  if (!/^RC/i.test(assetNumber)) {
    if (suffix) {
      return normalizedUrl;
    }
    return `${normalizedUrl.replace(/\/+$/, '')}/high.webp`;
  }

  const resolvedSuffix = suffix || '/high.webp';
  return `${prefix}${normalizedNumber}${resolvedSuffix}`;
}

async function fetchCardPrintRows(client, setCode) {
  const { rows } = await client.query(
    `
      select
        id,
        gv_id,
        name,
        number,
        number_plain,
        set_code,
        variant_key,
        image_url,
        representative_image_url,
        image_status,
        image_note,
        image_source
      from public.card_prints
      where set_code = $1
      order by number_plain::int nulls last, variant_key nulls first, name, id
    `,
    [setCode],
  );
  return rows;
}

async function fetchCardPrintRowsByIds(client, cardPrintIds) {
  const { rows } = await client.query(
    `
      select
        id,
        gv_id,
        name,
        number,
        number_plain,
        set_code,
        variant_key,
        image_url,
        representative_image_url,
        image_status,
        image_note,
        image_source
      from public.card_prints
      where id = any($1::uuid[])
      order by id
    `,
    [cardPrintIds],
  );
  return rows;
}

async function loadInputRows(inputJsonPath) {
  const raw = await fs.readFile(inputJsonPath, 'utf8');
  const parsed = JSON.parse(raw);
  const rows = Array.isArray(parsed?.rows) ? parsed.rows : null;
  if (!rows) {
    throw new Error('[source-image-enrichment] input json must contain a rows array.');
  }
  return rows;
}

async function applyRepresentativeImageUpdates(client, matchedRows) {
  let updated = 0;

  await client.query('begin');
  try {
    for (const row of matchedRows) {
      const { rowCount } = await client.query(
        `
          update public.card_prints
          set
            representative_image_url = $2,
            image_status = $3,
            image_note = $4,
            image_source = $5
          where id = $1
            and (image_url is null or btrim(image_url) = '')
            and (representative_image_url is null or btrim(representative_image_url) = '')
        `,
        [
          row.card_print_id,
          row.representative_image_url,
          row.image_status,
          row.image_note,
          normalizeLowerOrNull(row.image_source) ?? SOURCE_NAME,
        ],
      );
      updated += rowCount ?? 0;
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }

  return updated;
}

function buildCanonicalGroups(cardPrintRows, inputMetadataById = new Map()) {
  const groups = new Map();

  for (const row of cardPrintRows) {
    const inputMetadata = inputMetadataById.get(row.id) ?? {};
    const numberKey = normalizeNumberPlainKey(row.number_plain);
    if (!numberKey) {
      throw new Error(`[source-image-enrichment] missing number_plain for card_print ${row.id}`);
    }

    const setCode =
      normalizeLowerOrNull(inputMetadata.effective_set_code) ?? normalizeLowerOrNull(row.set_code);
    if (!setCode) {
      throw new Error(`[source-image-enrichment] missing set_code for card_print ${row.id}`);
    }

    const groupKey = `${setCode}::${numberKey}`;
    const stampLabel = normalizeTextOrNull(inputMetadata.stamp_label);
    const variantKey = normalizeVariantKey(row.variant_key);
    const isStamped =
      Boolean(stampLabel) || (variantKey ? variantKey.includes('stamp') : false);

    const current = groups.get(groupKey) ?? [];
    current.push({
      id: row.id,
      gvId: normalizeTextOrNull(row.gv_id),
      name: normalizeTextOrNull(row.name),
      number: normalizeTextOrNull(inputMetadata.printed_number ?? row.number),
      numberPlain: numberKey,
      setCode,
      stampLabel,
      isStamped,
      variantKey,
      imageUrl: normalizeTextOrNull(row.image_url),
      representativeImageUrl: normalizeTextOrNull(row.representative_image_url),
      imageStatus: normalizeLowerOrNull(row.image_status),
      imageNote: normalizeTextOrNull(row.image_note),
      imageSource: normalizeLowerOrNull(row.image_source),
    });
    groups.set(groupKey, current);
  }

  return groups;
}

function buildSiblingBaseRepresentativeByGroup(baseRows) {
  const representatives = new Map();
  for (const row of baseRows) {
    const setCode = normalizeLowerOrNull(row.set_code);
    const numberKey = normalizeNumberPlainKey(row.number_plain);
    if (!setCode || !numberKey) {
      continue;
    }

    const representativeImageUrl =
      normalizeTextOrNull(row.image_url) ?? normalizeTextOrNull(row.representative_image_url);
    if (!representativeImageUrl) {
      continue;
    }

    representatives.set(`${setCode}::${numberKey}`, {
      baseCardPrintId: normalizeTextOrNull(row.id),
      name: normalizeTextOrNull(row.name),
      number: normalizeTextOrNull(row.number),
      representativeImageUrl,
      imageSource: normalizeLowerOrNull(row.image_source) ?? SOURCE_NAME,
      imageStatus: normalizeLowerOrNull(row.image_status),
    });
  }

  return representatives;
}

function buildSourceStubGroupsBySet(tcgdexSetsByCode) {
  const groups = new Map();

  for (const [setCode, tcgdexSet] of tcgdexSetsByCode.entries()) {
    const cards = Array.isArray(tcgdexSet?.cards) ? tcgdexSet.cards : [];
    for (const card of cards) {
      const numberKey = normalizeNumberPlainKey(card?.localId);
      if (!numberKey) {
        continue;
      }

      const groupKey = `${setCode}::${numberKey}`;
      const current = groups.get(groupKey) ?? [];
      current.push({
        id: normalizeTextOrNull(card?.id),
        localId: normalizeTextOrNull(card?.localId),
        name: normalizeTextOrNull(card?.name),
        image: normalizeTextOrNull(card?.image),
        setCode,
        detail: null,
      });
      groups.set(groupKey, current);
    }
  }

  return groups;
}

async function fetchTcgdexSetsByCodesAllowingNotFound(tcgdexClient, setCodes) {
  const entries = [];
  const missingSetCodes = [];

  for (const setCode of setCodes) {
    try {
      entries.push([setCode, await tcgdexClient.fetchTcgdexSetById(setCode)]);
    } catch (error) {
      if (error?.status === 404) {
        missingSetCodes.push(setCode);
        log('source_set_missing', {
          source: SOURCE_NAME,
          set_code: setCode,
          reason: 'tcgdex_set_not_found',
        });
        entries.push([setCode, null]);
        continue;
      }
      throw error;
    }
  }

  return {
    tcgdexSetsByCode: new Map(entries),
    missingSetCodes,
  };
}

async function hydrateTcgdexDetails(tcgdexClient, sourceStubs) {
  await Promise.all(
    sourceStubs.map(async (stub) => {
      if (!stub.id) return;
      stub.detail = await tcgdexClient.fetchTcgdexCardById(stub.id);
    }),
  );
}

function buildRepresentativeRecord(row, sourceCard, reason, assignmentKind) {
  const imageUrl =
    normalizeTcgdexAssetImageUrl(sourceCard.detail?.image ?? sourceCard.image, row.number) ??
    normalizeTextOrNull(sourceCard.detail?.image) ??
    normalizeTextOrNull(sourceCard.image);

  if (!imageUrl) {
    return {
      status: 'unmatched',
      card_print_id: row.id,
      gv_id: row.gvId,
      number_plain: row.numberPlain,
      variant_key: row.variantKey,
      name: row.name,
      reason: 'TCGdex candidate did not expose a usable image URL.',
    };
  }

  return {
    status: 'matched',
    assignment_kind: assignmentKind,
    card_print_id: row.id,
    gv_id: row.gvId,
    number_plain: row.numberPlain,
    variant_key: row.variantKey,
    name: row.name,
    tcgdex_card_id: sourceCard.id,
    representative_image_url: imageUrl,
    image_source: SOURCE_NAME,
    image_status:
      assignmentKind === 'representative_shared_collision'
        ? 'representative_shared_collision'
        : assignmentKind === 'representative_shared_stamp'
          ? 'representative_shared_stamp'
          : 'representative_shared',
    image_note:
      assignmentKind === 'representative_shared_collision'
        ? COLLISION_REPRESENTATIVE_NOTE
        : assignmentKind === 'representative_shared_stamp'
          ? STAMP_REPRESENTATIVE_NOTE
          : null,
    reason,
  };
}

function buildSiblingBaseRepresentativeRecord(row, siblingBaseRepresentative, assignmentKind) {
  const representativeImageUrl = normalizeTextOrNull(siblingBaseRepresentative?.representativeImageUrl);
  if (!representativeImageUrl) {
    return buildUnmatchedRecord(row, 'Sibling base representative image was not available.');
  }

  return {
    status: 'matched',
    assignment_kind: assignmentKind,
    card_print_id: row.id,
    gv_id: row.gvId,
    number_plain: row.numberPlain,
    variant_key: row.variantKey,
    name: row.name,
    tcgdex_card_id: null,
    representative_image_url: representativeImageUrl,
    image_source: normalizeLowerOrNull(siblingBaseRepresentative?.imageSource) ?? SOURCE_NAME,
    image_status: 'representative_shared_stamp',
    image_note: STAMP_REPRESENTATIVE_NOTE,
    reason: `Representative stamp match via sibling base canon image ${siblingBaseRepresentative?.baseCardPrintId ?? 'unknown'}.`,
  };
}

function buildSkippedRecord(row, reason) {
  return {
    status: 'skipped_existing',
    card_print_id: row.id,
    gv_id: row.gvId,
    number_plain: row.numberPlain,
    variant_key: row.variantKey,
    name: row.name,
    reason,
  };
}

function buildAmbiguousRecord(row, reason) {
  return {
    status: 'ambiguous',
    card_print_id: row.id,
    gv_id: row.gvId,
    number_plain: row.numberPlain,
    variant_key: row.variantKey,
    name: row.name,
    reason,
  };
}

function buildUnmatchedRecord(row, reason) {
  return {
    status: 'unmatched',
    card_print_id: row.id,
    gv_id: row.gvId,
    number_plain: row.numberPlain,
    variant_key: row.variantKey,
    name: row.name,
    reason,
  };
}

function matchSingleRowGroup(row, sourceStubs, siblingBaseRepresentative = null) {
  if (row.imageUrl) {
    return [buildSkippedRecord(row, 'Row already has an exact image; representative assignment is not needed.')];
  }

  if (row.representativeImageUrl) {
    return [buildSkippedRecord(row, 'Row already has a representative image; rerun remains idempotent.')];
  }

  if (sourceStubs.length === 0) {
    if (row.isStamped && siblingBaseRepresentative) {
      return [buildSiblingBaseRepresentativeRecord(row, siblingBaseRepresentative, 'representative_shared_stamp')];
    }
    return [buildUnmatchedRecord(row, 'No TCGdex card exists for this printed number.')];
  }

  if (sourceStubs.length > 1) {
    if (row.isStamped && siblingBaseRepresentative) {
      return [buildSiblingBaseRepresentativeRecord(row, siblingBaseRepresentative, 'representative_shared_stamp')];
    }
    return [buildAmbiguousRecord(row, 'Multiple TCGdex candidates exist for this printed number.')];
  }

  const sourceCard = sourceStubs[0];
  if (normalizeName(row.name) !== normalizeName(sourceCard.detail?.name ?? sourceCard.name)) {
    if (row.isStamped && siblingBaseRepresentative) {
      return [buildSiblingBaseRepresentativeRecord(row, siblingBaseRepresentative, 'representative_shared_stamp')];
    }
    return [buildAmbiguousRecord(row, 'TCGdex candidate name did not match canon name deterministically.')];
  }

  const tcgdexRecord = buildRepresentativeRecord(
    row,
    sourceCard,
    'Representative match via TCGdex set + number + name.',
    row.isStamped ? 'representative_shared_stamp' : 'representative_shared',
  );

  if (tcgdexRecord.status === 'unmatched' && row.isStamped && siblingBaseRepresentative) {
    return [buildSiblingBaseRepresentativeRecord(row, siblingBaseRepresentative, 'representative_shared_stamp')];
  }

  return [tcgdexRecord];
}

function matchStampedGroup(canonicalRows, sourceStubs, siblingBaseRepresentative = null) {
  const rowsNeedingAssignment = canonicalRows.filter((row) => !row.imageUrl && !row.representativeImageUrl);
  const skippedRows = canonicalRows
    .filter((row) => row.imageUrl || row.representativeImageUrl)
    .map((row) =>
      buildSkippedRecord(
        row,
        row.imageUrl
          ? 'Row already has an exact image; representative assignment is not needed.'
          : 'Row already has a representative image; rerun remains idempotent.',
      ),
    );

  if (rowsNeedingAssignment.length === 0) {
    return skippedRows;
  }

  if (sourceStubs.length === 0) {
    if (siblingBaseRepresentative) {
      return [
        ...rowsNeedingAssignment.map((row) =>
          buildSiblingBaseRepresentativeRecord(row, siblingBaseRepresentative, 'representative_shared_stamp'),
        ),
        ...skippedRows,
      ];
    }
    return canonicalRows.map((row) =>
      buildUnmatchedRecord(row, 'No TCGdex card exists for this stamped row under the routed set + printed number.'),
    );
  }

  const distinctNames = uniqueValues(rowsNeedingAssignment.map((row) => normalizeName(row.name)));
  if (distinctNames.length !== 1) {
    return canonicalRows.map((row) =>
      buildAmbiguousRecord(row, 'Stamped group names were not uniform enough for representative assignment.'),
    );
  }

  const matchingSourceStubs = sourceStubs.filter(
    (stub) => normalizeName(stub.detail?.name ?? stub.name) === distinctNames[0],
  );

  if (matchingSourceStubs.length !== 1) {
    if (siblingBaseRepresentative) {
      return [
        ...rowsNeedingAssignment.map((row) =>
          buildSiblingBaseRepresentativeRecord(row, siblingBaseRepresentative, 'representative_shared_stamp'),
        ),
        ...skippedRows,
      ];
    }
    return canonicalRows.map((row) =>
      buildAmbiguousRecord(
        row,
        matchingSourceStubs.length === 0
          ? 'No TCGdex candidate name matched the stamped canon name deterministically.'
          : 'Multiple TCGdex candidates matched the stamped canon name; assignment is ambiguous.',
      ),
    );
  }

  const sourceCard = matchingSourceStubs[0];
  const tcgdexRecords = rowsNeedingAssignment.map((row) =>
    buildRepresentativeRecord(
      row,
      sourceCard,
      'Representative stamp match via TCGdex set + printed number + name.',
      'representative_shared_stamp',
    ),
  );

  if (tcgdexRecords.some((row) => row.status !== 'matched') && siblingBaseRepresentative) {
    return [
      ...rowsNeedingAssignment.map((row) =>
        buildSiblingBaseRepresentativeRecord(row, siblingBaseRepresentative, 'representative_shared_stamp'),
      ),
      ...skippedRows,
    ];
  }

  return [
    ...tcgdexRecords,
    ...skippedRows,
  ];
}

function matchCollisionGroup(canonicalRows, sourceStubs, siblingBaseRepresentative = null) {
  if (canonicalRows.every((row) => row.isStamped)) {
    return matchStampedGroup(canonicalRows, sourceStubs, siblingBaseRepresentative);
  }

  const rowsNeedingAssignment = canonicalRows.filter((row) => !row.imageUrl && !row.representativeImageUrl);
  const skippedRows = canonicalRows
    .filter((row) => row.imageUrl || row.representativeImageUrl)
    .map((row) =>
      buildSkippedRecord(
        row,
        row.imageUrl
          ? 'Row already has an exact image; representative assignment is not needed.'
          : 'Row already has a representative image; rerun remains idempotent.',
      ),
    );

  if (rowsNeedingAssignment.length === 0) {
    return skippedRows;
  }

  if (sourceStubs.length === 1) {
    const sourceCard = sourceStubs[0];
    const sourceName = normalizeName(sourceCard.detail?.name ?? sourceCard.name);
    if (!sourceName || rowsNeedingAssignment.some((row) => normalizeName(row.name) !== sourceName)) {
      return canonicalRows.map((row) =>
        buildAmbiguousRecord(row, 'Shared representative candidate name mismatch prevented safe collision assignment.'),
      );
    }

    return [
      ...rowsNeedingAssignment.map((row) =>
        buildRepresentativeRecord(
          row,
          sourceCard,
          'Shared representative match via TCGdex set + printed number + name.',
          'representative_shared_collision',
        ),
      ),
      ...skippedRows,
    ];
  }

  if (sourceStubs.length !== canonicalRows.length) {
    return canonicalRows.map((row) =>
      buildAmbiguousRecord(
        row,
        `Collision group cannot be resolved safely: canon rows=${canonicalRows.length}, TCGdex candidates=${sourceStubs.length}.`,
      ),
    );
  }

  const sourceByRarity = new Map();
  for (const stub of sourceStubs) {
    const rarityKey = normalizeRarity(stub.detail?.rarity);
    if (!rarityKey || sourceByRarity.has(rarityKey)) {
      return canonicalRows.map((row) =>
        buildAmbiguousRecord(row, 'TCGdex collision candidates did not expose a unique rarity key.'),
      );
    }
    sourceByRarity.set(rarityKey, stub);
  }

  const matched = [];
  for (const row of canonicalRows) {
    const expectedRarity = mapVariantKeyToExpectedRarity(row.variantKey);
    if (!expectedRarity) {
      return canonicalRows.map((groupRow) =>
        buildAmbiguousRecord(
          groupRow,
          'Collision group requires deterministic variant_key to TCGdex rarity mapping.',
        ),
      );
    }

    const sourceCard = sourceByRarity.get(expectedRarity);
    if (!sourceCard) {
      return canonicalRows.map((groupRow) =>
        buildAmbiguousRecord(
          groupRow,
          'TCGdex does not expose a full distinct candidate set for this collision group.',
        ),
      );
    }

    if (normalizeName(row.name) !== normalizeName(sourceCard.detail?.name ?? sourceCard.name)) {
      return canonicalRows.map((groupRow) =>
        buildAmbiguousRecord(groupRow, 'TCGdex collision candidate name mismatch prevented safe assignment.'),
      );
    }

    matched.push(
      buildRepresentativeRecord(
        row,
        sourceCard,
        `Representative collision match via TCGdex number + name + rarity ${expectedRarity}.`,
        'representative_shared_collision',
      ),
    );
  }

  return [...matched, ...skippedRows];
}

async function buildPlan({ client, tcgdexClient, setCode, inputJson }) {
  let cardPrintRows = [];
  let canonicalGroups = new Map();
  let sourceStubGroups = new Map();
  let sourceSetTotal = 0;
  let siblingBaseRepresentativeByGroup = new Map();

  if (setCode) {
    const [fetchedCardPrintRows, tcgdexSet] = await Promise.all([
      fetchCardPrintRows(client, setCode),
      tcgdexClient.fetchTcgdexSetById(setCode),
    ]);
    cardPrintRows = fetchedCardPrintRows;

    const tcgdexSetsByCode = new Map([[setCode, tcgdexSet]]);
    canonicalGroups = buildCanonicalGroups(cardPrintRows);
    sourceStubGroups = buildSourceStubGroupsBySet(tcgdexSetsByCode);
    sourceSetTotal = Array.isArray(tcgdexSet?.cards) ? tcgdexSet.cards.length : 0;
  } else {
    const inputRows = await loadInputRows(inputJson);
    const cardPrintIds = inputRows.map((row) => normalizeTextOrNull(row.card_print_id)).filter(Boolean);
    if (cardPrintIds.length === 0) {
      throw new Error('[source-image-enrichment] input rows did not include any card_print_id values.');
    }

    const inputMetadataById = new Map(
      inputRows.map((row) => [
        normalizeTextOrNull(row.card_print_id),
        {
          effective_set_code: normalizeLowerOrNull(row.effective_set_code),
          printed_number: normalizeTextOrNull(row.printed_number),
          stamp_label: normalizeTextOrNull(row.stamp_label),
        },
      ]),
    );

    cardPrintRows = await fetchCardPrintRowsByIds(client, cardPrintIds);
    if (cardPrintRows.length !== cardPrintIds.length) {
      throw new Error(
        `[source-image-enrichment] input rows=${cardPrintIds.length} but fetched card_print rows=${cardPrintRows.length}.`,
      );
    }

    for (const row of cardPrintRows) {
      if (!inputMetadataById.has(row.id)) {
        throw new Error(`[source-image-enrichment] fetched unexpected card_print row ${row.id}.`);
      }

      const expectedSetCode = inputMetadataById.get(row.id)?.effective_set_code ?? null;
      const actualSetCode = normalizeLowerOrNull(row.set_code);
      if (expectedSetCode && actualSetCode && expectedSetCode !== actualSetCode) {
        throw new Error(
          `[source-image-enrichment] set_code mismatch for ${row.id}: input=${expectedSetCode}, db=${actualSetCode}.`,
        );
      }
    }

    const setCodes = uniqueValues(
      cardPrintRows.map((row) => normalizeLowerOrNull(row.set_code)).filter(Boolean),
    );
    const numberPlains = uniqueValues(
      cardPrintRows.map((row) => normalizeNumberPlainKey(row.number_plain)).filter(Boolean),
    );
    const { tcgdexSetsByCode } = await fetchTcgdexSetsByCodesAllowingNotFound(tcgdexClient, setCodes);

    if (setCodes.length > 0 && numberPlains.length > 0) {
      const { rows: baseRows } = await client.query(
        `
          select
            id,
            gv_id,
            name,
            number,
            number_plain,
            set_code,
            variant_key,
            image_url,
            representative_image_url,
            image_status,
            image_note,
            image_source
          from public.card_prints
          where set_code = any($1::text[])
            and regexp_replace(coalesce(number_plain, ''), '^0+(?=\\d)', '') = any($2::text[])
            and coalesce(nullif(btrim(variant_key), ''), '') = ''
        `,
        [setCodes, numberPlains],
      );
      siblingBaseRepresentativeByGroup = buildSiblingBaseRepresentativeByGroup(baseRows);
    }

    canonicalGroups = buildCanonicalGroups(cardPrintRows, inputMetadataById);
    sourceStubGroups = buildSourceStubGroupsBySet(tcgdexSetsByCode);
    sourceSetTotal = [...tcgdexSetsByCode.values()].reduce(
      (total, tcgdexSet) => total + (Array.isArray(tcgdexSet?.cards) ? tcgdexSet.cards.length : 0),
      0,
    );
  }

  const numbersRequiringDetails = new Set();
  for (const [numberKey, rows] of canonicalGroups.entries()) {
    const sourceStubs = sourceStubGroups.get(numberKey) ?? [];
    if (rows.length > 1 || sourceStubs.length > 1 || rows.some((row) => row.isStamped)) {
      numbersRequiringDetails.add(numberKey);
    }
  }

  for (const numberKey of numbersRequiringDetails) {
    const sourceStubs = sourceStubGroups.get(numberKey) ?? [];
    await hydrateTcgdexDetails(tcgdexClient, sourceStubs);
  }

  const matched = [];
  const unmatched = [];
  const ambiguous = [];
  const skippedExisting = [];

  const orderedKeys = [...canonicalGroups.keys()].sort((left, right) => {
    const [leftSetCode, leftNumber] = left.split('::');
    const [rightSetCode, rightNumber] = right.split('::');
    if (leftSetCode !== rightSetCode) {
      return leftSetCode.localeCompare(rightSetCode);
    }
    return Number(leftNumber) - Number(rightNumber);
  });
  for (const numberKey of orderedKeys) {
    const canonicalRows = canonicalGroups.get(numberKey) ?? [];
    const sourceStubs = sourceStubGroups.get(numberKey) ?? [];
    const siblingBaseRepresentative = siblingBaseRepresentativeByGroup.get(numberKey) ?? null;

    const results =
      canonicalRows.length === 1
        ? matchSingleRowGroup(canonicalRows[0], sourceStubs, siblingBaseRepresentative)
        : matchCollisionGroup(canonicalRows, sourceStubs, siblingBaseRepresentative);

    for (const result of results) {
      if (result.status === 'matched') {
        matched.push(result);
      } else if (result.status === 'skipped_existing') {
        skippedExisting.push(result);
      } else if (result.status === 'ambiguous') {
        ambiguous.push(result);
      } else {
        unmatched.push(result);
      }
    }
  }

  return {
    total_cards: cardPrintRows.length,
    matched,
    unmatched,
    ambiguous,
    skipped_existing: skippedExisting,
    source_set_total: sourceSetTotal,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const tcgdexClient = createTcgdexClient();
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });

  await client.connect();
  try {
    log('run_config', {
      mode: options.apply ? 'apply' : 'dry-run',
      set_code: options.setCode,
      input_json: options.inputJson,
      source: SOURCE_NAME,
      scope: options.inputJson ? 'bounded_input_rows' : 'one_set_only',
    });

    const plan = await buildPlan({
      client,
      tcgdexClient,
      setCode: options.setCode,
      inputJson: options.inputJson,
    });

    const summary = {
      total_rows: plan.total_cards,
      source_set_total: plan.source_set_total,
      representative_shared: plan.matched.filter((row) => row.image_status === 'representative_shared').length,
      representative_shared_stamp: plan.matched.filter(
        (row) => row.image_status === 'representative_shared_stamp',
      ).length,
      representative_shared_collision: plan.matched.filter(
        (row) => row.image_status === 'representative_shared_collision',
      ).length,
      skipped_existing_representative: plan.skipped_existing.length,
      missing: plan.unmatched.length,
      unmatched: plan.unmatched.length,
      ambiguous: plan.ambiguous.length,
      examples: [
        ...plan.matched.slice(0, 4),
        ...plan.skipped_existing.slice(0, 4),
        ...plan.ambiguous.slice(0, 8),
        ...plan.unmatched.slice(0, 4),
      ],
    };

    console.log(JSON.stringify(summary, null, 2));

    if (!options.apply) {
      return;
    }

    if (plan.ambiguous.length > 0 || plan.unmatched.length > 0) {
      throw new Error(
        `[source-image-enrichment] apply blocked: ambiguous=${plan.ambiguous.length}, unmatched=${plan.unmatched.length}.`,
      );
    }

    const rowsToUpdate = plan.matched.filter((row) => row.representative_image_url);
    const updated = await applyRepresentativeImageUpdates(client, rowsToUpdate);
    log('apply_complete', {
      updated,
      representative_shared: rowsToUpdate.filter((row) => row.image_status === 'representative_shared').length,
      representative_shared_stamp: rowsToUpdate.filter(
        (row) => row.image_status === 'representative_shared_stamp',
      ).length,
      representative_shared_collision: rowsToUpdate.filter(
        (row) => row.image_status === 'representative_shared_collision',
      ).length,
      skipped_existing_representative: plan.skipped_existing.length,
      unmatched: plan.unmatched.length,
      ambiguous: plan.ambiguous.length,
    });
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
