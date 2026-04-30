import sharp from 'sharp';

export const SCAN_QUALITY_THRESHOLDS_V1 = {
  minBlurScore: 0.00045,
  minBrightnessScore: 0.18,
  maxBrightnessScore: 0.88,
  maxHighlightRatio: 0.16,
  minBorderConfidence: 0.15,
  minCardFillRatio: 0.18,
  maxCardFillRatio: 0.92,
};

function round(value, places = 6) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export async function computeScanQualityMetrics(imageBuffer) {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new Error('quality_metrics_invalid_buffer');
  }

  const { data, info } = await sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .resize({ width: 256, height: 256, fit: 'inside', withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = Number(info.width);
  const height = Number(info.height);
  const channels = Number(info.channels);
  const pixelCount = width * height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(channels) || pixelCount <= 0) {
    throw new Error('quality_metrics_invalid_dimensions');
  }

  const luma = new Float64Array(pixelCount);
  let sum = 0;
  let highlightCount = 0;
  let darkCount = 0;

  for (let i = 0, p = 0; p < pixelCount; i += channels, p += 1) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? r;
    const b = data[i + 2] ?? r;
    const y = ((0.2126 * r) + (0.7152 * g) + (0.0722 * b)) / 255;
    luma[p] = y;
    sum += y;
    if (y >= 0.94) highlightCount += 1;
    if (y <= 0.08) darkCount += 1;
  }

  const brightness = sum / pixelCount;
  let lapSum = 0;
  let lapSqSum = 0;
  let lapCount = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      const lap =
        (4 * luma[idx]) -
        luma[idx - 1] -
        luma[idx + 1] -
        luma[idx - width] -
        luma[idx + width];
      lapSum += lap;
      lapSqSum += lap * lap;
      lapCount += 1;
    }
  }

  const lapMean = lapCount > 0 ? lapSum / lapCount : 0;
  const lapVariance = lapCount > 0 ? Math.max(0, (lapSqSum / lapCount) - (lapMean * lapMean)) : 0;
  const highlightRatio = highlightCount / pixelCount;
  const darkRatio = darkCount / pixelCount;

  return {
    sample_width: width,
    sample_height: height,
    brightness_score: round(brightness),
    blur_score: round(lapVariance),
    glare_score: round(highlightRatio),
    highlight_ratio: round(highlightRatio),
    dark_ratio: round(darkRatio),
  };
}

export function evaluateCaptureAcceptance({
  decodeOk,
  normalizedExists,
  qualityMetrics,
  borderDetected,
  borderConfidence,
  cardFillRatio,
  warpSuccess,
}) {
  const reasons = [];
  const thresholds = SCAN_QUALITY_THRESHOLDS_V1;

  if (decodeOk !== true) reasons.push('decode_failed');
  if (normalizedExists !== true) reasons.push('normalized_card_missing');

  const blur = Number(qualityMetrics?.blur_score);
  const brightness = Number(qualityMetrics?.brightness_score);
  const highlight = Number(qualityMetrics?.highlight_ratio ?? qualityMetrics?.glare_score);

  if (!Number.isFinite(blur) || blur < thresholds.minBlurScore) {
    reasons.push(`blur_below_threshold:${Number.isFinite(blur) ? blur.toFixed(6) : 'missing'}`);
  }
  if (!Number.isFinite(brightness) || brightness < thresholds.minBrightnessScore) {
    reasons.push(`brightness_too_dark:${Number.isFinite(brightness) ? brightness.toFixed(3) : 'missing'}`);
  }
  if (!Number.isFinite(brightness) || brightness > thresholds.maxBrightnessScore) {
    reasons.push(`brightness_too_bright:${Number.isFinite(brightness) ? brightness.toFixed(3) : 'missing'}`);
  }
  if (!Number.isFinite(highlight) || highlight > thresholds.maxHighlightRatio) {
    reasons.push(`highlight_ratio_too_high:${Number.isFinite(highlight) ? highlight.toFixed(3) : 'missing'}`);
  }

  if (borderDetected !== true) {
    reasons.push('border_not_detected');
  } else {
    const conf = Number(borderConfidence);
    if (!Number.isFinite(conf) || conf < thresholds.minBorderConfidence) {
      reasons.push(`border_confidence_below_threshold:${Number.isFinite(conf) ? conf.toFixed(3) : 'missing'}`);
    }

    const fill = Number(cardFillRatio);
    if (!Number.isFinite(fill) || fill < thresholds.minCardFillRatio) {
      reasons.push(`card_fill_ratio_below_threshold:${Number.isFinite(fill) ? fill.toFixed(3) : 'missing'}`);
    }
    if (Number.isFinite(fill) && fill > thresholds.maxCardFillRatio) {
      reasons.push(`card_fill_ratio_above_threshold:${fill.toFixed(3)}`);
    }
  }

  if (borderDetected === true && warpSuccess !== true) {
    reasons.push('warp_failed');
  }

  return {
    capture_accepted: reasons.length === 0,
    rejection_reasons: reasons,
    quality_thresholds: { ...thresholds },
  };
}
