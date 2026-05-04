import crypto from 'node:crypto';
import sharp from 'sharp';

export const SYNTHETIC_SCAN_AUGMENT_V1 = {
  generator_version: 'synthetic_scan_augment_v1',
  normalized_card: {
    width: 1003,
    height: 1400,
    background: { r: 245, g: 245, b: 245, alpha: 1 },
  },
  variant_output: {
    width: 1024,
    height: 1400,
  },
  quality_thresholds: {
    min_brightness: 0.12,
    max_brightness: 0.92,
    min_blur_score: 0.004,
    min_card_visible_ratio: 0.32,
    max_card_visible_ratio: 1.0,
  },
  transform_policy: {
    label_preserving_only: true,
    no_vertical_flip: true,
    no_extreme_unreadable_transforms: true,
    categories: [
      'rotation',
      'bounded_affine_perspective_skew',
      'scale_and_crop_shift',
      'brightness_exposure',
      'contrast',
      'mild_blur',
      'jpeg_compression',
      'subtle_sleeve_haze',
      'glare_overlay',
      'background_canvas_padding',
      'subtle_texture_noise',
    ],
  },
};

export async function normalizeSourceCardImage(sourceBuffer, options = {}) {
  const config = {
    ...SYNTHETIC_SCAN_AUGMENT_V1.normalized_card,
    ...(options.normalized_card ?? {}),
  };

  return sharp(sourceBuffer, { failOn: 'none' })
    .rotate()
    .resize({
      width: config.width,
      height: config.height,
      fit: 'contain',
      background: config.background,
    })
    .flatten({ background: config.background })
    .png()
    .toBuffer();
}

export async function generateSyntheticVariant({
  normalizedCardBuffer,
  cardPrintId,
  variantIndex,
  options = {},
}) {
  const config = {
    ...SYNTHETIC_SCAN_AUGMENT_V1.variant_output,
    ...(options.variant_output ?? {}),
  };
  const seed = stableSeed(`${cardPrintId}:${variantIndex}:${options.seed ?? ''}`);
  const rng = mulberry32(seed);
  const params = variantParams({ rng, variantIndex });

  const cardHeight = Math.round(config.height * params.card_height_ratio);
  const cardWidth = Math.round(cardHeight * (SYNTHETIC_SCAN_AUGMENT_V1.normalized_card.width / SYNTHETIC_SCAN_AUGMENT_V1.normalized_card.height));
  const background = params.background_color;
  const cardLayerInput = await sharp(normalizedCardBuffer, { failOn: 'none' })
    .resize({
      width: cardWidth,
      height: cardHeight,
      fit: 'fill',
    })
    .modulate({
      brightness: params.brightness,
      saturation: params.saturation,
    })
    .linear(params.contrast, 128 * (1 - params.contrast))
    .blur(params.blur_sigma)
    .png()
    .toBuffer();

  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  let padded = await sharp(cardLayerInput, { failOn: 'none' })
    .extend({
      top: params.layer_padding,
      bottom: params.layer_padding,
      left: params.layer_padding,
      right: params.layer_padding,
      background: transparent,
    })
    .affine([
      [1, params.shear_x],
      [params.shear_y, 1],
    ], {
      background: transparent,
      interpolator: sharp.interpolators.bicubic,
    })
    .rotate(params.rotation_deg, {
      background: transparent,
    })
    .png()
    .toBuffer();

  let layerMeta = await sharp(padded).metadata();
  if ((layerMeta.width ?? 0) > config.width * 0.98 || (layerMeta.height ?? 0) > config.height * 0.98) {
    padded = await sharp(padded, { failOn: 'none' })
      .resize({
        width: Math.floor(config.width * 0.98),
        height: Math.floor(config.height * 0.98),
        fit: 'inside',
      })
      .png()
      .toBuffer();
    layerMeta = await sharp(padded).metadata();
  }
  const layerWidth = layerMeta.width ?? cardWidth;
  const layerHeight = layerMeta.height ?? cardHeight;
  const centerX = (config.width / 2) + Math.round(params.shift_x_ratio * config.width);
  const centerY = (config.height / 2) + Math.round(params.shift_y_ratio * config.height);
  const left = Math.round(centerX - (layerWidth / 2));
  const top = Math.round(centerY - (layerHeight / 2));

  let composite = sharp({
    create: {
      width: config.width,
      height: config.height,
      channels: 4,
      background,
    },
  }).composite([
    {
      input: padded,
      left,
      top,
    },
    {
      input: glareSvg({
        width: config.width,
        height: config.height,
        params,
      }),
      left: 0,
      top: 0,
      blend: 'over',
    },
    {
      input: hazeSvg({
        width: config.width,
        height: config.height,
        params,
      }),
      left: 0,
      top: 0,
      blend: 'over',
    },
    {
      input: noiseSvg({
        width: config.width,
        height: config.height,
        params,
      }),
      left: 0,
      top: 0,
      blend: 'overlay',
    },
  ]);

  const jpegBuffer = await composite
    .jpeg({ quality: params.jpeg_quality, chromaSubsampling: '4:2:0' })
    .toBuffer();
  const outputBuffer = await sharp(jpegBuffer, { failOn: 'none' })
    .png()
    .toBuffer();

  const visibleRatio = estimateCardVisibleRatio({
    cardWidth: layerWidth,
    cardHeight: layerHeight,
    left,
    top,
    outputWidth: config.width,
    outputHeight: config.height,
  });
  const quality = await computeSyntheticImageQuality(outputBuffer, {
    card_visible_ratio: visibleRatio,
  });
  const accepted = evaluateSyntheticQuality(quality);

  return {
    buffer: outputBuffer,
    accepted,
    quality,
    params: {
      ...params,
      seed,
      card_width: cardWidth,
      card_height: cardHeight,
      transformed_layer_width: layerWidth,
      transformed_layer_height: layerHeight,
      placement_left: left,
      placement_top: top,
      estimated_card_visible_ratio: visibleRatio,
    },
  };
}

export async function computeSyntheticImageQuality(imageBuffer, extras = {}) {
  const image = sharp(imageBuffer, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  const stats = await image.stats();
  const brightness = brightnessFromStats(stats);
  const blur = await blurScore(imageBuffer);
  const highlights = await highlightRatio(imageBuffer);

  return {
    decode_ok: Boolean(metadata.width && metadata.height),
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    brightness_score: round6(brightness),
    blur_score: round6(blur),
    highlight_ratio: round6(highlights),
    card_visible_ratio: round6(Number(extras.card_visible_ratio ?? 0)),
  };
}

export function evaluateSyntheticQuality(quality) {
  const thresholds = SYNTHETIC_SCAN_AUGMENT_V1.quality_thresholds;
  const reasons = [];
  if (quality.decode_ok !== true) reasons.push('decode_failed');
  if (!Number.isFinite(quality.brightness_score) || quality.brightness_score < thresholds.min_brightness) {
    reasons.push('too_dark');
  }
  if (!Number.isFinite(quality.brightness_score) || quality.brightness_score > thresholds.max_brightness) {
    reasons.push('too_bright');
  }
  if (!Number.isFinite(quality.blur_score) || quality.blur_score < thresholds.min_blur_score) {
    reasons.push('too_blurry');
  }
  if (!Number.isFinite(quality.card_visible_ratio) || quality.card_visible_ratio < thresholds.min_card_visible_ratio) {
    reasons.push('card_too_cropped_or_small');
  }

  return {
    accepted: reasons.length === 0,
    rejection_reasons: reasons,
    thresholds,
  };
}

function variantParams({ rng, variantIndex }) {
  const backgroundBase = randomInt(rng, 212, 246);
  const warmShift = randomInt(rng, -8, 10);
  return {
    variant_index: variantIndex,
    rotation_deg: round6(randomRange(rng, -6.0, 6.0)),
    shear_x: round6(randomRange(rng, -0.035, 0.035)),
    shear_y: round6(randomRange(rng, -0.025, 0.025)),
    card_height_ratio: round6(randomRange(rng, 0.70, 0.84)),
    shift_x_ratio: round6(randomRange(rng, -0.045, 0.045)),
    shift_y_ratio: round6(randomRange(rng, -0.045, 0.045)),
    brightness: round6(randomRange(rng, 0.86, 1.16)),
    contrast: round6(randomRange(rng, 0.88, 1.13)),
    saturation: round6(randomRange(rng, 0.90, 1.12)),
    blur_sigma: round6(randomRange(rng, 0.30, 0.75)),
    jpeg_quality: randomInt(rng, 66, 91),
    glare_opacity: round6(randomRange(rng, 0.03, 0.15)),
    glare_width: round6(randomRange(rng, 0.18, 0.36)),
    glare_angle: round6(randomRange(rng, -28, 28)),
    haze_opacity: round6(randomRange(rng, 0.015, 0.08)),
    noise_opacity: round6(randomRange(rng, 0.012, 0.035)),
    noise_frequency: round6(randomRange(rng, 0.65, 1.35)),
    layer_padding: 80,
    background_color: {
      r: clampByte(backgroundBase + warmShift),
      g: clampByte(backgroundBase),
      b: clampByte(backgroundBase - warmShift),
      alpha: 1,
    },
  };
}

function glareSvg({ width, height, params }) {
  const cx = width * 0.55;
  const cy = height * 0.34;
  const rx = width * params.glare_width;
  const ry = height * 0.055;
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="white" stop-opacity="${params.glare_opacity}"/>
          <stop offset="55%" stop-color="white" stop-opacity="${params.glare_opacity * 0.45}"/>
          <stop offset="100%" stop-color="white" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#g)" transform="rotate(${params.glare_angle} ${cx} ${cy})"/>
    </svg>
  `);
}

function hazeSvg({ width, height, params }) {
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white" opacity="${params.haze_opacity}"/>
    </svg>
  `);
}

function noiseSvg({ width, height, params }) {
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <filter id="n">
        <feTurbulence type="fractalNoise" baseFrequency="${params.noise_frequency}" numOctaves="1" seed="${params.seed % 10000}"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <rect width="100%" height="100%" filter="url(#n)" opacity="${params.noise_opacity}"/>
    </svg>
  `);
}

function estimateCardVisibleRatio({
  cardWidth,
  cardHeight,
  left,
  top,
  outputWidth,
  outputHeight,
}) {
  const visibleLeft = Math.max(0, left);
  const visibleTop = Math.max(0, top);
  const visibleRight = Math.min(outputWidth, left + cardWidth);
  const visibleBottom = Math.min(outputHeight, top + cardHeight);
  const visibleWidth = Math.max(0, visibleRight - visibleLeft);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);
  const visibleArea = visibleWidth * visibleHeight;
  const cardArea = Math.max(1, cardWidth * cardHeight);
  return round6(visibleArea / cardArea);
}

async function blurScore(imageBuffer) {
  const { data, info } = await sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .resize({ width: 180, height: 246, fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  let sum = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const center = data[(y * width) + x];
      const laplace = Math.abs(
        (center * 4) -
        data[(y * width) + x - 1] -
        data[(y * width) + x + 1] -
        data[((y - 1) * width) + x] -
        data[((y + 1) * width) + x],
      );
      sum += laplace;
      count += 1;
    }
  }
  return count === 0 ? 0 : (sum / count) / 255;
}

async function highlightRatio(imageBuffer) {
  const { data } = await sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .resize({ width: 160, height: 220, fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let highlighted = 0;
  for (const value of data) {
    if (value >= 245) highlighted += 1;
  }
  return data.length === 0 ? 0 : highlighted / data.length;
}

function brightnessFromStats(stats) {
  const channels = stats.channels.slice(0, 3);
  if (channels.length === 0) return 0;
  return channels.reduce((sum, channel) => sum + (channel.mean / 255), 0) / channels.length;
}

function stableSeed(value) {
  const hash = crypto.createHash('sha256').update(String(value)).digest();
  return hash.readUInt32LE(0);
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function randomRange(rng, min, max) {
  return min + ((max - min) * rng());
}

function randomInt(rng, min, max) {
  return Math.floor(randomRange(rng, min, max + 1));
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function round6(value) {
  return Math.round(Number(value) * 1_000_000) / 1_000_000;
}
