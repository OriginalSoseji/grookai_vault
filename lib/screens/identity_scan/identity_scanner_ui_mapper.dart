import '../../services/identity/identity_scan_service.dart';

enum ScannerUiState {
  idle,
  detecting,
  guidance,
  preview,
  locked,
  exact,
  insufficientEvidence,
}

class ScannerLocalFallbackState {
  const ScannerLocalFallbackState({
    required this.cameraReady,
    required this.isLiveCamera,
    required this.isProcessingCapture,
    required this.cardDetected,
    this.isLocked = false,
    this.guidanceText,
  });

  final bool cameraReady;
  final bool isLiveCamera;
  final bool isProcessingCapture;
  final bool cardDetected;
  final bool isLocked;
  final String? guidanceText;
}

class ScannerPresentationState {
  const ScannerPresentationState({
    required this.state,
    required this.eyebrow,
    required this.title,
    this.subtitle,
    this.supportingText,
    this.guidance,
    this.confidence01,
    this.backendDriven = false,
    this.isLocked = false,
    this.hasExact = false,
  });

  final ScannerUiState state;
  final String eyebrow;
  final String title;
  final String? subtitle;
  final String? supportingText;
  final String? guidance;
  final double? confidence01;
  final bool backendDriven;
  final bool isLocked;
  final bool hasExact;
}

class IdentityScannerUiMapper {
  const IdentityScannerUiMapper._();

  static ScannerPresentationState map({
    required IdentityScanPollResult? backendResult,
    required IdentityScanCandidate? resolvedCandidate,
    required IdentityScanCandidate? topCandidate,
    required ScannerLocalFallbackState local,
  }) {
    final signal = backendResult?.primarySignal;
    final backendGuidance = _translateGuidanceReason(signal?.guidanceReason);
    final previewName = signal?.likelyName ?? topCandidate?.name;
    final previewSet =
        signal?.likelySetName ?? topCandidate?.setName ?? topCandidate?.setCode;
    final previewNumber =
        signal?.exactResultCollectorNumber ?? topCandidate?.number;
    final previewLine = _joinDetailLine(previewSet, previewNumber);

    if (signal?.hasSuccessfulExactResult == true) {
      return ScannerPresentationState(
        state: ScannerUiState.exact,
        eyebrow: 'Ready to add',
        title: signal?.exactResultCardName ?? previewName ?? 'Card found',
        subtitle: _joinDetailLine(
          signal?.exactResultSetName ?? previewSet,
          signal?.exactResultCollectorNumber ?? previewNumber,
        ),
        supportingText: 'This card is ready for the next step.',
        confidence01: signal?.scanConfidence01 ?? signal?.confidence01,
        backendDriven: true,
        isLocked: true,
        hasExact: true,
      );
    }

    if (signal?.hasInsufficientEvidenceResult == true) {
      return ScannerPresentationState(
        state: ScannerUiState.insufficientEvidence,
        eyebrow: 'Need a clearer read',
        title: previewName ?? 'Couldn’t confirm this card yet',
        subtitle: previewSet,
        supportingText:
            'Try a flatter angle with less glare, or send this scan for review.',
        confidence01: signal?.scanConfidence01 ?? signal?.confidence01,
        backendDriven: true,
      );
    }

    if (resolvedCandidate != null) {
      return ScannerPresentationState(
        state: ScannerUiState.exact,
        eyebrow: 'Ready to add',
        title: resolvedCandidate.name ?? previewName ?? 'Card found',
        subtitle: _joinDetailLine(
          resolvedCandidate.setName ?? resolvedCandidate.setCode ?? previewSet,
          resolvedCandidate.number ?? previewNumber,
        ),
        supportingText: 'This card is ready for the next step.',
        confidence01: signal?.scanConfidence01 ?? signal?.confidence01,
        backendDriven: true,
        isLocked: true,
        hasExact: true,
      );
    }

    if (signal?.isLocked == true) {
      return ScannerPresentationState(
        state: ScannerUiState.locked,
        eyebrow: 'Locked on card',
        title:
            signal?.lockedCandidateName ?? previewName ?? 'Reading the print',
        subtitle: previewLine ?? 'Stay steady while Grookai confirms the card.',
        supportingText:
            'Hold the card in place while the exact print is confirmed.',
        confidence01: signal?.scanConfidence01 ?? signal?.confidence01,
        backendDriven: true,
        isLocked: true,
      );
    }

    if (backendGuidance != null) {
      return ScannerPresentationState(
        state: ScannerUiState.guidance,
        eyebrow: 'Scanner',
        title: backendGuidance,
        subtitle: 'Stay centered in the frame for the quickest read.',
        guidance: backendGuidance,
        confidence01: signal?.scanConfidence01 ?? signal?.confidence01,
        backendDriven: true,
      );
    }

    if (backendResult != null) {
      if (backendResult.isFailed) {
        return ScannerPresentationState(
          state: ScannerUiState.insufficientEvidence,
          eyebrow: 'Need a clearer read',
          title: previewName ?? 'Couldn’t confirm this card yet',
          subtitle: previewSet,
          supportingText:
              backendResult.error ??
              'Try a flatter angle with less glare, or send this scan for review.',
          confidence01: signal?.scanConfidence01 ?? signal?.confidence01,
          backendDriven: true,
        );
      }

      if (backendResult.isReady) {
        if ((signal?.hasPreviewHint ?? false) ||
            backendResult.candidates.isNotEmpty) {
          return ScannerPresentationState(
            state: ScannerUiState.preview,
            eyebrow: backendResult.candidates.isNotEmpty
                ? 'Likely match'
                : 'Preview',
            title: previewName ?? 'Looking for a clear match',
            subtitle: previewLine,
            supportingText: backendResult.candidates.length > 1
                ? 'A few likely prints are ready to review.'
                : (backendResult.candidates.isEmpty
                      ? 'Still reading the exact print from the card.'
                      : null),
            confidence01: signal?.scanConfidence01 ?? signal?.confidence01,
            backendDriven: true,
          );
        }

        return ScannerPresentationState(
          state: ScannerUiState.insufficientEvidence,
          eyebrow: 'Need a clearer read',
          title: previewName ?? 'Couldn’t confirm this card yet',
          subtitle: previewSet,
          supportingText:
              backendResult.error ??
              'Try a flatter angle with less glare, or send this scan for review.',
          confidence01: signal?.scanConfidence01 ?? signal?.confidence01,
          backendDriven: true,
        );
      }

      if (backendResult.isPending || local.isProcessingCapture) {
        return ScannerPresentationState(
          state: ScannerUiState.locked,
          eyebrow: 'Locked on card',
          title: 'Reading the print',
          subtitle: 'Stay steady while Grookai confirms the card.',
          supportingText: null,
          confidence01: signal?.scanConfidence01 ?? signal?.confidence01,
          backendDriven: true,
          isLocked: true,
        );
      }
    }

    if (local.guidanceText != null) {
      return ScannerPresentationState(
        state: ScannerUiState.guidance,
        eyebrow: 'Scanner',
        title: local.guidanceText!,
        subtitle: 'Stay centered in the frame for the quickest read.',
        guidance: local.guidanceText,
      );
    }

    if (!local.cameraReady) {
      return const ScannerPresentationState(
        state: ScannerUiState.idle,
        eyebrow: 'Scanner',
        title: 'Point your camera at a card',
        subtitle: 'The scanner will lock automatically when the card is ready.',
      );
    }

    if (local.isLocked) {
      return const ScannerPresentationState(
        state: ScannerUiState.locked,
        eyebrow: 'Locked on card',
        title: 'Reading the print',
        subtitle: 'Stay steady while Grookai confirms the card.',
        isLocked: true,
      );
    }

    if (local.cardDetected || local.isLiveCamera) {
      return const ScannerPresentationState(
        state: ScannerUiState.detecting,
        eyebrow: 'Card detected',
        title: 'Keep the card inside the frame',
        subtitle: 'The scan will continue automatically.',
      );
    }

    return const ScannerPresentationState(
      state: ScannerUiState.idle,
      eyebrow: 'Scanner',
      title: 'Point your camera at a card',
      subtitle: 'The scanner will lock automatically when the card is ready.',
    );
  }

  static String? _translateGuidanceReason(String? rawReason) {
    final normalized = rawReason?.trim().toLowerCase();
    if (normalized == null || normalized.isEmpty) return null;

    switch (normalized) {
      case 'move_closer':
        return 'Move closer';
      case 'hold_steady':
        return 'Hold steady';
      case 'reduce_glare':
        return 'Reduce glare';
      case 'need_full_card':
        return 'Show the full card';
      case 'need_card_text':
        return 'Bring the card into focus';
      case 'low_confidence':
        return 'Adjust the card';
    }

    if (normalized.contains('glare') || normalized.contains('reflect')) {
      return 'Reduce glare';
    }
    if (normalized.contains('steady') ||
        normalized.contains('blur') ||
        normalized.contains('motion')) {
      return 'Hold steady';
    }
    if (normalized.contains('closer') ||
        normalized.contains('small') ||
        normalized.contains('too_far')) {
      return 'Move closer';
    }
    return null;
  }

  static String? _joinDetailLine(String? setName, String? collectorNumber) {
    final parts = <String>[
      if (setName != null && setName.trim().isNotEmpty) setName.trim(),
      if (collectorNumber != null && collectorNumber.trim().isNotEmpty)
        '#${collectorNumber.trim()}',
    ];
    if (parts.isEmpty) return null;
    return parts.join(' • ');
  }
}
