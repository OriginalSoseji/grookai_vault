import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';

import 'scanner_v4_diagnostic_capture_v1.dart';

class ScannerV4DiagnosticTestStageV1 {
  const ScannerV4DiagnosticTestStageV1._();

  static const idle = 'idle';
  static const emptyDeskCountdown = 'empty_desk_countdown';
  static const emptyDeskCapture = 'empty_desk_capture';
  static const partialEdgeCountdown = 'partial_edge_countdown';
  static const partialEdgeCapture = 'partial_edge_capture';
  static const realCardCountdown = 'real_card_countdown';
  static const realCardCapture = 'real_card_capture';
  static const complete = 'complete';
}

class ScannerV4DiagnosticTestPhaseV1 {
  const ScannerV4DiagnosticTestPhaseV1({
    required this.phase,
    required this.label,
    required this.instructions,
    required this.countdownStage,
    required this.captureStage,
    this.countdownSeconds = 5,
    this.captureSeconds = 10,
  });

  final String phase;
  final String label;
  final String instructions;
  final String countdownStage;
  final String captureStage;
  final int countdownSeconds;
  final int captureSeconds;
}

class ScannerV4DiagnosticTestStatusV1 {
  const ScannerV4DiagnosticTestStatusV1({
    required this.stage,
    required this.running,
    required this.capturing,
    required this.complete,
    required this.phaseNumber,
    required this.totalPhases,
    required this.phase,
    required this.phaseLabel,
    required this.instructions,
    required this.secondsRemaining,
    required this.lastReportPath,
    required this.lastExportPrintedToConsole,
    required this.lastExportError,
    required this.lastPhaseResults,
  });

  static const idle = ScannerV4DiagnosticTestStatusV1(
    stage: ScannerV4DiagnosticTestStageV1.idle,
    running: false,
    capturing: false,
    complete: false,
    phaseNumber: 0,
    totalPhases: 3,
    phase: null,
    phaseLabel: 'Scanner V4 Auto Test',
    instructions: 'Run a guided real-device scanner diagnostic test.',
    secondsRemaining: 0,
    lastReportPath: null,
    lastExportPrintedToConsole: false,
    lastExportError: null,
    lastPhaseResults: <String, String>{},
  );

  final String stage;
  final bool running;
  final bool capturing;
  final bool complete;
  final int phaseNumber;
  final int totalPhases;
  final String? phase;
  final String phaseLabel;
  final String instructions;
  final int secondsRemaining;
  final String? lastReportPath;
  final bool lastExportPrintedToConsole;
  final String? lastExportError;
  final Map<String, String> lastPhaseResults;
}

class ScannerV4DiagnosticAutoExportResultV1 {
  const ScannerV4DiagnosticAutoExportResultV1({
    this.path,
    this.printedToConsole = false,
    this.error,
  });

  final String? path;
  final bool printedToConsole;
  final String? error;
}

class ScannerV4DiagnosticTestRunnerV1 extends ChangeNotifier {
  ScannerV4DiagnosticTestRunnerV1({
    required ScannerV4DiagnosticCaptureV1 capture,
  }) : _capture = capture;

  static const List<ScannerV4DiagnosticTestPhaseV1>
  phases = <ScannerV4DiagnosticTestPhaseV1>[
    ScannerV4DiagnosticTestPhaseV1(
      phase: 'empty_desk',
      label: 'Empty Desk',
      instructions:
          'Point camera at empty desk/background. Do not place a card in frame.',
      countdownStage: ScannerV4DiagnosticTestStageV1.emptyDeskCountdown,
      captureStage: ScannerV4DiagnosticTestStageV1.emptyDeskCapture,
    ),
    ScannerV4DiagnosticTestPhaseV1(
      phase: 'partial_edge',
      label: 'Partial Edge / Background Texture',
      instructions:
          'Point camera at a desk seam, mat edge, wood grain, or partial rectangle. No card.',
      countdownStage: ScannerV4DiagnosticTestStageV1.partialEdgeCountdown,
      captureStage: ScannerV4DiagnosticTestStageV1.partialEdgeCapture,
    ),
    ScannerV4DiagnosticTestPhaseV1(
      phase: 'real_card',
      label: 'Real Card',
      instructions: 'Place one real card clearly in frame.',
      countdownStage: ScannerV4DiagnosticTestStageV1.realCardCountdown,
      captureStage: ScannerV4DiagnosticTestStageV1.realCardCapture,
      countdownSeconds: 10,
    ),
  ];

  final ScannerV4DiagnosticCaptureV1 _capture;
  final Map<String, _PhaseTiming> _phaseTimings = <String, _PhaseTiming>{};
  Timer? _timer;
  String _stage = ScannerV4DiagnosticTestStageV1.idle;
  int _phaseIndex = 0;
  DateTime? _stageEndsAt;
  ScannerV4DiagnosticAutoExportResultV1? _lastExportResult;
  Map<String, String> _lastPhaseResults = const <String, String>{};

  ScannerV4DiagnosticTestStatusV1 get status {
    final phase = _activePhase;
    final running = _isRunningStage(_stage);
    return ScannerV4DiagnosticTestStatusV1(
      stage: _stage,
      running: running,
      capturing: isCapturing,
      complete: _stage == ScannerV4DiagnosticTestStageV1.complete,
      phaseNumber: phase == null ? 0 : _phaseIndex + 1,
      totalPhases: phases.length,
      phase: phase?.phase,
      phaseLabel: phase?.label ?? 'Scanner V4 Auto Test',
      instructions:
          phase?.instructions ??
          'Run a guided real-device scanner diagnostic test.',
      secondsRemaining: _secondsRemaining(DateTime.now()),
      lastReportPath: _lastExportResult?.path,
      lastExportPrintedToConsole: _lastExportResult?.printedToConsole ?? false,
      lastExportError: _lastExportResult?.error,
      lastPhaseResults: _lastPhaseResults,
    );
  }

  bool get isRunning => _isRunningStage(_stage);

  bool get isCapturing =>
      _stage == ScannerV4DiagnosticTestStageV1.emptyDeskCapture ||
      _stage == ScannerV4DiagnosticTestStageV1.partialEdgeCapture ||
      _stage == ScannerV4DiagnosticTestStageV1.realCardCapture;

  String? get currentCapturePhaseId => isCapturing ? _activePhase?.phase : null;

  void start() {
    _timer?.cancel();
    _capture.stop();
    _capture.clear();
    _phaseTimings.clear();
    _lastExportResult = null;
    _lastPhaseResults = const <String, String>{};
    _phaseIndex = 0;
    _enterCountdown(DateTime.now());
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      _tick(DateTime.now());
    });
    notifyListeners();
  }

  void cancel() {
    _timer?.cancel();
    _timer = null;
    _capture.stop();
    _stage = ScannerV4DiagnosticTestStageV1.idle;
    _stageEndsAt = null;
    notifyListeners();
  }

  Future<ScannerV4DiagnosticAutoExportResultV1> exportLastReport() async {
    final report = buildReport();
    final json = const JsonEncoder.withIndent('  ').convert(report);
    try {
      final file = File(
        '${Directory.systemTemp.path}${Platform.pathSeparator}'
        'scanner_v4_real_device_auto_test_report_v1.json',
      );
      await file.writeAsString('$json\n', flush: true);
      _lastExportResult = ScannerV4DiagnosticAutoExportResultV1(
        path: file.path,
      );
      _lastPhaseResults = _phaseResultLabels(report);
      debugPrint('[scanner_v4_auto_test] report=${file.path}');
      notifyListeners();
      return _lastExportResult!;
    } catch (error) {
      _printJsonReport(json);
      _lastExportResult = ScannerV4DiagnosticAutoExportResultV1(
        printedToConsole: true,
        error: error.toString(),
      );
      _lastPhaseResults = _phaseResultLabels(report);
      notifyListeners();
      return _lastExportResult!;
    }
  }

  Map<String, Object?> buildReport() {
    final phaseReports = phases
        .map((phase) {
          final frames = _capture.frames
              .where((frame) => frame.testPhase == phase.phase)
              .toList(growable: false);
          final summary = _summaryForFrames(frames);
          final evaluation = _evaluatePhase(phase, frames, summary);
          final timing = _phaseTimings[phase.phase];
          return <String, Object?>{
            'phase': phase.phase,
            'label': phase.label,
            'instructions': phase.instructions,
            'countdown_seconds': phase.countdownSeconds,
            'capture_seconds': phase.captureSeconds,
            'start_timestamp': timing?.startTimestamp
                ?.toUtc()
                .toIso8601String(),
            'end_timestamp': timing?.endTimestamp?.toUtc().toIso8601String(),
            'frames': frames
                .map((frame) => frame.toJson())
                .toList(growable: false),
            'summary': summary,
            'evaluation': evaluation,
          };
        })
        .toList(growable: false);

    final overallFrames = _capture.frames;
    return <String, Object?>{
      'branch': 'scanner-v4-card-present-gate',
      'mode': 'real_device_auto_test',
      'phases': phaseReports,
      'overall_summary': _summaryForFrames(overallFrames),
    };
  }

  @override
  void dispose() {
    _timer?.cancel();
    _capture.stop();
    super.dispose();
  }

  void _tick(DateTime now) {
    if (!_isRunningStage(_stage)) return;
    if (_stageEndsAt != null && now.isBefore(_stageEndsAt!)) {
      notifyListeners();
      return;
    }
    if (isCapturing) {
      _finishCapture(now);
    } else {
      _enterCapture(now);
    }
    notifyListeners();
  }

  void _enterCountdown(DateTime now) {
    final phase = phases[_phaseIndex];
    _capture.stop();
    _stage = phase.countdownStage;
    _stageEndsAt = now.add(Duration(seconds: phase.countdownSeconds));
    debugPrint(
      '[scanner_v4_auto_test] phase=${phase.phase} countdown seconds=${phase.countdownSeconds}',
    );
    final timing = _phaseTimings.putIfAbsent(phase.phase, () => _PhaseTiming());
    timing.startTimestamp = now;
  }

  void _enterCapture(DateTime now) {
    final phase = phases[_phaseIndex];
    _stage = phase.captureStage;
    _stageEndsAt = now.add(Duration(seconds: phase.captureSeconds));
    _phaseTimings.putIfAbsent(phase.phase, () => _PhaseTiming());
    debugPrint(
      '[scanner_v4_auto_test] phase=${phase.phase} capture seconds=${phase.captureSeconds}',
    );
    _capture.resume();
  }

  void _finishCapture(DateTime now) {
    final phase = phases[_phaseIndex];
    _capture.stop();
    _phaseTimings.putIfAbsent(phase.phase, () => _PhaseTiming()).endTimestamp =
        now;
    if (_phaseIndex < phases.length - 1) {
      _phaseIndex += 1;
      _enterCountdown(now);
      return;
    }
    _complete(now);
  }

  void _complete(DateTime now) {
    _timer?.cancel();
    _timer = null;
    _stage = ScannerV4DiagnosticTestStageV1.complete;
    _stageEndsAt = null;
    _lastPhaseResults = _phaseResultLabels(buildReport());
    unawaited(_exportAndPrintCompletionSummary());
  }

  Future<void> _exportAndPrintCompletionSummary() async {
    final result = await exportLastReport();
    final reportPath =
        result.path ?? (result.printedToConsole ? 'console' : 'unavailable');
    debugPrint('[scanner_v4_auto_test] complete');
    for (final phase in phases) {
      debugPrint(
        '${phase.phase}: ${_lastPhaseResults[phase.phase] ?? 'UNAVAILABLE'}',
      );
    }
    debugPrint('report=$reportPath');
  }

  ScannerV4DiagnosticTestPhaseV1? get _activePhase {
    if (_phaseIndex < 0 || _phaseIndex >= phases.length) return null;
    return phases[_phaseIndex];
  }

  int _secondsRemaining(DateTime now) {
    final endsAt = _stageEndsAt;
    if (endsAt == null) return 0;
    final remainingMs = endsAt.difference(now).inMilliseconds;
    if (remainingMs <= 0) return 0;
    return (remainingMs / 1000).ceil();
  }

  bool _isRunningStage(String stage) {
    return stage != ScannerV4DiagnosticTestStageV1.idle &&
        stage != ScannerV4DiagnosticTestStageV1.complete;
  }

  Map<String, Object?> _summaryForFrames(
    List<ScannerV4DiagnosticSnapshotV1> frames,
  ) {
    return <String, Object?>{
      'total_frames': frames.length,
      'native_success_frames': frames
          .where((frame) => frame.nativeSuccess)
          .length,
      'card_present_frames': frames.where((frame) => frame.cardPresent).length,
      'identity_allowed_frames': frames
          .where((frame) => frame.identityAllowed)
          .length,
      'identity_started_frames': frames
          .where((frame) => frame.identityStarted == true)
          .length,
    };
  }

  Map<String, Object?> _evaluatePhase(
    ScannerV4DiagnosticTestPhaseV1 phase,
    List<ScannerV4DiagnosticSnapshotV1> frames,
    Map<String, Object?> summary,
  ) {
    final totalFrames = summary['total_frames'] as int;
    final nativeSuccessFrames = summary['native_success_frames'] as int;
    final cardPresentFrames = summary['card_present_frames'] as int;
    final identityAllowedFrames = summary['identity_allowed_frames'] as int;
    final identityStartedFrames = summary['identity_started_frames'] as int;

    if (totalFrames == 0) {
      return const <String, Object?>{
        'status': 'FAIL',
        'reason': 'no_frames_captured',
        'warnings': <String>[],
        'ordering_check': 'not_applicable',
      };
    }

    if (phase.phase == 'empty_desk' || phase.phase == 'partial_edge') {
      final failures = <String>[];
      if (cardPresentFrames != 0) {
        failures.add('card_present_frames_nonzero:$cardPresentFrames');
      }
      if (identityAllowedFrames != 0) {
        failures.add('identity_allowed_frames_nonzero:$identityAllowedFrames');
      }
      if (identityStartedFrames != 0) {
        failures.add('identity_started_frames_nonzero:$identityStartedFrames');
      }
      final warnings = <String>[
        if (nativeSuccessFrames > 0)
          'native_success_frames_nonzero:$nativeSuccessFrames',
      ];
      return <String, Object?>{
        'status': failures.isNotEmpty
            ? 'FAIL'
            : warnings.isNotEmpty
            ? 'WARN'
            : 'PASS',
        'reason': failures.isEmpty
            ? 'empty_scene_identity_blocked'
            : failures.join(','),
        'warnings': warnings,
        'ordering_check': 'not_applicable',
      };
    }

    final failures = <String>[];
    if (nativeSuccessFrames <= 0) {
      failures.add('native_success_frames_zero');
    }
    if (cardPresentFrames <= 0) {
      failures.add('card_present_frames_zero');
    }
    final ordering = _identityOrderingCheck(frames);
    if (ordering == 'fail') {
      failures.add('identity_started_before_card_present');
    }
    return <String, Object?>{
      'status': failures.isEmpty ? 'PASS' : 'FAIL',
      'reason': failures.isEmpty ? 'real_card_detected' : failures.join(','),
      'warnings': const <String>[],
      'ordering_check': ordering,
    };
  }

  String _identityOrderingCheck(List<ScannerV4DiagnosticSnapshotV1> frames) {
    final identityFrames = frames
        .where((frame) => frame.identityStarted == true)
        .toList(growable: false);
    if (identityFrames.isEmpty) {
      final hasUnavailable = frames.any(
        (frame) => frame.identityStarted == 'unavailable',
      );
      return hasUnavailable ? 'unavailable' : 'not_applicable';
    }
    final firstCardPresent = frames
        .where((frame) => frame.cardPresent)
        .map((frame) => frame.frameIndex)
        .fold<int?>(null, (current, value) {
          if (current == null || value < current) return value;
          return current;
        });
    final firstIdentityStarted = identityFrames
        .map((frame) => frame.frameIndex)
        .fold<int?>(null, (current, value) {
          if (current == null || value < current) return value;
          return current;
        });
    if (firstCardPresent == null || firstIdentityStarted == null) return 'fail';
    return firstIdentityStarted >= firstCardPresent ? 'pass' : 'fail';
  }

  Map<String, String> _phaseResultLabels(Map<String, Object?> report) {
    final phasesJson = report['phases'];
    if (phasesJson is! List) return const <String, String>{};
    final result = <String, String>{};
    for (final phaseJson in phasesJson) {
      if (phaseJson is! Map) continue;
      final phase = phaseJson['phase']?.toString();
      final evaluation = phaseJson['evaluation'];
      if (phase == null || evaluation is! Map) continue;
      result[phase] = evaluation['status']?.toString() ?? 'UNAVAILABLE';
    }
    return result;
  }

  void _printJsonReport(String json) {
    const chunkSize = 700;
    debugPrint('[scanner_v4_auto_test] report_json_begin');
    for (var offset = 0; offset < json.length; offset += chunkSize) {
      final end = (offset + chunkSize).clamp(0, json.length);
      debugPrint(json.substring(offset, end));
    }
    debugPrint('[scanner_v4_auto_test] report_json_end');
  }
}

class _PhaseTiming {
  DateTime? startTimestamp;
  DateTime? endTimestamp;
}
