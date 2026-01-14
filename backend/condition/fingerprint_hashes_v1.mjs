import sharp from 'sharp';

/**
 * Convert a Buffer image to grayscale raw pixels at width x height.
 * Deterministic: force grayscale, output raw.
 */
async function toGrayRaw(imageBuffer, width, height) {
  const { data, info } = await sharp(imageBuffer)
    .resize(width, height, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (!info || info.width !== width || info.height !== height) {
    throw new Error(`gray_raw_bad_shape:${info?.width}x${info?.height}`);
  }
  return data;
}

/**
 * 64-bit dHash:
 * - resize to 9x8
 * - compare adjacent pixels horizontally (8 comparisons per row, 8 rows) => 64 bits
 * Return hex string length 16.
 */
export async function computeDHash64(imageBuffer) {
  const w = 9, h = 8;
  const px = await toGrayRaw(imageBuffer, w, h);

  let bits = BigInt(0);

  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < 8; x++) {
      const a = px[row + x];
      const b = px[row + x + 1];
      const bit = a < b ? 1n : 0n;
      bits = (bits << 1n) | bit;
    }
  }

  return bits.toString(16).padStart(16, '0');
}

/**
 * 64-bit pHash:
 * - resize to 32x32 grayscale
 * - run 2D DCT on 32x32
 * - take top-left 8x8 DCT coefficients (including DC)
 * - compute median of these 64 values
 * - set bit = coeff > median
 * Return hex string length 16.
 */
function dct1d(vec) {
  const N = vec.length;
  const out = new Array(N).fill(0);
  const factor = Math.PI / N;

  for (let k = 0; k < N; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += vec[n] * Math.cos((n + 0.5) * k * factor);
    }
    out[k] = sum;
  }
  return out;
}

function dct2d(matrix) {
  const N = matrix.length;

  // DCT rows
  const rows = new Array(N);
  for (let i = 0; i < N; i++) rows[i] = dct1d(matrix[i]);

  // DCT cols
  const out = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let j = 0; j < N; j++) {
    const col = new Array(N);
    for (let i = 0; i < N; i++) col[i] = rows[i][j];
    const colDct = dct1d(col);
    for (let i = 0; i < N; i++) out[i][j] = colDct[i];
  }

  return out;
}

export async function computePHash64(imageBuffer) {
  const N = 32;
  const px = await toGrayRaw(imageBuffer, N, N);

  // Convert to 2D float matrix
  const mat = Array.from({ length: N }, (_, y) =>
    Array.from({ length: N }, (_, x) => px[y * N + x])
  );

  const coeff = dct2d(mat);

  // top-left 8x8
  const vals = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) vals.push(coeff[y][x]);
  }

  // median
  const sorted = [...vals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  let bits = BigInt(0);
  for (let i = 0; i < vals.length; i++) {
    bits = (bits << 1n) | (vals[i] > median ? 1n : 0n);
  }

  return bits.toString(16).padStart(16, '0');
}

/** Hamming distance for 64-bit hex hashes */
export function hamming64(hexA, hexB) {
  if (typeof hexA !== 'string' || typeof hexB !== 'string' || hexA.length !== 16 || hexB.length !== 16) {
    throw new Error('bad_hash_input');
  }
  const a = BigInt('0x' + hexA);
  const b = BigInt('0x' + hexB);
  let x = a ^ b;
  let dist = 0;
  while (x) {
    dist += Number(x & 1n);
    x >>= 1n;
  }
  return dist;
}
