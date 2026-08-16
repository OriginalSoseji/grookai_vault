import { createHash } from "node:crypto";

export const ONE_PIECE_CARD_IMAGE_SELF_HOST_VERSION =
  "ONE_PIECE_CARD_IMAGE_SELF_HOST_V1";
export const ONE_PIECE_CARD_IMAGE_COUNT = 6730;
export const ONE_PIECE_CARD_IMAGE_BUCKET = "external-card-images";
export const ONE_PIECE_CARD_IMAGE_SOURCE_HOST =
  "tcgplayer-cdn.tcgplayer.com";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stable(entry)]));
  }
  return value;
}

export const stableJsonOnePieceCardImageV1 = (value) =>
  JSON.stringify(stable(value));
export const hashOnePieceCardImageV1 = (value) => createHash("sha256")
  .update(Buffer.isBuffer(value) ? value : stableJsonOnePieceCardImageV1(value))
  .digest("hex");

export function highResolutionOnePieceImageUrlV1(sourceUrl, productId) {
  const source = new URL(sourceUrl);
  const match = source.pathname.match(/^\/product\/(\d+)_200w\.jpg$/i);
  if (source.protocol !== "https:" ||
      source.hostname.toLowerCase() !== ONE_PIECE_CARD_IMAGE_SOURCE_HOST ||
      !match || Number(match[1]) !== Number(productId)) {
    throw new Error(`Invalid exact TCGPlayer image reference: ${productId}`);
  }
  source.pathname = `/product/${productId}_in_1000x1000.jpg`;
  return source.toString();
}

export function buildOnePieceCardImageSourcePlanV1(rows) {
  const items = [...rows].sort((left, right) =>
    Number(left.source_product_id) - Number(right.source_product_id)).map((row) => ({
      card_print_id: String(row.card_print_id),
      gv_id: String(row.gv_id),
      canonical_name: String(row.canonical_name),
      source_product_id: Number(row.source_product_id),
      source_image_url: String(row.source_image_url),
      high_resolution_url: highResolutionOnePieceImageUrlV1(
        row.source_image_url, row.source_product_id),
      evidence_role: row.existing_image_path
        ? "existing_official_self_hosted_image"
        : "exact_tcgplayer_product_image",
      existing_image_bucket: row.existing_image_path ? "user-card-images" : null,
      existing_image_path: row.existing_image_path ?? null,
      existing_image_note: row.existing_image_note ?? null,
    }));
  const core = { version: ONE_PIECE_CARD_IMAGE_SELF_HOST_VERSION,
    bucket: ONE_PIECE_CARD_IMAGE_BUCKET, items,
    counts: { card_prints: items.length, unique_card_print_ids:
      new Set(items.map((row) => row.card_print_id)).size,
    unique_gv_ids: new Set(items.map((row) => row.gv_id)).size,
    unique_source_products: new Set(items.map((row) =>
      row.source_product_id)).size,
    unique_source_urls: new Set(items.map((row) =>
      row.source_image_url)).size },
  boundaries: { database_writes: 0, storage_writes: 0,
    pointer_writes: 0, release_writes: 0, vault_writes: 0 } };
  return { ...core, plan_fingerprint_sha256:
    hashOnePieceCardImageV1(core) };
}

export function validateOnePieceCardImageSourcePlanV1(plan) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const items = plan?.items ?? [];
  const { plan_fingerprint_sha256: fingerprint, ...core } = plan ?? {};
  add(plan?.version !== ONE_PIECE_CARD_IMAGE_SELF_HOST_VERSION,
    "version_mismatch");
  add(fingerprint !== hashOnePieceCardImageV1(core),
    "plan_fingerprint_mismatch");
  add(items.length !== ONE_PIECE_CARD_IMAGE_COUNT, "item_count_mismatch");
  for (const key of ["unique_card_print_ids", "unique_gv_ids",
    "unique_source_products", "unique_source_urls"]) {
    add(Number(plan?.counts?.[key]) !== ONE_PIECE_CARD_IMAGE_COUNT,
      `uniqueness_mismatch:${key}`);
  }
  for (const row of items) {
    try {
      add(row.high_resolution_url !== highResolutionOnePieceImageUrlV1(
        row.source_image_url, row.source_product_id),
      `high_resolution_derivation_mismatch:${row.gv_id}`);
    } catch {
      findings.push(`invalid_source_image:${row.gv_id}`);
    }
    add(!["exact_tcgplayer_product_image",
      "existing_official_self_hosted_image"].includes(row.evidence_role),
    `evidence_role_mismatch:${row.gv_id}`);
    add(row.evidence_role === "existing_official_self_hosted_image" &&
      (!row.existing_image_path?.startsWith(
        "warehouse-derived/self-hosted-images-v1/card_prints/one-piece/st01/") ||
       row.existing_image_bucket !== "user-card-images"),
    `existing_official_binding_mismatch:${row.gv_id}`);
  }
  for (const [key, value] of Object.entries(plan?.boundaries ?? {})) {
    add(value !== 0, `boundary_overclaim:${key}`);
  }
  return { valid: findings.length === 0,
    findings: [...new Set(findings)] };
}

export function buildOnePieceCardImagePointerV1(source, image, publicUrl) {
  const extension = image.format === "png" ? "png" : "jpg";
  const authority = source.evidence_role === "existing_official_self_hosted_image"
    ? "official" : "tcgplayer";
  const imagePath = `one-piece/card-prints/${authority}/${source.source_product_id}/` +
    `${image.sha256.slice(0, 32)}.${extension}`;
  const imageSource = authority === "official"
    ? "self_hosted_official_one_piece_card_list_v1"
    : "self_hosted_tcgplayer_exact_product_v1";
  return { card_print_id: source.card_print_id, gv_id: source.gv_id,
    source_product_id: source.source_product_id, source_image_url:
      source.source_image_url, image_path: imagePath,
  image_url: `${String(publicUrl).replace(/\/$/, "")}/${imagePath}`,
  image_source: imageSource,
  image_hash: image.sha256, image_status: "exact",
  image_res: { width: image.width, height: image.height },
  image_note: authority === "official"
    ? `${source.existing_image_note} Copied to the public canonical image bucket ` +
      `and hash-verified by ${ONE_PIECE_CARD_IMAGE_SELF_HOST_VERSION}.`
    : "Exact TCGPlayer product image self-hosted and hash-verified by " +
      ONE_PIECE_CARD_IMAGE_SELF_HOST_VERSION,
  content_type: image.content_type, size_bytes: image.size_bytes,
  width: image.width, height: image.height, format: image.format,
  source_download_role: image.source_download_role };
}

export function validateOnePieceCardImagePointersV1(rows) {
  const findings = [];
  if ((rows ?? []).length !== ONE_PIECE_CARD_IMAGE_COUNT) {
    findings.push("pointer_count_mismatch");
  }
  for (const row of rows ?? []) {
    if (!row.card_print_id || !row.gv_id || !row.source_product_id ||
        !/^[0-9a-f]{64}$/.test(row.image_hash ?? "") ||
        !row.image_path?.startsWith(
          `one-piece/card-prints/${row.image_source ===
            "self_hosted_official_one_piece_card_list_v1"
            ? "official" : "tcgplayer"}/${row.source_product_id}/`) ||
        row.image_status !== "exact" ||
        !["self_hosted_tcgplayer_exact_product_v1",
          "self_hosted_official_one_piece_card_list_v1"].includes(
          row.image_source) ||
        !Number.isInteger(row.width) || !Number.isInteger(row.height) ||
        row.width < 100 || row.height < 100 || Number(row.size_bytes) <= 1000) {
      findings.push(`invalid_pointer:${row.gv_id ?? "unknown"}`);
    }
  }
  for (const [label, values] of Object.entries({
    card_print_id: (rows ?? []).map((row) => row.card_print_id),
    gv_id: (rows ?? []).map((row) => row.gv_id),
    image_path: (rows ?? []).map((row) => row.image_path),
  })) {
    if (new Set(values).size !== values.length) {
      findings.push(`duplicate_pointer:${label}`);
    }
  }
  return { valid: findings.length === 0,
    findings: [...new Set(findings)] };
}
