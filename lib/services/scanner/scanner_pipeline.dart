import 'dart:ui' as ui;
import 'ocr.dart';
import 'image_preprocess.dart';
import 'stamp_classifier.dart';
import '../../models/card_variant.dart';

class ScannerOutput {
  final String? setId; // e.g., 'SV2', 'SVP'
  final int? cardNo; // e.g., 15
  final int? setSize; // e.g., 172
  final int? year; // e.g., 2025
  final CardVariant variant;
  final dynamic condition; // optional dev hook for condition output

  const ScannerOutput({
    this.setId,
    this.cardNo,
    this.setSize,
    this.year,
    required this.variant,
    this.condition,
  });
}

class ScannerPipeline {
  final StampClassifier _stamp = StampClassifier();

  Future<void> init() async => _stamp.load();

  /// Spec crop boxes (percent-based), tuned for modern layouts:
  /// - set/rarity/number zone (bottom-right band)
  /// - artwork mid-zone for embossed/ghost overlays
  ui.Rect _numberZone(ui.Image img) =>
      ImagePreprocess.relativeCrop(img, leftPct: 0.62, topPct: 0.84, widthPct: 0.35, heightPct: 0.12);

  ui.Rect _artOverlayZone(ui.Image img) =>
      ImagePreprocess.relativeCrop(img, leftPct: 0.18, topPct: 0.28, widthPct: 0.64, heightPct: 0.30);

  Future<ScannerOutput> analyze({
    required ui.Image fullImage,
    String? fallbackSetId,
    String? fallbackName,
    String? fallbackLanguage,
  }) async {
    // 1) Preprocess
    final normalized = ImagePreprocess.normalize(fullImage);

    // 2) Extract OCR candidate text (stub — integrate your OCR engine here)
    final numberText = await _fakeOcr(normalized, _numberZone(normalized));
    final yearText = await _fakeOcr(normalized, _numberZone(normalized)); // often nearby

    int? cardNo, setSize, year;
    final m = OcrSpec.collectorNo.firstMatch(numberText ?? '');
    if (m != null) {
      cardNo = int.tryParse(m.group(1)!);
      setSize = int.tryParse(m.group(2)!);
    }

    final y = OcrSpec.year.firstMatch(yearText ?? '');
    if (y != null) {
      year = int.tryParse(y.group(0)!);
    }

    // 3) Stamp detection — classifier first, then OCR fallback
    final stampPatch = _artOverlayZone(normalized);
    final stampRes = await _stamp.classify(await _crop(normalized, stampPatch));

    String variantTag = stampRes.label;
    double conf = stampRes.confidence;
    bool hasOverlay = false;

    // OCR fallback to upgrade NONE → known text labels
    final overlayOcr = await _fakeOcr(normalized, stampPatch);
    if (overlayOcr != null) {
      for (final pat in OcrSpec.textStampPatterns) {
        final hit = pat.firstMatch(overlayOcr);
        if (hit != null) {
          final t = hit.group(0)!.toUpperCase().replaceAll(' ', '_');
          // Normalize some known forms
          if (t.contains('WORLD')) {
            final ymatch = RegExp(r'20\\d{2}').firstMatch(t);
            if (ymatch != null) {
              variantTag = 'WORLDS_${ymatch.group(0)}';
            } else {
              variantTag = 'WORLDS';
            }
          } else if (t.contains('CHAMPIONSHIP')) {
            final ymatch = RegExp(r'20\\d{2}').firstMatch(t);
            variantTag = ymatch != null ? 'CHAMPIONSHIP_${ymatch.group(0)}' : 'CHAMPIONSHIP';
          } else if (t.contains('WINNER')) {
            final ymatch = RegExp(r'20\\d{2}').firstMatch(t);
            variantTag = ymatch != null ? 'WINNERS_${ymatch.group(0)}' : 'WINNERS';
          } else if (t.contains('PRERELEASE')) {
            variantTag = 'PRERELEASE';
          } else if (t.contains('POKEMON_CENTER')) {
            variantTag = 'POKEMON_CENTER';
          } else if (t.contains('STAFF')) {
            variantTag = 'STAFF';
          }
          conf = conf < 0.85 ? 0.85 : conf; // promote if text hit found
          break;
        }
      }
    }

    // Heuristic: ghost/emboss overlays are often low-texture-on-holo → flag as overlay if classifier ≠ NONE or OCR matched
    hasOverlay = variantTag != 'NONE';

    return ScannerOutput(
      setId: fallbackSetId, // TODO: wire actual set symbol classifier
      cardNo: cardNo,
      setSize: setSize,
      year: year,
      variant: CardVariant(
        variantTag: variantTag,
        hasOverlay: hasOverlay,
        stampConfidence: conf,
      ),
      condition: null,
    );
  }

  // ===== Stubs to replace =====
  Future<String?> _fakeOcr(ui.Image img, ui.Rect region) async {
    // TODO: integrate with your OCR engine and restrict to region
    return null;
  }

  Future<ui.Image> _crop(ui.Image img, ui.Rect r) async {
    // TODO: implement GPU/Canvas crop; stub returns original
    return img;
  }
}
