import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/scanner/scanner_pipeline.dart';

void main() {
  test('ScannerPipeline can construct', () {
    final p = ScannerPipeline();
    expect(p, isNotNull);
  });
}

