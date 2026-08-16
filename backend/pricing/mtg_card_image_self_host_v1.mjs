import crypto from 'node:crypto';

export const MTG_CARD_IMAGE_SELF_HOST_VERSION = 'MTG_CARD_IMAGE_SELF_HOST_V1';
export const MTG_CARD_IMAGE_PLAN_VERSION = 'MTG_SELF_HOSTED_IMAGE_READINESS_V1';
export const MTG_CARD_IMAGE_BUCKET = 'user-card-images';
export const MTG_CARD_IMAGE_SOURCE_HOST = 'cards.scryfall.io';
export const MTG_CARD_IMAGE_PLAN_ROWS = 108487;
export const MTG_CARD_IMAGE_PLAN_SHA256 =
  'ec384a63110f99f6053c7a0ea2b4545dec6f434caad957c0997c992a2359a85d';
export const MTG_CARD_IMAGE_PLAN_LOGICAL_SHA256 =
  'd4c9a1c422df66ea1fd37fa7237f8951e70590b71acd7ffe2cc316aec3e3af77';
export const MTG_CARD_IMAGE_PATH_ROOT =
  'warehouse-derived/self-hosted-images-v1/card_prints/mtg';

export function sha256MtgImageV1(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function stableJsonMtgImageV1(value) {
  if (Array.isArray(value)) return `[${value.map(stableJsonMtgImageV1).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJsonMtgImageV1(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function inspectMtgImagePlanRowV1(row) {
  const findings = [];
  if (row?.plan_version !== MTG_CARD_IMAGE_PLAN_VERSION) findings.push('plan_version');
  if (!/^[0-9a-f-]{36}$/i.test(row?.card_print_id ?? '')) findings.push('card_print_id');
  if (!/^[0-9a-f-]{36}$/i.test(row?.scryfall_print_id ?? '')) findings.push('scryfall_print_id');
  if (!Number.isInteger(row?.face_index) || row.face_index < 0) findings.push('face_index');
  if (row?.face_role !== (row?.face_index === 0 ? 'front' : row?.face_index === 1
    ? 'back' : `additional_${row?.face_index}`)) findings.push('face_role');
  if (row?.source_identity_status !== 'exact_scryfall_print') findings.push('identity_status');
  for (const quality of ['png', 'large', 'normal']) {
    let parsed;
    try { parsed = new URL(row?.source_urls?.[quality]); } catch { findings.push(`${quality}_url`); continue; }
    if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== MTG_CARD_IMAGE_SOURCE_HOST) {
      findings.push(`${quality}_authority`);
    }
    const face = row.face_index === 0 ? 'front' : 'back';
    const extension = quality === 'png' ? 'png' : 'jpg';
    if (!parsed.pathname.endsWith(`/${row.scryfall_print_id}.${extension}`)
      || !parsed.pathname.startsWith(`/${quality}/${face}/`)) findings.push(`${quality}_identity`);
  }
  return { valid: findings.length === 0, findings };
}

export function mtgHostedImagePathV1(row, quality = 'large') {
  const inspected = inspectMtgImagePlanRowV1(row);
  if (!inspected.valid) throw new Error(`Invalid plan row: ${inspected.findings.join(',')}`);
  if (!['png', 'large', 'normal'].includes(quality)) throw new Error(`Unsupported quality: ${quality}`);
  const extension = quality === 'png' ? 'png' : 'jpg';
  const sourceUrl = row.source_urls[quality];
  return `${MTG_CARD_IMAGE_PATH_ROOT}/${row.set_code.toLowerCase()}`
    + `/${row.scryfall_print_id.toLowerCase()}/${row.face_role}`
    + `/${sha256MtgImageV1(sourceUrl).slice(0, 24)}.${extension}`;
}

export function inspectImageBytesV1(buffer, contentType = '') {
  const findings = [];
  let format = null;
  let width = null;
  let height = null;
  if (buffer.length >= 24
    && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    format = 'png';
    width = buffer.readUInt32BE(16);
    height = buffer.readUInt32BE(20);
  } else if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    format = 'jpg';
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker >= 0xd0 && marker <= 0xd7) { offset += 2; continue; }
      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2 || offset + 2 + length > buffer.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb,
        0xcd, 0xce, 0xcf].includes(marker)) {
        height = buffer.readUInt16BE(offset + 5);
        width = buffer.readUInt16BE(offset + 7);
        break;
      }
      offset += 2 + length;
    }
  }
  if (!format) findings.push('unsupported_image_format');
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 100 || height < 100) {
    findings.push('invalid_dimensions');
  }
  const normalizedType = String(contentType).split(';')[0].trim().toLowerCase();
  if (format === 'png' && normalizedType && normalizedType !== 'image/png') findings.push('mime_mismatch');
  if (format === 'jpg' && normalizedType && !['image/jpeg', 'image/jpg'].includes(normalizedType)) {
    findings.push('mime_mismatch');
  }
  if (buffer.length < 1_000) findings.push('image_too_small');
  return {
    valid: findings.length === 0,
    findings,
    format,
    content_type: format === 'png' ? 'image/png' : format === 'jpg' ? 'image/jpeg' : null,
    width,
    height,
    size_bytes: buffer.length,
    sha256: sha256MtgImageV1(buffer),
  };
}

export function buildMtgHostedImagePointerV1(row, image, quality, publicBaseUrl) {
  if (!image?.valid) throw new Error('Image must validate before pointer creation');
  const imagePath = mtgHostedImagePathV1(row, quality);
  return {
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    set_code: row.set_code,
    scryfall_print_id: row.scryfall_print_id,
    face_index: row.face_index,
    face_role: row.face_role,
    source_quality: quality,
    source_url: row.source_urls[quality],
    image_path: imagePath,
    image_url: `${String(publicBaseUrl).replace(/\/$/, '')}/${imagePath}`,
    image_hash: image.sha256,
    content_type: image.content_type,
    width: image.width,
    height: image.height,
    size_bytes: image.size_bytes,
    image_source: 'self_hosted_scryfall_exact_print_v1',
    image_status: 'exact',
  };
}

export function selectMtgImageCanaryV1(rows, count = 20) {
  if (!Number.isInteger(count) || count < 4 || rows.length < count) {
    throw new Error('Invalid canary count');
  }
  const backs = rows.filter((row) => row.face_role === 'back');
  const fronts = rows.filter((row) => row.face_role === 'front');
  const selected = [];
  const addSpread = (values, desired) => {
    if (!desired || !values.length) return;
    const step = values.length / desired;
    for (let index = 0; index < desired; index += 1) {
      const row = values[Math.min(values.length - 1, Math.floor(index * step))];
      if (!selected.some((item) => item.scryfall_print_id === row.scryfall_print_id
        && item.face_index === row.face_index)) selected.push(row);
    }
  };
  addSpread(backs, Math.min(5, backs.length, count));
  addSpread(fronts, count - selected.length);
  for (const row of rows) {
    if (selected.length >= count) break;
    if (!selected.some((item) => item.scryfall_print_id === row.scryfall_print_id
      && item.face_index === row.face_index)) selected.push(row);
  }
  return selected.slice(0, count);
}

export function groupMtgImagePointersV1(pointers) {
  const grouped = new Map();
  for (const pointer of pointers) {
    const current = grouped.get(pointer.card_print_id) ?? { front: null, back: null, additional: [] };
    if (pointer.face_role === 'front') current.front = pointer;
    else if (pointer.face_role === 'back') current.back = pointer;
    else current.additional.push(pointer);
    grouped.set(pointer.card_print_id, current);
  }
  return grouped;
}
