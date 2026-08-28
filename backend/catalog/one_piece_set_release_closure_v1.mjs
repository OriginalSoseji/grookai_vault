import { createHash } from "node:crypto";

import { normalizeOnePieceOfficialNameV1 } from
  "../pricing/one_piece_complete_official_catalog_authority_v1.mjs";

export const ONE_PIECE_SET_RELEASE_CLOSURE_VERSION =
  "ONE_PIECE_SET_RELEASE_CLOSURE_V1";
export const ONE_PIECE_SET_IMAGE_BUCKET = "external-card-images";

const ONE_PIECE_SET_IMAGE_AUTHORITIES = Object.freeze({
  identity: "tcgplayer",
  self_hosted_tcgplayer_exact_product_v1: "tcgplayer",
  self_hosted_bandai_official_exact_base_art_v1: "bandai-official",
  self_hosted_verified_external_exact_product_v1: "verified-external",
});

export const ONE_PIECE_GOVERNED_EXTERNAL_EXACT_IMAGE_OVERRIDES_V1 =
  Object.freeze({
    "707248": Object.freeze({
      card_number: "OP16-095",
      canonical_name: "Monkey.D.Luffy",
      source_product_name: "Monkey.D.Luffy (Round 1 Promo)",
      download_url:
        "https://www.tcgintel.app/_next/image?" +
        "url=%2Fcards%2FRound1%2Fround1-op-luffy.webp&w=1200&q=90",
      evidence_url:
        "https://www.tcgintel.app/blog/round1-one-piece-card-game-value",
      expected_sha256:
        "629a3a0fc1995dcd7e36174d126677c57903f8e52fb280d07598357e0c3f1859",
    }),
  });

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stable(entry)]),
    );
  }
  return value;
}

export function hashOnePieceSetReleaseClosureV1(value) {
  return createHash("sha256")
    .update(Buffer.isBuffer(value) ? value : JSON.stringify(stable(value)))
    .digest("hex");
}

export function normalizeOnePieceSetCodeV1(value) {
  const code = String(value ?? "").trim().toUpperCase();
  if (!/^(OP|ST|EB|PRB)\d{2}$/.test(code)) {
    throw new Error(`Unsupported One Piece set code: ${value}`);
  }
  return code;
}

export function buildOnePieceSetImagePointerV1({
  row,
  image,
  publicBaseUrl,
}) {
  const extension = image.format === "png" ? "png" : "jpg";
  const authority = image.source_authority;
  const official = authority === "bandai_official_exact_base_art";
  const verifiedExternal = authority === "verified_external_exact_product";
  if (!official && !verifiedExternal && authority !== "tcgplayer_exact_product") {
    throw new Error(`Unsupported image authority: ${image.source_authority}`);
  }
  const pathAuthority = official
    ? "bandai-official"
    : verifiedExternal ? "verified-external" : "tcgplayer";
  const imageSource = official
    ? "self_hosted_bandai_official_exact_base_art_v1"
    : verifiedExternal
      ? "self_hosted_verified_external_exact_product_v1"
      : "self_hosted_tcgplayer_exact_product_v1";
  const path = `one-piece/card-prints/${pathAuthority}/` +
    `${row.source_product_id}/` +
    `${image.sha256.slice(0, 32)}.${extension}`;
  return {
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    name: row.name,
    number: row.number,
    source_product_id: Number(row.source_product_id),
    source_product_name: row.source_product_name,
    source_image_url: row.source_image_url,
    image_url: `${String(publicBaseUrl).replace(/\/$/, "")}/${path}`,
    image_alt_url: null,
    image_source: imageSource,
    image_hash: image.sha256,
    image_status: "exact",
    image_res: { width: image.width, height: image.height },
    image_path: path,
    image_note: official
      ? `Exact Bandai official base artwork self-hosted and hash-verified by ` +
        `${ONE_PIECE_SET_RELEASE_CLOSURE_VERSION}; product name, card name, ` +
        `printed number, and base-variant status agreed.`
      : verifiedExternal
        ? `Exact external product image self-hosted and hash-verified by ` +
          `${ONE_PIECE_SET_RELEASE_CLOSURE_VERSION}; canonical identity, ` +
          `source product identity, printed number, and expected image hash agreed.`
      : `Exact TCGPlayer product image self-hosted and hash-verified by ` +
        `${ONE_PIECE_SET_RELEASE_CLOSURE_VERSION}.`,
    source_download_url: image.source_download_url ?? null,
    source_download_authority: image.source_authority ?? null,
    source_evidence_url: image.source_evidence_url ?? null,
    source_expected_sha256: image.source_expected_sha256 ?? null,
    content_type: image.content_type,
    size_bytes: image.size_bytes,
    width: image.width,
    height: image.height,
    format: image.format,
  };
}

export function isOnePieceSelfHostedExactImageV1(row, publicBaseUrl) {
  const productId = String(row?.source_product_id ?? "").trim();
  const imagePath = String(row?.image_path ?? "").trim();
  const imageSource = String(row?.image_source ?? "").trim();
  const imageHash = String(row?.image_hash ?? "");
  const imagePathMatch = imagePath.match(
    /^one-piece\/card-prints\/(tcgplayer|bandai-official|verified-external)\/(\d+)\/([0-9a-f]{32})\.(jpg|png)$/,
  );
  const expectedAuthority = ONE_PIECE_SET_IMAGE_AUTHORITIES[imageSource];
  const governedExternal = resolveOnePieceGovernedExternalExactImageV1(row);
  const governedSourceRequired =
    isOnePieceGovernedExternalImageProductV1(row);
  let imageUrl;
  let expectedUrl;
  try {
    imageUrl = new URL(String(row?.image_url ?? ""));
    expectedUrl = new URL(
      `${String(publicBaseUrl).replace(/\/$/, "")}/${imagePath}`,
    );
  } catch {
    return false;
  }

  return /^\d+$/.test(productId) &&
    row?.image_status === "exact" &&
    Boolean(expectedAuthority) &&
    (expectedAuthority !== "verified-external" || governedSourceRequired) &&
    (!governedSourceRequired || imageSource ===
      "self_hosted_verified_external_exact_product_v1") &&
    imagePathMatch?.[1] === expectedAuthority &&
    imagePathMatch?.[2] === productId &&
    imagePathMatch?.[3] === imageHash.slice(0, 32) &&
    /^[0-9a-f]{64}$/.test(imageHash) &&
    (!governedSourceRequired ||
      governedExternal?.expected_sha256 === imageHash) &&
    imageUrl.protocol === "https:" &&
    imageUrl.origin === expectedUrl.origin &&
    imageUrl.pathname === expectedUrl.pathname;
}

export function resolveOnePieceGovernedExternalExactImageV1(row) {
  const productId = String(row?.source_product_id ?? "").trim();
  const override = ONE_PIECE_GOVERNED_EXTERNAL_EXACT_IMAGE_OVERRIDES_V1[
    productId
  ];
  if (!override) return null;
  if (String(row?.number ?? "").trim().toUpperCase() !== override.card_number ||
      String(row?.name ?? "").trim() !== override.canonical_name ||
      String(row?.source_product_name ?? "").trim() !==
        override.source_product_name) {
    return null;
  }
  return override;
}

export function isOnePieceGovernedExternalImageProductV1(row) {
  const productId = String(row?.source_product_id ?? "").trim();
  return Object.hasOwn(
    ONE_PIECE_GOVERNED_EXTERNAL_EXACT_IMAGE_OVERRIDES_V1,
    productId,
  );
}

export function resolveOnePieceOfficialBaseImageV1(row, officialRecords) {
  const sourceName = normalizeOnePieceOfficialNameV1(
    row?.source_product_name,
  );
  const canonicalName = normalizeOnePieceOfficialNameV1(row?.name);
  const printedSerial = String(row?.number ?? "").match(/-(\d{3})$/)?.[1];
  const productNameSupport = sourceName === canonicalName
    ? "exact_canonical_name"
    : printedSerial && sourceName === `${canonicalName} ${printedSerial}`
      ? "exact_canonical_name_plus_printed_serial"
      : null;
  if (!sourceName || !productNameSupport) {
    return { status: "not_exact_base_product_name", image_url: null };
  }
  const matches = (officialRecords ?? []).filter((record) =>
    record.card_number === row.number &&
    record.variant_suffix === null &&
    record.normalized_official_name === canonicalName);
  if (matches.length !== 1) {
    return {
      status: matches.length === 0
        ? "official_base_image_not_found"
        : "official_base_image_ambiguous",
      image_url: null,
    };
  }
  return {
    status: "exact_official_base_image",
    image_url: matches[0].image_url,
    official_variant_id: matches[0].official_variant_id,
    source_url: matches[0].source_url,
    product_name_support: productNameSupport,
  };
}

export function buildOnePieceSetClosureSnapshotV1({
  set,
  releaseControl,
  rows,
  sourcePricing,
  official,
  imagePublicBaseUrl,
}) {
  const cohort = [...rows].sort((left, right) =>
    left.card_print_id.localeCompare(right.card_print_id));
  const counts = {
    cohort_rows: cohort.length,
    target_set_rows: cohort.filter((row) => row.set_code === set.code).length,
    cross_set_rows: cohort.filter((row) => row.set_code !== set.code).length,
    active_identities: cohort.filter((row) => Number(row.active_identity_count) === 1).length,
    active_evidence: cohort.filter((row) => Number(row.active_evidence_count) >= 1).length,
    exact_tcgplayer_mappings: cohort.filter((row) => Number(row.active_mapping_count) === 1).length,
    duplicate_tcgplayer_mappings: cohort.filter((row) => Number(row.active_mapping_count) > 1).length,
    self_hosted_exact_images: cohort.filter(
      (row) => isOnePieceSelfHostedExactImageV1(row, imagePublicBaseUrl),
    ).length,
    image_source_references: cohort.filter((row) => Boolean(row.source_image_url)).length,
    suppressed_rows: cohort.filter((row) => row.visibility_status === "suppressed").length,
    warehouse_market_products: Number(sourcePricing?.market_product_count ?? 0),
    official_artwork_records: Number(official?.artwork_record_count ?? 0),
    official_unique_numbers: Number(official?.unique_number_count ?? 0),
    official_exact_base_image_candidates: cohort.filter((row) =>
      !isOnePieceSelfHostedExactImageV1(row, imagePublicBaseUrl) &&
      resolveOnePieceOfficialBaseImageV1(row, official?.records).status ===
        "exact_official_base_image").length,
  };
  const fingerprintRows = cohort.map((row) => ({
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    set_code: row.set_code,
    number: row.number,
    source_product_id: row.source_product_id,
    source_product_name: row.source_product_name,
    source_image_url: row.source_image_url,
    name: row.name,
    active_identity_count: Number(row.active_identity_count),
    active_evidence_count: Number(row.active_evidence_count),
    active_mapping_count: Number(row.active_mapping_count),
    image_url: row.image_url,
    image_alt_url: row.image_alt_url,
    image_source: row.image_source,
    image_status: row.image_status,
    image_path: row.image_path,
    image_hash: row.image_hash,
    visibility_status: row.visibility_status,
  }));
  const core = {
    version: ONE_PIECE_SET_RELEASE_CLOSURE_VERSION,
    image_public_base_url: imagePublicBaseUrl,
    set,
    release_control: releaseControl,
    counts,
    source_pricing: sourcePricing,
    official,
    rows: fingerprintRows,
  };
  return {
    ...core,
    snapshot_fingerprint_sha256: hashOnePieceSetReleaseClosureV1(core),
  };
}

export function evaluateOnePieceSetReleaseReadinessV1(snapshot) {
  const findings = [];
  const count = Number(snapshot?.counts?.cohort_rows ?? 0);
  const require = (condition, code) => {
    if (!condition) findings.push(code);
  };
  require(snapshot?.set?.game === "one_piece", "target_game_mismatch");
  require(count > 0, "empty_release_cohort");
  require(snapshot?.release_control?.release_status === "hidden",
    "set_not_hidden_before_activation");
  require(Number(snapshot?.counts?.active_identities) === count,
    "identity_count_mismatch");
  require(Number(snapshot?.counts?.active_evidence) === count,
    "evidence_count_mismatch");
  require(Number(snapshot?.counts?.exact_tcgplayer_mappings) === count,
    "mapping_count_mismatch");
  require(Number(snapshot?.counts?.duplicate_tcgplayer_mappings) === 0,
    "duplicate_tcgplayer_mappings");
  require(Number(snapshot?.counts?.image_source_references) === count,
    "source_image_reference_gap");
  require(Number(snapshot?.counts?.self_hosted_exact_images) === count,
    "self_hosted_image_gap");
  return {
    valid: findings.length === 0,
    findings,
    cohort_rows: count,
    snapshot_fingerprint_sha256: snapshot?.snapshot_fingerprint_sha256 ?? null,
  };
}

export function evaluateOnePieceSetActivationReadinessV1(
  snapshot,
  currentVisibility = null,
) {
  const baseline = evaluateOnePieceSetReleaseReadinessV1(snapshot);
  const releaseStatus = snapshot?.release_control?.release_status ?? null;
  const suppressedRows = Number(snapshot?.counts?.suppressed_rows ?? 0);
  const count = Number(snapshot?.counts?.cohort_rows ?? 0);
  const findings = baseline.findings.filter((finding) =>
    finding !== "set_not_hidden_before_activation");
  const add = (condition, code) => {
    if (!condition) findings.push(code);
  };

  if (releaseStatus === "hidden") {
    add(baseline.findings.length === findings.length,
      "set_not_hidden_before_activation");
  } else if (releaseStatus === "signed_in" || releaseStatus === null) {
    add(suppressedRows > 0, "active_set_has_no_suppressed_increment");
    add(currentVisibility?.anonymous?.set_visible === false,
      "active_set_anonymous_visibility_mismatch");
    add(Number(currentVisibility?.anonymous?.card_count) === 0,
      "active_set_anonymous_card_count_mismatch");
    add(currentVisibility?.authenticated?.set_visible === true,
      "active_set_authenticated_visibility_mismatch");
    add(Number(currentVisibility?.authenticated?.card_count) ===
      count - suppressedRows,
    "active_set_existing_card_count_mismatch");
  } else {
    findings.push("release_status_not_activatable");
  }

  return {
    valid: findings.length === 0,
    findings: [...new Set(findings)],
    release_mode: releaseStatus === "hidden"
      ? "initial_hidden_release"
      : releaseStatus === "signed_in"
        ? "governed_active_increment"
        : releaseStatus === null
          ? "legacy_active_increment"
          : `unexpected_release_status:${releaseStatus}`,
    cohort_rows: count,
    suppressed_rows: suppressedRows,
  };
}

export function evaluateOnePieceIndependentReleaseReadbackV1(
  snapshot,
  visibility,
) {
  const findings = [];
  const count = Number(snapshot?.counts?.cohort_rows ?? 0);
  const releaseStatus = snapshot?.release_control?.release_status ?? null;
  const require = (condition, code) => {
    if (!condition) findings.push(code);
  };

  require(count > 0, "empty_release_cohort");
  require(releaseStatus === "signed_in" || releaseStatus === null,
    "release_status_not_signed_in");
  require(Number(snapshot?.counts?.suppressed_rows) === 0,
    "suppressed_rows_present");
  require(visibility?.anonymous?.set_visible === false,
    "anonymous_set_visible");
  require(Number(visibility?.anonymous?.card_count) === 0,
    "anonymous_cards_visible");
  require(visibility?.authenticated?.set_visible === true,
    "authenticated_set_not_visible");
  require(Number(visibility?.authenticated?.card_count) === count,
    "authenticated_card_count_mismatch");

  return {
    valid: findings.length === 0,
    findings,
    release_mode: releaseStatus === "signed_in"
      ? "governed_signed_in"
      : releaseStatus === null
        ? "legacy_active_without_release_control"
        : `unexpected_release_status:${releaseStatus}`,
    cohort_rows: count,
  };
}

export function validateOnePieceSetImagePointersV1(pointers, expectedCount) {
  const findings = [];
  if (pointers.length !== expectedCount) findings.push("pointer_count_mismatch");
  for (const pointer of pointers) {
    const expectedAuthority =
      ONE_PIECE_SET_IMAGE_AUTHORITIES[pointer.image_source];
    const pathMatch = String(pointer.image_path ?? "").match(
      /^one-piece\/card-prints\/(tcgplayer|bandai-official|verified-external)\/(\d+)\/([0-9a-f]{32})\.(jpg|png)$/,
    );
    const expectedDownloadAuthority = expectedAuthority === "bandai-official"
      ? "bandai_official_exact_base_art"
      : expectedAuthority === "verified-external"
        ? "verified_external_exact_product"
        : "tcgplayer_exact_product";
    const allowedDownloadHosts = expectedAuthority === "bandai-official"
      ? ["en.onepiece-cardgame.com"]
      : expectedAuthority === "verified-external"
        ? ["www.tcgintel.app"]
        : ["tcgplayer-cdn.tcgplayer.com", "product-images.tcgplayer.com"];
    let sourceDownloadHost = null;
    try {
      const sourceDownloadUrl = new URL(pointer.source_download_url);
      if (sourceDownloadUrl.protocol === "https:") {
        sourceDownloadHost = sourceDownloadUrl.hostname.toLowerCase();
      }
    } catch {
      // Invalid source URLs fail through the common pointer finding below.
    }
    const externalOverride = expectedAuthority === "verified-external"
      ? resolveOnePieceGovernedExternalExactImageV1(pointer)
      : null;
    const externalSourceValid = expectedAuthority !== "verified-external" ||
      (externalOverride !== null &&
       pointer.source_download_url === externalOverride.download_url &&
       pointer.source_evidence_url === externalOverride.evidence_url &&
       pointer.source_expected_sha256 === externalOverride.expected_sha256 &&
       pointer.image_hash === externalOverride.expected_sha256);
    if (!pointer.card_print_id || !pointer.gv_id ||
        !Number.isInteger(pointer.source_product_id) ||
        !/^[0-9a-f]{64}$/.test(pointer.image_hash ?? "") ||
        pathMatch?.[1] !== expectedAuthority ||
        Number(pathMatch?.[2]) !== pointer.source_product_id ||
        pathMatch?.[3] !== pointer.image_hash.slice(0, 32) ||
        pointer.image_status !== "exact" ||
        pointer.source_download_authority !== expectedDownloadAuthority ||
        !allowedDownloadHosts.includes(sourceDownloadHost) ||
        !externalSourceValid ||
        !Number.isInteger(pointer.width) || pointer.width < 100 ||
        !Number.isInteger(pointer.height) || pointer.height < 100 ||
        Number(pointer.size_bytes) <= 1000) {
      findings.push(`invalid_pointer:${pointer.gv_id ?? "unknown"}`);
    }
  }
  for (const field of ["card_print_id", "gv_id", "image_path"]) {
    if (new Set(pointers.map((row) => row[field])).size !== pointers.length) {
      findings.push(`duplicate_pointer:${field}`);
    }
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}
