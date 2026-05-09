import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../../services/scanner_v3/convergence_state_v1.dart';
import '../../../services/scanner_v4/scanner_live_behavior_v1.dart';
import '../../../services/scanner_v4/scanner_v4_diagnostic_test_runner_v1.dart';
import 'scanner_actions_bar.dart';
import 'scanner_confidence_rail.dart';
import 'scanner_debug_panel.dart';
import 'scanner_frame_guide.dart';
import 'scanner_primary_card_tile.dart';
import 'scanner_shutter_button.dart';
import 'scanner_state_label.dart';

class ScannerV3ScanMemoryEntry {
  const ScannerV3ScanMemoryEntry({
    required this.candidateId,
    required this.count,
    this.name,
    this.setCode,
    this.number,
    this.imageUrl,
  });

  final String candidateId;
  final int count;
  final String? name;
  final String? setCode;
  final String? number;
  final String? imageUrl;

  String get displayName {
    final trimmed = name?.trim() ?? '';
    return trimmed.isNotEmpty ? trimmed : 'Card';
  }
}

class ScannerV3CameraOverlay extends StatelessWidget {
  const ScannerV3CameraOverlay({
    super.key,
    required this.state,
    required this.guideRect,
    required this.quadPointsNorm,
    required this.quadPointSetsNorm,
    required this.selectedQuadNorm,
    required this.focusTapNorm,
    required this.exportEnabled,
    required this.flashEnabled,
    required this.identityRevealRequested,
    required this.scanMemory,
    required this.debugExpanded,
    required this.cameraPresetLabel,
    required this.cameraPreviewSize,
    required this.cameraInputSize,
    required this.cameraInitFallbackReason,
    required this.cameraStreamFps,
    required this.scannerAnalysisFps,
    required this.scannerLiveLoopFps,
    required this.diagnosticsEnabled,
    required this.diagnosticsFrameCount,
    required this.diagnosticsLastExportPath,
    required this.autoTestStatus,
    required this.onClose,
    required this.onToggleFlash,
    required this.onToggleDebug,
    required this.onShutter,
    required this.onTryAgain,
    required this.onSearchManually,
    required this.onToggleDiagnostics,
    required this.onExportDiagnostics,
    required this.onStartAutoTest,
    required this.onCancelAutoTest,
    required this.onExportAutoTestReport,
  });

  final ScannerV3LiveLoopState state;
  final Rect guideRect;
  final List<Offset>? quadPointsNorm;
  final List<List<Offset>>? quadPointSetsNorm;
  final List<Offset>? selectedQuadNorm;
  final Offset? focusTapNorm;
  final bool exportEnabled;
  final bool flashEnabled;
  final bool identityRevealRequested;
  final List<ScannerV3ScanMemoryEntry> scanMemory;
  final bool debugExpanded;
  final String cameraPresetLabel;
  final Size? cameraPreviewSize;
  final Size? cameraInputSize;
  final String? cameraInitFallbackReason;
  final double? cameraStreamFps;
  final double? scannerAnalysisFps;
  final double? scannerLiveLoopFps;
  final bool diagnosticsEnabled;
  final int diagnosticsFrameCount;
  final String? diagnosticsLastExportPath;
  final ScannerV4DiagnosticTestStatusV1 autoTestStatus;
  final VoidCallback onClose;
  final VoidCallback onToggleFlash;
  final VoidCallback onToggleDebug;
  final VoidCallback onShutter;
  final VoidCallback onTryAgain;
  final VoidCallback onSearchManually;
  final ValueChanged<bool> onToggleDiagnostics;
  final VoidCallback onExportDiagnostics;
  final VoidCallback onStartAutoTest;
  final VoidCallback onCancelAutoTest;
  final VoidCallback onExportAutoTestReport;

  @override
  Widget build(BuildContext context) {
    final rawDetectedCardCount =
        quadPointSetsNorm?.length ?? (quadPointsNorm?.length == 4 ? 1 : 0);
    final cardRegionVisible =
        state.cardPresent ||
        state.identityAllowed ||
        state.cardPresentReason == 'card_present_persistence_pending' ||
        state.identityBlockedReason == 'card_present_persistence_pending' ||
        state.identityDecisionState == 'identity_locked';
    final detectedCardCount = cardRegionVisible ? rawDetectedCardCount : 0;
    final visibleQuadPointsNorm = cardRegionVisible ? quadPointsNorm : null;
    final visibleQuadPointSetsNorm = cardRegionVisible
        ? quadPointSetsNorm
        : null;
    final visibleSelectedQuadNorm = cardRegionVisible ? selectedQuadNorm : null;
    final cardSelectionActive =
        visibleSelectedQuadNorm != null && visibleSelectedQuadNorm.length == 4;
    final edgeLocked = detectedCardCount > 0;
    final tone = ScannerV3UiTone.fromState(
      state,
      edgeLocked: edgeLocked,
      identityRevealRequested: identityRevealRequested,
    );
    final locked =
        identityRevealRequested &&
        state.identityDecisionState == 'identity_locked';
    final padding = MediaQuery.of(context).padding;
    final topInset = padding.top > 0 ? padding.top : 18.0;
    final bottomInset = padding.bottom > 0 ? padding.bottom : 18.0;
    final bottomPanelMaxHeight = _scannerBottomPanelMaxHeight(
      context,
      tone,
      debugExpanded,
      scanMemory.isNotEmpty,
    );
    final shutterBottomOffset = tone.showUnknownActions || tone.showRescanAction
        ? bottomPanelMaxHeight + 22
        : tone.showPrimaryCandidate
        ? bottomPanelMaxHeight + 20
        : bottomPanelMaxHeight + 18;

    return Stack(
      fit: StackFit.expand,
      children: [
        IgnorePointer(
          child: ScannerFrameGuide(
            guideRect: guideRect,
            quadPointsNorm: visibleQuadPointsNorm,
            quadPointSetsNorm: visibleQuadPointSetsNorm,
            selectedQuadNorm: visibleSelectedQuadNorm,
            cardSelectionActive: cardSelectionActive,
            focusTapNorm: focusTapNorm,
            accent: tone.accent,
            edgeLocked: edgeLocked,
            locked: locked,
          ),
        ),
        if (tone.spatialStatusVisible)
          IgnorePointer(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return Stack(
                  fit: StackFit.expand,
                  children: [
                    _ScannerSpatialStatusChip(
                      tone: tone,
                      guideRect: guideRect,
                      quadPointsNorm: visibleQuadPointsNorm,
                      quadPointSetsNorm: visibleQuadPointSetsNorm,
                      safePadding: padding,
                      overlaySize: Size(
                        constraints.maxWidth,
                        constraints.maxHeight,
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        Positioned(
          top: topInset + 12,
          left: 18,
          right: 18,
          child: _ScannerTopControls(
            flashEnabled: flashEnabled,
            onClose: onClose,
            onToggleFlash: onToggleFlash,
          ),
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: bottomInset + shutterBottomOffset,
          child: Center(
            child: ScannerShutterButton(tone: tone, onPressed: onShutter),
          ),
        ),
        Positioned(
          left: 16,
          right: 16,
          bottom: bottomInset + 16,
          child: _ScannerBottomPanel(
            state: state,
            tone: tone,
            edgeLocked: edgeLocked,
            detectedCardCount: detectedCardCount,
            cardSelectionActive: cardSelectionActive,
            scanMemory: scanMemory,
            exportEnabled: exportEnabled,
            debugExpanded: debugExpanded,
            maxHeight: bottomPanelMaxHeight,
            cameraPresetLabel: cameraPresetLabel,
            cameraPreviewSize: cameraPreviewSize,
            cameraInputSize: cameraInputSize,
            cameraInitFallbackReason: cameraInitFallbackReason,
            cameraStreamFps: cameraStreamFps,
            scannerAnalysisFps: scannerAnalysisFps,
            scannerLiveLoopFps: scannerLiveLoopFps,
            diagnosticsEnabled: diagnosticsEnabled,
            diagnosticsFrameCount: diagnosticsFrameCount,
            diagnosticsLastExportPath: diagnosticsLastExportPath,
            autoTestStatus: autoTestStatus,
            onToggleDebug: onToggleDebug,
            onTryAgain: onTryAgain,
            onSearchManually: onSearchManually,
            onToggleDiagnostics: onToggleDiagnostics,
            onExportDiagnostics: onExportDiagnostics,
            onStartAutoTest: onStartAutoTest,
            onCancelAutoTest: onCancelAutoTest,
            onExportAutoTestReport: onExportAutoTestReport,
          ),
        ),
      ],
    );
  }
}

double _scannerBottomPanelMaxHeight(
  BuildContext context,
  ScannerV3UiTone tone,
  bool debugExpanded,
  bool hasScanMemory,
) {
  final screenHeight = MediaQuery.sizeOf(context).height;
  if (debugExpanded) {
    return (screenHeight * 0.62).clamp(360.0, 520.0).toDouble();
  }
  if (tone.showUnknownActions || tone.showRescanAction) {
    return (screenHeight * 0.28).clamp(214.0, 260.0).toDouble();
  }
  if (tone.showPrimaryCandidate) {
    return (screenHeight * 0.30).clamp(224.0, 276.0).toDouble();
  }
  if (hasScanMemory) {
    return (screenHeight * 0.20).clamp(132.0, 176.0).toDouble();
  }
  return (screenHeight * 0.15).clamp(92.0, 126.0).toDouble();
}

class _ScannerSpatialStatusChip extends StatelessWidget {
  const _ScannerSpatialStatusChip({
    required this.tone,
    required this.guideRect,
    required this.quadPointsNorm,
    required this.quadPointSetsNorm,
    required this.safePadding,
    required this.overlaySize,
  });

  final ScannerV3UiTone tone;
  final Rect guideRect;
  final List<Offset>? quadPointsNorm;
  final List<List<Offset>>? quadPointSetsNorm;
  final EdgeInsets safePadding;
  final Size overlaySize;

  @override
  Widget build(BuildContext context) {
    final target = _targetRect();
    final chipWidth = (overlaySize.width - 32).clamp(0.0, 210.0).toDouble();
    if (chipWidth <= 0) return const SizedBox.shrink();

    final left = (target.center.dx - (chipWidth / 2))
        .clamp(16.0, overlaySize.width - chipWidth - 16.0)
        .toDouble();
    final minTop = safePadding.top + 96;
    final topLimit = overlaySize.height - safePadding.bottom - 286;
    final maxTop = topLimit < minTop ? minTop : topLimit;
    final top = (target.top - 52).clamp(minTop, maxTop).toDouble();

    return AnimatedPositioned(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOutCubic,
      left: left,
      top: top,
      width: chipWidth,
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 160),
        switchInCurve: Curves.easeOutCubic,
        switchOutCurve: Curves.easeInCubic,
        child: _ScannerSpatialStatusChipBody(
          key: ValueKey('${tone.phase}:${tone.spatialLabel}'),
          tone: tone,
        ),
      ),
    );
  }

  Rect _targetRect() {
    final pointSets = quadPointSetsNorm;
    final points = pointSets != null && pointSets.isNotEmpty
        ? pointSets.first
        : quadPointsNorm;
    if (points == null || points.length != 4) return guideRect;

    var minX = double.infinity;
    var minY = double.infinity;
    var maxX = double.negativeInfinity;
    var maxY = double.negativeInfinity;
    for (final point in points) {
      final x = point.dx * overlaySize.width;
      final y = point.dy * overlaySize.height;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }

    if (!minX.isFinite ||
        !minY.isFinite ||
        !maxX.isFinite ||
        !maxY.isFinite ||
        maxX <= minX ||
        maxY <= minY) {
      return guideRect;
    }
    return Rect.fromLTRB(minX, minY, maxX, maxY);
  }
}

class _ScannerSpatialStatusChipBody extends StatelessWidget {
  const _ScannerSpatialStatusChipBody({super.key, required this.tone});

  final ScannerV3UiTone tone;

  @override
  Widget build(BuildContext context) {
    return Align(
      child: ClipRRect(
        borderRadius: BorderRadius.circular(999),
        child: BackdropFilter(
          filter: ui.ImageFilter.blur(sigmaX: 18, sigmaY: 18),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.52),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: tone.accent.withValues(alpha: 0.36)),
              boxShadow: [
                BoxShadow(
                  color: tone.accent.withValues(alpha: 0.18),
                  blurRadius: 18,
                  spreadRadius: 1,
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(tone.icon, color: tone.accent, size: 15),
                  const SizedBox(width: 7),
                  Flexible(
                    child: Text(
                      tone.spatialLabel,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
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

class _ScannerTopControls extends StatelessWidget {
  const _ScannerTopControls({
    required this.flashEnabled,
    required this.onClose,
    required this.onToggleFlash,
  });

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
        const Spacer(),
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
        filter: ui.ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: DecoratedBox(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.black.withValues(alpha: 0.26),
            border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
          ),
          child: SizedBox(
            width: 44,
            height: 44,
            child: IconButton(
              tooltip: tooltip,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints.tightFor(width: 44, height: 44),
              icon: Icon(icon, color: Colors.white, size: 20),
              onPressed: onPressed,
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
    required this.detectedCardCount,
    required this.cardSelectionActive,
    required this.scanMemory,
    required this.exportEnabled,
    required this.debugExpanded,
    required this.maxHeight,
    required this.cameraPresetLabel,
    required this.cameraPreviewSize,
    required this.cameraInputSize,
    required this.cameraInitFallbackReason,
    required this.cameraStreamFps,
    required this.scannerAnalysisFps,
    required this.scannerLiveLoopFps,
    required this.diagnosticsEnabled,
    required this.diagnosticsFrameCount,
    required this.diagnosticsLastExportPath,
    required this.autoTestStatus,
    required this.onToggleDebug,
    required this.onTryAgain,
    required this.onSearchManually,
    required this.onToggleDiagnostics,
    required this.onExportDiagnostics,
    required this.onStartAutoTest,
    required this.onCancelAutoTest,
    required this.onExportAutoTestReport,
  });

  final ScannerV3LiveLoopState state;
  final ScannerV3UiTone tone;
  final bool edgeLocked;
  final int detectedCardCount;
  final bool cardSelectionActive;
  final List<ScannerV3ScanMemoryEntry> scanMemory;
  final bool exportEnabled;
  final bool debugExpanded;
  final double maxHeight;
  final String cameraPresetLabel;
  final Size? cameraPreviewSize;
  final Size? cameraInputSize;
  final String? cameraInitFallbackReason;
  final double? cameraStreamFps;
  final double? scannerAnalysisFps;
  final double? scannerLiveLoopFps;
  final bool diagnosticsEnabled;
  final int diagnosticsFrameCount;
  final String? diagnosticsLastExportPath;
  final ScannerV4DiagnosticTestStatusV1 autoTestStatus;
  final VoidCallback onToggleDebug;
  final VoidCallback onTryAgain;
  final VoidCallback onSearchManually;
  final ValueChanged<bool> onToggleDiagnostics;
  final VoidCallback onExportDiagnostics;
  final VoidCallback onStartAutoTest;
  final VoidCallback onCancelAutoTest;
  final VoidCallback onExportAutoTestReport;

  @override
  Widget build(BuildContext context) {
    final candidate = state.bestCandidate;
    final candidateId = state.lockedCandidateId ?? state.currentBestCandidateId;
    final showScanMemory = scanMemory.isNotEmpty;
    final showActions = tone.showUnknownActions || tone.showRescanAction;
    final compactDock =
        !debugExpanded &&
        !tone.showPrimaryCandidate &&
        !showActions &&
        !showScanMemory;
    final panelRadius = compactDock ? 999.0 : 28.0;
    final panelMaxWidth = compactDock
        ? 312.0
        : MediaQuery.sizeOf(context).width;
    final panelLayoutKey = tone.showPrimaryCandidate
        ? 'candidate'
        : showActions
        ? 'actions'
        : debugExpanded
        ? 'debug'
        : showScanMemory
        ? 'memory'
        : compactDock
        ? 'compact'
        : 'status';

    return GestureDetector(
      onLongPress: onToggleDebug,
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 220),
        switchInCurve: Curves.easeOutCubic,
        switchOutCurve: Curves.easeInCubic,
        child: Align(
          key: ValueKey(panelLayoutKey),
          alignment: Alignment.bottomCenter,
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: panelMaxWidth),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(panelRadius),
              child: BackdropFilter(
                filter: ui.ImageFilter.blur(sigmaX: 30, sigmaY: 30),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: const Color(0xCC101115),
                    borderRadius: BorderRadius.circular(panelRadius),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.10),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.42),
                        blurRadius: compactDock ? 28 : 36,
                        offset: Offset(0, compactDock ? 12 : 18),
                      ),
                    ],
                  ),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: compactDock
                          ? 58
                          : tone.showPrimaryCandidate
                          ? 188
                          : showActions
                          ? 176
                          : showScanMemory
                          ? 124
                          : 86,
                      maxHeight: maxHeight,
                    ),
                    child: Padding(
                      padding: compactDock
                          ? const EdgeInsets.fromLTRB(12, 11, 16, 11)
                          : const EdgeInsets.fromLTRB(16, 14, 16, 14),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (tone.showPrimaryCandidate)
                            ScannerPrimaryCardTile(
                              candidateId: candidateId,
                              candidateName: candidate?.name,
                              setCode: candidate?.setCode,
                              number: candidate?.number,
                              imageUrl: candidate?.imageUrl,
                              locked: tone.locked,
                              accent: tone.accent,
                            )
                          else
                            _ScannerDockHeader(
                              tone: tone,
                              compact: compactDock,
                            ),
                          if (!debugExpanded && tone.indeterminateProgress) ...[
                            const SizedBox(height: 10),
                            ScannerConfidenceRail(
                              value: tone.progress,
                              accent: tone.accent,
                              indeterminate: true,
                            ),
                          ],
                          if (showActions) ...[
                            const SizedBox(height: 12),
                            ScannerActionsBar(
                              showUnknownActions: tone.showUnknownActions,
                              showRescanAction: tone.showRescanAction,
                              onTryAgain: onTryAgain,
                              onSearchManually: onSearchManually,
                            ),
                          ],
                          if (showScanMemory) ...[
                            const SizedBox(height: 12),
                            _ScanMemoryStrip(entries: scanMemory),
                          ],
                          if (debugExpanded) ...[
                            const SizedBox(height: 12),
                            _QualityStrip(
                              state: state,
                              tone: tone,
                              edgeLocked: edgeLocked,
                              detectedCardCount: detectedCardCount,
                              cardSelectionActive: cardSelectionActive,
                            ),
                            ScannerDebugPanel(
                              state: state,
                              expanded: debugExpanded,
                              exportEnabled: exportEnabled,
                              cameraPresetLabel: cameraPresetLabel,
                              cameraPreviewSize: cameraPreviewSize,
                              cameraInputSize: cameraInputSize,
                              cameraInitFallbackReason:
                                  cameraInitFallbackReason,
                              cameraStreamFps: cameraStreamFps,
                              scannerAnalysisFps: scannerAnalysisFps,
                              scannerLiveLoopFps: scannerLiveLoopFps,
                              diagnosticsEnabled: diagnosticsEnabled,
                              diagnosticsFrameCount: diagnosticsFrameCount,
                              diagnosticsLastExportPath:
                                  diagnosticsLastExportPath,
                              autoTestStatus: autoTestStatus,
                              onToggle: onToggleDebug,
                              onToggleDiagnostics: onToggleDiagnostics,
                              onExportDiagnostics: onExportDiagnostics,
                              onStartAutoTest: onStartAutoTest,
                              onCancelAutoTest: onCancelAutoTest,
                              onExportAutoTestReport: onExportAutoTestReport,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
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
  const _StateOrb({required this.tone, this.compact = false});

  final ScannerV3UiTone tone;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: tone.accent.withValues(alpha: 0.15),
        border: Border.all(color: tone.accent.withValues(alpha: 0.38)),
      ),
      child: SizedBox(
        width: compact ? 34 : 40,
        height: compact ? 34 : 40,
        child: Icon(tone.icon, color: tone.accent, size: compact ? 18 : 20),
      ),
    );
  }
}

class _ScannerDockHeader extends StatelessWidget {
  const _ScannerDockHeader({required this.tone, this.compact = false});

  final ScannerV3UiTone tone;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    if (compact) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          _StateOrb(tone: tone, compact: true),
          const SizedBox(width: 11),
          Expanded(
            child: Text(
              tone.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                letterSpacing: 0,
              ),
            ),
          ),
        ],
      );
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        _StateOrb(tone: tone, compact: compact),
        SizedBox(width: compact ? 11 : 13),
        Expanded(child: ScannerStateLabel(tone: tone)),
      ],
    );
  }
}

class _ScanMemoryStrip extends StatelessWidget {
  const _ScanMemoryStrip({required this.entries});

  final List<ScannerV3ScanMemoryEntry> entries;

  @override
  Widget build(BuildContext context) {
    final visibleEntries = entries.take(8).toList(growable: false);
    return SizedBox(
      height: 48,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: visibleEntries.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final entry = visibleEntries[index];
          return Tooltip(
            message: entry.displayName,
            child: _ScanMemoryThumb(entry: entry),
          );
        },
      ),
    );
  }
}

class _ScanMemoryThumb extends StatelessWidget {
  const _ScanMemoryThumb({required this.entry});

  final ScannerV3ScanMemoryEntry entry;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 35,
      height: 48,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned.fill(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(7),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.08),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.14),
                  ),
                ),
                child: _ScanMemoryImage(entry: entry),
              ),
            ),
          ),
          if (entry.count > 1)
            Positioned(
              right: -4,
              top: -4,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.32),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(4),
                  child: Text(
                    '${entry.count}',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: const Color(0xFF101114),
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ScanMemoryImage extends StatelessWidget {
  const _ScanMemoryImage({required this.entry});

  final ScannerV3ScanMemoryEntry entry;

  @override
  Widget build(BuildContext context) {
    final imageUrl = entry.imageUrl?.trim() ?? '';
    if (imageUrl.isEmpty) return _fallback(context);
    return Image.network(
      imageUrl,
      fit: BoxFit.cover,
      width: double.infinity,
      height: double.infinity,
      cacheWidth: 96,
      cacheHeight: 132,
      filterQuality: FilterQuality.low,
      gaplessPlayback: true,
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) return child;
        return _fallback(context);
      },
      errorBuilder: (context, error, stackTrace) => _fallback(context),
    );
  }

  Widget _fallback(BuildContext context) {
    final initial = entry.displayName.isEmpty
        ? '?'
        : entry.displayName[0].toUpperCase();
    return Center(
      child: Text(
        initial,
        style: Theme.of(context).textTheme.titleMedium?.copyWith(
          color: Colors.white.withValues(alpha: 0.86),
          fontWeight: FontWeight.w900,
          letterSpacing: 0,
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
    required this.detectedCardCount,
    required this.cardSelectionActive,
  });

  final ScannerV3LiveLoopState state;
  final ScannerV3UiTone tone;
  final bool edgeLocked;
  final int detectedCardCount;
  final bool cardSelectionActive;

  @override
  Widget build(BuildContext context) {
    final confirmedFrame =
        state.cardPresent ||
        state.identityAllowed ||
        tone.phase == ScannerLiveBehaviorPhase.ready ||
        tone.phase == ScannerLiveBehaviorPhase.scanningIdentity ||
        tone.phase == ScannerLiveBehaviorPhase.recognized;
    final glareOk = state.quality.glareRatio < 0.12;
    final brightnessOk =
        state.quality.brightnessScore > 0.18 &&
        state.quality.brightnessScore < 0.86;
    final qualityActive = state.quality.accepted && confirmedFrame;
    final qualityText = state.sampledFrameCount == 0
        ? 'Place'
        : qualityActive
        ? 'Clear'
        : 'Align';
    final frameText = cardSelectionActive
        ? 'Selected'
        : edgeLocked && confirmedFrame
        ? detectedCardCount > 1
              ? '$detectedCardCount framed'
              : 'Framed'
        : 'Edges';

    return Row(
      children: [
        Expanded(
          child: _QualityChip(
            icon: qualityActive
                ? Icons.check_rounded
                : Icons.pan_tool_alt_rounded,
            label: qualityText,
            active: qualityActive,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _QualityChip(
            icon: edgeLocked ? Icons.crop_free_rounded : Icons.fit_screen,
            label: frameText,
            active: edgeLocked && confirmedFrame,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _QualityChip(
            icon: glareOk && brightnessOk
                ? Icons.light_mode_rounded
                : Icons.flare_rounded,
            label: glareOk && brightnessOk ? 'Light' : 'Glare',
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
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: Colors.white.withValues(alpha: active ? 0.13 : 0.07),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
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
