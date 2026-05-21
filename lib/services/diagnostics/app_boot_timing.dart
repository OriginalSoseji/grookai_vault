import 'package:flutter/foundation.dart';

/// Debug-only app startup markers.
///
/// These logs are intentionally disabled in release builds. They are meant to
/// separate perceived startup delay from real initialization work while we tune
/// the native splash and first Flutter frame.
class AppBootTiming {
  static final Stopwatch _watch = Stopwatch()..start();
  static final Set<String> _onceLabels = <String>{};

  static void mark(String label) {
    if (!kDebugMode) {
      return;
    }
    debugPrint('[APP_BOOT_V1] ${_watch.elapsedMilliseconds}ms $label');
  }

  static void markOnce(String label) {
    if (!kDebugMode || !_onceLabels.add(label)) {
      return;
    }
    mark(label);
  }
}
