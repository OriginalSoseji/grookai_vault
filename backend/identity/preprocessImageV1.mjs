import sharp from 'sharp';

function average(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export async function preprocessImageV1(imageBuffer) {
  let stats;
  try {
    stats = await sharp(imageBuffer).stats();
  } catch (error) {
    return {
      applied: false,
      imageBuffer,
      quality: null,
      notes: [`preprocess_skipped:${error?.message || 'unsupported_image'}`],
    };
  }

  const rgbChannels = stats.channels.slice(0, 3);
  const meanBrightness = average(rgbChannels.map((channel) => channel.mean));
  const meanContrast = average(rgbChannels.map((channel) => channel.stdev));

  const needsBrightnessLift = meanBrightness < 108;
  const needsContrastLift = meanContrast < 42;
  const shouldApply = needsBrightnessLift && needsContrastLift;

  if (!shouldApply) {
    return {
      applied: false,
      imageBuffer,
      quality: {
        mean_brightness: meanBrightness,
        mean_contrast: meanContrast,
        low_light_score: clamp01(Math.max((108 - meanBrightness) / 38, (42 - meanContrast) / 24)),
      },
      notes: [],
    };
  }

  const brightnessBoost = meanBrightness < 96 ? 1.24 : 1.16;
  const linearScale = meanContrast < 36 ? 1.12 : 1.06;

  const processedBuffer = await sharp(imageBuffer)
    .normalize()
    .modulate({
      brightness: brightnessBoost,
      saturation: 1.03,
    })
    .linear(linearScale, -6)
    .jpeg({ quality: 92 })
    .toBuffer();

  return {
    applied: true,
    imageBuffer: processedBuffer,
    quality: {
      mean_brightness: meanBrightness,
      mean_contrast: meanContrast,
      low_light_score: clamp01(Math.max((108 - meanBrightness) / 38, (42 - meanContrast) / 24)),
    },
    notes: [
      needsBrightnessLift ? 'brightness_normalized' : null,
      needsContrastLift ? 'contrast_enhanced' : null,
    ].filter(Boolean),
  };
}
