import 'dart:ui' as ui;

class ImageMetrics {
  // Centering proxy: placeholder using aspect regions; return 0..1 (1 best).
  static Future<double> estimateCentering(ui.Image img) async {
    // TODO: replace with border-box detection; stub returns neutral-good.
    return 0.88;
  }

  // Edge wear proxy: placeholder 0..1 (0 = heavy wear, 1 = pristine).
  static Future<double> estimateEdgeWear(ui.Image img) async {
    // TODO: sample strips along borders and measure brightness/texture spikes.
    return 0.78;
  }

  // Corner wear proxy.
  static Future<double> estimateCornerWear(ui.Image img) async {
    // TODO: corner crops (5–8% each) → look for brightness peaks/tears.
    return 0.82;
  }

  // Surface scratches proxy.
  static Future<double> estimateSurfaceClean(ui.Image img) async {
    // TODO: high-pass filter + threshold hits per area.
    return 0.74;
  }

  // Crease detection proxy (boolean-ish 0..1).
  static Future<double> estimateCreaseRisk(ui.Image img) async {
    // TODO: oriented line detector (Hough-ish).
    return 0.9;
  }
}

