import {
  sha256V1,
  stableJsonV1,
} from "./cross_tcg_sealed_product_domain_v1.mjs";

export const ONE_PIECE_SEALED_OFFICIAL_AUTHORITY_VERSION =
  "ONE_PIECE_SEALED_OFFICIAL_PRODUCT_AUTHORITY_V1";
export const ONE_PIECE_OFFICIAL_PRODUCT_HOST = "en.onepiece-cardgame.com";
export const ONE_PIECE_OFFICIAL_PRODUCT_ROOT =
  "https://en.onepiece-cardgame.com/products/";

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function textFromHtml(value) {
  return clean(decodeHtml(value).replace(/<br\s*\/?\s*>/gi, " | ")
    .replace(/<[^>]+>/g, " "));
}

function officialUrl(value, baseUrl) {
  const parsed = new URL(decodeHtml(value), baseUrl);
  if (parsed.protocol !== "https:" ||
      parsed.hostname.toLowerCase() !== ONE_PIECE_OFFICIAL_PRODUCT_HOST) {
    throw new Error(`Official product URL outside allowlist: ${parsed}`);
  }
  parsed.hash = "";
  return parsed.toString();
}

export function normalizeOnePieceSealedOfficialTextV1(value) {
  return decodeHtml(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .replace(/\bvol\.?\b/g, "volume")
    .replace(/\bstarter\s+deck\s+(\d+)\s*:/g, "starter deck $1 ")
    .replace(/\[(st)-?(\d{2})\]/g, (_, prefix, number) =>
      ` starter deck ${Number(number)} `)
    .replace(/\[(?:op|eb|prb|dp|ts|ld)-?\d{1,2}\]/g, " ")
    .replace(/\bone\s+piece\s+card\s+game\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classText(block, className) {
  const pattern = new RegExp(
    `<([a-z][a-z0-9]*)\\b[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1>`,
    "i",
  );
  return textFromHtml(block.match(pattern)?.[2] ?? "");
}

function withoutLeadingLabel(value, label) {
  return clean(value).replace(new RegExp(`^${label}\\s*`, "i"), "");
}

export function parseOnePieceOfficialProductIndexV1({ html, pageUrl }) {
  if (!/<html\b[^>]*\blang=["']en["']/i.test(html)) {
    throw new Error("Official product index does not declare English HTML");
  }
  const entries = [];
  const itemPattern = /<li\b[^>]*class=["'][^"']*\blinkListColBox\b[^"']*["'][^>]*data-cat=["']([^"']+)["'][^>]*>([\s\S]*?)<\/li>/gi;
  for (const match of String(html).matchAll(itemPattern)) {
    const block = match[2];
    const href = block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*\blinkListColItem\b/i)?.[1];
    const title = classText(block, "linkListColTitle");
    if (!href || !title) continue;
    const image = block.match(/<img\b[^>]*(?:data-src|src)=["']([^"']+)["']/i)?.[1] ?? null;
    entries.push({
      official_url: officialUrl(href, pageUrl),
      index_category: clean(match[1]).toLowerCase(),
      index_label: classText(block, "linkListColCat") || null,
      index_tag: classText(block, "linkListColTag") || null,
      official_index_title: title,
      release_date_text: withoutLeadingLabel(
        classText(block, "linkListColDate"), "Release Date") || null,
      msrp_text: withoutLeadingLabel(
        classText(block, "linkListColPrice"), "MSRP") || null,
      image_url: image ? officialUrl(image, pageUrl) : null,
      source_index_url: pageUrl,
    });
  }
  const pageNumbers = [...String(html).matchAll(/href=["'][^"']*\bpage=(\d+)[^"']*["']/gi)]
    .map((match) => Number(match[1])).filter(Number.isInteger);
  return {
    entries,
    maximum_page: Math.max(1, ...pageNumbers),
  };
}

function fieldHtml(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const legacy = String(html).match(new RegExp(
    `<h4\\b[^>]*class=["'][^"']*\\bprodStatusTit\\b[^"']*["'][^>]*>\\s*${escaped}\\s*<\\/h4>\\s*` +
    `<div\\b[^>]*>([\\s\\S]*?)<\\/div>`,
    "i",
  ))?.[1];
  if (legacy) return legacy;
  const current = String(html).match(new RegExp(
    `<dt\\b[^>]*>\\s*${escaped}\\s*<\\/dt>\\s*<dd\\b[^>]*>([\\s\\S]*?)<\\/dd>`,
    "i",
  ))?.[1];
  return current || null;
}

function fieldValue(html, label) {
  const value = fieldHtml(html, label);
  return value ? textFromHtml(value) : null;
}

function fieldListValues(html, label) {
  const value = fieldHtml(html, label);
  if (!value) return [];
  const structured = [...String(value).matchAll(
    /<(?:li|p)\b[^>]*>([\s\S]*?)<\/(?:li|p)>/gi,
  )].map((match) => textFromHtml(match[1])).filter(Boolean);
  return structured.length > 0 ? structured : [textFromHtml(value)].filter(Boolean);
}

function contentsValues(html) {
  const value = fieldValue(html, "Contents");
  if (!value) return [];
  return value.split(/\s*\|\s*/).map(clean).filter(Boolean);
}

function detailHeading(html) {
  const detail = String(html).match(
    /<div\b[^>]*class=["'][^"']*\bdetailColStatus\b[^"']*["'][^>]*>[\s\S]*?<h4\b[^>]*>([\s\S]*?)<\/h4>/i,
  )?.[1];
  return detail ? textFromHtml(detail) : null;
}

function parseDate(value) {
  const cleaned = clean(value);
  if (!cleaned) return null;
  const parsed = new Date(`${cleaned} 00:00:00 UTC`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

export function parseOnePieceOfficialProductDetailV1({
  html,
  finalUrl,
  indexEntry,
  sourcePage = null,
}) {
  if (!/<html\b[^>]*\blang=["']en["']/i.test(html)) {
    throw new Error(`Official product detail is not English HTML: ${finalUrl}`);
  }
  const productNames = fieldListValues(html, "Product Name");
  const headingName = detailHeading(html);
  const officialProductNames = productNames.length > 0
    ? productNames
    : [headingName || indexEntry.official_index_title];
  const canonicalName = officialProductNames.join(" | ");
  const releaseDateText = fieldValue(html, "Release Date") ||
    fieldValue(html, "Delivery Month") || indexEntry.release_date_text;
  const images = [];
  for (const match of String(html).matchAll(/<img\b[^>]*(?:data-src|src)=["']([^"']+)["']/gi)) {
    const raw = decodeHtml(match[1]);
    if (!/products\//i.test(raw) || /(?:common|logo|icon|bnr|banner)/i.test(raw)) continue;
    try {
      images.push(officialUrl(raw, finalUrl));
    } catch {
      // Non-authority assets are ignored rather than followed.
    }
  }
  const core = {
    authority_version: ONE_PIECE_SEALED_OFFICIAL_AUTHORITY_VERSION,
    official_url: officialUrl(finalUrl, ONE_PIECE_OFFICIAL_PRODUCT_ROOT),
    official_index_title: indexEntry.official_index_title,
    official_canonical_name: canonicalName,
    official_product_names: officialProductNames,
    normalized_official_name: normalizeOnePieceSealedOfficialTextV1(canonicalName),
    index_category: indexEntry.index_category,
    index_label: indexEntry.index_label,
    index_tag: indexEntry.index_tag,
    release_date_text: releaseDateText || null,
    release_date: parseDate(releaseDateText),
    msrp_text: fieldValue(html, "MSRP") || indexEntry.msrp_text || null,
    contents_text: contentsValues(html),
    official_image_urls: [...new Set([
      indexEntry.image_url,
      ...images,
    ].filter(Boolean))].slice(0, 20),
    source_page: sourcePage ?? {
      final_url: finalUrl,
      raw_html_persisted_in_audit: false,
    },
    manufacturer_support: {
      normalized_value: "Bandai",
      authority: "official_one_piece_card_game_product_site",
      source_url: finalUrl,
    },
    authority_scope: {
      official_product_family_support: true,
      exact_source_variant_support: false,
      exact_source_mapping_authority: false,
      pricing_authority: false,
      publication_authority: false,
    },
  };
  return { ...core, official_record_fingerprint_sha256: sha256V1(stableJsonV1(core)) };
}

const MATCH_STOP_WORDS = new Set([
  "one", "piece", "card", "game", "goods", "premium", "bandai",
  "booster", "product", "pack", "box", "case", "display", "sealed",
  "english", "version",
]);

function matchTokens(value) {
  return new Set(normalizeOnePieceSealedOfficialTextV1(value).split(" ")
    .filter((token) => token && !MATCH_STOP_WORDS.has(token)));
}

function similarity(left, right) {
  const leftTokens = matchTokens(left);
  const rightTokens = matchTokens(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  let intersection = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) intersection += 1;
  return intersection / Math.max(leftTokens.size, rightTokens.size);
}

export function bindOnePieceSealedReviewToOfficialV1(reviewRow, records) {
  const sourceNames = [
    reviewRow.proposed_family.proposed_canonical_name,
    reviewRow.source_product_name,
    reviewRow.source_identity.group_name,
  ].filter(Boolean);
  const scored = records.map((record) => ({
    record,
    score: Math.max(...sourceNames.flatMap((sourceName) => [
      similarity(sourceName, record.official_canonical_name),
      similarity(sourceName, record.official_index_title),
      ...(record.official_product_names ?? []).map((officialName) =>
        similarity(sourceName, officialName)),
    ])),
  })).filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score ||
      left.record.official_url.localeCompare(right.record.official_url));
  const top = scored[0] ?? null;
  const second = scored[1] ?? null;
  const uniqueSupport = top && top.score >= 0.8 &&
    (!second || top.score - second.score >= 0.15 ||
      second.record.official_url === top.record.official_url);
  const status = uniqueSupport
    ? "official_family_support_candidate_unique"
    : top?.score >= 0.8
      ? "official_family_support_candidate_ambiguous"
      : "official_family_support_not_found";
  return {
    candidate_id: reviewRow.candidate_id,
    source_product_id: reviewRow.source_product_id,
    source_product_name: reviewRow.source_product_name,
    proposed_family_key: reviewRow.proposed_family.proposed_family_key,
    proposed_package_form: reviewRow.proposed_variant.proposed_package_form,
    binding_status: status,
    top_score: top ? Number(top.score.toFixed(4)) : 0,
    second_score: second ? Number(second.score.toFixed(4)) : null,
    official_record: uniqueSupport ? top.record : null,
    review_candidates: scored.slice(0, 3).map((entry) => ({
      official_url: entry.record.official_url,
      official_name: entry.record.official_canonical_name,
      score: Number(entry.score.toFixed(4)),
    })),
    exact_variant_authority: false,
    exact_source_mapping_authority: false,
    promotion_eligible: false,
    publication_authority: false,
  };
}

export function buildOnePieceSealedOfficialAuthorityResultV1({
  repository,
  reviewPlanFingerprint,
  indexSources,
  officialRecords,
  reviewRows,
  detailFailures = [],
}) {
  const records = [...officialRecords].sort((left, right) =>
    left.official_url.localeCompare(right.official_url));
  const bindings = reviewRows.map((row) =>
    bindOnePieceSealedReviewToOfficialV1(row, records));
  const core = {
    version: ONE_PIECE_SEALED_OFFICIAL_AUTHORITY_VERSION,
    repository,
    review_plan_fingerprint_sha256: reviewPlanFingerprint,
    index_sources: indexSources,
    official_records: records,
    detail_failures: detailFailures,
    bindings,
    counts: {
      index_pages: indexSources.length,
      official_records: records.length,
      detail_failures: detailFailures.length,
      review_rows: bindings.length,
      unique_family_support_candidates: bindings.filter((row) =>
        row.binding_status === "official_family_support_candidate_unique").length,
      ambiguous_family_support_candidates: bindings.filter((row) =>
        row.binding_status === "official_family_support_candidate_ambiguous").length,
      family_support_not_found: bindings.filter((row) =>
        row.binding_status === "official_family_support_not_found").length,
      exact_variant_authorities: 0,
      exact_source_mapping_authorities: 0,
    },
    boundaries: {
      network_reads: true,
      database_connections: 0,
      database_writes: 0,
      storage_writes: 0,
      source_image_downloads: 0,
      raw_html_audit_persistence: false,
      exact_variant_authority: false,
      exact_source_mapping_authority: false,
      pricing_authority: false,
      publication_authority: false,
      app_visibility_enabled: false,
    },
  };
  return { ...core, authority_fingerprint_sha256: sha256V1(stableJsonV1(core)) };
}

export function validateOnePieceSealedOfficialAuthorityResultV1(result) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const { authority_fingerprint_sha256: ignored, ...core } = result ?? {};
  add(result?.version !== ONE_PIECE_SEALED_OFFICIAL_AUTHORITY_VERSION,
    "version_mismatch");
  add(result?.authority_fingerprint_sha256 !== sha256V1(stableJsonV1(core)),
    "authority_fingerprint_mismatch");
  add((result?.index_sources ?? []).length < 1, "index_sources_missing");
  add((result?.official_records ?? []).length < 1, "official_records_missing");
  add((result?.bindings ?? []).length !== 403, "review_binding_count_mismatch");
  add(new Set((result?.official_records ?? []).map((row) =>
    row.official_url)).size !== (result?.official_records ?? []).length,
  "duplicate_official_url");
  add(new Set((result?.bindings ?? []).map((row) =>
    row.candidate_id)).size !== 403, "duplicate_or_missing_candidate_binding");
  for (const row of result?.official_records ?? []) {
    add(new URL(row.official_url).hostname.toLowerCase() !==
      ONE_PIECE_OFFICIAL_PRODUCT_HOST, "official_host_mismatch");
    add(row.authority_scope?.exact_source_variant_support !== false ||
      row.authority_scope?.exact_source_mapping_authority !== false ||
      row.authority_scope?.pricing_authority !== false ||
      row.authority_scope?.publication_authority !== false,
    "official_record_authority_overclaim");
  }
  for (const row of result?.bindings ?? []) {
    add(row.exact_variant_authority !== false ||
      row.exact_source_mapping_authority !== false ||
      row.promotion_eligible !== false || row.publication_authority !== false,
    `binding_authority_overclaim:${row.source_product_id}`);
  }
  const boundaries = result?.boundaries ?? {};
  add(boundaries.network_reads !== true || boundaries.database_connections !== 0 ||
    boundaries.database_writes !== 0 || boundaries.storage_writes !== 0 ||
    boundaries.source_image_downloads !== 0 ||
    boundaries.raw_html_audit_persistence !== false ||
    boundaries.exact_variant_authority !== false ||
    boundaries.exact_source_mapping_authority !== false ||
    boundaries.pricing_authority !== false ||
    boundaries.publication_authority !== false ||
    boundaries.app_visibility_enabled !== false,
  "boundaries_mismatch");
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}
