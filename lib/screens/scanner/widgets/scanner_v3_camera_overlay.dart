import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../../services/scanner_v3/convergence_state_v1.dart';
import 'scanner_actions_bar.dart';
import 'scanner_confidence_rail.dart';
import 'scanner_debug_panel.dart';
import 'scanner_frame_guide.dart';
import 'scanner_primary_card_tile.dart';
import 'scanner_shutter_button.dart';
import 'scanner_state_label.dart';

class ScannerV3CameraOverlay extends StatelessWidget {
  const ScannerV3CameraOverlay({
    super.key,
    required this.state,
    required this.guideRect,
    required this.quadPointsNorm,
    required this.focusTapNorm,
    required this.exportEnabled,
    required this.flashEnabled,
    required this.debugExpanded,
    required this.cameraPresetLabel,
    required this.cameraPreviewSize,
    required this.cameraInputSize,
    required this.cameraInitFallbackReason,
    required this.onClose,
    required this.onToggleFlash,
    required this.onToggleDebug,
    required this.onTryAgain,
    required this.onSearchManually,
  });

  final ScannerV3LiveLoopState state;
  final Rect guideRect;
  final List<Offset>? quadPointsNorm;
  final Offset? focusTapNorm;
  final bool exportEnabled;
  final bool flashEnabled;
  final bool debugExpanded;
  final String cameraPresetLabel;
  final Size? cameraPreviewSize;
  final Size? cameraInputSize;
  final String? cameraInitFallbackReason;
  final VoidCallback onClose;
  final VoidCallback onToggleFlash;
  final VoidCallback onToggleDebug;
  final VoidCallback onTryAgain;
  final VoidCallback onSearchManually;

  @override
  Widget build(BuildContext context) {
    final tone = ScannerV3UiTone.fromState(state);
    final edgeLocked = quadPointsNorm != null && quadPointsNorm!.length == 4;
    final locked = state.identityDecisionState == 'identity_locked';
    final padding = MediaQuery.of(context).padding;
    final shutterBottomOffset = tone.showUnknownActions || tone.showRescanAction
        ? 236.0
        : tone.showPrimaryCandidate
        ? 214.0
        : 168.0;

    return Stack(
      fit: StackFit.expand,
      children: [
        IgnorePointer(
          child: ScannerFrameGuide(
            guideRect: guideRect,
            quadPointsNorm: quadPointsNorm,
            focusTapNorm: focusTapNorm,
            accent: tone.accent,
            edgeLocked: edgeLocked,
            locked: locked,
          ),
        ),
        Positioned(
          top: padding.top + 10,
          left: 16,
          right: 16,
          child: _ScannerTopControls(
            tone: tone,
            flashEnabled: flashEnabled,
            onClose: onClose,
            onToggleFlash: onToggleFlash,
          ),
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: padding.bottom + shutterBottomOffset,
          child: Center(
            child: ScannerShutterButton(tone: tone, onPressed: onTryAgain),
          ),
        ),
        Positioned(
          left: 14,
          right: 14,
          bottom: padding.bottom + 14,
          child: _ScannerBottomPanel(
            state: state,
            tone: tone,
            edgeLocked: edgeLocked,
            exportEnabled: exportEnabled,
            debugExpanded: debugExpanded,
            cameraPresetLabel: cameraPresetLabel,
            cameraPreviewSize: cameraPreviewSize,
            cameraInputSize: cameraInputSize,
            cameraInitFallbackReason: cameraInitFallbackReason,
            onToggleDebug: onToggleDebug,
            onTryAgain: onTryAgain,
            onSearchManually: onSearchManually,
          ),
        ),
      ],
    );
  }
}

class _ScannerTopControls extends StatelessWidget {
  const _ScannerTopControls({
    required this.tone,
    required this.flashEnabled,
    required this.onClose,
    required this.onToggleFlash,
  });

  final ScannerV3UiTone tone;
  final bool flashEnabled;
  final VoidCallback onClose;
  final VoidCallback onToggleFlash;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _GlassIconButton(
          icon: Icons.close_rounded,
          tooltip: 'Close scanner',
          onPressed: onClose,
        ),
        Expanded(
          child: Center(child: _TopStatusPill(tone: tone)),
        ),
        _GlassIconButton(
          icon: flashEnabled ? Icons.flash_on_rounded : Icons.flash_off_rounded,
          tooltip: flashEnabled ? 'Flash on' : 'Flash off',
          onPressed: onToggleFlash,
        ),
      ],
    );
  }
}

class _GlassIconButton extends StatelessWidget {
  const _GlassIconButton({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return ClipOval(
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: DecoratedBox(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.black.withValues(alpha: 0.38),
            border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
          ),
          child: IconButton(
            tooltip: tooltip,
            icon: Icon(icon, color: Colors.white, size: 21),
            onPressed: onPressed,
          ),
        ),
      ),
    );
  }
}

class _TopStatusPill extends StatelessWidget {
  const _TopStatusPill({required this.tone});

  final ScannerV3UiTone tone;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return ClipRRect(
      borderRadius: BorderRadius.circular(999),
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.40),
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
    );
  }
}

class _ScannerBottomPanel extends StatelessWidget {
  const _ScannerBottomPanel({
    required this.state,
    required this.tone,
    required this.edgeLocked,
    required this.exportEnabled,
    required this.debugExpanded,
    required this.cameraPresetLabel,
    required this.cameraPreviewSize,
    required this.cameraInputSize,
    required this.cameraInitFallbackReason,
    required this.onToggleDebug,
    required this.onTryAgain,
    required this.onSearchManually,
  });

  final ScannerV3LiveLoopState state;
  final ScannerV3UiTone tone;
  final bool edgeLocked;
  final bool exportEnabled;
  final bool debugExpanded;
  final String cameraPresetLabel;
  final Size? cameraPreviewSize;
  final Size? cameraInputSize;
  final String? cameraInitFallbackReason;
  final VoidCallback onToggleDebug;
  final VoidCallback onTryAgain;
  final VoidCallback onSearchManually;

  @override
  Widget build(BuildContext context) {
    final candidate = state.bestCandidate;
    final candidateId = state.lockedCandidateId ?? state.currentBestCandidateId;

    return AnimatedScale(
      scale: tone.locked ? 1.0 : 0.995,
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOutCubic,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: BackdropFilter(
          filter: ui.ImageFilter.blur(sigmaX: 24, sigmaY: 24),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: const Color(0xE6111216),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withValues(alpha: 0.11)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.36),
                  blurRadius: 30,
                  offset: const Offset(0, 16),
                ),
              ],
            ),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 140, maxHeight: 260),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 15, 16, 14),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _StateOrb(tone: tone),
                        const SizedBox(width: 12),
                        Expanded(child: ScannerStateLabel(tone: tone)),
                        const SizedBox(width: 12),
                        _SignalBadge(label: tone.badge, tone: tone),
                      ],
                    ),
                    if (tone.showPrimaryCandidate) ...[
                      const SizedBox(height: 12),
                      ScannerPrimaryCardTile(
                        candidateId: candidateId,
                        candidateName: candidate?.name,
                        setCode: candidate?.setCode,
                        number: candidate?.number,
                        locked: tone.locked,
                        accent: tone.accent,
                      ),
                    ],
                    const SizedBox(height: 14),
                    ScannerConfidenceRail(
                      value: tone.progress,
                      accent: tone.accent,
                      indeterminate: tone.indeterminateProgress,
                    ),
                    const SizedBox(height: 12),
                    _QualityStrip(
                      state: state,
                      tone: tone,
                      edgeLocked: edgeLocked,
                    ),
                    if (tone.showUnknownActions || tone.showRescanAction) ...[
                      const SizedBox(height: 12),
                      ScannerActionsBar(
                        showUnknownActions: tone.showUnknownActions,
                        showRescanAction: tone.showRescanAction,
                        onTryAgain: onTryAgain,
                        onSearchManually: onSearchManually,
                      ),
                    ],
                    ScannerDebugPanel(
                      state: state,
                      expanded: debugExpanded,
                      exportEnabled: exportEnabled,
                      cameraPresetLabel: cameraPresetLabel,
                      cameraPreviewSize: cameraPreviewSize,
                      cameraInputSize: cameraInputSize,
                      cameraInitFallbackReason: cameraInitFallbackReason,
                      onToggle: onToggleDebug,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _StateOrb extends StatelessWidget {
  const _StateOrb({required this.tone});

  final ScannerV3UiTone tone;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: tone.accent.withValues(alpha: 0.15),
        border: Border.all(color: tone.accent.withValues(alpha: 0.38)),
      ),
      child: SizedBox(
        width: 44,
        height: 44,
        child: Icon(tone.icon, color: tone.accent, size: 22),
      ),
    );
  }
}

class _SignalBadge extends StatelessWidget {
  const _SignalBadge({required this.label, required this.tone});

  final String label;
  final ScannerV3UiTone tone;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: tone.accent.withValues(alpha: 0.13),
        borderRadius: BorderRadius.circular(13),
        border: Border.all(color: tone.accent.withValues(alpha: 0.28)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
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

class _QualityStrip extends StatelessWidget {
  const _QualityStrip({
    required this.state,
    required this.tone,
    required this.edgeLocked,
  });

  final ScannerV3LiveLoopState state;
  final ScannerV3UiTone tone;
  final bool edgeLocked;

  @override
  Widget build(BuildContext context) {
    final glareOk = state.quality.glareRatio < 0.12;
    final brightnessOk =
        state.quality.brightnessScore > 0.18 &&
        state.quality.brightnessScore < 0.86;
    final qualityText = state.sampledFrameCount == 0
        ? 'Position card'
        : state.quality.accepted
        ? 'Image clear'
        : tone.hint;

    return Row(
      children: [
        Expanded(
          child: _QualityChip(
            icon: state.quality.accepted
                ? Icons.check_rounded
                : Icons.pan_tool_alt_rounded,
            label: qualityText,
            active: state.quality.accepted,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _QualityChip(
            icon: edgeLocked ? Icons.crop_free_rounded : Icons.fit_screen,
            label: edgeLocked ? 'Edges locked' : 'Align edges',
            active: edgeLocked,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _QualityChip(
            icon: glareOk && brightnessOk
                ? Icons.light_mode_rounded
                : Icons.flare_rounded,
            label: glareOk && brightnessOk ? 'Light good' : 'Reduce glare',
            active: glareOk && brightnessOk,
          ),
        ),
      ],
    );
  }
}

class _QualityChip extends StatelessWidget {
  const _QualityChip({
    required this.icon,
    required this.label,
    required this.active,
  });

  final IconData icon;
  final String label;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final color = active ? Colors.white : Colors.white.withValues(alpha: 0.62);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: active ? 0.08 : 0.045),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.white.withValues(alpha: active ? 0.13 : 0.07),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 14),
            const SizedBox(width: 5),
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
