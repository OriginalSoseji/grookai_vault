import '../env.mjs';

import pg from 'pg';
import { createTcgdexClient } from '../clients/tcgdex.mjs';

const { Client } = pg;

const WORKER_NAME = 'source_image_enrichment_worker_v1';
const SOURCE_NAME = 'tcgdex';
const ALLOWED_SET_CODE = 'me03';
const COLLISION_REPRESENTATIVE_NOTE =
  'Identity is confirmed. Displayed image is a shared representative image until the exact variant image is available.';

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
    }
  }

  if (!options.setCode) {
    throw new Error('[source-image-enrichment] --set-code is required.');
  }

  if (options.setCode !== ALLOWED_SET_CODE) {
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
  return digits.length > 0 ? digits : null;
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
          SOURCE_NAME,
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

function buildCanonicalGroups(cardPrintRows) {
  const groups = new Map();

  for (const row of cardPrintRows) {
    const numberKey = normalizeNumberPlainKey(row.number_plain);
    if (!numberKey) {
      throw new Error(`[source-image-enrichment] missing number_plain for card_print ${row.id}`);
    }

    const current = groups.get(numberKey) ?? [];
    current.push({
      id: row.id,
      gvId: normalizeTextOrNull(row.gv_id),
      name: normalizeTextOrNull(row.name),
      number: normalizeTextOrNull(row.number),
      numberPlain: numberKey,
      variantKey: normalizeVariantKey(row.variant_key),
      imageUrl: normalizeTextOrNull(row.image_url),
      representativeImageUrl: normalizeTextOrNull(row.representative_image_url),
      imageStatus: normalizeLowerOrNull(row.image_status),
      imageNote: normalizeTextOrNull(row.image_note),
      imageSource: normalizeLowerOrNull(row.image_source),
    });
    groups.set(numberKey, current);
  }

  return groups;
}

function buildSourceStubGroups(tcgdexSet) {
  const groups = new Map();
  const cards = Array.isArray(tcgdexSet?.cards) ? tcgdexSet.cards : [];

  for (const card of cards) {
    const numberKey = normalizeNumberPlainKey(card?.localId);
    if (!numberKey) {
      continue;
    }

    const current = groups.get(numberKey) ?? [];
    current.push({
      id: normalizeTextOrNull(card?.id),
      localId: normalizeTextOrNull(card?.localId),
      name: normalizeTextOrNull(card?.name),
      image: normalizeTextOrNull(card?.image),
      detail: null,
    });
    groups.set(numberKey, current);
  }

  return groups;
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
    image_status:
      assignmentKind === 'representative_shared_collision'
        ? 'representative_shared_collision'
        : 'representative_shared',
    image_note:
      assignmentKind === 'representative_shared_collision'
        ? COLLISION_REPRESENTATIVE_NOTE
        : null,
    reason,
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

function matchSingleRowGroup(row, sourceStubs) {
  if (row.imageUrl) {
    return [buildSkippedRecord(row, 'Row already has an exact image; representative assignment is not needed.')];
  }

  if (row.representativeImageUrl) {
    return [buildSkippedRecord(row, 'Row already has a representative image; rerun remains idempotent.')];
  }

  if (sourceStubs.length === 0) {
    return [buildUnmatchedRecord(row, 'No TCGdex card exists for this printed number.')];
  }

  if (sourceStubs.length > 1) {
    return [buildAmbiguousRecord(row, 'Multiple TCGdex candidates exist for this printed number.')];
  }

  const sourceCard = sourceStubs[0];
  if (normalizeName(row.name) !== normalizeName(sourceCard.detail?.name ?? sourceCard.name)) {
    return [buildAmbiguousRecord(row, 'TCGdex candidate name did not match canon name deterministically.')];
  }

  return [
    buildRepresentativeRecord(
      row,
      sourceCard,
      'Representative match via TCGdex set + number + name.',
      'representative_shared',
    ),
  ];
}

function matchCollisionGroup(canonicalRows, sourceStubs) {
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

async function buildPlan({ client, tcgdexClient, setCode }) {
  const [cardPrintRows, tcgdexSet] = await Promise.all([
    fetchCardPrintRows(client, setCode),
    tcgdexClient.fetchTcgdexSetById(setCode),
  ]);

  const canonicalGroups = buildCanonicalGroups(cardPrintRows);
  const sourceStubGroups = buildSourceStubGroups(tcgdexSet);

  const numbersRequiringDetails = new Set();
  for (const [numberKey, rows] of canonicalGroups.entries()) {
    const sourceStubs = sourceStubGroups.get(numberKey) ?? [];
    if (rows.length > 1 || sourceStubs.length > 1) {
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

  const orderedKeys = [...canonicalGroups.keys()].sort((left, right) => Number(left) - Number(right));
  for (const numberKey of orderedKeys) {
    const canonicalRows = canonicalGroups.get(numberKey) ?? [];
    const sourceStubs = sourceStubGroups.get(numberKey) ?? [];

    const results =
      canonicalRows.length === 1
        ? matchSingleRowGroup(canonicalRows[0], sourceStubs)
        : matchCollisionGroup(canonicalRows, sourceStubs);

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
    source_set_total: Array.isArray(tcgdexSet?.cards) ? tcgdexSet.cards.length : 0,
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
      source: SOURCE_NAME,
      scope: 'one_set_only',
    });

    const plan = await buildPlan({
      client,
      tcgdexClient,
      setCode: options.setCode,
    });

    const summary = {
      total_rows: plan.total_cards,
      source_set_total: plan.source_set_total,
      representative_shared: plan.matched.filter((row) => row.image_status === 'representative_shared').length,
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
