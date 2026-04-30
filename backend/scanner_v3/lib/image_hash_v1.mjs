import sharp from 'sharp';

export const DHASH_V1 = {
  algorithm: 'dhash_9x8_luma_v1',
  width: 9,
  height: 8,
  bits: 64,
};

function bitStringToHex(bits) {
  if (typeof bits !== 'string' || bits.length === 0) {
    throw new Error('invalid_hash_bits');
  }
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    const nibble = bits.slice(i, i + 4).padEnd(4, '0');
    hex += Number.parseInt(nibble, 2).toString(16);
  }
  return hex;
}

export async function computeDHashV1(imageBuffer) {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new Error('dhash_invalid_image_buffer');
  }

  const { data, info } = await sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .resize({
      width: DHASH_V1.width,
      height: DHASH_V1.height,
      fit: 'fill',
    })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.width !== DHASH_V1.width || info.height !== DHASH_V1.height || info.channels !== 1) {
    throw new Error('dhash_unexpected_raster_shape');
  }

  let bits = '';
  for (let y = 0; y < DHASH_V1.height; y += 1) {
    const rowOffset = y * DHASH_V1.width;
    for (let x = 0; x < DHASH_V1.width - 1; x += 1) {
      const left = data[rowOffset + x];
      const right = data[rowOffset + x + 1];
      bits += left > right ? '1' : '0';
    }
  }

  return {
    algorithm: DHASH_V1.algorithm,
    bits,
    hex: bitStringToHex(bits),
    bit_length: bits.length,
    source_width: info.width,
    source_height: info.height,
  };
}

export function hammingDistanceBits(leftBits, rightBits) {
  if (typeof leftBits !== 'string' || typeof rightBits !== 'string') {
    throw new Error('hamming_invalid_bits');
  }
  if (leftBits.length !== rightBits.length) {
    throw new Error(`hamming_length_mismatch:${leftBits.length}:${rightBits.length}`);
  }

  let distance = 0;
  for (let i = 0; i < leftBits.length; i += 1) {
    if (leftBits[i] !== rightBits[i]) distance += 1;
  }
  return distance;
}

export function rankByHammingDistance({ query, references, topN = 3 }) {
  if (!query || !Array.isArray(references)) {
    throw new Error('rank_invalid_input');
  }

  return references
    .map((reference) => {
      const fullCardDistance = hammingDistanceBits(query.full_card_hash.bits, reference.full_card_hash.bits);
      const artworkDistance = hammingDistanceBits(query.artwork_hash.bits, reference.artwork_hash.bits);
      return {
        id: reference.id,
        source_dir: reference.source_dir,
        distance: fullCardDistance + artworkDistance,
        full_card_distance: fullCardDistance,
        artwork_distance: artworkDistance,
        is_self: reference.id === query.id,
      };
    })
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if (a.artwork_distance !== b.artwork_distance) return a.artwork_distance - b.artwork_distance;
      if (a.full_card_distance !== b.full_card_distance) return a.full_card_distance - b.full_card_distance;
      if (a.is_self !== b.is_self) return a.is_self ? -1 : 1;
      return a.id.localeCompare(b.id);
    })
    .slice(0, topN);
}
