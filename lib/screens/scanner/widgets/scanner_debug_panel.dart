import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../../services/scanner_v3/convergence_state_v1.dart';

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
    required this.onToggle,
  });

  final ScannerV3LiveLoopState state;
  final bool expanded;
  final bool exportEnabled;
  final String cameraPresetLabel;
  final Size? cameraPreviewSize;
  final Size? cameraInputSize;
  final String? cameraInitFallbackReason;
  final VoidCallback onToggle;

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
            secondChild: Padding(
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
                  ],
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

  String _formatSize(Size? size) {
    if (size == null) return 'unknown';
    return '${size.width.round()}x${size.height.round()}';
  }
}
