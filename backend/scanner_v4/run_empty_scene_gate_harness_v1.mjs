#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const sceneRoot = path.join(repoRoot, '.tmp', 'scanner_empty_scene_tests');
const resultsDir = path.join(sceneRoot, 'results');
const resultsPath = path.join(resultsDir, 'empty_scene_results_v1.json');

const categories = [
  'desk_texture',
  'wood_grain',
  'low_light',
  'bright_light',
  'motion_blur',
  'camera_noise',
  'background_only',
  'partial_edges',
  'non_card_rectangles',
];

const gateConstants = Object.freeze({
  targetAspectRatio: 0.716,
  minBlurScore: 0.006,
  minBrightnessScore: 0.12,
  maxBrightnessScore: 0.90,
  maxGlareRatio: 0.18,
  minCardFillRatio: 0.08,
  maxCardFillRatio: 0.72,
  minNativeDetectorConfidence: 0.45,
  minFallbackBorderConfidence: 0.35,
  minFallbackCardFillRatio: 0.14,
  maxFallbackCardFillRatio: 0.60,
  minArtworkForegroundRatio: 0.015,
  maxArtworkForegroundRatio: 0.88,
  minArtworkLumaStdDev: 0.035,
  minFallbackArtworkForegroundRatio: 0.045,
  minFallbackArtworkLumaStdDev: 0.055,
});

const detectorConstants = Object.freeze({
  gridWidth: 96,
  gridHeight: 160,
  cardAspect: 0.716,
  searchLeft: 0.06,
  searchTop: 0.05,
  searchRight: 0.94,
  searchBottom: 0.96,
});

const sourceRefs = Object.freeze({
  nativeDetector: 'android/app/src/main/kotlin/com/example/grookai_vault/scanner/QuadDetectorV1Bridge.kt',
  liveLoopGate: 'lib/services/scanner_v3/scanner_v3_live_loop_controller.dart',
});

main();

function main() {
  ensureSceneFolders();
  const existingImages = listSceneImages();
  if (existingImages.length === 0) {
    writeDefaultLocalScenes();
  }

  const images = listSceneImages();
  const results = images.map(runImage);
  const report = {
    harness: 'scanner_v4_empty_scene_gate_harness_v1',
    generated_at: new Date(0).toISOString(),
    scene_root: relativePath(sceneRoot),
    source_refs: sourceRefs,
    totals: summarize(results),
    results,
  };

  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(resultsPath, `${JSON.stringify(report, null, 2)}\n`);

  const totals = report.totals;
  console.log(`TOTAL_IMAGES ${totals.total_images}`);
  console.log(`DETECTOR_FALSE_POSITIVES ${totals.detector_false_positives}`);
  console.log(`CARD_PRESENT_FALSE_POSITIVES ${totals.card_present_false_positives}`);
  console.log(`IDENTITY_ELIGIBLE_FALSE_POSITIVES ${totals.identity_eligible_false_positives}`);
  console.log(`PASS_RATE ${totals.pass_rate}`);
  console.log(`RESULT_JSON ${relativePath(resultsPath)}`);
}

function ensureSceneFolders() {
  for (const category of categories) {
    fs.mkdirSync(path.join(sceneRoot, category), { recursive: true });
  }
  fs.mkdirSync(resultsDir, { recursive: true });
}

function listSceneImages() {
  const images = [];
  for (const category of categories) {
    const categoryDir = path.join(sceneRoot, category);
    if (!fs.existsSync(categoryDir)) continue;
    for (const entry of fs.readdirSync(categoryDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!['.pgm', '.ppm'].includes(ext)) continue;
      images.push({
        category,
        path: path.join(categoryDir, entry.name),
      });
    }
  }
  images.sort((a, b) => relativePath(a.path).localeCompare(relativePath(b.path)));
  return images;
}

function runImage(scene) {
  const image = readPortableAnyMap(scene.path);
  const native = runNativeDetectorMirror(image);
  const gate = runCardPresentGateMirror(image, native);
  return {
    image: relativePath(scene.path),
    category: scene.category,
    native_success: native.success,
    native_confidence: round(native.confidence),
    points_present: Array.isArray(native.points) && native.points.length === 4,
    quad_source: gate.quadSource,
    card_present: gate.cardPresent,
    rejection_reason: gate.rejectionReason,
    identity_eligible: gate.identityEligible,
    native_failure_reason: native.failureReason,
    candidate_score: native.diagnostics.best_candidate_score == null ? null : round(native.diagnostics.best_candidate_score),
    edge_support: native.diagnostics.best_candidate_edge_support == null ? null : round(native.diagnostics.best_candidate_edge_support),
    area_ratio: native.diagnostics.best_candidate_area == null ? null : round(native.diagnostics.best_candidate_area),
  };
}

function runNativeDetectorMirror(image) {
  const grid = buildGrid(image, detectorConstants.gridWidth, detectorConstants.gridHeight);
  const edgeThreshold = Math.max(10, percentile(grid.edge, 86));
  const darkThreshold = Math.max(0, Math.min(255, percentile(grid.luma, 35)));
  const edgeMask = grid.edge.map((value) => value >= edgeThreshold);
  const seedMask = grid.luma.map((value, index) => (
    value <= darkThreshold || edgeMask[index]
  ));
  const components = findComponents(seedMask, detectorConstants.gridWidth, detectorConstants.gridHeight)
    .filter((component) => (
      component.count >= 3
      && component.areaRatio >= 0.0004
      && component.areaRatio <= 0.18
      && component.centerX >= detectorConstants.searchLeft
      && component.centerX <= detectorConstants.searchRight
      && component.centerY >= detectorConstants.searchTop
      && component.centerY <= detectorConstants.searchBottom
    ));

  if (components.length === 0) {
    return nativeFailure('no_card_component', {
      seed_component_count: 0,
      seed_pixel_count: seedMask.filter(Boolean).length,
      edge_pixel_count: edgeMask.filter(Boolean).length,
      dark_luma_threshold: darkThreshold,
      edge_threshold: edgeThreshold,
    });
  }

  const displayAspect = image.width / image.height;
  const targetDisplayAspect = detectorConstants.cardAspect / displayAspect;
  const candidates = components.map((component, index) => scoreComponent(component, edgeMask, targetDisplayAspect, index))
    .filter(Boolean);
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0] ?? null;
  if (best == null || best.score < 0.38) {
    return nativeFailure('no_candidate_above_threshold', {
      seed_component_count: components.length,
      candidate_score_count: candidates.length,
      best_candidate_score: best?.score ?? null,
      seed_pixel_count: seedMask.filter(Boolean).length,
      edge_pixel_count: edgeMask.filter(Boolean).length,
      dark_luma_threshold: darkThreshold,
      edge_threshold: edgeThreshold,
    });
  }

  const rect = best.rect;
  const points = [
    { x: rect.left, y: rect.top },
    { x: rect.right, y: rect.top },
    { x: rect.right, y: rect.bottom },
    { x: rect.left, y: rect.bottom },
  ];
  const confidence = clamp(0.42 + best.score * 0.58, 0, 0.98);
  return {
    success: true,
    points,
    confidence,
    failureReason: null,
    diagnostics: {
      pipeline: 'seed_cluster_outer_boundary_v4_harness_mirror',
      detector_registered: true,
      detector_called: true,
      detector_success: true,
      selected_candidate_source: 'seed_cluster_outer_boundary_v4_harness_mirror',
      seed_component_count: components.length,
      candidate_score_count: candidates.length,
      best_candidate_score: best.score,
      best_candidate_aspect: best.aspect,
      best_candidate_area: best.areaRatio,
      best_candidate_edge_support: best.edgeSupport,
      best_candidate_seed_coverage: best.seedCoverage,
    },
  };
}

function nativeFailure(reason, diagnostics) {
  return {
    success: false,
    points: [],
    confidence: 0,
    failureReason: reason,
    diagnostics: {
      pipeline: 'seed_cluster_outer_boundary_v4_harness_mirror',
      detector_registered: true,
      detector_called: true,
      detector_success: false,
      selected_candidate_source: null,
      selected_failure_reason: reason,
      ...diagnostics,
    },
  };
}

function scoreComponent(component, edgeMask, targetDisplayAspect, index) {
  const padX = Math.max(1, Math.round(component.width * 0.18));
  const padY = Math.max(2, Math.round(component.height * 0.18));
  const gridWidth = detectorConstants.gridWidth;
  const gridHeight = detectorConstants.gridHeight;
  const minX = Math.max(0, component.minX - padX);
  const maxX = Math.min(gridWidth - 1, component.maxX + padX);
  const minY = Math.max(0, component.minY - padY);
  const maxY = Math.min(gridHeight - 1, component.maxY + padY);
  const rectWidth = maxX - minX + 1;
  const rectHeight = maxY - minY + 1;
  if (rectWidth < 18 || rectHeight < 24) return null;

  const left = minX / gridWidth;
  const right = (maxX + 1) / gridWidth;
  const top = minY / gridHeight;
  const bottom = (maxY + 1) / gridHeight;
  const areaRatio = (right - left) * (bottom - top);
  if (areaRatio < 0.018 || areaRatio > 0.68) return null;

  const aspect = (right - left) / Math.max(0.001, bottom - top);
  const aspectScoreValue = aspectScore(aspect, targetDisplayAspect);
  if (aspectScoreValue < 0.22) return null;

  const edgeSupport = rectEdgeSupport(edgeMask, minX, maxX, minY, maxY, gridWidth, gridHeight);
  const seedCoverage = clamp(component.count / Math.max(1, rectWidth * rectHeight), 0, 1);
  const compactness = component.areaRatio / areaRatio;
  const coverageScore = clamp(Math.exp(-Math.abs(seedCoverage - 0.16) * 4), 0, 1);
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const centerScore = clamp(1 - ((Math.abs(centerX - 0.5) * 0.9) + (Math.abs(centerY - 0.56) * 0.45)), 0, 1);
  const sizePenalty = areaRatio > 0.56 ? (areaRatio - 0.56) * 1.4 : areaRatio < 0.04 ? (0.04 - areaRatio) * 3 : 0;
  const boundaryPenalty = left < 0.015 || top < 0.015 || right > 0.985 || bottom > 0.985 ? 0.10 : 0;
  const score = (
    aspectScoreValue * 0.28
    + edgeSupport * 0.30
    + coverageScore * 0.17
    + centerScore * 0.13
    + clamp(compactness, 0, 1) * 0.12
    - sizePenalty
    - boundaryPenalty
  );
  if (score < 0.28) return null;
  return {
    clusterIndex: index,
    rect: { left, top, right, bottom },
    score: clamp(score, 0, 1),
    aspect,
    areaRatio,
    edgeSupport,
    seedCoverage,
  };
}

function runCardPresentGateMirror(image, native) {
  const hasNativeQuad = native.success && Array.isArray(native.points) && native.points.length === 4;
  const displayQuad = hasNativeQuad ? native.points : null;
  if (displayQuad == null) {
    return gateResult('none', false, 'no_quad');
  }

  const rect = pointsToRect(displayQuad);
  const fillRatio = Math.max(0, (rect.right - rect.left) * (rect.bottom - rect.top));
  const normalized = cropNearest(image, rect, 733, 1024);
  const quality = measureQuality(normalized, fillRatio);
  if (!quality.accepted) {
    return gateResult('native_detector', false, cardAbsentReasonForQuality(quality));
  }

  if (fillRatio < gateConstants.minCardFillRatio || fillRatio > gateConstants.maxCardFillRatio) {
    return gateResult('native_detector', false, 'fill_ratio_invalid');
  }
  if ((native.confidence ?? 0) < gateConstants.minNativeDetectorConfidence) {
    return gateResult('native_detector', false, 'low_detector_confidence');
  }

  const fullCardStats = lumaStats(normalized, { left: 0, top: 0, right: 1, bottom: 1 });
  if (fullCardStats.stdDev < gateConstants.minArtworkLumaStdDev * 0.55) {
    return gateResult('native_detector', false, 'normalized_empty');
  }

  const artworkStats = lumaStats(normalized, { left: 0.08, top: 0.12, right: 0.92, bottom: 0.60 });
  if (
    artworkStats.stdDev < gateConstants.minArtworkLumaStdDev
    || artworkStats.foregroundRatio < gateConstants.minArtworkForegroundRatio
    || artworkStats.foregroundRatio > gateConstants.maxArtworkForegroundRatio
  ) {
    return gateResult('native_detector', false, 'artwork_background_dominant');
  }

  return gateResult('native_detector', true, null);
}

function gateResult(quadSource, cardPresent, rejectionReason) {
  return {
    quadSource,
    cardPresent,
    rejectionReason,
    identityEligible: cardPresent,
  };
}

function measureQuality(image, fillRatio) {
  const stats = lumaStats(image, { left: 0, top: 0, right: 1, bottom: 1 });
  const blur = blurScore(image);
  const glare = image.data.filter((value) => value >= 245).length / image.data.length;
  const reasons = [];
  if (blur < gateConstants.minBlurScore) reasons.push('blur_below_threshold');
  if (stats.mean < gateConstants.minBrightnessScore) reasons.push('brightness_too_low');
  if (stats.mean > gateConstants.maxBrightnessScore) reasons.push('brightness_too_high');
  if (glare > gateConstants.maxGlareRatio) reasons.push('glare_above_threshold');
  if (fillRatio < gateConstants.minCardFillRatio) reasons.push('card_fill_ratio_below_threshold');
  return {
    accepted: reasons.length === 0,
    rejectionReasons: reasons,
    blurScore: blur,
    brightnessScore: stats.mean,
    glareRatio: glare,
    cardFillRatio: fillRatio,
  };
}

function cardAbsentReasonForQuality(quality) {
  if (quality.rejectionReasons.includes('card_fill_ratio_below_threshold')) return 'fill_ratio_invalid';
  if (
    quality.rejectionReasons.includes('blur_below_threshold')
    || quality.rejectionReasons.includes('brightness_too_low')
    || quality.rejectionReasons.includes('brightness_too_high')
    || quality.rejectionReasons.includes('glare_above_threshold')
  ) {
    return 'blur_or_brightness_invalid';
  }
  return quality.rejectionReasons[0] ?? 'card_present_unknown';
}

function buildGrid(image, gridWidth, gridHeight) {
  const luma = new Array(gridWidth * gridHeight);
  for (let gy = 0; gy < gridHeight; gy += 1) {
    for (let gx = 0; gx < gridWidth; gx += 1) {
      const sx = Math.min(image.width - 1, Math.floor((gx + 0.5) * image.width / gridWidth));
      const sy = Math.min(image.height - 1, Math.floor((gy + 0.5) * image.height / gridHeight));
      luma[gy * gridWidth + gx] = image.data[sy * image.width + sx];
    }
  }
  const edge = new Array(luma.length).fill(0);
  for (let y = 1; y < gridHeight - 1; y += 1) {
    for (let x = 1; x < gridWidth - 1; x += 1) {
      const i = y * gridWidth + x;
      const dx = Math.abs(luma[i + 1] - luma[i - 1]);
      const dy = Math.abs(luma[i + gridWidth] - luma[i - gridWidth]);
      edge[i] = Math.max(dx, dy);
    }
  }
  return { luma, edge };
}

function findComponents(mask, gridWidth, gridHeight) {
  const visited = new Array(mask.length).fill(false);
  const components = [];
  for (let y = 0; y < gridHeight; y += 1) {
    for (let x = 0; x < gridWidth; x += 1) {
      const start = y * gridWidth + x;
      if (!mask[start] || visited[start]) continue;
      const queue = [start];
      visited[start] = true;
      let count = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      for (let q = 0; q < queue.length; q += 1) {
        const index = queue[q];
        const cx = index % gridWidth;
        const cy = Math.floor(index / gridWidth);
        count += 1;
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);
        for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
          if (nx < 0 || ny < 0 || nx >= gridWidth || ny >= gridHeight) continue;
          const next = ny * gridWidth + nx;
          if (!mask[next] || visited[next]) continue;
          visited[next] = true;
          queue.push(next);
        }
      }
      const width = maxX - minX + 1;
      const height = maxY - minY + 1;
      components.push({
        count,
        minX,
        maxX,
        minY,
        maxY,
        width,
        height,
        areaRatio: (width * height) / (gridWidth * gridHeight),
        centerX: ((minX + maxX + 1) / 2) / gridWidth,
        centerY: ((minY + maxY + 1) / 2) / gridHeight,
      });
    }
  }
  return components;
}

function rectEdgeSupport(edgeMask, minX, maxX, minY, maxY, gridWidth, gridHeight) {
  const vertical = (x) => {
    let hits = 0;
    let total = 0;
    for (let y = Math.max(1, minY); y <= Math.min(gridHeight - 2, maxY); y += 1) {
      let hit = false;
      for (let ox = -1; ox <= 1; ox += 1) {
        hit = hit || edgeMask[y * gridWidth + clampInt(x + ox, 0, gridWidth - 1)];
      }
      if (hit) hits += 1;
      total += 1;
    }
    return total === 0 ? 0 : hits / total;
  };
  const horizontal = (y) => {
    let hits = 0;
    let total = 0;
    for (let x = Math.max(1, minX); x <= Math.min(gridWidth - 2, maxX); x += 1) {
      let hit = false;
      for (let oy = -1; oy <= 1; oy += 1) {
        hit = hit || edgeMask[clampInt(y + oy, 0, gridHeight - 1) * gridWidth + x];
      }
      if (hit) hits += 1;
      total += 1;
    }
    return total === 0 ? 0 : hits / total;
  };
  return (vertical(minX) + vertical(maxX) + horizontal(minY) + horizontal(maxY)) / 4;
}

function lumaStats(image, rect) {
  const left = clampInt(Math.round(rect.left * (image.width - 1)), 0, image.width - 1);
  const right = clampInt(Math.round(rect.right * (image.width - 1)), 0, image.width - 1);
  const top = clampInt(Math.round(rect.top * (image.height - 1)), 0, image.height - 1);
  const bottom = clampInt(Math.round(rect.bottom * (image.height - 1)), 0, image.height - 1);
  let count = 0;
  let sum = 0;
  const values = [];
  const step = Math.max(1, Math.floor(image.height / 180));
  for (let y = top; y <= bottom; y += step) {
    for (let x = left; x <= right; x += step) {
      const value = image.data[y * image.width + x] / 255;
      values.push(value);
      sum += value;
      count += 1;
    }
  }
  if (count === 0) return { mean: 0, stdDev: 0, foregroundRatio: 0 };
  const mean = sum / count;
  let variance = 0;
  let foreground = 0;
  for (const value of values) {
    variance += (value - mean) ** 2;
    if (Math.abs(value - mean) > 0.08) foreground += 1;
  }
  return {
    mean,
    stdDev: Math.sqrt(variance / count),
    foregroundRatio: foreground / count,
  };
}

function blurScore(image) {
  let total = 0;
  let count = 0;
  const step = Math.max(1, Math.floor(image.height / 180));
  for (let y = step; y < image.height - step; y += step) {
    for (let x = step; x < image.width - step; x += step) {
      const i = y * image.width + x;
      const dx = Math.abs(image.data[i + step] - image.data[i - step]);
      const dy = Math.abs(image.data[i + step * image.width] - image.data[i - step * image.width]);
      total += Math.max(dx, dy) / 255;
      count += 1;
    }
  }
  return count === 0 ? 0 : total / count;
}

function cropNearest(image, rect, width, height) {
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const ny = rect.top + ((y + 0.5) / height) * (rect.bottom - rect.top);
    const sy = clampInt(Math.floor(ny * image.height), 0, image.height - 1);
    for (let x = 0; x < width; x += 1) {
      const nx = rect.left + ((x + 0.5) / width) * (rect.right - rect.left);
      const sx = clampInt(Math.floor(nx * image.width), 0, image.width - 1);
      data[y * width + x] = image.data[sy * image.width + sx];
    }
  }
  return { width, height, data };
}

function pointsToRect(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    left: clamp(Math.min(...xs), 0, 1),
    top: clamp(Math.min(...ys), 0, 1),
    right: clamp(Math.max(...xs), 0, 1),
    bottom: clamp(Math.max(...ys), 0, 1),
  };
}

function readPortableAnyMap(filePath) {
  const raw = fs.readFileSync(filePath);
  const header = readPamHeader(raw);
  if (!['P2', 'P3', 'P5', 'P6'].includes(header.magic)) {
    throw new Error(`unsupported image format for ${filePath}: ${header.magic}`);
  }
  if (header.max <= 0) throw new Error(`invalid max value in ${filePath}`);

  const pixelCount = header.width * header.height;
  const data = new Uint8Array(pixelCount);
  if (header.magic === 'P2' || header.magic === 'P3') {
    const body = raw.subarray(header.offset).toString('ascii').replace(/#[^\n\r]*/g, ' ').trim();
    const values = body.length === 0 ? [] : body.split(/\s+/).map(Number);
    const stride = header.magic === 'P3' ? 3 : 1;
    if (values.length < pixelCount * stride) throw new Error(`not enough pixel data in ${filePath}`);
    for (let i = 0; i < pixelCount; i += 1) {
      if (stride === 1) {
        data[i] = scaleToByte(values[i], header.max);
      } else {
        const r = values[i * 3];
        const g = values[i * 3 + 1];
        const b = values[i * 3 + 2];
        data[i] = scaleToByte((r * 0.299) + (g * 0.587) + (b * 0.114), header.max);
      }
    }
  } else {
    const stride = header.magic === 'P6' ? 3 : 1;
    if (raw.length - header.offset < pixelCount * stride) throw new Error(`not enough binary pixel data in ${filePath}`);
    for (let i = 0; i < pixelCount; i += 1) {
      if (stride === 1) {
        data[i] = scaleToByte(raw[header.offset + i], header.max);
      } else {
        const base = header.offset + i * 3;
        data[i] = scaleToByte((raw[base] * 0.299) + (raw[base + 1] * 0.587) + (raw[base + 2] * 0.114), header.max);
      }
    }
  }
  return { width: header.width, height: header.height, data };
}

function readPamHeader(raw) {
  let index = 0;
  const tokens = [];
  while (tokens.length < 4 && index < raw.length) {
    while (index < raw.length && isWhitespace(raw[index])) index += 1;
    if (raw[index] === 35) {
      while (index < raw.length && raw[index] !== 10 && raw[index] !== 13) index += 1;
      continue;
    }
    const start = index;
    while (index < raw.length && !isWhitespace(raw[index])) index += 1;
    if (start !== index) tokens.push(raw.subarray(start, index).toString('ascii'));
  }
  while (index < raw.length && isWhitespace(raw[index])) index += 1;
  return {
    magic: tokens[0],
    width: Number(tokens[1]),
    height: Number(tokens[2]),
    max: Number(tokens[3]),
    offset: index,
  };
}

function writeDefaultLocalScenes() {
  const width = 240;
  const height = 336;
  for (const category of categories) {
    const filePath = path.join(sceneRoot, category, `${category}_default.pgm`);
    const data = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        data[y * width + x] = fixturePixel(category, x, y, width, height);
      }
    }
    writePgm(filePath, width, height, data);
  }
}

function fixturePixel(category, x, y, width, height) {
  const base = 128;
  if (category === 'background_only') return 132;
  if (category === 'low_light') return 28 + ((x + y) % 5);
  if (category === 'bright_light') return 238 + ((x + y) % 8);
  if (category === 'desk_texture') return 112 + ((x * 7 + y * 3) % 38);
  if (category === 'wood_grain') return 120 + Math.floor(22 * Math.sin((x + y * 0.25) / 8)) + ((y % 17) < 2 ? 18 : 0);
  if (category === 'motion_blur') return 118 + Math.floor(16 * Math.sin(x / 18));
  if (category === 'camera_noise') return 118 + (((x * 37 + y * 19 + x * y) % 53) - 26);
  if (category === 'partial_edges') {
    const edge = (x > width * 0.18 && x < width * 0.82 && Math.abs(y - height * 0.34) < 2)
      || (y > height * 0.20 && y < height * 0.82 && Math.abs(x - width * 0.21) < 2);
    return edge ? 44 : 136 + ((x + y) % 15);
  }
  if (category === 'non_card_rectangles') {
    const inRect = x > width * 0.19 && x < width * 0.82 && y > height * 0.18 && y < height * 0.77;
    const border = inRect && (
      Math.abs(x - width * 0.19) < 3
      || Math.abs(x - width * 0.82) < 3
      || Math.abs(y - height * 0.18) < 3
      || Math.abs(y - height * 0.77) < 3
    );
    if (border) return 42;
    if (inRect) return 96 + ((x * 11 + y * 5) % 92);
    return 150 + ((x + y) % 20);
  }
  return base;
}

function writePgm(filePath, width, height, data) {
  const header = `P2\n# scanner empty-scene local fixture\n${width} ${height}\n255\n`;
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const values = [];
    for (let x = 0; x < width; x += 1) {
      values.push(String(data[y * width + x]));
    }
    rows.push(values.join(' '));
  }
  fs.writeFileSync(filePath, `${header}${rows.join('\n')}\n`);
}

function summarize(results) {
  const total = results.length;
  const detectorFalse = results.filter((result) => result.native_success || result.points_present).length;
  const cardPresentFalse = results.filter((result) => result.card_present).length;
  const identityEligibleFalse = results.filter((result) => result.identity_eligible).length;
  const pass = total === 0 ? 0 : (total - identityEligibleFalse) / total;
  return {
    total_images: total,
    detector_false_positives: detectorFalse,
    card_present_false_positives: cardPresentFalse,
    identity_eligible_false_positives: identityEligibleFalse,
    pass_rate: round(pass),
  };
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[index];
}

function aspectScore(aspect, target) {
  const safeAspect = Math.max(0.001, aspect);
  const safeTarget = Math.max(0.001, target);
  return clamp(1 - Math.min(1, Math.abs(Math.log(safeAspect / safeTarget)) / Math.log(2)), 0, 1);
}

function scaleToByte(value, max) {
  return clampInt(Math.round((Number(value) / max) * 255), 0, 255);
}

function isWhitespace(byte) {
  return byte === 9 || byte === 10 || byte === 11 || byte === 12 || byte === 13 || byte === 32;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampInt(value, min, max) {
  return Math.trunc(clamp(value, min, max));
}

function round(value) {
  if (value == null) return value;
  return Math.round(value * 10000) / 10000;
}

function relativePath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
}
