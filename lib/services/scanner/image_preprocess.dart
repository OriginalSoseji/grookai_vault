import 'dart:ui' as ui;

class ImagePreprocess {
  /// Normalize brightness/contrast for stamp detection.
  static ui.Image normalize(ui.Image img) {
    // Stub: returns input. Replace with shader/image_ops later.
    return img;
  }

  /// Crop by relative percentages. Values are [0..1].
  /// Returns a Rect representing the crop on the original image.
  static ui.Rect relativeCrop(
    ui.Image img, {
    required double leftPct,
    required double topPct,
    required double widthPct,
    required double heightPct,
  }) {
    final w = img.width.toDouble();
    final h = img.height.toDouble();
    return ui.Rect.fromLTWH(
      (leftPct.clamp(0.0, 1.0)) * w,
      (topPct.clamp(0.0, 1.0)) * h,
      (widthPct.clamp(0.0, 1.0)) * w,
      (heightPct.clamp(0.0, 1.0)) * h,
    );
  }
}
