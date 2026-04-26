import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

class NormalizedCardRegion {
  const NormalizedCardRegion({
    required this.bytes,
    required this.width,
    required this.height,
    required this.cropLeft,
    required this.cropTop,
    required this.cropRight,
    required this.cropBottom,
  });

  final Uint8List bytes;
  final int width;
  final int height;
  final double cropLeft;
  final double cropTop;
  final double cropRight;
  final double cropBottom;
}

class CardRegionNormalizer {
  CardRegionNormalizer._();

  static const double targetAspectRatio = 0.716;
  static const int normalizedWidth = 144;
  static const int normalizedHeight = 201;
  static const int _maxDecodeWidth = 900;

  static Future<NormalizedCardRegion> normalize(Uint8List bytes) async {
    final decoded = await _decode(bytes);
    try {
      final crop = _findLikelyCardCrop(decoded);
      final normalized = _resizeCrop(decoded, crop);
      return NormalizedCardRegion(
        bytes: normalized,
        width: normalizedWidth,
        height: normalizedHeight,
        cropLeft: crop.left,
        cropTop: crop.top,
        cropRight: crop.right,
        cropBottom: crop.bottom,
      );
    } finally {
      decoded.dispose();
    }
  }

  static Future<_DecodedImage> _decode(Uint8List bytes) async {
    final codec = await ui.instantiateImageCodec(
      bytes,
      targetWidth: _maxDecodeWidth,
    );
    final frame = await codec.getNextFrame();
    final image = frame.image;
    final width = image.width;
    final height = image.height;
    final byteData = await image.toByteData(format: ui.ImageByteFormat.rawRgba);
    image.dispose();

    if (byteData == null) {
      throw StateError('Unable to decode image for card-region normalization.');
    }

    return _DecodedImage(
      bytes: byteData.buffer.asUint8List(),
      width: width,
      height: height,
    );
  }

  static _CropRect _findLikelyCardCrop(_DecodedImage image) {
    final borderLum = _borderLuminance(image);
    final threshold = math.max(32, math.min(214, borderLum + 10));
    final differenceThreshold = borderLum < 80 ? 12 : 24;
    final step = math.max(1, math.min(image.width, image.height) ~/ 320);

    var minX = image.width;
    var minY = image.height;
    var maxX = 0;
    var maxY = 0;
    var hits = 0;
    var samples = 0;

    for (var y = 0; y < image.height; y += step) {
      for (var x = 0; x < image.width; x += step) {
        samples += 1;
        final lum = image.luminanceAt(x, y);
        final backgroundDifference = (lum - borderLum).abs();
        if (lum > threshold && backgroundDifference > differenceThreshold) {
          hits += 1;
          minX = math.min(minX, x);
          minY = math.min(minY, y);
          maxX = math.max(maxX, x);
          maxY = math.max(maxY, y);
        }
      }
    }

    if (samples == 0 || hits / samples < 0.035) {
      return _centerCardCrop(image.width.toDouble(), image.height.toDouble());
    }

    final marginX = (maxX - minX + 1) * 0.045;
    final marginY = (maxY - minY + 1) * 0.045;
    return _fitCardAspect(
      _CropRect(
        left: minX - marginX,
        top: minY - marginY,
        right: maxX + marginX,
        bottom: maxY + marginY,
      ),
      image.width.toDouble(),
      image.height.toDouble(),
    );
  }

  static double _borderLuminance(_DecodedImage image) {
    final step = math.max(1, math.min(image.width, image.height) ~/ 90);
    var sum = 0;
    var count = 0;

    for (var x = 0; x < image.width; x += step) {
      sum += image.luminanceAt(x, 0);
      sum += image.luminanceAt(x, image.height - 1);
      count += 2;
    }
    for (var y = 0; y < image.height; y += step) {
      sum += image.luminanceAt(0, y);
      sum += image.luminanceAt(image.width - 1, y);
      count += 2;
    }

    return count == 0 ? 0 : sum / count;
  }

  static _CropRect _centerCardCrop(double width, double height) {
    final imageAspect = width / height;
    if (imageAspect > targetAspectRatio) {
      final cropWidth = height * targetAspectRatio;
      final left = (width - cropWidth) / 2;
      return _CropRect(
        left: left,
        top: 0,
        right: left + cropWidth,
        bottom: height,
      );
    }
    final cropHeight = width / targetAspectRatio;
    final top = (height - cropHeight) / 2;
    return _CropRect(left: 0, top: top, right: width, bottom: top + cropHeight);
  }

  static _CropRect _fitCardAspect(
    _CropRect crop,
    double imageWidth,
    double imageHeight,
  ) {
    var left = crop.left.clamp(0.0, imageWidth - 1);
    var top = crop.top.clamp(0.0, imageHeight - 1);
    var right = crop.right.clamp(left + 1, imageWidth);
    var bottom = crop.bottom.clamp(top + 1, imageHeight);

    var width = right - left;
    var height = bottom - top;
    final aspect = width / height;

    if (aspect > targetAspectRatio) {
      final targetHeight = width / targetAspectRatio;
      final extra = targetHeight - height;
      top -= extra / 2;
      bottom += extra / 2;
    } else {
      final targetWidth = height * targetAspectRatio;
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

    return _CropRect(left: left, top: top, right: right, bottom: bottom);
  }

  static Uint8List _resizeCrop(_DecodedImage image, _CropRect crop) {
    final output = Uint8List(normalizedWidth * normalizedHeight * 4);
    final cropWidth = crop.right - crop.left;
    final cropHeight = crop.bottom - crop.top;

    for (var y = 0; y < normalizedHeight; y += 1) {
      final srcY = crop.top + ((y + 0.5) / normalizedHeight) * cropHeight;
      for (var x = 0; x < normalizedWidth; x += 1) {
        final srcX = crop.left + ((x + 0.5) / normalizedWidth) * cropWidth;
        final color = image.sample(srcX, srcY);
        final offset = ((y * normalizedWidth) + x) * 4;
        output[offset] = color.r;
        output[offset + 1] = color.g;
        output[offset + 2] = color.b;
        output[offset + 3] = 255;
      }
    }

    return output;
  }
}

class _DecodedImage {
  const _DecodedImage({
    required this.bytes,
    required this.width,
    required this.height,
  });

  final Uint8List bytes;
  final int width;
  final int height;

  void dispose() {}

  int luminanceAt(int x, int y) {
    final offset =
        ((y.clamp(0, height - 1) * width) + x.clamp(0, width - 1)) * 4;
    final r = bytes[offset];
    final g = bytes[offset + 1];
    final b = bytes[offset + 2];
    return ((r * 299) + (g * 587) + (b * 114)) ~/ 1000;
  }

  _Color sample(double x, double y) {
    final x0 = x.floor().clamp(0, width - 1);
    final y0 = y.floor().clamp(0, height - 1);
    final x1 = (x0 + 1).clamp(0, width - 1);
    final y1 = (y0 + 1).clamp(0, height - 1);
    final tx = x - x0;
    final ty = y - y0;

    final c00 = _rgbaAt(x0, y0);
    final c10 = _rgbaAt(x1, y0);
    final c01 = _rgbaAt(x0, y1);
    final c11 = _rgbaAt(x1, y1);

    int blend(int a, int b, int c, int d) {
      final top = a + ((b - a) * tx);
      final bottom = c + ((d - c) * tx);
      return (top + ((bottom - top) * ty)).round().clamp(0, 255);
    }

    return _Color(
      r: blend(c00.r, c10.r, c01.r, c11.r),
      g: blend(c00.g, c10.g, c01.g, c11.g),
      b: blend(c00.b, c10.b, c01.b, c11.b),
    );
  }

  _Color _rgbaAt(int x, int y) {
    final offset = ((y * width) + x) * 4;
    return _Color(r: bytes[offset], g: bytes[offset + 1], b: bytes[offset + 2]);
  }
}

class _CropRect {
  const _CropRect({
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

class _Color {
  const _Color({required this.r, required this.g, required this.b});

  final int r;
  final int g;
  final int b;
}
