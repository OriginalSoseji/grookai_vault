import 'dart:collection';
import 'package:flutter/scheduler.dart';

class TelemetrySnapshot {
  final double avgFps60s;
  final double httpErrorRate15m; // 0..1
  final Map<String, int> pricingFreshnessBins; // e.g., {'<=1h': 12, '1-6h': 3, '>24h': 1}
  TelemetrySnapshot({required this.avgFps60s, required this.httpErrorRate15m, required this.pricingFreshnessBins});
  Map<String, dynamic> toJson() => {
    'avgFps60s': avgFps60s,
    'httpErrorRate15m': httpErrorRate15m,
    'pricingFreshnessBins': pricingFreshnessBins,
  };
}

class AppTelemetry {
  static final AppTelemetry I = AppTelemetry._();
  AppTelemetry._() {
    SchedulerBinding.instance.addTimingsCallback(_onTimings);
  }

  // FPS over last 60s
  final Queue<(Duration, Duration)> _frameTimings = Queue(); // (build, raster)
  void _onTimings(List<FrameTiming> timings) {
    for (final t in timings) {
      _frameTimings.addLast((t.buildDuration, t.rasterDuration));
    }
    // trim >60s by approximate count (assuming 60fps ~ 3600 frames), use timestamp queue in a real impl
    while (_frameTimings.length > 4000) { _frameTimings.removeFirst(); }
  }

  double get avgFps60s {
    if (_frameTimings.isEmpty) return 0;
    // Approximate FPS using mean of (build+raster) durations clamped to 60fps
    final ms = _frameTimings
        .map((e) => (e.$1 + e.$2).inMilliseconds)
        .fold<double>(0, (a, b) => a + b);
    final avgMs = ms / _frameTimings.length;
    if (avgMs <= 0) return 0;
    return (1000.0 / avgMs).clamp(0, 120);
  }

  // HTTP failures per 15 minutes
  final Queue<DateTime> _httpErrors = Queue();
  void recordHttpFailure() {
    final now = DateTime.now();
    _httpErrors.addLast(now);
    _trimHttp();
  }
  void _trimHttp() {
    final cutoff = DateTime.now().subtract(const Duration(minutes: 15));
    while (_httpErrors.isNotEmpty && _httpErrors.first.isBefore(cutoff)) {
      _httpErrors.removeFirst();
    }
  }
  double get httpErrorRate15m {
    _trimHttp();
    // Expose raw count as rate per minute for simplicity
    return _httpErrors.length / 15.0;
  }

  // Pricing freshness bins (client-observed)
  final Map<String, int> _freshnessBins = {'<=1h': 0, '1-6h': 0, '6-24h': 0, '>24h': 0};
  void observePricingFreshness(Duration? age) {
    if (age == null) return;
    String k;
    if (age.inMinutes <= 60) { k = '<=1h'; }
    else if (age.inHours <= 6) { k = '1-6h'; }
    else if (age.inHours <= 24) { k = '6-24h'; }
    else { k = '>24h'; }
    _freshnessBins[k] = (_freshnessBins[k] ?? 0) + 1;
  }

  TelemetrySnapshot snapshot() => TelemetrySnapshot(
    avgFps60s: avgFps60s,
    httpErrorRate15m: httpErrorRate15m,
    pricingFreshnessBins: Map<String, int>.from(_freshnessBins),
  );
}
