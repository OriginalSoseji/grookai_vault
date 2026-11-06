import 'dart:math' as math;
import 'dart:typed_data';
import 'package:image/image.dart' as img;

/// Top-level isolate entry point. Geometry is passed as fractions of the image.
Uint8List prepareScannerUpload(Map<String, Object> input) {
  final bytes = input['bytes']! as Uint8List;
  final decoded = img.decodeImage(bytes);
  if (decoded == null) throw const FormatException('Unsupported photo format');
  var image = img.bakeOrientation(decoded);
  var crop = input['crop'] as List<double>?;
  final viewport = input['viewport'] as List<double>?;
  final guide = input['guide'] as List<double>?;
  if (viewport != null && guide != null) {
    final viewportAspect = viewport[0] / viewport[1];
    final sourceAspect = image.width / image.height;
    final visibleW = sourceAspect > viewportAspect
        ? image.height * viewportAspect
        : image.width.toDouble();
    final visibleH = sourceAspect > viewportAspect
        ? image.height.toDouble()
        : image.width / viewportAspect;
    final left = (image.width - visibleW) / 2 + visibleW * guide[0];
    final top = (image.height - visibleH) / 2 + visibleH * guide[1];
    final width = visibleW * guide[2];
    final height = visibleH * guide[3];
    final pad = math.min(width, height) * 0.04;
    final x = math.max(0.0, left - pad);
    final y = math.max(0.0, top - pad);
    crop = [
      x / image.width,
      y / image.height,
      (math.min(image.width.toDouble(), left + width + pad) - x) / image.width,
      (math.min(image.height.toDouble(), top + height + pad) - y) /
          image.height,
    ];
  }
  if (crop != null) {
    final x = (image.width * crop[0]).floor().clamp(0, image.width - 1);
    final y = (image.height * crop[1]).floor().clamp(0, image.height - 1);
    final w = (image.width * crop[2]).ceil().clamp(1, image.width - x);
    final h = (image.height * crop[3]).ceil().clamp(1, image.height - y);
    image = img.copyCrop(image, x: x, y: y, width: w, height: h);
  }
  image = resizeScannerUpload(
    image,
    maxDimension: input['maxDimension'] as int? ?? 1200,
  );
  return Uint8List.fromList(img.encodeJpg(image, quality: 85));
}

img.Image resizeScannerUpload(img.Image source, {int maxDimension = 1200}) {
  final edge = math.max(source.width, source.height);
  if (edge <= maxDimension) return source;
  return img.copyResize(
    source,
    width: math.max(1, (source.width * maxDimension / edge).round()),
    height: math.max(1, (source.height * maxDimension / edge).round()),
    interpolation: img.Interpolation.average,
  );
}
