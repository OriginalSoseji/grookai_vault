import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';

import '../scanner_v3/candidate_vote_state_v1.dart';
import '../scanner_v3/convergence_state_v1.dart';

const _unavailable = 'unavailable';

class ScannerV4DiagnosticSnapshotV1 {
  const ScannerV4DiagnosticSnapshotV1({
    required this.timestamp,
    required this.frameIndex,
    required this.nativeRegistered,
    required this.nativeCalled,
    required this.nativeSuccess,
    required this.nativeConfidence,
    required this.nativeFailureReason,
    required this.pointsPresent,
    required this.quadSource,
    required this.cardPresent,
    required this.cardPresentReason,
    required this.cardPresentConsecutiveFrames,
    required this.identityAllowed,
    required this.identityAllowedReason,
    required this.identityBlockedReason,
    required this.identityStarted,
    required this.scannerState,
    required this.nativeDiagnosticsUsable,
    required this.nativeDiagnosticsRejectionReason,
    required this.identityCandidates,
    this.nativeElapsedMs,
    this.identitySignalSource,
    this.lastDecisionReason,
    this.cardPresentMetrics,
    this.nativeDiagnostics,
    this.cameraMetrics,
    this.testPhase,
  });

  factory ScannerV4DiagnosticSnapshotV1.fromLivePath({
    required DateTime timestamp,
    required ScannerV3LiveLoopState state,
    required bool nativeRegistered,
    required bool nativeCalled,
    required bool nativeSuccess,
    required double? nativeConfidence,
    required int? nativeElapsedMs,
    required String? nativeFailureReason,
    required bool pointsPresent,
    required Map<String, dynamic>? nativeRawResponse,
    Map<String, Object?>? cameraMetrics,
    String? testPhase,
  }) {
    final identityStarted = _identityStartedFromState(state);
    return ScannerV4DiagnosticSnapshotV1(
      timestamp: timestamp.toUtc(),
      frameIndex: state.frameCount,
      nativeRegistered: nativeRegistered,
      nativeCalled: nativeCalled,
      nativeSuccess: nativeSuccess,
      nativeConfidence: nativeConfidence ?? _unavailable,
      nativeFailureReason: nativeFailureReason,
      pointsPresent: pointsPresent,
      quadSource: state.selectedQuadSource,
      cardPresent: state.cardPresent,
      cardPresentReason: state.cardPresentReason ?? _unavailable,
      cardPresentConsecutiveFrames: state.cardPresentConsecutiveFrames,
      identityAllowed: state.identityAllowed,
      identityAllowedReason: state.identityAllowedReason ?? _unavailable,
      identityBlockedReason: state.identityBlockedReason ?? _unavailable,
      identityStarted: identityStarted,
      scannerState: state.identityDecisionState,
      nativeDiagnosticsUsable: state.nativeDiagnosticsUsable,
      nativeDiagnosticsRejectionReason:
          state.nativeDiagnosticsRejectionReason ?? _unavailable,
      identityCandidates: _identityCandidatesFromState(state),
      nativeElapsedMs: nativeElapsedMs ?? _unavailable,
      identitySignalSource: state.identitySignalSource,
      lastDecisionReason: state.lastDecisionReason,
      cardPresentMetrics: _cardPresentMetricsFromState(state),
      nativeDiagnostics: _diagnosticsFromRawResponse(nativeRawResponse),
      cameraMetrics: cameraMetrics,
      testPhase: testPhase,
    );
  }

  final DateTime timestamp;
  final int frameIndex;
  final bool nativeRegistered;
  final bool nativeCalled;
  final bool nativeSuccess;
  final Object nativeConfidence;
  final Object? nativeFailureReason;
  final bool pointsPresent;
  final Object quadSource;
  final bool cardPresent;
  final Object cardPresentReason;
  final int cardPresentConsecutiveFrames;
  final bool identityAllowed;
  final Object identityAllowedReason;
  final Object identityBlockedReason;
  final Object identityStarted;
  final Object scannerState;
  final bool nativeDiagnosticsUsable;
  final Object nativeDiagnosticsRejectionReason;
  final List<Map<String, Object?>> identityCandidates;
  final Object? nativeElapsedMs;
  final String? identitySignalSource;
  final String? lastDecisionReason;
  final Map<String, Object?>? cardPresentMetrics;
  final Map<String, Object?>? nativeDiagnostics;
  final Map<String, Object?>? cameraMetrics;
  final String? testPhase;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'timestamp': timestamp.toIso8601String(),
      'frame_index': frameIndex,
      'native_registered': nativeRegistered,
      'native_called': nativeCalled,
      'native_success': nativeSuccess,
      'native_confidence': nativeConfidence,
      'native_failure_reason': nativeFailureReason,
      'points_present': pointsPresent,
      'quad_source': quadSource,
      'card_present': cardPresent,
      'card_present_reason': cardPresentReason,
      'card_present_consecutive_frames': cardPresentConsecutiveFrames,
      'identity_allowed': identityAllowed,
      'identity_allowed_reason': identityAllowedReason,
      'identity_blocked_reason': identityBlockedReason,
      'identity_started': identityStarted,
      'scanner_state': scannerState,
      'native_diagnostics_usable': nativeDiagnosticsUsable,
      'native_diagnostics_rejection_reason': nativeDiagnosticsRejectionReason,
      'identity_candidates': identityCandidates,
      'native_elapsed_ms': nativeElapsedMs,
      'identity_signal_source': identitySignalSource ?? _unavailable,
      'last_decision_reason': lastDecisionReason ?? _unavailable,
      'card_present_metrics': cardPresentMetrics ?? _unavailable,
      'native_diagnostics': nativeDiagnostics ?? _unavailable,
      'camera_metrics': cameraMetrics ?? _unavailable,
      'test_phase': testPhase ?? _unavailable,
    };
  }

  static Object _identityStartedFromState(ScannerV3LiveLoopState state) {
    if (state.identityDecisionState == IdentityDecisionStateV1.identityLocked ||
        state.candidates.isNotEmpty) {
      return true;
    }
    switch (state.identitySignalSource) {
      case 'v8_fast_full_card_vector':
      case 'v8_multicrop_vector_rerank':
      case 'v8_multicrop_identity_no_successful_crops':
      case 'identity_error':
        return true;
      case 'v8_identity_locked_frozen':
      case 'card_present_persistence_pending':
      case 'card_absent':
      case 'quality_rejected':
      case 'normalization_failed':
      case 'waiting':
        return false;
    }
    return state.cardPresent ? _unavailable : false;
  }

  static List<Map<String, Object?>> _identityCandidatesFromState(
    ScannerV3LiveLoopState state,
  ) {
    return state.candidates
        .take(5)
        .map(
          (candidate) => <String, Object?>{
            'id': candidate.id,
            'name': candidate.name,
            'set_code': candidate.setCode,
            'number': candidate.number,
            'gv_id': candidate.gvId,
            'source': candidate.source,
            'score': candidate.score,
            'occurrences': candidate.occurrences,
            'last_seen_frame': candidate.lastSeenFrame,
            'vector_distance': candidate.vectorDistance,
            'top5_occurrences': candidate.topFiveOccurrences,
            'best_rank': candidate.bestRank,
            'crop_support_count': candidate.cropContributionCount,
            'recent_top5_count': candidate.recentTopFiveCount,
            'similarity': candidate.similarity,
            'aggregate_score': candidate.aggregateScore,
            'rerank_score': candidate.rerankScore,
          },
        )
        .toList(growable: false);
  }

  static Map<String, Object?>? _cardPresentMetricsFromState(
    ScannerV3LiveLoopState state,
  ) {
    final metrics = <String, Object?>{
      'full_luma_std_dev': state.cardPresentFullLumaStdDev,
      'artwork_luma_std_dev': state.cardPresentArtworkLumaStdDev,
      'artwork_foreground_ratio': state.cardPresentArtworkForegroundRatio,
      'border_bright_ratio': state.cardPresentBorderBrightRatio,
      'border_band_coverage': state.cardPresentBorderBandCoverage,
      'pokemon_layout_score': state.cardPresentPokemonLayoutScore,
      'pokemon_horizontal_contrast': state.cardPresentPokemonHorizontalContrast,
      'pokemon_text_panel_bright_ratio':
          state.cardPresentPokemonTextPanelBrightRatio,
    };
    metrics.removeWhere((_, value) => value == null);
    return metrics.isEmpty ? null : metrics;
  }

  static Map<String, Object?>? _diagnosticsFromRawResponse(
    Map<String, dynamic>? rawResponse,
  ) {
    final diagnostics = rawResponse?['diagnostics'];
    if (diagnostics is! Map) return null;
    final result = <String, Object?>{};
    for (final entry in diagnostics.entries) {
      final key = entry.key?.toString();
      if (key == null || key == 'debug_masks') continue;
      result[key] = _jsonSafe(entry.value);
    }
    return result;
  }

  static Object? _jsonSafe(Object? value) {
    if (value == null || value is num || value is bool || value is String) {
      return value;
    }
    if (value is Iterable) {
      return value.map(_jsonSafe).toList(growable: false);
    }
    if (value is Map) {
      return <String, Object?>{
        for (final entry in value.entries)
          if (entry.key != null) entry.key.toString(): _jsonSafe(entry.value),
      };
    }
    return value.toString();
  }
}

class ScannerV4DiagnosticCaptureV1 {
  final List<ScannerV4DiagnosticSnapshotV1> _frames =
      <ScannerV4DiagnosticSnapshotV1>[];
  bool _enabled = false;

  bool get enabled => _enabled;
  int get frameCount => _frames.length;
  List<ScannerV4DiagnosticSnapshotV1> get frames =>
      List<ScannerV4DiagnosticSnapshotV1>.unmodifiable(_frames);

  void start() {
    _frames.clear();
    _enabled = true;
  }

  void resume() {
    _enabled = true;
  }

  void stop() {
    _enabled = false;
  }

  void clear() {
    _frames.clear();
  }

  void record(ScannerV4DiagnosticSnapshotV1 snapshot) {
    if (!_enabled) return;
    _frames.add(snapshot);
  }

  Map<String, Object?> buildReport() {
    final frameJson = _frames
        .map((frame) => frame.toJson())
        .toList(growable: false);
    return <String, Object?>{
      'branch': 'scanner-v4-card-present-gate',
      'mode': 'real_device_diagnostics',
      'frames': frameJson,
      'summary': <String, Object?>{
        'total_frames': _frames.length,
        'native_success_frames': _frames
            .where((frame) => frame.nativeSuccess)
            .length,
        'card_present_frames': _frames
            .where((frame) => frame.cardPresent)
            .length,
        'identity_allowed_frames': _frames
            .where((frame) => frame.identityAllowed)
            .length,
        'identity_started_frames': _frames
            .where((frame) => frame.identityStarted == true)
            .length,
      },
    };
  }

  Future<ScannerV4DiagnosticExportResultV1> exportReport() async {
    final json = const JsonEncoder.withIndent('  ').convert(buildReport());
    try {
      final file = File(
        '${Directory.systemTemp.path}${Platform.pathSeparator}'
        'scanner_v4_real_device_empty_scene_report_v1.json',
      );
      await file.writeAsString('$json\n', flush: true);
      debugPrint('[scanner_v4_diagnostics] saved=${file.path}');
      return ScannerV4DiagnosticExportResultV1(path: file.path);
    } catch (error) {
      debugPrint('[scanner_v4_diagnostics] file_export_failed=$error');
      _printJsonReport(json);
      return ScannerV4DiagnosticExportResultV1(
        printedToConsole: true,
        error: error.toString(),
      );
    }
  }

  void _printJsonReport(String json) {
    const chunkSize = 700;
    debugPrint('[scanner_v4_diagnostics] report_json_begin');
    for (var offset = 0; offset < json.length; offset += chunkSize) {
      final end = (offset + chunkSize).clamp(0, json.length);
      debugPrint(json.substring(offset, end));
    }
    debugPrint('[scanner_v4_diagnostics] report_json_end');
  }
}

class ScannerV4DiagnosticExportResultV1 {
  const ScannerV4DiagnosticExportResultV1({
    this.path,
    this.printedToConsole = false,
    this.error,
  });

  final String? path;
  final bool printedToConsole;
  final String? error;
}
