import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../../services/scanner_v3/convergence_state_v1.dart';

class ScannerV3CameraOverlay extends StatelessWidget {
  const ScannerV3CameraOverlay({
    super.key,
    required this.state,
    required this.guideRect,
    required this.quadPointsNorm,
    required this.focusTapNorm,
    required this.exportEnabled,
    required this.debugExpanded,
    required this.onToggleDebug,
    required this.onTryAgain,
    required this.onSearchManually,
  });

  final ScannerV3LiveLoopState state;
  final Rect guideRect;
  final List<Offset>? quadPointsNorm;
  final Offset? focusTapNorm;
  final bool exportEnabled;
  final bool debugExpanded;
  final VoidCallback onToggleDebug;
  final VoidCallback onTryAgain;
  final VoidCallback onSearchManually;

  @override
  Widget build(BuildContext context) {
    final tone = _ScannerV3Tone.fromState(state);

    return Stack(
      fit: StackFit.expand,
      children: [
        IgnorePointer(
          child: CustomPaint(
            painter: _ScannerV3GuidePainter(
              guideRect: guideRect,
              quadPointsNorm: quadPointsNorm,
              focusTapNorm: focusTapNorm,
              accent: tone.accent,
              locked: state.identityDecisionState == 'identity_locked',
            ),
          ),
        ),
        Positioned(
          top: 14,
          left: 16,
          right: 16,
          child: IgnorePointer(child: _TopStatusPill(tone: tone)),
        ),
        Positioned(
          left: 14,
          right: 14,
          bottom: 14,
          child: _BottomGlassPanel(
            state: state,
            tone: tone,
            exportEnabled: exportEnabled,
            debugExpanded: debugExpanded,
            onToggleDebug: onToggleDebug,
            onTryAgain: onTryAgain,
            onSearchManually: onSearchManually,
          ),
        ),
      ],
    );
  }
}

class _TopStatusPill extends StatelessWidget {
  const _TopStatusPill({required this.tone});

  final _ScannerV3Tone tone;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Align(
      alignment: Alignment.center,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(999),
        child: BackdropFilter(
          filter: ui.ImageFilter.blur(sigmaX: 18, sigmaY: 18),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.42),
              border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(tone.icon, size: 15, color: tone.accent),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      tone.pill,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: textTheme.labelMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BottomGlassPanel extends StatelessWidget {
  const _BottomGlassPanel({
    required this.state,
    required this.tone,
    required this.exportEnabled,
    required this.debugExpanded,
    required this.onToggleDebug,
    required this.onTryAgain,
    required this.onSearchManually,
  });

  final ScannerV3LiveLoopState state;
  final _ScannerV3Tone tone;
  final bool exportEnabled;
  final bool debugExpanded;
  final VoidCallback onToggleDebug;
  final VoidCallback onTryAgain;
  final VoidCallback onSearchManually;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final candidate = _displayCandidate(
      state.lockedCandidateId ?? state.currentBestCandidateId,
    );
    final confidence = (state.confidenceScore * 100).clamp(0, 100).round();

    return ClipRRect(
      borderRadius: BorderRadius.circular(22),
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 22, sigmaY: 22),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: const Color(0xE6121317),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: Colors.white.withValues(alpha: 0.11)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.34),
                blurRadius: 28,
                offset: const Offset(0, 14),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _StateOrb(tone: tone),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            tone.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: textTheme.titleMedium?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            tone.subtitle(candidate),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: textTheme.bodySmall?.copyWith(
                              color: Colors.white.withValues(alpha: 0.72),
                              height: 1.2,
                              letterSpacing: 0,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    _ConfidenceBadge(
                      confidence: confidence,
                      accent: tone.accent,
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                _ConfidenceRail(
                  value: state.confidenceScore.clamp(0.0, 1.0).toDouble(),
                  accent: tone.accent,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: onTryAgain,
                        icon: const Icon(Icons.refresh, size: 18),
                        label: const Text('Try again'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: BorderSide(
                            color: Colors.white.withValues(alpha: 0.22),
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: onSearchManually,
                        icon: const Icon(Icons.search, size: 18),
                        label: const Text('Search manually'),
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF111217),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                  ],
                ),
                if (kDebugMode) ...[
                  const SizedBox(height: 10),
                  _DebugDisclosure(
                    state: state,
                    expanded: debugExpanded,
                    exportEnabled: exportEnabled,
                    onToggle: onToggleDebug,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _displayCandidate(String? id) {
    if (id == null || id.isEmpty) return 'candidate';
    if (id.length <= 14) return id;
    return '${id.substring(0, 8)}...${id.substring(id.length - 4)}';
  }
}

class _StateOrb extends StatelessWidget {
  const _StateOrb({required this.tone});

  final _ScannerV3Tone tone;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: tone.accent.withValues(alpha: 0.16),
        border: Border.all(color: tone.accent.withValues(alpha: 0.42)),
      ),
      child: SizedBox(
        width: 44,
        height: 44,
        child: Icon(tone.icon, color: tone.accent, size: 22),
      ),
    );
  }
}

class _ConfidenceBadge extends StatelessWidget {
  const _ConfidenceBadge({required this.confidence, required this.accent});

  final int confidence;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(13),
        border: Border.all(color: accent.withValues(alpha: 0.30)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        child: Text(
          '$confidence%',
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w800,
            letterSpacing: 0,
          ),
        ),
      ),
    );
  }
}

class _ConfidenceRail extends StatelessWidget {
  const _ConfidenceRail({required this.value, required this.accent});

  final double value;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(999),
      child: SizedBox(
        height: 5,
        child: Stack(
          fit: StackFit.expand,
          children: [
            ColoredBox(color: Colors.white.withValues(alpha: 0.09)),
            FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: value,
              child: ColoredBox(color: accent),
            ),
          ],
        ),
      ),
    );
  }
}

class _DebugDisclosure extends StatelessWidget {
  const _DebugDisclosure({
    required this.state,
    required this.expanded,
    required this.exportEnabled,
    required this.onToggle,
  });

  final ScannerV3LiveLoopState state;
  final bool expanded;
  final bool exportEnabled;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
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
                    'V8',
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
                    _debugLine(
                      'decision',
                      '${state.identityDecisionState}  gap ${state.identityScoreGap.toStringAsFixed(2)}  top ${state.identityTopCandidateScore.toStringAsFixed(2)}',
                    ),
                    _debugLine(
                      'support',
                      'crops ${state.identityCropSupportCount}  recent ${state.identityRecentFrameSupportCount}  dist ${state.identityTopDistance?.toStringAsFixed(3) ?? "n/a"}',
                    ),
                    _debugLine(
                      'frames',
                      '${state.acceptedFrameCount} accepted / ${state.rejectedFrameCount} rejected',
                    ),
                    _debugLine(
                      'quality',
                      'blur ${state.quality.blurScore.toStringAsFixed(3)}  bright ${state.quality.brightnessScore.toStringAsFixed(2)}  glare ${state.quality.glareRatio.toStringAsFixed(2)}',
                    ),
                    _debugLine(
                      'timing',
                      'embed ${state.embeddingElapsedMs ?? -1}ms  vector ${state.vectorSearchElapsedMs ?? -1}ms  export ${exportEnabled ? "on" : "off"}',
                    ),
                    _debugLine(
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

  Widget _debugLine(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(top: 5),
      child: Text(
        '$label: $value',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
}

class _ScannerV3GuidePainter extends CustomPainter {
  _ScannerV3GuidePainter({
    required this.guideRect,
    required this.quadPointsNorm,
    required this.focusTapNorm,
    required this.accent,
    required this.locked,
  });

  final Rect guideRect;
  final List<Offset>? quadPointsNorm;
  final Offset? focusTapNorm;
  final Color accent;
  final bool locked;

  @override
  void paint(Canvas canvas, Size size) {
    final overlay = Paint()..color = Colors.black.withValues(alpha: 0.30);
    final fullPath = Path()..addRect(Offset.zero & size);
    final guidePath = Path()
      ..addRRect(RRect.fromRectAndRadius(guideRect, const Radius.circular(24)));
    canvas.drawPath(
      Path.combine(PathOperation.difference, fullPath, guidePath),
      overlay,
    );

    final glowPaint = Paint()
      ..color = accent.withValues(alpha: locked ? 0.36 : 0.18)
      ..style = PaintingStyle.stroke
      ..strokeWidth = locked ? 4 : 3
      ..maskFilter = ui.MaskFilter.blur(ui.BlurStyle.outer, locked ? 9 : 5);
    canvas.drawRRect(
      RRect.fromRectAndRadius(guideRect, const Radius.circular(24)),
      glowPaint,
    );

    final borderPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.18)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;
    canvas.drawRRect(
      RRect.fromRectAndRadius(guideRect, const Radius.circular(24)),
      borderPaint,
    );

    final cornerPaint = Paint()
      ..color = accent.withValues(alpha: locked ? 0.96 : 0.78)
      ..style = PaintingStyle.stroke
      ..strokeWidth = locked ? 4 : 3
      ..strokeCap = StrokeCap.round;
    final corner = (guideRect.width * 0.13).clamp(26.0, 48.0);
    _drawCorner(canvas, cornerPaint, guideRect.topLeft, corner, true, true);
    _drawCorner(canvas, cornerPaint, guideRect.topRight, corner, false, true);
    _drawCorner(
      canvas,
      cornerPaint,
      guideRect.bottomRight,
      corner,
      false,
      false,
    );
    _drawCorner(canvas, cornerPaint, guideRect.bottomLeft, corner, true, false);

    final points = quadPointsNorm;
    if (points != null && points.length == 4) {
      final quadPath = Path();
      for (var i = 0; i < points.length; i += 1) {
        final point = Offset(
          points[i].dx * size.width,
          points[i].dy * size.height,
        );
        if (i == 0) {
          quadPath.moveTo(point.dx, point.dy);
        } else {
          quadPath.lineTo(point.dx, point.dy);
        }
      }
      quadPath.close();
      final quadPaint = Paint()
        ..color = accent.withValues(alpha: 0.62)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2;
      canvas.drawPath(quadPath, quadPaint);
    }

    final focus = focusTapNorm;
    if (focus != null) {
      final center = Offset(focus.dx * size.width, focus.dy * size.height);
      final focusPaint = Paint()
        ..color = Colors.white.withValues(alpha: 0.82)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.4;
      canvas.drawCircle(center, 18, focusPaint);
      canvas.drawCircle(center, 3, focusPaint);
    }
  }

  void _drawCorner(
    Canvas canvas,
    Paint paint,
    Offset point,
    double length,
    bool left,
    bool top,
  ) {
    final xDir = left ? 1.0 : -1.0;
    final yDir = top ? 1.0 : -1.0;
    canvas.drawLine(point, Offset(point.dx + (length * xDir), point.dy), paint);
    canvas.drawLine(point, Offset(point.dx, point.dy + (length * yDir)), paint);
  }

  @override
  bool shouldRepaint(covariant _ScannerV3GuidePainter oldDelegate) {
    return oldDelegate.guideRect != guideRect ||
        oldDelegate.quadPointsNorm != quadPointsNorm ||
        oldDelegate.focusTapNorm != focusTapNorm ||
        oldDelegate.accent != accent ||
        oldDelegate.locked != locked;
  }
}

class _ScannerV3Tone {
  const _ScannerV3Tone({
    required this.title,
    required this.pill,
    required this.subtitle,
    required this.icon,
    required this.accent,
  });

  final String title;
  final String pill;
  final String Function(String candidate) subtitle;
  final IconData icon;
  final Color accent;

  static _ScannerV3Tone fromState(ScannerV3LiveLoopState state) {
    switch (state.identityDecisionState) {
      case 'identity_locked':
        return _ScannerV3Tone(
          title: 'Locked',
          pill: 'Card locked',
          subtitle: (candidate) => 'Matched $candidate',
          icon: Icons.lock_rounded,
          accent: const Color(0xFF7EE7B2),
        );
      case 'candidate_unknown':
        return _ScannerV3Tone(
          title: 'No confident match',
          pill: 'Not enough evidence',
          subtitle: (_) => 'Try again or search manually.',
          icon: Icons.help_outline_rounded,
          accent: const Color(0xFFF2C76E),
        );
      case 'candidate_ambiguous':
        return _ScannerV3Tone(
          title: 'Need another angle',
          pill: 'Signal is close',
          subtitle: (_) => 'Tilt slightly and hold steady.',
          icon: Icons.compare_arrows_rounded,
          accent: const Color(0xFFFFD37A),
        );
      case 'candidate_unstable':
        return _ScannerV3Tone(
          title: 'Hold steady',
          pill: 'Stabilizing',
          subtitle: (_) => 'Keep the card inside the frame.',
          icon: Icons.radar_rounded,
          accent: const Color(0xFFAEC8FF),
        );
      default:
        return _ScannerV3Tone(
          title: 'Scanning',
          pill: 'Align card',
          subtitle: (_) => 'Center the card and fill the guide.',
          icon: Icons.center_focus_strong_rounded,
          accent: const Color(0xFFD7DEE8),
        );
    }
  }
}
