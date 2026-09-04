import crypto from 'node:crypto';

export const MTG_SEALED_IMAGE_COVERAGE_V1 =
  'MTG_SEALED_IMAGE_COVERAGE_V1';
export const MTG_SEALED_IMAGE_EVIDENCE_V1 =
  'MTG_SEALED_IMAGE_EVIDENCE_V1';
export const MTG_SEALED_IMAGE_STORAGE_PREFIX_V1 = 'sealed/mtg/sha256';

const ALLOWED_IMAGE_HOSTS = new Set([
  'product-images.tcgplayer.com',
  'tcgplayer-cdn.tcgplayer.com',
]);

function clean(value) {
  const result = String(value ?? '').trim();
  return result || null;
}

function normalizedName(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object' && !Buffer.isBuffer(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) =>
      [key, stableValue(value[key])]));
  }
  return value;
}

export function hashMtgSealedImageV1(value) {
  const input = Buffer.isBuffer(value)
    ? value
    : Buffer.from(JSON.stringify(stableValue(value)));
  return crypto.createHash('sha256').update(input).digest('hex');
}

function jpegDimensions(buffer) {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker === 0xda) break;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) break;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
      0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
      };
    }
    offset += length;
  }
  return null;
}

function webpDimensions(buffer) {
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X' && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (chunk === 'VP8 ' && buffer.length >= 30 &&
      buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === 'VP8L' && buffer.length >= 25 && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  return null;
}

export function inspectMtgSealedImageBytesV1(buffer, headerContentType = null) {
  const diagnostics = [];
  let format = null;
  let dimensions = null;
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { valid_image: false, format: null, content_type: null, width: null,
      height: null, size_bytes: 0, sha256: null,
      placeholder_suspected: false, diagnostics: ['empty_image_bytes'] };
  }
  if (buffer.length >= 24 && buffer.subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    format = 'png';
    dimensions = { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  } else if (buffer.length >= 10 &&
      (buffer.toString('ascii', 0, 6) === 'GIF87a' ||
       buffer.toString('ascii', 0, 6) === 'GIF89a')) {
    format = 'gif';
    dimensions = { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  } else if (buffer.length >= 12 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    format = 'jpeg';
    dimensions = jpegDimensions(buffer);
  } else if (buffer.length >= 30 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP') {
    format = 'webp';
    dimensions = webpDimensions(buffer);
  } else {
    diagnostics.push('unsupported_image_signature');
  }
  if (format && !dimensions) diagnostics.push('image_dimensions_unreadable');
  const headerType = clean(headerContentType)?.split(';')[0].toLowerCase() ?? null;
  if (headerType && !headerType.startsWith('image/')) {
    diagnostics.push('non_image_content_type');
  }
  const expectedTypes = {
    jpeg: new Set(['image/jpeg', 'image/jpg']), png: new Set(['image/png']),
    gif: new Set(['image/gif']), webp: new Set(['image/webp']),
  };
  if (headerType?.startsWith('image/') && format &&
      !expectedTypes[format].has(headerType)) {
    diagnostics.push('content_type_signature_mismatch');
  }
  const width = dimensions?.width ?? null;
  const height = dimensions?.height ?? null;
  const placeholder = Number.isInteger(width) && Number.isInteger(height) &&
    (width < 80 || height < 80 || buffer.length < 2_000);
  if (placeholder) diagnostics.push('placeholder_dimensions_or_bytes');
  return {
    valid_image: Boolean(format && dimensions &&
      !diagnostics.includes('non_image_content_type') &&
      !diagnostics.includes('content_type_signature_mismatch')),
    format,
    content_type: format ? `image/${format === 'jpeg' ? 'jpeg' : format}` : null,
    width,
    height,
    size_bytes: buffer.length,
    sha256: hashMtgSealedImageV1(buffer),
    placeholder_suspected: placeholder,
    diagnostics,
  };
}

function exactTcgplayerCandidates(row) {
  const sourceUrl = clean(row.source_image_url);
  const candidates = [];
  if (sourceUrl) {
    let parsed;
    try {
      parsed = new URL(sourceUrl);
    } catch {
      return { candidates: [], invalid_source_url: true };
    }
    if (parsed.protocol !== 'https:' || !ALLOWED_IMAGE_HOSTS.has(
      parsed.hostname.toLowerCase())) {
      return { candidates: [], invalid_source_url: true };
    }
    if (parsed.hostname.toLowerCase() === 'tcgplayer-cdn.tcgplayer.com') {
      const high = new URL(parsed);
      high.pathname = high.pathname.replace(/_200w\.jpg$/i, '_in_1000x1000.jpg');
      candidates.push({ role: 'tcgplayer_source_high_resolution', url: high.toString() });
    }
    candidates.push({ role: 'tcgplayer_warehouse_source', url: parsed.toString() });
  }
  const productId = Number(row.source_product_id);
  if (Number.isSafeInteger(productId) && productId > 0) {
    candidates.push({
      role: 'tcgplayer_exact_product_image',
      url: `https://product-images.tcgplayer.com/fit-in/1000x1000/${productId}.jpg`,
    });
  }
  return {
    candidates: candidates.filter((candidate, index, all) =>
      all.findIndex((other) => other.url === candidate.url) === index),
    invalid_source_url: false,
  };
}

export function buildMtgSealedImageSourcePlanV1(rows, options = {}) {
  const expectedMemberCount = Number(options.expectedMemberCount ?? rows.length);
  const findings = [];
  const memberIds = new Set();
  const variantIds = new Set();
  const output = rows.map((row, selectedIndex) => {
    const memberId = clean(row.release_member_id);
    const variantId = clean(row.variant_id);
    if (!memberId || memberIds.has(memberId)) findings.push('duplicate_or_missing_release_member_id');
    if (!variantId || variantIds.has(variantId)) findings.push('duplicate_or_missing_variant_id');
    memberIds.add(memberId);
    variantIds.add(variantId);
    const sourceProductId = Number(row.source_product_id);
    const currentProductId = Number(row.current_source_product_id);
    const identityConflict = row.game_key !== 'mtg' ||
      Number(row.source_category_id) !== 1 ||
      sourceProductId !== currentProductId ||
      Number(row.source_group_id) !== Number(row.current_source_group_id) ||
      normalizedName(row.source_product_name) !==
        normalizedName(row.current_source_product_name);
    const candidateResult = exactTcgplayerCandidates(row);
    return {
      selected_index: selectedIndex,
      release_id: clean(row.release_id),
      release_member_id: memberId,
      member_fingerprint: clean(row.member_fingerprint),
      game_key: clean(row.game_key),
      game_key: clean(row.game_key),
      family_id: clean(row.family_id),
      variant_id: variantId,
      canonical_name: clean(row.canonical_name),
      package_form: clean(row.package_form),
      language_code: clean(row.language_code),
      source_mapping_id: clean(row.source_mapping_id),
      source_provider: clean(row.source_provider),
      source_category_id: Number(row.source_category_id),
      source_group_id: Number(row.source_group_id),
      source_product_id: sourceProductId,
      source_product_name: clean(row.source_product_name),
      mapping_source_payload_hash: clean(row.mapping_source_payload_hash),
      current_source_payload_hash: clean(row.current_source_payload_hash),
      source_image_url: clean(row.source_image_url),
      source_image_count: row.source_image_count == null
        ? null : Number(row.source_image_count),
      source_active: row.source_active === true,
      catalog_metadata_status: clean(row.catalog_metadata_status),
      identity_conflict: identityConflict,
      invalid_source_url: candidateResult.invalid_source_url,
      candidate_urls: candidateResult.candidates,
    };
  });
  if (rows.length !== expectedMemberCount) findings.push('release_member_count_mismatch');
  if (output.some((row) => row.release_id !== output[0]?.release_id)) {
    findings.push('multiple_release_ids');
  }
  if (output.some((row) => !row.member_fingerprint ||
      !/^[0-9a-f]{64}$/.test(row.member_fingerprint))) {
    findings.push('invalid_member_fingerprint');
  }
  if (output.some((row) => row.source_provider !== 'tcgplayer')) {
    findings.push('unexpected_source_provider');
  }
  return {
    version: MTG_SEALED_IMAGE_COVERAGE_V1,
    expected_member_count: expectedMemberCount,
    selected_member_count: output.length,
    release_id: output[0]?.release_id ?? null,
    rows: output,
    findings: [...new Set(findings)].sort(),
    valid: findings.length === 0,
    plan_fingerprint_sha256: hashMtgSealedImageV1(output),
    boundaries: {
      database_writes: 0,
      storage_writes: 0,
      image_pointer_writes: 0,
      pricing_writes: 0,
      release_pointer_writes: 0,
      visibility_writes: 0,
      vault_writes: 0,
    },
  };
}

function extensionFor(format) {
  return format === 'jpeg' ? 'jpg' : format;
}

export function proposedMtgSealedStoragePathV1(image) {
  if (!image?.sha256 || !/^[0-9a-f]{64}$/.test(image.sha256) ||
      !['jpeg', 'png', 'gif', 'webp'].includes(image.format)) return null;
  return `${MTG_SEALED_IMAGE_STORAGE_PREFIX_V1}/${image.sha256.slice(0, 2)}/` +
    `${image.sha256}.${extensionFor(image.format)}`;
}

export function finalizeMtgSealedImageCoverageV1(plan, probeResults,
  retrievedAt = new Date().toISOString()) {
  if (!plan?.valid) throw new Error('Cannot finalize an invalid source plan');
  if (!Array.isArray(probeResults) || probeResults.length !== plan.rows.length) {
    throw new Error('Probe result count does not match source plan');
  }
  const rows = plan.rows.map((source, index) => {
    const result = probeResults[index] ?? {};
    let classification = 'invalid_image';
    if (source.identity_conflict || source.invalid_source_url) {
      classification = 'identity_conflict';
    } else if (result.status === 'missing_source_image') {
      classification = 'missing_source_image';
    } else if (result.image?.valid_image && result.image.placeholder_suspected) {
      classification = 'placeholder';
    } else if (result.image?.valid_image) {
      classification = 'exact_image_ready';
    }
    return {
      ...source,
      classification,
      retrieval: {
        retrieved_at: result.retrieved_at ?? retrievedAt,
        attempted_urls: result.attempted_urls ?? [],
        selected_role: result.selected_role ?? null,
        selected_source_url: result.selected_source_url ?? null,
        final_url: result.final_url ?? null,
        http_status: result.http_status ?? null,
        error_codes: result.error_codes ?? [],
      },
      image: result.image ?? null,
      proposed_storage_path: proposedMtgSealedStoragePathV1(result.image),
      evidence_contract_version: MTG_SEALED_IMAGE_EVIDENCE_V1,
    };
  });
  const byHash = new Map();
  for (const row of rows) {
    if (!row.image?.valid_image || row.classification !== 'exact_image_ready') continue;
    const members = byHash.get(row.image.sha256) ?? [];
    members.push(row);
    byHash.set(row.image.sha256, members);
  }
  for (const members of byHash.values()) {
    if (members.length > 1) {
      for (const row of members) row.classification = 'shared_bytes_exact_variant';
    }
  }
  const counts = Object.fromEntries([
    'exact_image_ready', 'shared_bytes_exact_variant', 'missing_source_image',
    'invalid_image', 'placeholder', 'identity_conflict',
  ].map((status) => [status,
    rows.filter((row) => row.classification === status).length]));
  const eligible = counts.exact_image_ready + counts.shared_bytes_exact_variant;
  const uniqueHashes = new Set(rows.filter((row) => row.image?.valid_image)
    .map((row) => row.image.sha256));
  const findings = [];
  if (rows.length !== plan.expected_member_count) findings.push('final_member_count_mismatch');
  if (new Set(rows.map((row) => row.release_member_id)).size !== rows.length) {
    findings.push('final_duplicate_release_member');
  }
  if (rows.some((row) => row.proposed_storage_path &&
      !row.proposed_storage_path.startsWith(`${MTG_SEALED_IMAGE_STORAGE_PREFIX_V1}/`))) {
    findings.push('storage_path_scope_violation');
  }
  return {
    version: MTG_SEALED_IMAGE_COVERAGE_V1,
    release_id: plan.release_id,
    source_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    expected_member_count: plan.expected_member_count,
    selected_member_count: rows.length,
    image_eligible_member_count: eligible,
    excluded_member_count: rows.length - eligible,
    unique_image_count: uniqueHashes.size,
    classification_counts: counts,
    rows,
    findings,
    valid: findings.length === 0,
    coverage_fingerprint_sha256: hashMtgSealedImageV1(rows),
    boundaries: plan.boundaries,
  };
}

export function validateMtgSealedImageCoverageV1(coverage) {
  const findings = [...(coverage?.findings ?? [])];
  const rows = coverage?.rows ?? [];
  if (coverage?.version !== MTG_SEALED_IMAGE_COVERAGE_V1) findings.push('version_mismatch');
  if (rows.length !== coverage?.expected_member_count) findings.push('row_count_mismatch');
  if (new Set(rows.map((row) => row.release_member_id)).size !== rows.length) {
    findings.push('duplicate_release_member');
  }
  if (rows.some((row) => row.game_key && row.game_key !== 'mtg')) {
    findings.push('cross_game_row');
  }
  if (rows.some((row) => ['exact_image_ready', 'shared_bytes_exact_variant']
    .includes(row.classification) && (!row.image?.valid_image ||
      !row.proposed_storage_path))) findings.push('eligible_image_evidence_missing');
  if (coverage?.coverage_fingerprint_sha256 !== hashMtgSealedImageV1(rows)) {
    findings.push('coverage_fingerprint_mismatch');
  }
  if (Object.values(coverage?.boundaries ?? {}).some((value) => value !== 0)) {
    findings.push('write_boundary_violation');
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)].sort() };
}
