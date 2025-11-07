import 'dart:ui' as ui;
import 'scanner_pipeline.dart';

/// Example usage; wire this into your actual UI/flow as needed.
class ScannerDemo {
  final ScannerPipeline pipeline = ScannerPipeline();

  Future<void> init() async => pipeline.init();

  Future<void> runOnImage(ui.Image image) async {
    await pipeline.analyze(fullImage: image);
    // Replace with your logger/telemetry
    // print('Scanner → cardNo=${out.cardNo}/${out.setSize} year=${out.year} variant=${out.variant.variantTag} conf=${out.variant.stampConfidence}');
  }
}
