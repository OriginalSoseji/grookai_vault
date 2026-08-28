import { sha256, stableJson } from
  "./one_piece_canonical_import_staging_v1.mjs";
import { decodeOnePieceOfficialHtmlEntitiesV1 } from
  "./one_piece_official_html_v1.mjs";

export const ONE_PIECE_COMPLETE_OFFICIAL_CATALOG_AUTHORITY_VERSION =
  "ONE_PIECE_COMPLETE_OFFICIAL_ENGLISH_CATALOG_AUTHORITY_V1";
export const ONE_PIECE_OFFICIAL_CARD_LIST_HOST =
  "en.onepiece-cardgame.com";
export const ONE_PIECE_OFFICIAL_CARD_LIST_ROOT =
  "https://en.onepiece-cardgame.com/cardlist/";
export const ONE_PIECE_REQUIRED_NUMBERED_SET_CODES = Object.freeze([
  ...Array.from({ length: 16 }, (_, index) =>
    `OP${String(index + 1).padStart(2, "0")}`),
  ...Array.from({ length: 36 }, (_, index) =>
    `ST${String(index + 1).padStart(2, "0")}`),
  "EB01", "EB02", "EB03", "EB04", "PRB01", "PRB02", "P",
].sort((left, right) => left.localeCompare(right, undefined, { numeric: true })));

function clean(value) {
  return String(value ?? "").trim();
}

function textFromHtml(value) {
  return decodeOnePieceOfficialHtmlEntitiesV1(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSetCode(value) {
  const match = clean(value).toUpperCase().match(/^(OP|ST|EB|PRB)-?(\d{2})$/);
  if (match) return `${match[1]}${match[2]}`;
  if (clean(value).toLowerCase() === "promotion card") return "P";
  return null;
}

export function normalizeOnePieceOfficialNameV1(value) {
  return decodeOnePieceOfficialHtmlEntitiesV1(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseOnePieceOfficialSeriesOptionsV1(html) {
  if (!/<html\b[^>]*\blang=["']en["']/i.test(html)) {
    throw new Error("Official card-list source does not declare English HTML");
  }
  const options = [];
  const pattern = /<option\b[^>]*\bvalue=["']?(\d+)["']?[^>]*>([\s\S]*?)<\/option>/gi;
  for (const match of String(html).matchAll(pattern)) {
    const seriesId = match[1];
    const label = textFromHtml(match[2]);
    const setCodes = [];
    for (const bracket of label.matchAll(/\[([^\]]+)\]/g)) {
      for (const token of bracket[1].split(/[-/]/)) {
        const normalized = normalizeSetCode(token);
        if (normalized) setCodes.push(normalized);
      }
      const joined = bracket[1];
      for (const codeMatch of joined.matchAll(/(OP|ST|EB|PRB)-?(\d{2})/gi)) {
        setCodes.push(`${codeMatch[1].toUpperCase()}${codeMatch[2]}`);
      }
    }
    if (/^promotion card$/i.test(label)) setCodes.push("P");
    const supplementalScope = /^other product card$/i.test(label);
    if (setCodes.length === 0 && !supplementalScope) continue;
    options.push({
      series_id: seriesId,
      label,
      set_codes: [...new Set(setCodes)].sort((left, right) =>
        left.localeCompare(right, undefined, { numeric: true })),
      supplemental_scope: supplementalScope,
      url: `${ONE_PIECE_OFFICIAL_CARD_LIST_ROOT}?series=${seriesId}`,
    });
  }
  const unique = new Map(options.map((option) => [option.series_id, option]));
  return [...unique.values()].sort((left, right) =>
    Number(left.series_id) - Number(right.series_id));
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cardNumberFromVariantId(variantId) {
  const match = clean(variantId).toUpperCase().match(
    /^((?:(?:OP|ST|EB|PRB)\d{2}|P)-\d{3})(?:_[A-Z0-9]+)?$/,
  );
  return match?.[1] ?? null;
}

export function parseOnePieceOfficialCardListHtmlV1({
  html,
  series,
  finalUrl,
}) {
  if (!/<html\b[^>]*\blang=["']en["']/i.test(html)) {
    throw new Error(`Official series ${series.series_id} is not English HTML`);
  }
  const records = [];
  const anchorPattern = /<a\b[^>]*\bdata-src=["']#([^"']+)["'][^>]*>[\s\S]{0,500}?<img\b[^>]*\bdata-src=["']([^"']+)["'][^>]*\balt=["']([^"']*)["'][^>]*>[\s\S]{0,80}?<\/a>/gi;
  for (const match of String(html).matchAll(anchorPattern)) {
    const officialVariantId = decodeOnePieceOfficialHtmlEntitiesV1(match[1]);
    const cardNumber = cardNumberFromVariantId(officialVariantId);
    if (!cardNumber) continue;
    const imageUrl = new URL(
      decodeOnePieceOfficialHtmlEntitiesV1(match[2]),
      finalUrl,
    ).toString();
    const imageHost = new URL(imageUrl).hostname.toLowerCase();
    if (imageHost !== ONE_PIECE_OFFICIAL_CARD_LIST_HOST) {
      throw new Error(`Official image redirected outside authority: ${imageUrl}`);
    }
    const modalPattern = new RegExp(
      `id=["']${escapeRegex(officialVariantId)}["'][\\s\\S]{0,900}?` +
      `<span>([^<]*)<\\/span>\\s*\\|\\s*<span>([^<]*)<\\/span>` +
      `\\s*\\|\\s*<span>([^<]*)<\\/span>`,
      "i",
    );
    const modal = String(html).match(modalPattern);
    const modalNumber = textFromHtml(modal?.[1] ?? "").toUpperCase() || cardNumber;
    if (modalNumber !== cardNumber) {
      throw new Error(`Official modal number mismatch: ${officialVariantId}`);
    }
    records.push({
      official_variant_id: officialVariantId,
      card_number: cardNumber,
      variant_suffix: officialVariantId.slice(cardNumber.length) || null,
      official_name: textFromHtml(match[3]),
      normalized_official_name: normalizeOnePieceOfficialNameV1(match[3]),
      rarity: textFromHtml(modal?.[2] ?? "") || null,
      card_type: textFromHtml(modal?.[3] ?? "").toLowerCase() || null,
      image_url: imageUrl,
      series_id: String(series.series_id),
      series_label: series.label,
      series_set_codes: [...series.set_codes],
      source_url: finalUrl,
    });
  }
  const deduped = new Map();
  for (const record of records) {
    const key = `${record.series_id}:${record.official_variant_id}:${record.image_url}`;
    deduped.set(key, record);
  }
  return [...deduped.values()].sort((left, right) =>
    left.card_number.localeCompare(right.card_number, undefined, { numeric: true }) ||
    left.official_variant_id.localeCompare(right.official_variant_id, undefined,
      { numeric: true }));
}

export function buildOnePieceOfficialNumberAuthorityV1(records) {
  const groups = new Map();
  for (const record of records ?? []) {
    const group = groups.get(record.card_number) ?? [];
    group.push(record);
    groups.set(record.card_number, group);
  }
  const authorities = [];
  const conflicts = [];
  for (const [cardNumber, cardRecords] of groups.entries()) {
    const names = [...new Set(cardRecords.map((record) =>
      record.normalized_official_name).filter(Boolean))];
    if (names.length !== 1) {
      conflicts.push({
        card_number: cardNumber,
        normalized_names: names.sort(),
        official_variant_ids: cardRecords.map((record) =>
          record.official_variant_id).sort(),
      });
      continue;
    }
    const matching = cardRecords.filter((record) =>
      record.normalized_official_name === names[0]);
    const displayNames = [...new Set(matching.map((record) => record.official_name))]
      .sort((left, right) => left.length - right.length || left.localeCompare(right));
    authorities.push({
      card_number: cardNumber,
      official_name: displayNames[0],
      normalized_official_name: names[0],
      card_types: [...new Set(matching.map((record) => record.card_type)
        .filter(Boolean))].sort(),
      rarities: [...new Set(matching.map((record) => record.rarity)
        .filter(Boolean))].sort(),
      series_ids: [...new Set(matching.map((record) => record.series_id))]
        .sort((left, right) => Number(left) - Number(right)),
      series_labels: [...new Set(matching.map((record) => record.series_label))]
        .sort(),
      official_variant_ids: [...new Set(matching.map((record) =>
        record.official_variant_id))].sort((left, right) =>
        left.localeCompare(right, undefined, { numeric: true })),
      official_image_urls: [...new Set(matching.map((record) => record.image_url))]
        .sort(),
      evidence_record_count: matching.length,
      authority_status: "exact_official_english_printed_number_and_name",
    });
  }
  authorities.sort((left, right) =>
    left.card_number.localeCompare(right.card_number, undefined, { numeric: true }));
  return { authorities, conflicts };
}

function levenshtein(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const replace = previous[rightIndex - 1] +
        (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        replace,
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function isSingleAdjacentTransposition(left, right) {
  if (left.length !== right.length || left === right) return false;
  const mismatches = [];
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) mismatches.push(index);
  }
  return mismatches.length === 2 &&
    mismatches[1] === mismatches[0] + 1 &&
    left[mismatches[0]] === right[mismatches[1]] &&
    left[mismatches[1]] === right[mismatches[0]];
}

function sourceNameSupportKind(sourceName, officialName) {
  const source = normalizeOnePieceOfficialNameV1(sourceName);
  const official = normalizeOnePieceOfficialNameV1(officialName);
  if (!source || !official) return null;
  if (source === official || source.startsWith(`${official} `)) {
    return "exact_normalized_name_or_variant_prefix";
  }
  const sourcePrefix = source.split(" ").slice(0, official.split(" ").length)
    .join(" ");
  if (isSingleAdjacentTransposition(sourcePrefix, official)) {
    return "single_adjacent_transposition_with_exact_card_number";
  }
  const distance = levenshtein(sourcePrefix, official);
  const maximumDistance = official.length >= 12 ? 2 : 1;
  if (distance <= maximumDistance &&
      distance / Math.max(sourcePrefix.length, official.length) <= 0.12) {
    return "bounded_orthographic_equivalence_with_exact_card_number";
  }
  return null;
}

export function bindOnePieceNumberedCandidatesToOfficialAuthorityV1({
  numberedCandidates,
  officialAuthorities,
  officialCatalogGapsBecomeExplicitHolds = false,
}) {
  const authorityByNumber = new Map((officialAuthorities ?? []).map((row) =>
    [row.card_number, row]));
  const rows = (numberedCandidates ?? []).map((candidate) => {
    const authority = authorityByNumber.get(candidate.card_number) ?? null;
    const nameSupportKind = authority
      ? sourceNameSupportKind(candidate.source_product_name,
        authority.official_name)
      : null;
    const sourceNameSupported = nameSupportKind !== null;
    const existingExact = candidate.reconciliation_action ===
      "retain_existing_exact_canonical_binding";
    const status = authority && sourceNameSupported
      ? "exact_official_number_name_binding"
      : existingExact
        ? "existing_st01_authority_retained_official_crawl_mismatch"
        : authority
          ? "official_number_found_source_name_mismatch"
          : officialCatalogGapsBecomeExplicitHolds
            ? "official_catalog_gap_hold"
            : "official_number_not_found";
    return {
      ...candidate,
      official_authority: authority,
      source_name_supports_official_name: sourceNameSupported,
      source_name_support_kind: nameSupportKind,
      official_authority_status: status,
      canonical_promotion_eligible:
        status === "exact_official_number_name_binding" || existingExact,
      publishable: false,
    };
  });
  return {
    rows,
    summary: {
      selected_products: rows.length,
      exact_official_bindings: rows.filter((row) =>
        row.official_authority_status ===
          "exact_official_number_name_binding").length,
      retained_existing_bindings: rows.filter((row) =>
        row.official_authority_status ===
          "existing_st01_authority_retained_official_crawl_mismatch").length,
      source_name_mismatches: rows.filter((row) =>
        row.official_authority_status ===
          "official_number_found_source_name_mismatch").length,
      official_number_missing: rows.filter((row) =>
        row.official_authority_status === "official_number_not_found").length,
      official_catalog_gap_holds: rows.filter((row) =>
        row.official_authority_status === "official_catalog_gap_hold").length,
      promotion_eligible_products: rows.filter((row) =>
        row.canonical_promotion_eligible).length,
    },
  };
}

export function validateOnePieceOfficialCatalogAuthorityV1(result) {
  const findings = [];
  const add = (condition, code) => {
    if (condition) findings.push(code);
  };
  const { authority_fingerprint_sha256: ignored, ...core } = result ?? {};
  add(result?.version !== ONE_PIECE_COMPLETE_OFFICIAL_CATALOG_AUTHORITY_VERSION,
    "version_mismatch");
  add(result?.authority_fingerprint_sha256 !== sha256(stableJson(core)),
    "fingerprint_mismatch");
  const coveredCodes = new Set((result?.series ?? []).flatMap((row) =>
    row.set_codes ?? []));
  for (const code of ONE_PIECE_REQUIRED_NUMBERED_SET_CODES) {
    add(!coveredCodes.has(code), `missing_series_code:${code}`);
  }
  add((result?.official_conflicts ?? []).length > 0,
    "official_number_name_conflicts");
  add(result?.binding_summary?.selected_products !== 6547,
    "selected_product_count_mismatch");
  add(result?.binding_summary?.promotion_eligible_products !== 6530,
    "authority_bound_product_count_mismatch");
  add(result?.binding_summary?.official_catalog_gap_holds !== 17,
    "official_catalog_hold_count_mismatch");
  add(result?.binding_summary?.promotion_eligible_products +
    result?.binding_summary?.official_catalog_gap_holds !== 6547,
  "numbered_product_accounting_mismatch");
  add(result?.binding_summary?.source_name_mismatches !== 0,
    "source_name_mismatches_present");
  add(result?.binding_summary?.official_number_missing !== 0,
    "official_number_gaps_present");
  add(result?.boundaries?.database_connections !== 0 ||
    result?.boundaries?.database_writes !== 0 ||
    result?.boundaries?.storage_writes !== 0 ||
    result?.boundaries?.image_downloads !== 0 ||
    result?.boundaries?.publication_writes !== 0,
  "write_or_image_boundary_open");
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function buildOnePieceOfficialCatalogAuthorityResultV1(input) {
  const numberAuthority = buildOnePieceOfficialNumberAuthorityV1(
    input.officialRecords);
  const binding = bindOnePieceNumberedCandidatesToOfficialAuthorityV1({
    numberedCandidates: input.numberedCandidates,
    officialAuthorities: numberAuthority.authorities,
    officialCatalogGapsBecomeExplicitHolds:
      input.officialCatalogGapsBecomeExplicitHolds === true,
  });
  const core = {
    version: ONE_PIECE_COMPLETE_OFFICIAL_CATALOG_AUTHORITY_VERSION,
    repository: input.repository,
    source_reconciliation_fingerprint_sha256:
      input.sourceReconciliationFingerprint,
    root_source: input.rootSource,
    series: input.series,
    official_records: input.officialRecords,
    official_number_authorities: numberAuthority.authorities,
    official_conflicts: numberAuthority.conflicts,
    bindings: binding.rows,
    binding_summary: binding.summary,
    boundaries: {
      database_connections: 0,
      database_writes: 0,
      storage_writes: 0,
      image_downloads: 0,
      image_urls_reference_only: true,
      pricing_writes: 0,
      publication_writes: 0,
      app_visibility_enabled: false,
    },
  };
  return {
    ...core,
    authority_fingerprint_sha256: sha256(stableJson(core)),
  };
}
