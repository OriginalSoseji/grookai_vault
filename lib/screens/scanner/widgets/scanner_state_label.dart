import 'package:flutter/material.dart';

import '../../../services/scanner_v3/convergence_state_v1.dart';
import '../../../services/scanner_v4/scanner_live_behavior_v1.dart';

class ScannerV3UiTone {
  const ScannerV3UiTone({
    required this.phase,
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

  final ScannerLiveBehaviorPhase phase;
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

  bool get spatialStatusVisible => phase != ScannerLiveBehaviorPhase.searching;

  String get spatialLabel {
    switch (phase) {
      case ScannerLiveBehaviorPhase.searching:
        return '';
      case ScannerLiveBehaviorPhase.aligning:
        return 'Align';
      case ScannerLiveBehaviorPhase.cardPresentPending:
        return 'Hold';
      case ScannerLiveBehaviorPhase.ready:
        return 'Ready';
      case ScannerLiveBehaviorPhase.scanningIdentity:
        return 'Reading';
      case ScannerLiveBehaviorPhase.recognized:
        return 'Card found';
      case ScannerLiveBehaviorPhase.unknown:
        return 'Try again';
      case ScannerLiveBehaviorPhase.blocked:
        return 'Blocked';
    }
  }

  static ScannerV3UiTone fromState(
    ScannerV3LiveLoopState state, {
    bool edgeLocked = false,
  }) {
    final confidence = state.confidenceScore.clamp(0.0, 1.0).toDouble();
    final softPreviewReady = _softPreviewReady(state);
    final behavior = ScannerLiveBehaviorV1.fromLiveLoopState(
      state,
      edgeLocked: edgeLocked,
    );
    switch (behavior.phase) {
      case ScannerLiveBehaviorPhase.blocked:
        return const ScannerV3UiTone(
          phase: ScannerLiveBehaviorPhase.blocked,
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
      case ScannerLiveBehaviorPhase.recognized:
        return ScannerV3UiTone(
          phase: ScannerLiveBehaviorPhase.recognized,
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
      case ScannerLiveBehaviorPhase.unknown:
        return const ScannerV3UiTone(
          phase: ScannerLiveBehaviorPhase.unknown,
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
      case ScannerLiveBehaviorPhase.cardPresentPending:
        return ScannerV3UiTone(
          phase: ScannerLiveBehaviorPhase.cardPresentPending,
          title: 'Hold steady',
          pill: 'Hold steady',
          subtitle: 'Keep the card in frame',
          badge: 'Hold',
          hint: 'Stabilizing',
          icon: Icons.center_focus_strong_rounded,
          accent: const Color(0xFFAEC8FF),
          progress: confidence == 0 ? 0.34 : confidence,
          showPrimaryCandidate: false,
          showUnknownActions: false,
          showRescanAction: false,
          indeterminateProgress: true,
        );
      case ScannerLiveBehaviorPhase.scanningIdentity:
        if (state.identityDecisionState == 'candidate_ambiguous') {
          return ScannerV3UiTone(
            phase: ScannerLiveBehaviorPhase.scanningIdentity,
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
        }
        return ScannerV3UiTone(
          phase: ScannerLiveBehaviorPhase.scanningIdentity,
          title: 'Reading card',
          pill: 'Reading',
          subtitle: softPreviewReady
              ? 'Possible match forming. Hold steady'
              : 'Keep the card inside the frame',
          badge: confidence == 0 ? 'Scan' : '${(confidence * 100).round()}%',
          hint: 'Stabilizing',
          icon: Icons.center_focus_strong_rounded,
          accent: const Color(0xFFAEC8FF),
          progress: confidence == 0 ? 0.42 : confidence,
          showPrimaryCandidate: softPreviewReady,
          showUnknownActions: false,
          showRescanAction: false,
          indeterminateProgress: true,
        );
      case ScannerLiveBehaviorPhase.ready:
        return ScannerV3UiTone(
          phase: ScannerLiveBehaviorPhase.ready,
          title: 'Ready',
          pill: 'Ready',
          subtitle: 'Hold still while reading starts',
          badge: 'Ready',
          hint: 'Hold steady',
          icon: Icons.check_circle_outline_rounded,
          accent: const Color(0xFF7EE7B2),
          progress: confidence == 0 ? 0.40 : confidence,
          showPrimaryCandidate: false,
          showUnknownActions: false,
          showRescanAction: false,
          indeterminateProgress: true,
        );
      case ScannerLiveBehaviorPhase.aligning:
        return ScannerV3UiTone(
          phase: ScannerLiveBehaviorPhase.aligning,
          title: 'Align card',
          pill: 'Live scan',
          subtitle: edgeLocked
              ? 'Keep the full card visible'
              : 'Fill the frame with one card',
          badge: edgeLocked ? 'Align' : 'Scan',
          hint: state.sampledFrameCount == 0 ? 'Position card' : 'Hold steady',
          icon: Icons.crop_free_rounded,
          accent: const Color(0xFFD7DEE8),
          progress: state.quality.accepted ? 0.24 : 0.12,
          showPrimaryCandidate: false,
          showUnknownActions: false,
          showRescanAction: false,
          indeterminateProgress: false,
        );
      case ScannerLiveBehaviorPhase.searching:
        return ScannerV3UiTone(
          phase: ScannerLiveBehaviorPhase.searching,
          title: 'Find a card',
          pill: 'Live scan',
          subtitle: 'Place one card in frame',
          badge: 'Scan',
          hint: 'Position card',
          icon: Icons.crop_free_rounded,
          accent: const Color(0xFFD7DEE8),
          progress: 0.08,
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
