import 'dart:typed_data';
import 'dart:ui' as ui;

import 'card_region_normalizer.dart';

class PerceptualImageHash {
  PerceptualImageHash._();

  static Future<String> computeDHash(Uint8List bytes) async {
    final codec = await ui.instantiateImageCodec(
      bytes,
      targetWidth: 9,
      targetHeight: 8,
    );
    final frame = await codec.getNextFrame();
    final image = frame.image;
    final data = await image.toByteData(format: ui.ImageByteFormat.rawRgba);
    image.dispose();

    if (data == null) {
      throw StateError('Unable to read image pixels for perceptual hash.');
    }

    var hash = BigInt.zero;
    var bitIndex = 0;
    for (var y = 0; y < 8; y += 1) {
      for (var x = 0; x < 8; x += 1) {
        final left = _luminance(data, 9, x, y);
        final right = _luminance(data, 9, x + 1, y);
        if (left > right) {
          hash |= BigInt.one << bitIndex;
        }
        bitIndex += 1;
      }
    }

    return hash.toRadixString(16).padLeft(16, '0');
  }

  static Future<String> hashNormalizedCardRegion(Uint8List bytes) async {
    final normalized = await CardRegionNormalizer.normalize(bytes);
    return computeDHashFromRgba(
      normalized.bytes,
      normalized.width,
      normalized.height,
    );
  }

  static String computeDHashFromRgba(Uint8List bytes, int width, int height) {
    final data = ByteData.sublistView(bytes);
    var hash = BigInt.zero;
    var bitIndex = 0;

    for (var y = 0; y < 8; y += 1) {
      for (var x = 0; x < 8; x += 1) {
        final left = _sampleLuminance(data, width, height, x, y);
        final right = _sampleLuminance(data, width, height, x + 1, y);
        if (left > right) {
          hash |= BigInt.one << bitIndex;
        }
        bitIndex += 1;
      }
    }

    return hash.toRadixString(16).padLeft(16, '0');
  }

  static int hammingDistance(String first, String second) {
    if (first.length != second.length) {
      return 64;
    }
    var value =
        BigInt.parse(first, radix: 16) ^ BigInt.parse(second, radix: 16);
    var distance = 0;
    while (value > BigInt.zero) {
      if ((value & BigInt.one) == BigInt.one) {
        distance += 1;
      }
      value >>= 1;
    }
    return distance;
  }

  static int _sampleLuminance(
    ByteData data,
    int width,
    int height,
    int sampleX,
    int sampleY,
  ) {
    final xStart = ((sampleX / 9) * width).floor().clamp(0, width - 1);
    final xEnd = ((((sampleX + 1) / 9) * width).ceil()).clamp(
      xStart + 1,
      width,
    );
    final yStart = ((sampleY / 8) * height).floor().clamp(0, height - 1);
    final yEnd = ((((sampleY + 1) / 8) * height).ceil()).clamp(
      yStart + 1,
      height,
    );

    var sum = 0;
    var count = 0;
    for (var y = yStart; y < yEnd; y += 1) {
      for (var x = xStart; x < xEnd; x += 1) {
        sum += _luminance(data, width, x, y);
        count += 1;
      }
    }
    return count == 0 ? 0 : sum ~/ count;
  }

  static int _luminance(ByteData data, int width, int x, int y) {
    final offset = ((y * width) + x) * 4;
    final r = data.getUint8(offset);
    final g = data.getUint8(offset + 1);
    final b = data.getUint8(offset + 2);
    return ((r * 299) + (g * 587) + (b * 114)) ~/ 1000;
  }
}
