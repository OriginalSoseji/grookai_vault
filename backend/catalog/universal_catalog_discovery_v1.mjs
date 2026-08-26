import crypto from "node:crypto";

export const UNIVERSAL_CATALOG_DISCOVERY_VERSION =
  "UNIVERSAL_CATALOG_DISCOVERY_V1";

export const CATALOG_GAP_STATUSES = Object.freeze({
  AMBIGUOUS_SOURCE_IDENTITY: "ambiguous_source_identity",
  EXACT_COMPLETE: "exact_complete",
  FUTURE_RELEASE: "future_release",
  INCOMPLETE_CARDS: "incomplete_cards",
  MISSING_SET: "missing_set",
  PRESENT_UNVERIFIED: "present_unverified",
  SOURCE_BEHIND: "source_behind",
  SOURCE_NO_ELIGIBLE_CARDS: "source_no_eligible_cards",
});

function clean(value) {
  return String(value ?? "").trim();
}

export function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return crypto.createHash("sha256").update(
    typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : stableJson(value),
  ).digest("hex");
}

export function normalizeCatalogText(value) {
  return clean(value)
    .normalize("NFKC")
    .toLocaleLowerCase("und")
    .replace(/&/g, " and ")
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCatalogSetCode(gameCode, value) {
  const compact = clean(value).toLocaleLowerCase("und").replace(/[^a-z0-9]+/g, "");
  if (!compact) return "";
  if (gameCode === "one_piece") {
    const match = compact.match(/^(op|st|eb|prb)(\d{1,2})$/i);
    if (match) return `${match[1].toLowerCase()}${match[2].padStart(2, "0")}`;
  }
  return compact;
}

export function catalogSetMatchKeys(row) {
  const gameCode = clean(row.game_code);
  return [...new Set([
    row.code ? `code:${normalizeCatalogSetCode(gameCode, row.code)}` : "",
    row.source_set_id ? `source:${normalizeCatalogText(row.source_set_id)}` : "",
    row.name ? `name:${normalizeCatalogText(row.name)}` : "",
    ...(row.aliases ?? []).map((alias) => `name:${normalizeCatalogText(alias)}`),
  ].filter((value) => value && !value.endsWith(":")))];
}

function integerOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function compareDate(value, asOf) {
  const date = clean(value);
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.localeCompare(asOf) : -1;
}

export function reconcileCatalogSets({ sourceSets, databaseSets, asOf }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean(asOf))) {
    throw new Error("asOf must use YYYY-MM-DD");
  }
  const databaseIndex = new Map();
  for (const row of databaseSets ?? []) {
    for (const key of catalogSetMatchKeys(row)) {
      const candidates = databaseIndex.get(key) ?? [];
      candidates.push(row);
      databaseIndex.set(key, candidates);
    }
  }

  const sourceCodeCounts = new Map();
  for (const source of sourceSets ?? []) {
    const code = normalizeCatalogSetCode(source.game_code, source.code);
    if (!code) continue;
    const key = `${source.game_code}:${code}`;
    sourceCodeCounts.set(key, (sourceCodeCounts.get(key) ?? 0) + 1);
  }
  const results = [];
  for (const source of sourceSets ?? []) {
    const candidateMap = new Map();
    for (const key of catalogSetMatchKeys(source)) {
      for (const row of databaseIndex.get(key) ?? []) {
        candidateMap.set(`${row.game_code}:${row.code}`, row);
      }
    }
    const candidates = [...candidateMap.values()];
    const database = candidates.length === 1 ? candidates[0] : null;
    const expected = integerOrNull(source.expected_card_count);
    const actual = integerOrNull(database?.card_count);
    let status;
    const normalizedSourceCode = normalizeCatalogSetCode(source.game_code, source.code);
    if (normalizedSourceCode &&
      (sourceCodeCounts.get(`${source.game_code}:${normalizedSourceCode}`) ?? 0) > 1) {
      status = CATALOG_GAP_STATUSES.AMBIGUOUS_SOURCE_IDENTITY;
    } else if (!database && expected === 0) {
      status = CATALOG_GAP_STATUSES.SOURCE_NO_ELIGIBLE_CARDS;
    } else if (compareDate(source.release_date, asOf) > 0) {
      status = CATALOG_GAP_STATUSES.FUTURE_RELEASE;
    } else if (!database) {
      status = CATALOG_GAP_STATUSES.MISSING_SET;
    } else if (expected === null || actual === null) {
      status = CATALOG_GAP_STATUSES.PRESENT_UNVERIFIED;
    } else if (actual < expected) {
      status = CATALOG_GAP_STATUSES.INCOMPLETE_CARDS;
    } else if (actual > expected) {
      status = CATALOG_GAP_STATUSES.SOURCE_BEHIND;
    } else {
      status = CATALOG_GAP_STATUSES.EXACT_COMPLETE;
    }

    results.push({
      game_code: source.game_code,
      source_id: source.source_id,
      source_set_id: source.source_set_id ?? null,
      source_code: source.code ?? null,
      source_name: source.name,
      source_url: source.source_url,
      release_date: source.release_date ?? null,
      expected_card_count: expected,
      database_code: database?.code ?? null,
      database_name: database?.name ?? null,
      database_card_count: actual,
      candidate_database_codes: candidates.map((row) => row.code).sort(),
      status,
      missing_card_count:
        status === CATALOG_GAP_STATUSES.INCOMPLETE_CARDS
          ? expected - actual
          : null,
    });
  }
  return results.sort((left, right) =>
    left.game_code.localeCompare(right.game_code) ||
    String(left.release_date ?? "").localeCompare(String(right.release_date ?? "")) ||
    String(left.source_code ?? left.source_name).localeCompare(
      String(right.source_code ?? right.source_name), undefined, { numeric: true },
    ));
}

export function summarizeCatalogReconciliation(rows) {
  const byStatus = {};
  const byGame = {};
  for (const row of rows ?? []) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    const game = byGame[row.game_code] ?? { total: 0, actionable_gaps: 0, statuses: {} };
    game.total += 1;
    game.statuses[row.status] = (game.statuses[row.status] ?? 0) + 1;
    if ([CATALOG_GAP_STATUSES.MISSING_SET, CATALOG_GAP_STATUSES.INCOMPLETE_CARDS]
      .includes(row.status)) {
      game.actionable_gaps += 1;
    }
    byGame[row.game_code] = game;
  }
  const actionable = (rows ?? []).filter((row) =>
    [CATALOG_GAP_STATUSES.MISSING_SET, CATALOG_GAP_STATUSES.INCOMPLETE_CARDS]
      .includes(row.status));
  return {
    version: UNIVERSAL_CATALOG_DISCOVERY_VERSION,
    source_set_count: rows?.length ?? 0,
    actionable_gap_count: actionable.length,
    by_status: byStatus,
    by_game: byGame,
    actionable_gap_fingerprint: sha256(actionable),
  };
}

export function buildCatalogSearchAliases(rows) {
  const aliases = [];
  for (const row of rows ?? []) {
    if (!row.database_code) continue;
    for (const alias of [row.source_name, row.source_code, row.database_name]) {
      const normalized = normalizeCatalogText(alias);
      if (!normalized) continue;
      aliases.push({
        game_code: row.game_code,
        alias: normalized,
        set_codes: [row.database_code.toLowerCase()],
        authority: "source_reconciled_set_identity",
        source_id: row.source_id,
        source_url: row.source_url,
      });
    }
  }
  const unique = new Map();
  for (const alias of aliases) {
    const key = `${alias.game_code}:${alias.alias}:${alias.set_codes.join(",")}`;
    unique.set(key, alias);
  }
  return [...unique.values()].sort((left, right) =>
    left.game_code.localeCompare(right.game_code) || left.alias.localeCompare(right.alias));
}
