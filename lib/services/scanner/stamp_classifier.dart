import 'dart:ui' as ui;

/// Classifier labels must match assets/stamps/*.png filenames (without extension).
const List<String> kStampLabels = <String>[
  'NONE',
  'PRERELEASE',
  'STAFF',
  'WINNERS_2025',
  'WORLDS_2024',
  'WORLDS_2025',
  'POKEMON_CENTER',
  'CHAMPIONSHIP_2025',
];

class StampClassifierResult {
  final String label; // one of kStampLabels
  final double confidence; // 0.0–1.0

  const StampClassifierResult(this.label, this.confidence);
}

/// Stub classifier: returns NONE with low confidence.
/// Replace with real TFLite/vision model later.
class StampClassifier {
  Future<void> load() async {
    // TODO: Load TFLite/ML model if/when added.
  }

  Future<StampClassifierResult> classify(ui.Image patch) async {
    return const StampClassifierResult('NONE', 0.01);
    }
}

