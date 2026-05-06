import 'package:flutter/material.dart';

import '../../../services/scanner_v3/convergence_state_v1.dart';

class ScannerV3UiTone {
  const ScannerV3UiTone({
    required this.title,
    required this.pill,
    required this.subtitle,
    required this.badge,
    required this.hint,
    required this.icon,
    required this.accent,
    required this.progress,
    required this.showPrimaryCandidate,
    required this.showUnknownActions,
    required this.showRescanAction,
    required this.indeterminateProgress,
  });

  final String title;
  final String pill;
  final String subtitle;
  final String badge;
  final String hint;
  final IconData icon;
  final Color accent;
  final double progress;
  final bool showPrimaryCandidate;
  final bool showUnknownActions;
  final bool showRescanAction;
  final bool indeterminateProgress;

  bool get locked => pill == 'Locked';

  static ScannerV3UiTone fromState(ScannerV3LiveLoopState state) {
    final confidence = state.confidenceScore.clamp(0.0, 1.0).toDouble();
    final softPreviewReady = _softPreviewReady(state);
    if (state.identityServiceUnavailable) {
      return const ScannerV3UiTone(
        title: 'Scanner identity service unavailable',
        pill: 'Offline',
        subtitle: 'Start the local identity service to show matches',
        badge: 'Setup',
        hint: 'Open Diagnostics',
        icon: Icons.cloud_off_rounded,
        accent: Color(0xFFFFC46B),
        progress: 0.0,
        showPrimaryCandidate: false,
        showUnknownActions: true,
        showRescanAction: false,
        indeterminateProgress: false,
      );
    }
    switch (state.identityDecisionState) {
      case 'identity_locked':
        return ScannerV3UiTone(
          title: 'Card found',
          pill: 'Locked',
          subtitle: 'Ready to review',
          badge: '${(confidence * 100).round()}%',
          hint: 'Match confirmed',
          icon: Icons.check_circle_rounded,
          accent: const Color(0xFF7EE7B2),
          progress: confidence,
          showPrimaryCandidate: true,
          showUnknownActions: false,
          showRescanAction: true,
          indeterminateProgress: false,
        );
      case 'candidate_unknown':
        return const ScannerV3UiTone(
          title: 'No confident match',
          pill: 'Search available',
          subtitle: 'Try again or search manually',
          badge: 'Review',
          hint: 'No final identity shown',
          icon: Icons.help_outline_rounded,
          accent: Color(0xFFF2C76E),
          progress: 0.38,
          showPrimaryCandidate: false,
          showUnknownActions: true,
          showRescanAction: false,
          indeterminateProgress: false,
        );
      case 'candidate_ambiguous':
        return ScannerV3UiTone(
          title: 'Need a clearer angle',
          pill: 'Hold steady',
          subtitle: 'Reduce glare and keep the card flat',
          badge: 'Adjust',
          hint: _hintForQuality(state),
          icon: Icons.tune_rounded,
          accent: const Color(0xFFFFD37A),
          progress: confidence == 0 ? 0.48 : confidence,
          showPrimaryCandidate: false,
          showUnknownActions: false,
          showRescanAction: false,
          indeterminateProgress: true,
        );
      case 'candidate_unstable':
        return ScannerV3UiTone(
          title: 'Reading card',
          pill: 'Reading',
          subtitle: softPreviewReady
              ? 'Possible match forming. Hold steady'
              : 'Keep the card inside the frame',
          badge: '${(confidence * 100).round()}%',
          hint: 'Stabilizing',
          icon: Icons.center_focus_strong_rounded,
          accent: const Color(0xFFAEC8FF),
          progress: confidence == 0 ? 0.32 : confidence,
          showPrimaryCandidate: softPreviewReady,
          showUnknownActions: false,
          showRescanAction: false,
          indeterminateProgress: true,
        );
      default:
        return ScannerV3UiTone(
          title: 'Align card',
          pill: 'Live scan',
          subtitle: 'Fill the frame with one card',
          badge: 'Ready',
          hint: state.sampledFrameCount == 0 ? 'Position card' : 'Hold steady',
          icon: Icons.crop_free_rounded,
          accent: const Color(0xFFD7DEE8),
          progress: state.quality.accepted ? 0.26 : 0.10,
          showPrimaryCandidate: false,
          showUnknownActions: false,
          showRescanAction: false,
          indeterminateProgress: false,
        );
    }
  }

  static bool _softPreviewReady(ScannerV3LiveLoopState state) {
    if (state.bestCandidate == null) return false;
    if (state.identityDecisionState != 'candidate_unstable') return false;
    if (state.identityCropSupportCount < 2) return false;
    if (state.identityRecentFrameSupportCount < 2) return false;
    if (state.identityTopCandidateScore < 1.2) return false;
    if (state.identityScoreGap < 0.45) return false;
    final distance = state.identityTopDistance;
    if (distance == null || distance > 0.195) return false;
    return true;
  }

  static String _hintForQuality(ScannerV3LiveLoopState state) {
    final reasons = state.quality.rejectionReasons.join(' ').toLowerCase();
    if (reasons.contains('glare') || reasons.contains('bright')) {
      return 'Reduce glare';
    }
    if (reasons.contains('dark')) return 'More light';
    return 'Hold steady';
  }
}

class ScannerStateLabel extends StatelessWidget {
  const ScannerStateLabel({super.key, required this.tone});

  final ScannerV3UiTone tone;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 180),
          switchInCurve: Curves.easeOutCubic,
          switchOutCurve: Curves.easeInCubic,
          transitionBuilder: (child, animation) {
            return FadeTransition(
              opacity: animation,
              child: SlideTransition(
                position: Tween<Offset>(
                  begin: const Offset(0, 0.10),
                  end: Offset.zero,
                ).animate(animation),
                child: child,
              ),
            );
          },
          child: Text(
            tone.title,
            key: ValueKey(tone.title),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: textTheme.titleMedium?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              letterSpacing: 0,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          tone.subtitle,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: textTheme.bodySmall?.copyWith(
            color: Colors.white.withValues(alpha: 0.72),
            height: 1.2,
            letterSpacing: 0,
          ),
        ),
      ],
    );
  }
}
