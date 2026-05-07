import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../../services/scanner_v3/convergence_state_v1.dart';
import '../../../services/scanner_v4/scanner_v4_diagnostic_test_runner_v1.dart';

class ScannerDebugPanel extends StatelessWidget {
  const ScannerDebugPanel({
    super.key,
    required this.state,
    required this.expanded,
    required this.exportEnabled,
    required this.cameraPresetLabel,
    required this.cameraPreviewSize,
    required this.cameraInputSize,
    required this.cameraInitFallbackReason,
    required this.diagnosticsEnabled,
    required this.diagnosticsFrameCount,
    required this.diagnosticsLastExportPath,
    required this.autoTestStatus,
    required this.onToggle,
    required this.onToggleDiagnostics,
    required this.onExportDiagnostics,
    required this.onStartAutoTest,
    required this.onCancelAutoTest,
    required this.onExportAutoTestReport,
  });

  final ScannerV3LiveLoopState state;
  final bool expanded;
  final bool exportEnabled;
  final String cameraPresetLabel;
  final Size? cameraPreviewSize;
  final Size? cameraInputSize;
  final String? cameraInitFallbackReason;
  final bool diagnosticsEnabled;
  final int diagnosticsFrameCount;
  final String? diagnosticsLastExportPath;
  final ScannerV4DiagnosticTestStatusV1 autoTestStatus;
  final VoidCallback onToggle;
  final ValueChanged<bool> onToggleDiagnostics;
  final VoidCallback onExportDiagnostics;
  final VoidCallback onStartAutoTest;
  final VoidCallback onCancelAutoTest;
  final VoidCallback onExportAutoTestReport;

  @override
  Widget build(BuildContext context) {
    if (!kDebugMode) return const SizedBox.shrink();

    final textTheme = Theme.of(context).textTheme;
    final topCandidates = state.candidates
        .take(5)
        .map(
          (candidate) =>
              '${candidate.id}:${candidate.score.toStringAsFixed(1)}',
        )
        .join(' ');

    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: onToggle,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              child: Row(
                children: [
                  Icon(
                    expanded ? Icons.expand_more : Icons.chevron_right,
                    color: Colors.white.withValues(alpha: 0.72),
                    size: 18,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Diagnostics',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: textTheme.labelMedium?.copyWith(
                        color: Colors.white.withValues(alpha: 0.74),
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0,
                      ),
                    ),
                  ),
                  Text(
                    'V8/V9',
                    style: textTheme.labelSmall?.copyWith(
                      color: Colors.white.withValues(alpha: 0.58),
                      letterSpacing: 0,
                    ),
                  ),
                ],
              ),
            ),
          ),
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 360),
              child: SingleChildScrollView(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                  child: DefaultTextStyle(
                    style: textTheme.labelSmall!.copyWith(
                      color: Colors.white.withValues(alpha: 0.62),
                      height: 1.25,
                      letterSpacing: 0,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _line(
                          'decision',
                          '${state.identityDecisionState} gap ${state.identityScoreGap.toStringAsFixed(2)} top ${state.identityTopCandidateScore.toStringAsFixed(2)}',
                        ),
                        _line(
                          'service',
                          state.identityServiceUnavailable
                              ? (state.identityServiceError ?? 'unavailable')
                              : 'available',
                        ),
                        _line(
                          'card present',
                          '${state.cardPresent} ${state.cardPresentReason ?? ""}',
                        ),
                        _line(
                          'support',
                          'crops ${state.identityCropSupportCount} recent ${state.identityRecentFrameSupportCount} dist ${state.identityTopDistance?.toStringAsFixed(3) ?? "n/a"}',
                        ),
                        _line(
                          'frames',
                          '${state.acceptedFrameCount} accepted / ${state.rejectedFrameCount} rejected',
                        ),
                        _line(
                          'camera',
                          'preset $cameraPresetLabel preview ${_formatSize(cameraPreviewSize)} input ${_formatSize(cameraInputSize)}',
                        ),
                        if (cameraInitFallbackReason != null)
                          _line('camera fallback', cameraInitFallbackReason!),
                        _line(
                          'timing',
                          'embed ${state.embeddingElapsedMs ?? -1}ms vector ${state.vectorSearchElapsedMs ?? -1}ms export ${exportEnabled ? "on" : "off"}',
                        ),
                        _line(
                          'top5',
                          topCandidates.isEmpty ? 'none' : topCandidates,
                        ),
                        const SizedBox(height: 8),
                        _diagnosticsControls(context),
                        _line(
                          'v4 diagnostics',
                          '${diagnosticsEnabled ? "recording" : "off"} frames $diagnosticsFrameCount',
                        ),
                        if (diagnosticsLastExportPath != null)
                          _line('v4 report', diagnosticsLastExportPath!),
                        const SizedBox(height: 10),
                        _autoTestControls(context),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            crossFadeState: expanded
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 160),
            sizeCurve: Curves.easeOutCubic,
          ),
        ],
      ),
    );
  }

  Widget _line(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(top: 5),
      child: Text(
        '$label: $value',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }

  Widget _diagnosticsControls(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Row(
      children: [
        Expanded(
          child: Text(
            'Scanner V4 Diagnostics',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: textTheme.labelMedium?.copyWith(
              color: Colors.white.withValues(alpha: 0.76),
              fontWeight: FontWeight.w700,
              letterSpacing: 0,
            ),
          ),
        ),
        Switch.adaptive(
          value: diagnosticsEnabled,
          onChanged: autoTestStatus.running ? null : onToggleDiagnostics,
        ),
        TextButton.icon(
          onPressed: onExportDiagnostics,
          icon: const Icon(Icons.ios_share_rounded, size: 16),
          label: const Text('Export'),
          style: TextButton.styleFrom(
            foregroundColor: Colors.white.withValues(alpha: 0.82),
            textStyle: textTheme.labelSmall,
          ),
        ),
      ],
    );
  }

  Widget _autoTestControls(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final phaseResults = autoTestStatus.lastPhaseResults.entries
        .map((entry) => '${entry.key}:${entry.value}')
        .join(' ');
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Scanner V4 Auto Test',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: textTheme.labelMedium?.copyWith(
                color: Colors.white.withValues(alpha: 0.82),
                fontWeight: FontWeight.w800,
                letterSpacing: 0,
              ),
            ),
            const SizedBox(height: 6),
            _line('phase', _autoTestPhaseText()),
            _line('timer', _autoTestTimerText()),
            Text(
              autoTestStatus.instructions,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            if (phaseResults.isNotEmpty) _line('results', phaseResults),
            if (autoTestStatus.lastReportPath != null)
              _line('auto report', autoTestStatus.lastReportPath!),
            if (autoTestStatus.lastExportPrintedToConsole)
              _line('auto report', 'printed to console'),
            if (autoTestStatus.lastExportError != null)
              _line('auto export error', autoTestStatus.lastExportError!),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                TextButton.icon(
                  onPressed: autoTestStatus.running ? null : onStartAutoTest,
                  icon: const Icon(Icons.play_arrow_rounded, size: 16),
                  label: const Text('Start'),
                  style: _autoButtonStyle(textTheme),
                ),
                TextButton.icon(
                  onPressed: autoTestStatus.running ? onCancelAutoTest : null,
                  icon: const Icon(Icons.stop_rounded, size: 16),
                  label: const Text('Cancel'),
                  style: _autoButtonStyle(textTheme),
                ),
                TextButton.icon(
                  onPressed: onExportAutoTestReport,
                  icon: const Icon(Icons.ios_share_rounded, size: 16),
                  label: const Text('Export Last Report'),
                  style: _autoButtonStyle(textTheme),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _autoTestPhaseText() {
    if (autoTestStatus.stage == ScannerV4DiagnosticTestStageV1.idle) {
      return 'idle';
    }
    if (autoTestStatus.complete) return 'complete';
    return 'Phase ${autoTestStatus.phaseNumber}/${autoTestStatus.totalPhases}: ${autoTestStatus.phaseLabel}';
  }

  String _autoTestTimerText() {
    if (autoTestStatus.capturing) {
      return 'capturing ${autoTestStatus.secondsRemaining}s';
    }
    if (autoTestStatus.running) {
      return 'capture starts in ${autoTestStatus.secondsRemaining}s';
    }
    return 'not running';
  }

  ButtonStyle _autoButtonStyle(TextTheme textTheme) {
    return TextButton.styleFrom(
      foregroundColor: Colors.white.withValues(alpha: 0.82),
      disabledForegroundColor: Colors.white.withValues(alpha: 0.34),
      textStyle: textTheme.labelSmall,
    );
  }

  String _formatSize(Size? size) {
    if (size == null) return 'unknown';
    return '${size.width.round()}x${size.height.round()}';
  }
}
