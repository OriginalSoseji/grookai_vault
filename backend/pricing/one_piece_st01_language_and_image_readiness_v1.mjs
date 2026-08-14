import crypto from "node:crypto";

export const ONE_PIECE_ST01_READINESS_VERSION =
  "ONE_PIECE_ST01_LANGUAGE_AND_IMAGE_READINESS_V1";
export const ONE_PIECE_ST01_SOURCE_CATEGORY_ID = 68;
export const ONE_PIECE_ST01_SOURCE_GROUP_ID = 3189;
export const ONE_PIECE_ST01_PRODUCT_URL =
  "https://en.onepiece-cardgame.com/products/decks/st01-04.php";
export const ONE_PIECE_ST01_CARD_LIST_URL =
  "https://en.onepiece-cardgame.com/cardlist/?series=569001";
export const ONE_PIECE_ST01_OFFICIAL_HOST = "en.onepiece-cardgame.com";
export const ONE_PIECE_IMAGE_SOURCE_HOST =
  "tcgplayer-cdn.tcgplayer.com";
export const ONE_PIECE_SELF_HOSTED_CARD_PREFIX =
  "warehouse-derived/self-hosted-images-v1/card_prints/one-piece/st01";
export const MAX_IMAGE_BYTES = 8_388_608;
export const MIN_IMAGE_BYTES = 5_000;

export const ST01_OFFICIAL_CARDS = Object.freeze([
  ["ST01-001", "Monkey.D.Luffy"],
  ["ST01-002", "Usopp"],
  ["ST01-003", "Karoo"],
  ["ST01-004", "Sanji"],
  ["ST01-005", "Jinbe"],
  ["ST01-006", "Tony Tony.Chopper"],
  ["ST01-007", "Nami"],
  ["ST01-008", "Nico Robin"],
  ["ST01-009", "Nefeltari Vivi"],
  ["ST01-010", "Franky"],
  ["ST01-011", "Brook"],
  ["ST01-012", "Monkey.D.Luffy"],
  ["ST01-013", "Roronoa Zoro"],
  ["ST01-014", "Guard Point"],
  ["ST01-015", "Gum-Gum Jet Pistol"],
  ["ST01-016", "Diable Jambe"],
  ["ST01-017", "Thousand Sunny"],
]);

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function clean(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

export function normalizePathSegment(value, fallback = "unknown") {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || fallback;
}

export function normalizeOfficialHtmlText(html) {
  return String(html ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function expectedOfficialName(sourceName, cardNumber) {
  const official = new Map(ST01_OFFICIAL_CARDS).get(cardNumber);
  if (!official) return null;
  const normalizedSource = String(sourceName ?? "")
    .replace(/\s*\(\d{3}\)\s*$/, "")
    .trim();
  return normalizedSource === official ? official : null;
}

function assertOfficialResponse(response, expectedUrl) {
  const finalUrl = new URL(response.final_url);
  if (response.http_status !== 200 || response.http_ok !== true) {
    throw new Error(`Official source unavailable: ${expectedUrl}`);
  }
  if (finalUrl.protocol !== "https:" ||
      finalUrl.hostname.toLowerCase() !== ONE_PIECE_ST01_OFFICIAL_HOST) {
    throw new Error(`Official source redirected outside authority: ${response.final_url}`);
  }
}

export function evaluateSt01OfficialAuthority({
  productResponse,
  cardListResponse,
  stagedRows,
}) {
  assertOfficialResponse(productResponse, ONE_PIECE_ST01_PRODUCT_URL);
  assertOfficialResponse(cardListResponse, ONE_PIECE_ST01_CARD_LIST_URL);
  const productText = normalizeOfficialHtmlText(productResponse.body);
  const cardText = normalizeOfficialHtmlText(cardListResponse.body);
  const englishHtmlPattern = /<html\b[^>]*\blang=["']en["']/i;
  if (!englishHtmlPattern.test(productResponse.body) ||
      !englishHtmlPattern.test(cardListResponse.body)) {
    throw new Error("Official sources do not declare English HTML locale");
  }
  const productMarkers = [
    "STARTER DECK -Straw Hat Crew- [ST-01]",
    "December 2, 2022",
    "USD $11.99",
    "Constructed Deck x 1 (51 cards)",
    "DON!! Cards x 10",
    "17 types",
  ];
  const missingProductMarkers = productMarkers.filter((marker) =>
    !productText.includes(marker));
  if (missingProductMarkers.length > 0) {
    throw new Error(`Official product markers missing: ${missingProductMarkers.join(", ")}`);
  }
  if (!cardText.includes("17 results")) {
    throw new Error("Official English ST-01 card-list scope is not exact");
  }

  const officialMatches = [];
  for (const [number, name] of ST01_OFFICIAL_CARDS) {
    const numberIndex = cardText.indexOf(number);
    const nameIndex = cardText.indexOf(name, numberIndex);
    const setIndex = cardText.indexOf("-Straw Hat Crew-[ST-01]", nameIndex);
    if (numberIndex < 0 || nameIndex < numberIndex || setIndex < nameIndex) {
      throw new Error(`Official ST-01 card evidence missing: ${number} ${name}`);
    }
    officialMatches.push({ card_number: number, official_name: name });
  }

  const rows = stagedRows.map((row) => {
    const base = {
      row_ordinal: row.row_ordinal,
      staging_row_id: row.staging_row_id,
      source_product_id: row.source_product_id,
      source_product_name: row.source_product_name,
      review_lane: row.review_lane,
      source_category_id: ONE_PIECE_ST01_SOURCE_CATEGORY_ID,
      source_group_id: ONE_PIECE_ST01_SOURCE_GROUP_ID,
      blanket_category_language_authority: false,
      authority_scope: "tcgplayer_group_3189_st01_only",
      supporting_official_sources: [
        ONE_PIECE_ST01_PRODUCT_URL,
        ONE_PIECE_ST01_CARD_LIST_URL,
      ],
    };
    if (row.review_lane === "numbered_card_parent_identity_review") {
      const officialName = expectedOfficialName(
        row.source_product_name,
        row.card_number,
      );
      if (!officialName) {
        throw new Error(`Staged card does not match official list: ${row.card_number}`);
      }
      return {
        ...base,
        language_code: "en",
        authority_status: "exact_official_english_st01_card_match",
        official_card_number: row.card_number,
        official_card_name: officialName,
        language_blocker_resolved: true,
      };
    }
    if (row.source_product_id === 288221) {
      return {
        ...base,
        language_code: "en",
        authority_status: "exact_official_english_st01_product_match",
        language_blocker_resolved: true,
      };
    }
    const status = row.review_lane === "don_card_variant_identity_review"
      ? "official_english_st01_context_only_don_variant_unverified"
      : row.source_product_id === 288225
        ? "official_english_st01_to_st04_context_only_bundle_unverified"
        : "official_english_st01_context_only_packaging_variant_unverified";
    return {
      ...base,
      language_code: null,
      authority_status: status,
      language_blocker_resolved: false,
    };
  });
  return {
    authority_version: ONE_PIECE_ST01_READINESS_VERSION,
    official_product_markers: productMarkers,
    official_card_matches: officialMatches,
    rows,
    summary: {
      staged_rows: rows.length,
      exact_language_authority_rows:
        rows.filter((row) => row.language_blocker_resolved).length,
      context_only_rows:
        rows.filter((row) => !row.language_blocker_resolved).length,
      official_numbered_card_matches: officialMatches.length,
      blanket_category_authority_granted: false,
    },
  };
}

export function parseTcgplayerImageReference(value, productId) {
  const parsed = new URL(value);
  const match = parsed.pathname.match(/^\/product\/(\d+)_200w\.jpg$/i);
  if (parsed.protocol !== "https:" ||
      parsed.hostname.toLowerCase() !== ONE_PIECE_IMAGE_SOURCE_HOST ||
      !match || Number(match[1]) !== Number(productId)) {
    throw new Error(`Invalid TCGPlayer image reference for ${productId}`);
  }
  const highResolution = new URL(parsed);
  highResolution.pathname = `/product/${productId}_in_1000x1000.jpg`;
  return {
    exact_reference_url: parsed.toString(),
    high_resolution_candidate_url: highResolution.toString(),
    source_product_id: Number(productId),
  };
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    if (marker >= 0xc0 && marker <= 0xcf &&
        ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return {
        width: buffer.readUInt16BE(offset + 7),
        height: buffer.readUInt16BE(offset + 5),
        format: "jpg",
      };
    }
    offset += 2 + length;
  }
  return null;
}

export function inspectOnePieceImage(buffer, contentType) {
  const normalizedType = clean(contentType)?.split(";")[0].toLowerCase();
  const dimensions = jpegDimensions(buffer);
  const diagnostics = [];
  if (normalizedType !== "image/jpeg") diagnostics.push("content_type_not_jpeg");
  if (!dimensions) diagnostics.push("unrecognized_jpeg_bytes");
  if (buffer.length < MIN_IMAGE_BYTES) diagnostics.push("below_minimum_bytes");
  if (buffer.length > MAX_IMAGE_BYTES) diagnostics.push("above_maximum_bytes");
  if (dimensions && (dimensions.width < 600 || dimensions.height < 600)) {
    diagnostics.push("below_preferred_self_hosted_resolution");
  }
  return {
    content_type: normalizedType,
    size_bytes: buffer.length,
    sha256: sha256(buffer),
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    format: dimensions?.format ?? null,
    diagnostics,
    valid_image: !diagnostics.some((item) => [
      "content_type_not_jpeg",
      "unrecognized_jpeg_bytes",
      "below_minimum_bytes",
      "above_maximum_bytes",
    ].includes(item)),
    preferred_self_hosted_resolution:
      Boolean(dimensions && dimensions.width >= 600 && dimensions.height >= 600),
  };
}

export function proposedImageTarget(row, image) {
  if (row.review_lane === "sealed_product_identity_review") {
    return {
      target_storage_path: null,
      target_path_status: "pending_sealed_image_contract",
    };
  }
  if (!row.proposed_parent_gv_id) {
    throw new Error(`Card/DON row lacks proposed GV-ID: ${row.source_product_id}`);
  }
  return {
    target_storage_path: `${ONE_PIECE_SELF_HOSTED_CARD_PREFIX}/` +
      `${normalizePathSegment(row.proposed_parent_gv_id)}/` +
      `${image.sha256.slice(0, 24)}.${image.format}`,
    target_path_status: "proposed_content_addressed_card_path",
  };
}

export function validateReadinessRows(rows) {
  const findings = [];
  if (rows.length !== 21) findings.push("row_count_not_21");
  if (new Set(rows.map((row) => row.source_product_id)).size !== rows.length) {
    findings.push("duplicate_source_product_id");
  }
  const targets = rows.map((row) => row.image.target_storage_path).filter(Boolean);
  if (new Set(targets).size !== targets.length) {
    findings.push("duplicate_target_storage_path");
  }
  const selectedHashes = rows.map((row) => row.image.selected_source?.sha256)
    .filter(Boolean);
  if (new Set(selectedHashes).size !== selectedHashes.length) {
    findings.push("duplicate_selected_image_sha256");
  }
  for (const row of rows) {
    if (!row.image.selected_source?.accepted) {
      findings.push(`image_not_accepted:${row.source_product_id}`);
    }
    if (row.image.storage_write_performed || row.image.pointer_write_performed ||
        row.database_write_performed) {
      findings.push(`write_boundary_failed:${row.source_product_id}`);
    }
    if (row.review_lane === "sealed_product_identity_review" &&
        (row.image.target_storage_path !== null ||
         row.image.target_path_status !== "pending_sealed_image_contract")) {
      findings.push(`sealed_target_contract_failed:${row.source_product_id}`);
    }
  }
  return findings;
}
