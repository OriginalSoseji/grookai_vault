import 'dart:ui' as ui;
import 'package:grookai_vault/services/scanner/scanner_pipeline.dart';

class ScanDraft {
  final ui.Image image; // preview of the scanned photo (not persisted)
  final ScannerOutput out; // parsed result from pipeline
  final DateTime createdAt;

  const ScanDraft({
    required this.image,
    required this.out,
    required this.createdAt,
  });
}

