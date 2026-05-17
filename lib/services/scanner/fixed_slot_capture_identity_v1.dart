import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

import 'package:grookai_vault/services/scanner_v3/vector_candidate_service_v1.dart';

class FixedSlotCaptureGeometryV1 {
  FixedSlotCaptureGeometryV1._();

  static const double cardAspectRatio = 0.716;

  static ui.Rect oneCardSlotRect(ui.Size viewportSize) {
    final width = viewportSize.width;
    final height = viewportSize.height;
    final safeTop = 104.0;
    final safeBottom = 178.0;
    final availableHeight = (height - safeTop - safeBottom)
        .clamp(260.0, math.max(260.0, height))
        .toDouble();
    final centerY = safeTop + availableHeight / 2;

    final preferredWidth = (width * 0.74).clamp(220.0, width - 40.0);
    final preferredHeight = preferredWidth / cardAspectRatio;
    final slotHeight = math.min(preferredHeight, availableHeight);
    final slotWidth = slotHeight * cardAspectRatio;

    return ui.Rect.fromCenter(
      center: ui.Offset(width / 2, centerY),
      width: slotWidth,
      height: slotHeight,
    );
  }

  static ui.Rect mapPreviewSlotToImage({
    required ui.Rect slotRect,
    required ui.Size previewViewportSize,
    required ui.Size decodedImageSize,
  }) {
    if (previewViewportSize.width <= 0 ||
        previewViewportSize.height <= 0 ||
        decodedImageSize.width <= 0 ||
        decodedImageSize.height <= 0) {
      throw const FixedSlotCaptureException('invalid_mapping_size');
    }

    // The camera preview is rendered as a center-cropped cover view. The still
    // image is mapped through the same cover transform, then the visible slot is
    // projected back into decoded-image coordinates.
    final scale = math.max(
      previewViewportSize.width / decodedImageSize.width,
      previewViewportSize.height / decodedImageSize.height,
    );
    final displayedWidth = decodedImageSize.width * scale;
    final displayedHeight = decodedImageSize.height * scale;
    final offsetX = (previewViewportSize.width - displayedWidth) / 2;
    final offsetY = (previewViewportSize.height - displayedHeight) / 2;

    final projected = ui.Rect.fromLTRB(
      (slotRect.left - offsetX) / scale,
      (slotRect.top - offsetY) / scale,
      (slotRect.right - offsetX) / scale,
      (slotRect.bottom - offsetY) / scale,
    );

    final padded = ui.Rect.fromLTRB(
      projected.left - projected.width * 0.035,
      projected.top - projected.height * 0.025,
      projected.right + projected.width * 0.035,
      projected.bottom + projected.height * 0.025,
    );

    return _fitCardAspect(
      padded,
      decodedImageSize.width,
      decodedImageSize.height,
    );
  }

  static ui.Rect _fitCardAspect(
    ui.Rect rect,
    double imageWidth,
    double imageHeight,
  ) {
    var left = rect.left.clamp(0.0, imageWidth - 1);
    var top = rect.top.clamp(0.0, imageHeight - 1);
    var right = rect.right.clamp(left + 1, imageWidth);
    var bottom = rect.bottom.clamp(top + 1, imageHeight);

    var width = right - left;
    var height = bottom - top;
    final aspect = width / height;

    if (aspect > cardAspectRatio) {
      final targetHeight = width / cardAspectRatio;
      final extra = targetHeight - height;
      top -= extra / 2;
      bottom += extra / 2;
    } else {
      final targetWidth = height * cardAspectRatio;
      final extra = targetWidth - width;
      left -= extra / 2;
      right += extra / 2;
    }

    if (left < 0) {
      right -= left;
      left = 0;
    }
    if (right > imageWidth) {
      left -= right - imageWidth;
      right = imageWidth;
    }
    if (top < 0) {
      bottom -= top;
      top = 0;
    }
    if (bottom > imageHeight) {
      top -= bottom - imageHeight;
      bottom = imageHeight;
    }

    left = left.clamp(0.0, imageWidth - 1);
    top = top.clamp(0.0, imageHeight - 1);
    right = right.clamp(left + 1, imageWidth);
    bottom = bottom.clamp(top + 1, imageHeight);

    return ui.Rect.fromLTRB(left, top, right, bottom);
  }
}

class FixedSlotStillProcessorV1 {
  FixedSlotStillProcessorV1._();

  static const int normalizedWidth = 716;
  static const int normalizedHeight = 1000;
  static const int annCropSize = 224;
  static const int _maxDecodeWidth = 1800;

  static Future<FixedSlotStillArtifactV1> process({
    required Uint8List stillBytes,
    required ui.Size previewViewportSize,
    required ui.Rect slotRect,
  }) async {
    final codec = await ui.instantiateImageCodec(
      stillBytes,
      targetWidth: _maxDecodeWidth,
    );
    final frame = await codec.getNextFrame();
    final image = frame.image;
    try {
      final imageSize = ui.Size(
        image.width.toDouble(),
        image.height.toDouble(),
      );
      final cropRect = FixedSlotCaptureGeometryV1.mapPreviewSlotToImage(
        slotRect: slotRect,
        previewViewportSize: previewViewportSize,
        decodedImageSize: imageSize,
      );

      final initialSlotCrop = await _renderCrop(
        image: image,
        sourceRect: cropRect,
        width: normalizedWidth,
        height: normalizedHeight,
      );
      final edgeRefinement = FixedSlotCardEdgeRefinerV1.detect(
        rawRgbaBytes: initialSlotCrop.rawRgbaBytes,
        width: normalizedWidth,
        height: normalizedHeight,
      );
      final edgeRefinedCrop = edgeRefinement == null
          ? null
          : await _renderRawRectCrop(
              sourceRaw: initialSlotCrop.rawRgbaBytes,
              sourceWidth: normalizedWidth,
              sourceHeight: normalizedHeight,
              sourceRect: edgeRefinement.normalizedBounds,
              width: normalizedWidth,
              height: normalizedHeight,
            );
      final normalized = edgeRefinement == null
          ? initialSlotCrop
          : await _warpRawQuadrilateral(
              sourceRaw: initialSlotCrop.rawRgbaBytes,
              sourceWidth: normalizedWidth,
              sourceHeight: normalizedHeight,
              points: edgeRefinement.perspectivePoints,
              width: normalizedWidth,
              height: normalizedHeight,
            );
      final quality = _measureQuality(
        normalized.rawRgbaBytes,
        normalizedWidth,
        normalizedHeight,
      );
      final normalizedImage = await _rawRgbaToImage(
        normalized.rawRgbaBytes,
        normalizedWidth,
        normalizedHeight,
      );
      final annCrops = <FixedSlotAnnCropV1>[];
      final debugCrops = <FixedSlotAnnCropV1>[];
      try {
        annCrops.add(
          FixedSlotAnnCropV1(
            cropType: 'fixed_slot_visual_confirmation',
            width: normalizedWidth,
            height: normalizedHeight,
            rawRgbaBytes: normalized.rawRgbaBytes,
            pngBytes: normalized.pngBytes,
          ),
        );
        annCrops.addAll(await _buildAnnCrops(normalizedImage));
        debugCrops.addAll(await _buildDebugCrops(normalizedImage));
      } finally {
        normalizedImage.dispose();
      }

      return FixedSlotStillArtifactV1(
        fullStillBytes: stillBytes,
        decodedImageWidth: image.width,
        decodedImageHeight: image.height,
        previewViewportSize: previewViewportSize,
        slotRect: slotRect,
        cropRect: cropRect,
        refinedCropRect: edgeRefinement == null
            ? null
            : _mapNormalizedRectToImage(
                cropRect,
                edgeRefinement.normalizedBounds,
              ),
        edgeRefinement: edgeRefinement,
        initialSlotCropPngBytes: initialSlotCrop.pngBytes,
        edgeRefinedCropPngBytes: edgeRefinedCrop?.pngBytes,
        normalizedPngBytes: normalized.pngBytes,
        normalizedWidth: normalizedWidth,
        normalizedHeight: normalizedHeight,
        quality: quality,
        annCrops: annCrops,
        debugCrops: debugCrops,
      );
    } finally {
      image.dispose();
    }
  }

  static ui.Rect _mapNormalizedRectToImage(
    ui.Rect imageCropRect,
    ui.Rect normalizedRect,
  ) {
    return ui.Rect.fromLTRB(
      imageCropRect.left +
          imageCropRect.width * (normalizedRect.left / normalizedWidth),
      imageCropRect.top +
          imageCropRect.height * (normalizedRect.top / normalizedHeight),
      imageCropRect.left +
          imageCropRect.width * (normalizedRect.right / normalizedWidth),
      imageCropRect.top +
          imageCropRect.height * (normalizedRect.bottom / normalizedHeight),
    );
  }

  static Future<List<FixedSlotAnnCropV1>> _buildAnnCrops(
    ui.Image normalizedImage,
  ) async {
    return <FixedSlotAnnCropV1>[
      await _buildCrop(
        image: normalizedImage,
        cropType: 'full_card_core_identity',
        rect: const _RectNorm(left: 0.09, top: 0.10, right: 0.91, bottom: 0.80),
      ),
      await _buildCrop(
        image: normalizedImage,
        cropType: 'full_card',
        rect: const _RectNorm(left: 0.00, top: 0.00, right: 1.00, bottom: 1.00),
      ),
    ];
  }

  static Future<List<FixedSlotAnnCropV1>> _buildDebugCrops(
    ui.Image normalizedImage,
  ) async {
    return <FixedSlotAnnCropV1>[
      await _buildCrop(
        image: normalizedImage,
        cropType: 'full_card_core',
        rect: const _RectNorm(left: 0.08, top: 0.10, right: 0.92, bottom: 0.82),
      ),
      await _buildCrop(
        image: normalizedImage,
        cropType: 'full_card_upper',
        rect: const _RectNorm(left: 0.00, top: 0.00, right: 1.00, bottom: 0.50),
      ),
      await _buildCrop(
        image: normalizedImage,
        cropType: 'artwork_zoom_in_10_gray',
        rect: const _RectNorm(left: 0.12, top: 0.19, right: 0.88, bottom: 0.58),
        grayscale: true,
      ),
    ];
  }

  static Future<FixedSlotAnnCropV1> _buildCrop({
    required ui.Image image,
    required String cropType,
    required _RectNorm rect,
    bool grayscale = false,
  }) async {
    final rendered = await _renderCrop(
      image: image,
      sourceRect: ui.Rect.fromLTRB(
        image.width * rect.left,
        image.height * rect.top,
        image.width * rect.right,
        image.height * rect.bottom,
      ),
      width: annCropSize,
      height: annCropSize,
      grayscale: grayscale,
    );
    return FixedSlotAnnCropV1(
      cropType: cropType,
      width: annCropSize,
      height: annCropSize,
      rawRgbaBytes: rendered.rawRgbaBytes,
      pngBytes: rendered.pngBytes,
    );
  }

  static Future<_RenderedCropV1> _renderCrop({
    required ui.Image image,
    required ui.Rect sourceRect,
    required int width,
    required int height,
    bool grayscale = false,
  }) async {
    final recorder = ui.PictureRecorder();
    final canvas = ui.Canvas(recorder);
    final paint = ui.Paint()..filterQuality = ui.FilterQuality.high;
    canvas.drawImageRect(
      image,
      sourceRect,
      ui.Rect.fromLTWH(0, 0, width.toDouble(), height.toDouble()),
      paint,
    );
    final picture = recorder.endRecording();
    final rendered = await picture.toImage(width, height);
    picture.dispose();

    try {
      final rawData = await rendered.toByteData(
        format: ui.ImageByteFormat.rawRgba,
      );
      if (rawData == null) {
        throw const FixedSlotCaptureException('unable_to_encode_raw_crop');
      }
      final raw = Uint8List.fromList(rawData.buffer.asUint8List());
      if (grayscale) {
        _applyGrayscale(raw);
      }
      final png = grayscale
          ? await _rawRgbaToPng(raw, width, height)
          : await _imageToPng(rendered);
      return _RenderedCropV1(rawRgbaBytes: raw, pngBytes: png);
    } finally {
      rendered.dispose();
    }
  }

  static Future<_RenderedCropV1> _renderRawRectCrop({
    required Uint8List sourceRaw,
    required int sourceWidth,
    required int sourceHeight,
    required ui.Rect sourceRect,
    required int width,
    required int height,
  }) async {
    final raw = Uint8List(width * height * 4);
    for (var y = 0; y < height; y += 1) {
      final v = (y + 0.5) / height;
      final sourceY = sourceRect.top + sourceRect.height * v;
      for (var x = 0; x < width; x += 1) {
        final u = (x + 0.5) / width;
        final sourceX = sourceRect.left + sourceRect.width * u;
        _sampleBilinearRgba(
          sourceRaw: sourceRaw,
          sourceWidth: sourceWidth,
          sourceHeight: sourceHeight,
          sourceX: sourceX,
          sourceY: sourceY,
          targetRaw: raw,
          targetOffset: ((y * width) + x) * 4,
        );
      }
    }
    return _RenderedCropV1(
      rawRgbaBytes: raw,
      pngBytes: await _rawRgbaToPng(raw, width, height),
    );
  }

  static Future<_RenderedCropV1> _warpRawQuadrilateral({
    required Uint8List sourceRaw,
    required int sourceWidth,
    required int sourceHeight,
    required List<ui.Offset> points,
    required int width,
    required int height,
  }) async {
    if (points.length != 4) {
      throw const FixedSlotCaptureException('invalid_perspective_points');
    }
    final topLeft = points[0];
    final topRight = points[1];
    final bottomRight = points[2];
    final bottomLeft = points[3];
    final raw = Uint8List(width * height * 4);
    for (var y = 0; y < height; y += 1) {
      final v = (y + 0.5) / height;
      final inverseV = 1.0 - v;
      for (var x = 0; x < width; x += 1) {
        final u = (x + 0.5) / width;
        final inverseU = 1.0 - u;
        final sourceX =
            (topLeft.dx * inverseU * inverseV) +
            (topRight.dx * u * inverseV) +
            (bottomRight.dx * u * v) +
            (bottomLeft.dx * inverseU * v);
        final sourceY =
            (topLeft.dy * inverseU * inverseV) +
            (topRight.dy * u * inverseV) +
            (bottomRight.dy * u * v) +
            (bottomLeft.dy * inverseU * v);
        _sampleBilinearRgba(
          sourceRaw: sourceRaw,
          sourceWidth: sourceWidth,
          sourceHeight: sourceHeight,
          sourceX: sourceX,
          sourceY: sourceY,
          targetRaw: raw,
          targetOffset: ((y * width) + x) * 4,
        );
      }
    }
    return _RenderedCropV1(
      rawRgbaBytes: raw,
      pngBytes: await _rawRgbaToPng(raw, width, height),
    );
  }

  static void _sampleBilinearRgba({
    required Uint8List sourceRaw,
    required int sourceWidth,
    required int sourceHeight,
    required double sourceX,
    required double sourceY,
    required Uint8List targetRaw,
    required int targetOffset,
  }) {
    final clampedX = sourceX.clamp(0.0, sourceWidth - 1.0);
    final clampedY = sourceY.clamp(0.0, sourceHeight - 1.0);
    final x0 = clampedX.floor();
    final y0 = clampedY.floor();
    final x1 = math.min(sourceWidth - 1, x0 + 1);
    final y1 = math.min(sourceHeight - 1, y0 + 1);
    final wx = clampedX - x0;
    final wy = clampedY - y0;
    final topWeight = 1.0 - wy;
    final leftWeight = 1.0 - wx;
    final offsets = <int>[
      ((y0 * sourceWidth) + x0) * 4,
      ((y0 * sourceWidth) + x1) * 4,
      ((y1 * sourceWidth) + x0) * 4,
      ((y1 * sourceWidth) + x1) * 4,
    ];
    final weights = <double>[
      leftWeight * topWeight,
      wx * topWeight,
      leftWeight * wy,
      wx * wy,
    ];
    for (var channel = 0; channel < 4; channel += 1) {
      final value =
          (sourceRaw[offsets[0] + channel] * weights[0]) +
          (sourceRaw[offsets[1] + channel] * weights[1]) +
          (sourceRaw[offsets[2] + channel] * weights[2]) +
          (sourceRaw[offsets[3] + channel] * weights[3]);
      targetRaw[targetOffset + channel] = value.round().clamp(0, 255).toInt();
    }
  }

  static Future<Uint8List> _imageToPng(ui.Image image) async {
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    if (data == null) {
      throw const FixedSlotCaptureException('unable_to_encode_png_crop');
    }
    return Uint8List.fromList(data.buffer.asUint8List());
  }

  static Future<Uint8List> _rawRgbaToPng(
    Uint8List raw,
    int width,
    int height,
  ) async {
    final image = await _rawRgbaToImage(raw, width, height);
    try {
      return _imageToPng(image);
    } finally {
      image.dispose();
    }
  }

  static Future<ui.Image> _rawRgbaToImage(
    Uint8List raw,
    int width,
    int height,
  ) async {
    final completer = Completer<ui.Image>();
    ui.decodeImageFromPixels(
      raw,
      width,
      height,
      ui.PixelFormat.rgba8888,
      completer.complete,
    );
    return completer.future;
  }

  static void _applyGrayscale(Uint8List raw) {
    for (var offset = 0; offset + 3 < raw.length; offset += 4) {
      final lum =
          ((raw[offset] * 299) +
              (raw[offset + 1] * 587) +
              (raw[offset + 2] * 114)) ~/
          1000;
      raw[offset] = lum;
      raw[offset + 1] = lum;
      raw[offset + 2] = lum;
      raw[offset + 3] = 255;
    }
  }

  static FixedSlotCaptureQualityV1 _measureQuality(
    Uint8List raw,
    int width,
    int height,
  ) {
    if (width <= 1 || height <= 1 || raw.length < width * height * 4) {
      return const FixedSlotCaptureQualityV1(
        meanLuma: 0,
        contrast: 0,
        sharpness: 0,
      );
    }

    var sum = 0.0;
    var sumSquares = 0.0;
    var gradientSum = 0.0;
    var gradientCount = 0;
    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        final offset = ((y * width) + x) * 4;
        final luma =
            ((raw[offset] * 0.299) +
                (raw[offset + 1] * 0.587) +
                (raw[offset + 2] * 0.114)) /
            255.0;
        sum += luma;
        sumSquares += luma * luma;
        if (x > 0 && y > 0) {
          final leftOffset = ((y * width) + x - 1) * 4;
          final upOffset = (((y - 1) * width) + x) * 4;
          final leftLuma =
              ((raw[leftOffset] * 0.299) +
                  (raw[leftOffset + 1] * 0.587) +
                  (raw[leftOffset + 2] * 0.114)) /
              255.0;
          final upLuma =
              ((raw[upOffset] * 0.299) +
                  (raw[upOffset + 1] * 0.587) +
                  (raw[upOffset + 2] * 0.114)) /
              255.0;
          gradientSum += (luma - leftLuma).abs() + (luma - upLuma).abs();
          gradientCount += 2;
        }
      }
    }

    final pixelCount = width * height;
    final mean = sum / pixelCount;
    final variance = math.max(0.0, (sumSquares / pixelCount) - (mean * mean));
    final contrast = math.sqrt(variance);
    final sharpness = gradientCount == 0 ? 0.0 : gradientSum / gradientCount;
    return FixedSlotCaptureQualityV1(
      meanLuma: mean,
      contrast: contrast,
      sharpness: sharpness,
    );
  }
}

class FixedSlotCardEdgeRefinerV1 {
  FixedSlotCardEdgeRefinerV1._();

  static const double _cardAspectRatio =
      FixedSlotCaptureGeometryV1.cardAspectRatio;
  static const double _foregroundDistanceThreshold = 45.0;
  static const double _rowForegroundFraction = 0.12;
  static const double _columnForegroundFraction = 0.12;

  static FixedSlotEdgeRefinementV1? detect({
    required Uint8List rawRgbaBytes,
    required int width,
    required int height,
  }) {
    if (width <= 0 || height <= 0 || rawRgbaBytes.length < width * height * 4) {
      return null;
    }
    final gradientDetection = _detectGradientCardBounds(
      rawRgbaBytes: rawRgbaBytes,
      width: width,
      height: height,
    );
    if (gradientDetection != null) {
      return gradientDetection;
    }

    final background = _cornerMedianBackground(rawRgbaBytes, width, height);
    final backgroundLum = _luminance(
      background[0],
      background[1],
      background[2],
    );
    final rows = List<int>.filled(height, 0);
    final columns = List<int>.filled(width, 0);
    final leftByRow = List<int>.filled(height, -1);
    final rightByRow = List<int>.filled(height, -1);

    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        final offset = ((y * width) + x) * 4;
        final red = rawRgbaBytes[offset];
        final green = rawRgbaBytes[offset + 1];
        final blue = rawRgbaBytes[offset + 2];
        final distance = math.sqrt(
          math.pow(red - background[0], 2) +
              math.pow(green - background[1], 2) +
              math.pow(blue - background[2], 2),
        );
        final lum = _luminance(red, green, blue);
        if (distance <= _foregroundDistanceThreshold ||
            lum <= backgroundLum + 10) {
          continue;
        }
        rows[y] += 1;
        columns[x] += 1;
        if (leftByRow[y] < 0) leftByRow[y] = x;
        rightByRow[y] = x;
      }
    }

    final minimumRowCount = width * _rowForegroundFraction;
    final minimumColumnCount = height * _columnForegroundFraction;
    var top = 0;
    while (top < height && rows[top] < minimumRowCount) {
      top += 1;
    }
    var bottom = height - 1;
    while (bottom >= 0 && rows[bottom] < minimumRowCount) {
      bottom -= 1;
    }
    var left = 0;
    while (left < width && columns[left] < minimumColumnCount) {
      left += 1;
    }
    var right = width - 1;
    while (right >= 0 && columns[right] < minimumColumnCount) {
      right -= 1;
    }

    if (top >= bottom || left >= right) return null;
    final rectWidth = right - left + 1;
    final rectHeight = bottom - top + 1;
    if (rectWidth < width * 0.45 || rectHeight < height * 0.45) {
      return null;
    }
    final aspect = rectWidth / rectHeight;
    if (aspect < 0.55 || aspect > 0.92) return null;

    final bounds = ui.Rect.fromLTRB(
      left.toDouble(),
      top.toDouble(),
      (right + 1).toDouble(),
      (bottom + 1).toDouble(),
    );
    final perspectivePoints = _perspectivePointsFromEdges(
      bounds: bounds,
      leftByRow: leftByRow,
      rightByRow: rightByRow,
      imageWidth: width,
      imageHeight: height,
    );
    return FixedSlotEdgeRefinementV1(
      normalizedBounds: bounds,
      perspectivePoints: perspectivePoints,
      method: 'corner_background_foreground_projection_v1',
      backgroundRgb: background,
      foregroundDistanceThreshold: _foregroundDistanceThreshold,
    );
  }

  static FixedSlotEdgeRefinementV1? _detectGradientCardBounds({
    required Uint8List rawRgbaBytes,
    required int width,
    required int height,
  }) {
    final luminance = List<double>.filled(width * height, 0);
    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        final offset = ((y * width) + x) * 4;
        luminance[(y * width) + x] = _luminance(
          rawRgbaBytes[offset],
          rawRgbaBytes[offset + 1],
          rawRgbaBytes[offset + 2],
        );
      }
    }

    final columnScores = List<double>.filled(width, 0);
    final rowStart = (height * 0.06).round().clamp(1, height - 2);
    final rowEnd = (height * 0.88).round().clamp(rowStart + 1, height - 2);
    for (var x = 1; x < width - 1; x += 1) {
      var score = 0.0;
      for (var y = rowStart; y <= rowEnd; y += 1) {
        score +=
            (luminance[(y * width) + x + 1] - luminance[(y * width) + x - 1])
                .abs();
      }
      columnScores[x] = score;
    }

    final rowScores = List<double>.filled(height, 0);
    final columnStart = (width * 0.10).round().clamp(1, width - 2);
    final columnEnd = (width * 0.90).round().clamp(columnStart + 1, width - 2);
    for (var y = 1; y < height - 1; y += 1) {
      var score = 0.0;
      for (var x = columnStart; x <= columnEnd; x += 1) {
        score +=
            (luminance[((y + 1) * width) + x] -
                    luminance[((y - 1) * width) + x])
                .abs();
      }
      rowScores[y] = score;
    }

    final smoothColumns = _smoothScores(columnScores, radius: 4);
    final smoothRows = _smoothScores(rowScores, radius: 3);
    final top = _bestScoreIndex(
      smoothRows,
      (height * 0.04).round(),
      (height * 0.25).round(),
    );
    if (top == null) {
      return null;
    }

    final edgePair = _bestGradientEdgePair(
      smoothColumns: smoothColumns,
      smoothRows: smoothRows,
      top: top,
      width: width,
      height: height,
    );
    if (edgePair == null) return null;
    final left = edgePair.left;
    final right = edgePair.right;
    final bottom = edgePair.bottom;

    final horizontalPadding = math.max(4.0, width * 0.06);
    final verticalPadding = math.max(4.0, height * 0.06);
    final boundedLeft = (left - horizontalPadding)
        .clamp(0.0, width - 1.0)
        .toDouble();
    final boundedTop = (top - verticalPadding)
        .clamp(0.0, height - 1.0)
        .toDouble();
    final boundedRight = (right + horizontalPadding).clamp(
      boundedLeft + 1.0,
      width.toDouble(),
    );
    final boundedBottom = (bottom + verticalPadding).clamp(
      boundedTop + 1.0,
      height.toDouble(),
    );
    final rawBounds = ui.Rect.fromLTRB(
      boundedLeft,
      boundedTop,
      boundedRight,
      boundedBottom,
    );
    final bounds = FixedSlotCaptureGeometryV1._fitCardAspect(
      rawBounds,
      width.toDouble(),
      height.toDouble(),
    );
    final aspect = bounds.width / bounds.height;
    if (bounds.width < width * 0.38 ||
        bounds.height < height * 0.52 ||
        aspect < 0.54 ||
        aspect > 0.84) {
      return null;
    }

    return FixedSlotEdgeRefinementV1(
      normalizedBounds: bounds,
      perspectivePoints: <ui.Offset>[
        ui.Offset(bounds.left, bounds.top),
        ui.Offset(bounds.right, bounds.top),
        ui.Offset(bounds.right, bounds.bottom),
        ui.Offset(bounds.left, bounds.bottom),
      ],
      method: 'luminance_gradient_card_edge_v1',
      backgroundRgb: _cornerMedianBackground(rawRgbaBytes, width, height),
      foregroundDistanceThreshold: _foregroundDistanceThreshold,
    );
  }

  static List<double> _smoothScores(
    List<double> values, {
    required int radius,
  }) {
    final smoothed = List<double>.filled(values.length, 0);
    for (var index = 0; index < values.length; index += 1) {
      final start = math.max(0, index - radius);
      final end = math.min(values.length - 1, index + radius);
      var sum = 0.0;
      var count = 0;
      for (var cursor = start; cursor <= end; cursor += 1) {
        sum += values[cursor];
        count += 1;
      }
      smoothed[index] = count == 0 ? values[index] : sum / count;
    }
    return smoothed;
  }

  static int? _bestScoreIndex(List<double> values, int start, int end) {
    if (values.isEmpty) return null;
    final safeStart = start.clamp(0, values.length - 1);
    final safeEnd = end.clamp(safeStart, values.length - 1);
    var bestIndex = safeStart;
    var bestScore = values[safeStart];
    for (var index = safeStart + 1; index <= safeEnd; index += 1) {
      final score = values[index];
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    return bestScore > 0 ? bestIndex : null;
  }

  static _GradientCardBoundsV1? _bestGradientEdgePair({
    required List<double> smoothColumns,
    required List<double> smoothRows,
    required int top,
    required int width,
    required int height,
  }) {
    final leftCandidates = _topScoreIndexes(
      smoothColumns,
      (width * 0.02).round(),
      (width * 0.50).round(),
      count: 12,
    );
    final rightCandidates = _topScoreIndexes(
      smoothColumns,
      (width * 0.35).round(),
      (width * 0.98).round(),
      count: 14,
    );
    if (leftCandidates.isEmpty || rightCandidates.isEmpty) return null;

    _GradientCardBoundsV1? best;
    var bestScore = 0.0;
    for (final left in leftCandidates) {
      for (final right in rightCandidates) {
        if (right <= left) continue;
        final edgeWidth = right - left;
        if (edgeWidth < width * 0.38 || edgeWidth > width * 0.96) continue;

        final expectedHeight = edgeWidth / _cardAspectRatio;
        final expectedBottom = (top + expectedHeight).round();
        if (expectedBottom <= top + 1 || expectedBottom >= height - 2) {
          continue;
        }

        final bottomScore = _maxScoreInWindow(
          smoothRows,
          expectedBottom - 26,
          expectedBottom + 26,
        );
        final aspect = edgeWidth / (expectedBottom - top);
        if (aspect < 0.62 || aspect > 0.80) continue;

        final score =
            smoothColumns[left] +
            smoothColumns[right] +
            (smoothRows[top] * 0.65) +
            (bottomScore * 1.45);
        if (score > bestScore) {
          bestScore = score;
          best = _GradientCardBoundsV1(
            left: left,
            right: right,
            bottom: expectedBottom,
          );
        }
      }
    }

    return bestScore > 0 ? best : null;
  }

  static List<int> _topScoreIndexes(
    List<double> values,
    int start,
    int end, {
    required int count,
  }) {
    if (values.isEmpty || count <= 0) return const <int>[];
    final safeStart = start.clamp(0, values.length - 1);
    final safeEnd = end.clamp(safeStart, values.length - 1);
    final rows = <_ScoreIndexV1>[];
    for (var index = safeStart; index <= safeEnd; index += 1) {
      rows.add(_ScoreIndexV1(index: index, score: values[index]));
    }
    rows.sort((a, b) {
      final scoreCompare = b.score.compareTo(a.score);
      return scoreCompare == 0 ? a.index.compareTo(b.index) : scoreCompare;
    });
    return rows
        .take(count)
        .where((row) => row.score > 0)
        .map((row) => row.index)
        .toList(growable: false);
  }

  static double _maxScoreInWindow(List<double> values, int start, int end) {
    if (values.isEmpty) return 0;
    final safeStart = start.clamp(0, values.length - 1);
    final safeEnd = end.clamp(safeStart, values.length - 1);
    var best = 0.0;
    for (var index = safeStart; index <= safeEnd; index += 1) {
      best = math.max(best, values[index]);
    }
    return best;
  }

  static List<int> _cornerMedianBackground(
    Uint8List raw,
    int width,
    int height,
  ) {
    final sampleSize = math.max(12, (math.min(width, height) * 0.035).floor());
    final reds = <int>[];
    final greens = <int>[];
    final blues = <int>[];
    for (final corner in <ui.Offset>[
      ui.Offset.zero,
      ui.Offset((width - sampleSize).toDouble(), 0),
      ui.Offset(0, (height - sampleSize).toDouble()),
      ui.Offset(
        (width - sampleSize).toDouble(),
        (height - sampleSize).toDouble(),
      ),
    ]) {
      for (var y = corner.dy.toInt(); y < corner.dy + sampleSize; y += 1) {
        for (var x = corner.dx.toInt(); x < corner.dx + sampleSize; x += 1) {
          final offset = ((y * width) + x) * 4;
          reds.add(raw[offset]);
          greens.add(raw[offset + 1]);
          blues.add(raw[offset + 2]);
        }
      }
    }
    reds.sort();
    greens.sort();
    blues.sort();
    final middle = reds.length ~/ 2;
    return <int>[reds[middle], greens[middle], blues[middle]];
  }

  static List<ui.Offset> _perspectivePointsFromEdges({
    required ui.Rect bounds,
    required List<int> leftByRow,
    required List<int> rightByRow,
    required int imageWidth,
    required int imageHeight,
  }) {
    final top = bounds.top.round();
    final bottom = math.max(top + 1, bounds.bottom.round() - 1);
    final height = bottom - top + 1;
    final topStart = top + (height * 0.06).round();
    final topEnd = top + (height * 0.24).round();
    final bottomStart = bottom - (height * 0.24).round();
    final bottomEnd = bottom - (height * 0.06).round();

    final leftTop = _medianEdge(leftByRow, topStart, topEnd) ?? bounds.left;
    final rightTop = _medianEdge(rightByRow, topStart, topEnd) ?? bounds.right;
    final leftBottom =
        _medianEdge(leftByRow, bottomStart, bottomEnd) ?? bounds.left;
    final rightBottom =
        _medianEdge(rightByRow, bottomStart, bottomEnd) ?? bounds.right;

    return <ui.Offset>[
      ui.Offset(leftTop.clamp(0.0, imageWidth - 1.0).toDouble(), bounds.top),
      ui.Offset(
        rightTop.clamp(1.0, imageWidth.toDouble()).toDouble(),
        bounds.top,
      ),
      ui.Offset(
        rightBottom.clamp(1.0, imageWidth.toDouble()).toDouble(),
        bounds.bottom,
      ),
      ui.Offset(
        leftBottom.clamp(0.0, imageWidth - 1.0).toDouble(),
        bounds.bottom,
      ),
    ];
  }

  static double? _medianEdge(List<int> values, int start, int end) {
    final selected = <int>[];
    final safeStart = start.clamp(0, values.length - 1);
    final safeEnd = end.clamp(safeStart, values.length - 1);
    for (var index = safeStart; index <= safeEnd; index += 1) {
      final value = values[index];
      if (value >= 0) selected.add(value);
    }
    if (selected.isEmpty) return null;
    selected.sort();
    return selected[selected.length ~/ 2].toDouble();
  }

  static double _luminance(int red, int green, int blue) {
    return (red * 0.299) + (green * 0.587) + (blue * 0.114);
  }
}

class FixedSlotEdgeRefinementV1 {
  const FixedSlotEdgeRefinementV1({
    required this.normalizedBounds,
    required this.perspectivePoints,
    required this.method,
    required this.backgroundRgb,
    required this.foregroundDistanceThreshold,
  });

  final ui.Rect normalizedBounds;
  final List<ui.Offset> perspectivePoints;
  final String method;
  final List<int> backgroundRgb;
  final double foregroundDistanceThreshold;
}

class _GradientCardBoundsV1 {
  const _GradientCardBoundsV1({
    required this.left,
    required this.right,
    required this.bottom,
  });

  final int left;
  final int right;
  final int bottom;
}

class _ScoreIndexV1 {
  const _ScoreIndexV1({required this.index, required this.score});

  final int index;
  final double score;
}

class _RectNorm {
  const _RectNorm({
    required this.left,
    required this.top,
    required this.right,
    required this.bottom,
  });

  final double left;
  final double top;
  final double right;
  final double bottom;
}

class FixedSlotStillArtifactV1 {
  const FixedSlotStillArtifactV1({
    required this.fullStillBytes,
    required this.decodedImageWidth,
    required this.decodedImageHeight,
    required this.previewViewportSize,
    required this.slotRect,
    required this.cropRect,
    required this.refinedCropRect,
    required this.edgeRefinement,
    required this.initialSlotCropPngBytes,
    required this.edgeRefinedCropPngBytes,
    required this.normalizedPngBytes,
    required this.normalizedWidth,
    required this.normalizedHeight,
    required this.quality,
    required this.annCrops,
    required this.debugCrops,
  });

  final Uint8List fullStillBytes;
  final int decodedImageWidth;
  final int decodedImageHeight;
  final ui.Size previewViewportSize;
  final ui.Rect slotRect;
  final ui.Rect cropRect;
  final ui.Rect? refinedCropRect;
  final FixedSlotEdgeRefinementV1? edgeRefinement;
  final Uint8List initialSlotCropPngBytes;
  final Uint8List? edgeRefinedCropPngBytes;
  final Uint8List normalizedPngBytes;
  final int normalizedWidth;
  final int normalizedHeight;
  final FixedSlotCaptureQualityV1 quality;
  final List<FixedSlotAnnCropV1> annCrops;
  final List<FixedSlotAnnCropV1> debugCrops;
}

class FixedSlotCaptureQualityV1 {
  const FixedSlotCaptureQualityV1({
    required this.meanLuma,
    required this.contrast,
    required this.sharpness,
  });

  final double meanLuma;
  final double contrast;
  final double sharpness;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'mean_luma': meanLuma,
      'contrast': contrast,
      'sharpness': sharpness,
      'metric_version': 'fixed_slot_capture_quality_v1',
    };
  }
}

class FixedSlotAnnCropV1 {
  const FixedSlotAnnCropV1({
    required this.cropType,
    required this.width,
    required this.height,
    required this.rawRgbaBytes,
    required this.pngBytes,
  });

  final String cropType;
  final int width;
  final int height;
  final Uint8List rawRgbaBytes;
  final Uint8List pngBytes;

  Map<String, Object?> toRequestJson() {
    return <String, Object?>{
      'crop_type': cropType,
      'raw_b64': base64Encode(rawRgbaBytes),
      'width': width,
      'height': height,
      'format': 'rgba8888',
    };
  }
}

class FixedSlotAnnIdentityClientV1 {
  FixedSlotAnnIdentityClientV1({
    String? endpoint,
    http.Client? client,
    this.topK = 200,
    this.timeout = const Duration(seconds: 5),
  }) : endpoint = endpoint ?? resolveConfiguredEndpoint(),
       _client = client ?? http.Client();

  final String endpoint;
  final int topK;
  final Duration timeout;
  final http.Client _client;

  static String resolveConfiguredEndpoint() {
    final direct = _firstNonEmpty(
      dotenv.env['SCANNER_V3_RESOLVE_ENDPOINT'],
      const String.fromEnvironment('SCANNER_V3_RESOLVE_ENDPOINT'),
    );
    if (direct != null) return direct;

    final base = _firstNonEmpty(
      dotenv.env['SCANNER_V3_IDENTITY_BASE_ENDPOINT'],
      const String.fromEnvironment('SCANNER_V3_IDENTITY_BASE_ENDPOINT'),
    );
    if (base != null) {
      return '${base.replaceFirst(RegExp(r'/+$'), '')}/scanner-v3/resolve-crops';
    }

    final embedding = _firstNonEmpty(
      dotenv.env['SCANNER_V3_EMBEDDING_ENDPOINT'],
      const String.fromEnvironment('SCANNER_V3_EMBEDDING_ENDPOINT'),
    );
    if (embedding != null) {
      return embedding.replaceFirst(
        RegExp(r'/scanner-v3/embed-crop$'),
        '/scanner-v3/resolve-crops',
      );
    }

    return '';
  }

  Future<FixedSlotAnnResolutionV1> resolve(
    List<FixedSlotAnnCropV1> crops,
  ) async {
    final resolvedEndpoint = endpoint.trim();
    if (resolvedEndpoint.isEmpty) {
      return FixedSlotAnnResolutionV1.closed(
        endpoint: resolvedEndpoint,
        failureReason: 'scanner_endpoint_not_configured',
      );
    }
    final uri = Uri.tryParse(resolvedEndpoint);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      return FixedSlotAnnResolutionV1.closed(
        endpoint: resolvedEndpoint,
        failureReason: 'invalid_scanner_endpoint',
      );
    }

    final stopwatch = Stopwatch()..start();
    try {
      final response = await _client
          .post(
            uri,
            headers: const <String, String>{
              'content-type': 'application/json',
              'accept': 'application/json',
            },
            body: jsonEncode(<String, Object?>{
              'top_k': topK,
              'mode': 'fixed_slot_capture_scanner_v1',
              'crops': crops.map((crop) => crop.toRequestJson()).toList(),
            }),
          )
          .timeout(timeout);
      stopwatch.stop();

      if (response.statusCode < 200 || response.statusCode >= 300) {
        return FixedSlotAnnResolutionV1.closed(
          endpoint: resolvedEndpoint,
          elapsed: stopwatch.elapsed,
          failureReason: 'scanner_http_${response.statusCode}',
        );
      }

      final decoded = jsonDecode(response.body);
      if (decoded is! Map<String, dynamic>) {
        return FixedSlotAnnResolutionV1.closed(
          endpoint: resolvedEndpoint,
          elapsed: stopwatch.elapsed,
          failureReason: 'scanner_response_not_object',
        );
      }

      final cropsByType = _parseResolvedCrops(decoded['crops']);
      final decision = _chooseConfidentCandidate(cropsByType, decoded);
      return FixedSlotAnnResolutionV1(
        endpoint: resolvedEndpoint,
        elapsed: stopwatch.elapsed,
        candidate: decision.candidate,
        failureReason: decision.failureReason,
        evidence: decision.evidence,
        rawResponse: decoded,
        candidatesByCropType: cropsByType.map(
          (key, value) => MapEntry(
            key,
            value.map((item) => item.candidate).toList(growable: false),
          ),
        ),
      );
    } catch (error) {
      stopwatch.stop();
      return FixedSlotAnnResolutionV1.closed(
        endpoint: resolvedEndpoint,
        elapsed: stopwatch.elapsed,
        failureReason: 'scanner_request_failed:${error.runtimeType}',
      );
    }
  }

  static String? _firstNonEmpty(String? first, String? second) {
    final firstValue = first?.trim();
    if (firstValue != null && firstValue.isNotEmpty) return firstValue;
    final secondValue = second?.trim();
    if (secondValue != null && secondValue.isNotEmpty) return secondValue;
    return null;
  }

  static Map<String, List<_ResolvedCropCandidateV1>> _parseResolvedCrops(
    Object? rawCrops,
  ) {
    final byType = <String, List<_ResolvedCropCandidateV1>>{};
    if (rawCrops is! List) return byType;
    for (final rawCrop in rawCrops) {
      if (rawCrop is! Map) continue;
      final cropType = (rawCrop['crop_type'] ?? rawCrop['cropType'] ?? '')
          .toString();
      final candidates = rawCrop['candidates'];
      if (cropType.trim().isEmpty || candidates is! List) continue;
      byType[cropType] = <_ResolvedCropCandidateV1>[
        for (var i = 0; i < candidates.length; i += 1)
          if (candidates[i] is Map)
            _ResolvedCropCandidateV1(
              candidate: _candidateFromRaw(
                candidates[i] as Map,
                fallbackRank: i + 1,
                queryCropType: cropType,
              ),
              raw: Map<String, Object?>.from(candidates[i] as Map),
            ),
      ];
    }
    return byType;
  }

  static _FixedSlotDecisionV1 _chooseConfidentCandidate(
    Map<String, List<_ResolvedCropCandidateV1>> candidatesByCrop,
    Map<String, dynamic> decoded,
  ) {
    final backendConfirmation = _confirmedBackendVisualCandidate(decoded);
    if (backendConfirmation != null) return backendConfirmation;
    final backendFailure = _backendVisualConfirmationFailure(decoded);
    if (backendFailure != null) return backendFailure;

    final identityCandidates =
        candidatesByCrop['full_card_core_identity'] ?? const [];
    final fullCardCandidates = candidatesByCrop['full_card'] ?? const [];
    if (identityCandidates.isEmpty || fullCardCandidates.isEmpty) {
      return const _FixedSlotDecisionV1(
        failureReason: 'no_identity_anchor_candidates',
        evidence: <String, Object?>{},
      );
    }

    final identityTop = identityCandidates.first;
    final fullCardTop = fullCardCandidates.first;
    final top = identityTop;
    final topId = identityTop.candidate.cardId;
    final exactFullCardAgreement = fullCardTop.candidate.cardId == topId;
    _ResolvedCropCandidateV1? fullCardExactSupport;
    for (final candidate in fullCardCandidates) {
      if (candidate.candidate.cardId == topId) {
        fullCardExactSupport = candidate;
        break;
      }
    }
    final alignmentSignal =
        top.raw['visual_full_card_alignment_signal'] == true ||
        top.raw['full_card_exact_visual_match'] == true ||
        top.candidate.contributingCropTypes.contains(
          'visual_full_card_alignment',
        ) ||
        top.candidate.contributingCropTypes.contains(
          'full_card_exact_visual_match',
        );
    final fullCardAlignmentSignal =
        fullCardTop.raw['visual_full_card_alignment_signal'] == true ||
        fullCardTop.raw['full_card_exact_visual_match'] == true ||
        fullCardTop.candidate.contributingCropTypes.contains(
          'visual_full_card_alignment',
        ) ||
        fullCardTop.candidate.contributingCropTypes.contains(
          'full_card_exact_visual_match',
        );
    final fullCardAlignmentDistance = _optionalDouble(
      fullCardTop.raw['visual_card_alignment_distance'],
    );
    final fullCardAlignmentSeparation = _optionalDouble(
      fullCardTop.raw['visual_card_alignment_separation'],
    );
    final contributionCount = top.candidate.cropContributionCount ?? 1;
    final isWildDistance =
        identityTop.candidate.distance > 0.36 ||
        fullCardTop.candidate.distance > 0.36;

    final evidence = <String, Object?>{
      'anchor_crop_type': 'full_card_core_identity',
      'anchor_rank1_card_id': identityTop.candidate.cardId,
      'anchor_rank1_name': identityTop.candidate.name,
      'anchor_rank1_distance': identityTop.candidate.distance,
      'full_card_rank1_card_id': fullCardTop.candidate.cardId,
      'full_card_rank1_name': fullCardTop.candidate.name,
      'full_card_rank1_distance': fullCardTop.candidate.distance,
      'full_card_exact_support_rank': fullCardExactSupport?.candidate.rank,
      'full_card_exact_support_distance':
          fullCardExactSupport?.candidate.distance,
      'supporting_crop_types': exactFullCardAgreement
          ? const <String>['full_card']
          : const <String>[],
      'rank1_exact_agreement': exactFullCardAgreement,
      'exact_full_card_support': fullCardExactSupport != null,
      'alignment_signal': alignmentSignal,
      'full_card_alignment_signal': fullCardAlignmentSignal,
      'full_card_alignment_distance': fullCardAlignmentDistance,
      'full_card_alignment_separation': fullCardAlignmentSeparation,
      'crop_contribution_count': contributionCount,
    };

    if (isWildDistance) {
      return _FixedSlotDecisionV1(
        failureReason: 'full_card_candidate_too_far',
        evidence: evidence,
      );
    }
    if (exactFullCardAgreement) {
      return _FixedSlotDecisionV1(candidate: top.candidate, evidence: evidence);
    }
    if (fullCardAlignmentSignal &&
        fullCardTop.candidate.distance <= 0.24 &&
        (fullCardAlignmentDistance == null ||
            fullCardAlignmentDistance <= 0.24) &&
        (fullCardAlignmentSeparation == null ||
            fullCardAlignmentSeparation >= 0.045)) {
      return _FixedSlotDecisionV1(
        candidate: fullCardTop.candidate,
        evidence: <String, Object?>{
          ...evidence,
          'accepted_by': 'full_card_exact_visual_match',
        },
      );
    }

    return _FixedSlotDecisionV1(
      failureReason: 'identity_full_card_disagreement',
      evidence: evidence,
    );
  }

  static _FixedSlotDecisionV1? _confirmedBackendVisualCandidate(
    Map<String, dynamic> decoded,
  ) {
    final rawConfirmation = decoded['fixed_slot_visual_confirmation'];
    if (rawConfirmation is! Map) return null;
    if (rawConfirmation['confirmed'] != true) return null;

    final rawCandidate = rawConfirmation['candidate'];
    if (rawCandidate is! Map) return null;

    final candidate = _candidateFromRaw(
      rawCandidate,
      fallbackRank: 1,
      queryCropType: 'fixed_slot_visual_confirmation',
    );
    if (candidate.cardId == 'unknown' && candidate.gvId == null) return null;

    final rawDecision = rawConfirmation['decision'];
    final topCandidates = rawConfirmation['top_candidates'];
    final evidence = <String, Object?>{
      'backend_confirmation': true,
      'confirmation_crop_type': 'fixed_slot_visual_confirmation',
      'confirmation_elapsed_ms': rawConfirmation['elapsed_ms'],
      'confirmation_candidate_pool_count':
          rawConfirmation['candidate_pool_count'],
      'confirmation_scored_count': rawConfirmation['scored_count'],
      'confirmation_decision': rawDecision is Map
          ? Map<String, Object?>.from(rawDecision)
          : rawDecision,
      'confirmation_top_candidates': topCandidates is List
          ? topCandidates.take(5).toList(growable: false)
          : topCandidates,
    };

    return _FixedSlotDecisionV1(candidate: candidate, evidence: evidence);
  }

  static _FixedSlotDecisionV1? _backendVisualConfirmationFailure(
    Map<String, dynamic> decoded,
  ) {
    final rawConfirmation = decoded['fixed_slot_visual_confirmation'];
    if (rawConfirmation is! Map) return null;
    if (rawConfirmation['enabled'] != true) return null;
    if (rawConfirmation['confirmed'] == true) return null;

    final rawDecision = rawConfirmation['decision'];
    final topCandidates = rawConfirmation['top_candidates'];
    final failureReason = rawConfirmation['failure_reason']?.toString().trim();
    return _FixedSlotDecisionV1(
      failureReason: failureReason == null || failureReason.isEmpty
          ? 'backend_visual_confirmation_failed'
          : 'backend_visual_confirmation_failed:$failureReason',
      evidence: <String, Object?>{
        'backend_confirmation': false,
        'confirmation_crop_type': 'fixed_slot_visual_confirmation',
        'confirmation_elapsed_ms': rawConfirmation['elapsed_ms'],
        'confirmation_candidate_pool_count':
            rawConfirmation['candidate_pool_count'],
        'confirmation_scored_count': rawConfirmation['scored_count'],
        'confirmation_failure_reason': failureReason,
        'confirmation_decision': rawDecision is Map
            ? Map<String, Object?>.from(rawDecision)
            : rawDecision,
        'confirmation_top_candidates': topCandidates is List
            ? topCandidates.take(5).toList(growable: false)
            : topCandidates,
      },
    );
  }

  static Candidate _candidateFromRaw(
    Map raw, {
    required int fallbackRank,
    required String queryCropType,
  }) {
    final cardId = (raw['card_id'] ?? raw['cardId'] ?? '').toString().trim();
    final rawDistance = raw['distance'];
    final distance = rawDistance is num
        ? rawDistance.toDouble()
        : double.tryParse('$rawDistance');
    final rawRank = raw['rank'];
    final rank = rawRank is num ? rawRank.toInt() : fallbackRank;
    return Candidate(
      cardId: cardId.isEmpty ? 'unknown' : cardId,
      distance: (distance == null || !distance.isFinite) ? 1.0 : distance,
      rank: rank <= 0 ? fallbackRank : rank,
      name: _optionalString(raw['name']),
      setCode: _optionalString(raw['set_code'] ?? raw['setCode']),
      number: _optionalString(raw['number']),
      gvId: _optionalString(raw['gv_id'] ?? raw['gvId']),
      imageUrl: _optionalString(raw['image_url'] ?? raw['imageUrl']),
      sourcePath: _optionalString(raw['source_path'] ?? raw['sourcePath']),
      similarityOverride: _optionalDouble(raw['similarity']),
      aggregateScore: _optionalDouble(
        raw['aggregate_score'] ?? raw['aggregateScore'],
      ),
      rerankScore: _optionalDouble(raw['rerank_score'] ?? raw['rerankScore']),
      cropContributionCount: _optionalInt(
        raw['crop_contribution_count'] ?? raw['cropContributionCount'],
      ),
      referenceViewContributionCount: _optionalInt(
        raw['reference_view_contribution_count'] ??
            raw['referenceViewContributionCount'],
      ),
      bestQueryCropType: _optionalString(
        raw['best_query_crop_type'] ?? raw['bestQueryCropType'],
      ),
      bestReferenceViewType: _optionalString(
        raw['best_reference_view_type'] ?? raw['bestReferenceViewType'],
      ),
      contributingCropTypes: _optionalStringList(
        raw['contributing_crop_types'] ?? raw['contributingCropTypes'],
      ),
      queryCropType: queryCropType,
      rawRank: _optionalInt(raw['raw_rank'] ?? raw['rawRank']),
      viewType: _optionalString(raw['view_type'] ?? raw['viewType']),
      cropType: _optionalString(raw['crop_type'] ?? raw['cropType']),
    );
  }

  static String? _optionalString(Object? value) {
    final text = value?.toString().trim() ?? '';
    return text.isEmpty ? null : text;
  }

  static double? _optionalDouble(Object? value) {
    if (value == null) return null;
    final number = value is num ? value.toDouble() : double.tryParse('$value');
    return number == null || !number.isFinite ? null : number;
  }

  static int? _optionalInt(Object? value) {
    if (value == null) return null;
    final number = value is num ? value.toInt() : int.tryParse('$value');
    return number == null || number <= 0 ? null : number;
  }

  static List<String> _optionalStringList(Object? value) {
    if (value is! List) return const <String>[];
    return value
        .map((item) => item.toString().trim())
        .where((item) => item.isNotEmpty)
        .toList(growable: false);
  }
}

class FixedSlotAnnResolutionV1 {
  const FixedSlotAnnResolutionV1({
    required this.endpoint,
    this.elapsed = Duration.zero,
    this.candidate,
    this.failureReason,
    this.evidence = const <String, Object?>{},
    this.rawResponse,
    this.candidatesByCropType = const <String, List<Candidate>>{},
  });

  factory FixedSlotAnnResolutionV1.closed({
    required String endpoint,
    Duration elapsed = Duration.zero,
    required String failureReason,
  }) {
    return FixedSlotAnnResolutionV1(
      endpoint: endpoint,
      elapsed: elapsed,
      failureReason: failureReason,
    );
  }

  final String endpoint;
  final Duration elapsed;
  final Candidate? candidate;
  final String? failureReason;
  final Map<String, Object?> evidence;
  final Map<String, dynamic>? rawResponse;
  final Map<String, List<Candidate>> candidatesByCropType;

  bool get hasConfidentMatch => candidate != null && failureReason == null;
}

class FixedSlotArtifactWriterV1 {
  FixedSlotArtifactWriterV1._();

  static Future<FixedSlotArtifactFilesV1?> writeLatest({
    required FixedSlotStillArtifactV1 artifact,
    required FixedSlotAnnResolutionV1 resolution,
  }) async {
    if (!kDebugMode) return null;
    final directory = await _artifactDirectory();
    await directory.create(recursive: true);

    final fullStill = _fileIn(directory, 'latest_full_still.jpg');
    final initialSlot = _fileIn(directory, 'latest_initial_slot_crop.png');
    final edgeRefined = _fileIn(directory, 'latest_edge_refined_crop.png');
    final normalized = _fileIn(directory, 'latest_fixed_slot_normalized.png');
    final manifest = _fileIn(directory, 'latest_fixed_slot_manifest.json');
    final cropFiles = <String, String>{};

    await fullStill.writeAsBytes(artifact.fullStillBytes, flush: true);
    await initialSlot.writeAsBytes(
      artifact.initialSlotCropPngBytes,
      flush: true,
    );
    if (artifact.edgeRefinedCropPngBytes != null) {
      await edgeRefined.writeAsBytes(
        artifact.edgeRefinedCropPngBytes!,
        flush: true,
      );
    } else if (await edgeRefined.exists()) {
      await edgeRefined.delete();
    }
    await normalized.writeAsBytes(artifact.normalizedPngBytes, flush: true);
    for (final crop in <FixedSlotAnnCropV1>[
      ...artifact.annCrops,
      ...artifact.debugCrops,
    ]) {
      final file = _fileIn(
        directory,
        'latest_ann_crop_${_safeFileToken(crop.cropType)}.png',
      );
      await file.writeAsBytes(crop.pngBytes, flush: true);
      cropFiles[crop.cropType] = file.path;
    }
    await manifest.writeAsString(
      const JsonEncoder.withIndent('  ').convert(<String, Object?>{
        'timestamp': DateTime.now().toUtc().toIso8601String(),
        'scanner_surface': 'fixed_slot_capture_v1',
        'identity_mode': 'still_capture_ann',
        'ocr': false,
        'live_identity_loop': false,
        'endpoint': resolution.endpoint,
        'captured_image_width': artifact.decodedImageWidth,
        'captured_image_height': artifact.decodedImageHeight,
        'preview_viewport': _sizeJson(artifact.previewViewportSize),
        'slot_rect_preview_coordinates': _rectJson(artifact.slotRect),
        'mapped_crop_rect_image_coordinates': _rectJson(artifact.cropRect),
        'refined_crop_rect_image_coordinates': _rectJsonOrNull(
          artifact.refinedCropRect,
        ),
        'edge_refinement': _edgeRefinementJson(artifact.edgeRefinement),
        'normalized_output_width': artifact.normalizedWidth,
        'normalized_output_height': artifact.normalizedHeight,
        'normalized_quality': artifact.quality.toJson(),
        'ann_crop_types': artifact.annCrops
            .map((crop) => crop.cropType)
            .toList(growable: false),
        'debug_crop_types': artifact.debugCrops
            .map((crop) => crop.cropType)
            .toList(growable: false),
        'debug_files': <String, Object?>{
          'full_still': fullStill.path,
          'initial_slot_crop': initialSlot.path,
          'edge_refined_crop': artifact.edgeRefinedCropPngBytes == null
              ? null
              : edgeRefined.path,
          'final_normalized_card': normalized.path,
          'ann_crops': cropFiles,
        },
        'endpoint_used': resolution.endpoint,
        'ann_elapsed_ms': resolution.elapsed.inMicroseconds / 1000,
        'ann_has_confident_match': resolution.hasConfidentMatch,
        'ann_failure_reason': resolution.failureReason,
        'ann_candidate': _candidateJson(resolution.candidate),
        'ann_evidence': resolution.evidence,
        'mapping_assumption':
            'visible slot mapped to decoded still with center-crop cover transform',
      }),
      flush: true,
    );

    return FixedSlotArtifactFilesV1(
      directoryPath: directory.path,
      fullStillPath: fullStill.path,
      normalizedPath: normalized.path,
      manifestPath: manifest.path,
    );
  }

  static Future<Directory> _artifactDirectory() async {
    final candidates = <Directory>[
      Directory(['.tmp', 'scanner_fixed_slot'].join(Platform.pathSeparator)),
      Directory(
        [
          Directory.systemTemp.path,
          'scanner_fixed_slot',
        ].join(Platform.pathSeparator),
      ),
    ];
    Object? lastError;
    for (final directory in candidates) {
      try {
        await directory.create(recursive: true);
        return directory;
      } catch (error) {
        lastError = error;
      }
    }
    throw FixedSlotCaptureException(
      'artifact_directory_unavailable:${lastError ?? 'unknown'}',
    );
  }

  static File _fileIn(Directory directory, String name) {
    return File([directory.path, name].join(Platform.pathSeparator));
  }

  static Map<String, double> _sizeJson(ui.Size size) {
    return <String, double>{'width': size.width, 'height': size.height};
  }

  static Map<String, double> _rectJson(ui.Rect rect) {
    return <String, double>{
      'left': rect.left,
      'top': rect.top,
      'right': rect.right,
      'bottom': rect.bottom,
      'width': rect.width,
      'height': rect.height,
    };
  }

  static Map<String, double>? _rectJsonOrNull(ui.Rect? rect) {
    return rect == null ? null : _rectJson(rect);
  }

  static Map<String, Object?>? _edgeRefinementJson(
    FixedSlotEdgeRefinementV1? refinement,
  ) {
    if (refinement == null) {
      return <String, Object?>{
        'applied': false,
        'method': null,
        'perspective_applied': false,
      };
    }
    return <String, Object?>{
      'applied': true,
      'method': refinement.method,
      'perspective_applied': true,
      'normalized_bounds': _rectJson(refinement.normalizedBounds),
      'perspective_points_normalized_slot_coordinates': refinement
          .perspectivePoints
          .map((point) => <String, double>{'x': point.dx, 'y': point.dy})
          .toList(growable: false),
      'background_rgb': refinement.backgroundRgb,
      'foreground_distance_threshold': refinement.foregroundDistanceThreshold,
    };
  }

  static String _safeFileToken(String value) {
    final token = value.replaceAll(RegExp(r'[^A-Za-z0-9_.-]+'), '_');
    return token.isEmpty ? 'unknown' : token;
  }

  static Map<String, Object?>? _candidateJson(Candidate? candidate) {
    if (candidate == null) return null;
    return <String, Object?>{
      'card_id': candidate.cardId,
      'gv_id': candidate.gvId,
      'name': candidate.name,
      'set_code': candidate.setCode,
      'number': candidate.number,
      'distance': candidate.distance,
      'similarity': candidate.similarity,
      'rank': candidate.rank,
      'contributing_crop_types': candidate.contributingCropTypes,
    };
  }
}

class FixedSlotArtifactFilesV1 {
  const FixedSlotArtifactFilesV1({
    required this.directoryPath,
    required this.fullStillPath,
    required this.normalizedPath,
    required this.manifestPath,
  });

  final String directoryPath;
  final String fullStillPath;
  final String normalizedPath;
  final String manifestPath;
}

class FixedSlotCaptureException implements Exception {
  const FixedSlotCaptureException(this.message);

  final String message;

  @override
  String toString() => 'FixedSlotCaptureException($message)';
}

class _RenderedCropV1 {
  const _RenderedCropV1({required this.rawRgbaBytes, required this.pngBytes});

  final Uint8List rawRgbaBytes;
  final Uint8List pngBytes;
}

class _ResolvedCropCandidateV1 {
  const _ResolvedCropCandidateV1({required this.candidate, required this.raw});

  final Candidate candidate;
  final Map<String, Object?> raw;
}

class _FixedSlotDecisionV1 {
  const _FixedSlotDecisionV1({
    this.candidate,
    this.failureReason,
    required this.evidence,
  });

  final Candidate? candidate;
  final String? failureReason;
  final Map<String, Object?> evidence;
}
