import 'package:flutter/material.dart';

import '../../../card_detail_screen.dart';
import '../../../services/identity/catalog_artwork_resolution.dart';
import '../../../services/identity/display_identity.dart';
import '../../../services/scanner_v5/scanner_v5_identity_service.dart';
import '../../../widgets/card_surface_artwork.dart';
import '../../../theme/gv_tokens.dart';
import 'scanner_candidate_row.dart';

class ScannerResultSheet extends StatelessWidget {
  const ScannerResultSheet({
    required this.result,
    required this.addingToVault,
    required this.onAddCandidate,
    required this.onDismiss,
    required this.onRetake,
    required this.onShowAlternates,
    required this.showExactAlternates,
    this.onViewCandidate,
    super.key,
  });

  final ScannerV5IdentifyResult result;
  final bool addingToVault;
  final ValueChanged<ScannerV5Candidate> onAddCandidate;
  final VoidCallback onDismiss;
  final VoidCallback onRetake;
  final VoidCallback onShowAlternates;
  final bool showExactAlternates;
  final ValueChanged<ScannerV5Candidate>? onViewCandidate;

  void _viewCard(BuildContext context, ScannerV5Candidate candidate) {
    if (addingToVault) return;
    if (onViewCandidate != null) {
      onViewCandidate!(candidate);
      return;
    }
    // A scan resolves the canonical parent, not a finish or condition.
    Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => CardDetailScreen(
          cardPrintId: candidate.vaultCardPrintId,
          gvId: candidate.gvId,
          name: candidate.name,
          setCode: candidate.setCode,
          number: candidate.number,
          imageUrl: candidate.imageUrl,
          entrySurface: 'scanner',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final candidates = result.candidates;
    if (candidates.isEmpty) {
      return const SizedBox.shrink();
    }
    final isExact = result.mode == 'ocr_exact';
    final colors = Theme.of(context).colorScheme;
    return AnimatedSlide(
      duration: const Duration(milliseconds: 240),
      curve: Curves.easeOut,
      offset: Offset.zero,
      child: Align(
        alignment: Alignment.bottomCenter,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: colors.surfaceContainerLow,
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(GvRadii.floating),
            ),
            border: Border(top: BorderSide(color: colors.outlineVariant)),
          ),
          child: SafeArea(
            top: false,
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.sizeOf(context).height * 0.72,
                maxWidth: 640,
              ),
              child: SingleChildScrollView(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: Container(
                          width: 38,
                          height: 4,
                          decoration: BoxDecoration(
                            color: colors.outlineVariant,
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      if (isExact)
                        _ExactMatchSheet(
                          candidate: candidates.first,
                          alternateCandidates: candidates.skip(1).toList(),
                          addingToVault: addingToVault,
                          showAlternates: showExactAlternates,
                          onAdd: () => onAddCandidate(candidates.first),
                          onAddAlternate: onAddCandidate,
                          onShowAlternates: onShowAlternates,
                          onScanNext: onDismiss,
                          onRetake: onRetake,
                          onView: () => _viewCard(context, candidates.first),
                          onViewAlternate: (candidate) =>
                              _viewCard(context, candidate),
                        )
                      else
                        _PickerSheet(
                          result: result,
                          addingToVault: addingToVault,
                          onAddCandidate: onAddCandidate,
                          onDismiss: onDismiss,
                          onRetake: onRetake,
                          onViewCandidate: (candidate) =>
                              _viewCard(context, candidate),
                        ),
                    ],
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

class _ExactMatchSheet extends StatelessWidget {
  const _ExactMatchSheet({
    required this.candidate,
    required this.alternateCandidates,
    required this.addingToVault,
    required this.showAlternates,
    required this.onAdd,
    required this.onAddAlternate,
    required this.onShowAlternates,
    required this.onScanNext,
    required this.onRetake,
    required this.onView,
    required this.onViewAlternate,
  });

  final ScannerV5Candidate candidate;
  final List<ScannerV5Candidate> alternateCandidates;
  final bool addingToVault;
  final bool showAlternates;
  final VoidCallback onAdd;
  final ValueChanged<ScannerV5Candidate> onAddAlternate;
  final VoidCallback onShowAlternates;
  final VoidCallback onScanNext;
  final VoidCallback onRetake;
  final VoidCallback onView;
  final ValueChanged<ScannerV5Candidate> onViewAlternate;

  @override
  Widget build(BuildContext context) {
    final displayIdentity = resolveDisplayIdentityFromFields(
      name: candidate.name,
      variantKey: candidate.variantKey,
      printedIdentityModifier: candidate.printedIdentityModifier,
    );
    final artwork = resolveCatalogArtwork(
      gvId: candidate.gvId,
      providerImageUrl: candidate.imageUrl,
    );
    final colors = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            Icon(
              Icons.check_circle_outline,
              color: colors.onSurfaceVariant,
              size: 17,
            ),
            SizedBox(width: 7),
            Expanded(
              child: Text(
                'Number matched',
                style: Theme.of(context).textTheme.labelLarge,
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CardSurfaceArtwork(
              label: displayIdentity.displayName,
              imageUrl: artwork.primaryImageUrl,
              fallbackImageUrl: artwork.fallbackImageUrl,
              width: 96,
              height: 134,
              borderRadius: GvRadii.artwork,
              padding: EdgeInsets.zero,
              backgroundColor: colors.surfaceContainer,
              enableTapToZoom: false,
              showShadow: false,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    displayIdentity.displayName,
                    style: TextStyle(
                      color: colors.onSurface,
                      fontSize: 19,
                      fontWeight: FontWeight.w700,
                      height: 1.1,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    _candidateMeta(candidate),
                    style: TextStyle(
                      color: colors.onSurfaceVariant,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w500,
                      height: 1.2,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        Text(
          'Review finish and condition before adding your copy.',
          style: Theme.of(
            context,
          ).textTheme.bodySmall?.copyWith(color: colors.onSurfaceVariant),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: addingToVault ? null : onAdd,
            icon: addingToVault
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.add_circle_outline_rounded),
            label: Text(addingToVault ? 'Adding' : 'Add to Vault'),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(GvRadii.control),
              ),
              textStyle: const TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: addingToVault ? null : onView,
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(GvRadii.control),
              ),
            ),
            icon: const Icon(Icons.style_outlined, size: 18),
            label: const Text('View card & market'),
          ),
        ),
        const SizedBox(height: 4),
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          spacing: 12,
          runSpacing: 4,
          children: [
            TextButton(
              onPressed: addingToVault || showAlternates
                  ? null
                  : onShowAlternates,
              child: const Text('Not this card?'),
            ),
            TextButton(
              onPressed: addingToVault ? null : onScanNext,
              child: const Text('Scan next'),
            ),
          ],
        ),
        if (showAlternates) ...[
          const SizedBox(height: 8),
          if (alternateCandidates.isEmpty)
            Text(
              'No other reliable matches. Retake or choose another photo.',
              style: TextStyle(
                color: colors.onSurfaceVariant,
                fontSize: 12.5,
                fontWeight: FontWeight.w500,
              ),
            )
          else
            for (final candidate in alternateCandidates.take(3)) ...[
              ScannerCandidateRow(
                candidate: candidate,
                enabled: !addingToVault,
                onTap: () => onAddAlternate(candidate),
                onView: () => onViewAlternate(candidate),
              ),
              const SizedBox(height: 8),
            ],
          TextButton(
            onPressed: addingToVault ? null : onRetake,
            child: const Text('Retake'),
          ),
        ],
      ],
    );
  }
}

class _PickerSheet extends StatelessWidget {
  const _PickerSheet({
    required this.result,
    required this.addingToVault,
    required this.onAddCandidate,
    required this.onDismiss,
    required this.onRetake,
    required this.onViewCandidate,
  });

  final ScannerV5IdentifyResult result;
  final bool addingToVault;
  final ValueChanged<ScannerV5Candidate> onAddCandidate;
  final VoidCallback onDismiss;
  final VoidCallback onRetake;
  final ValueChanged<ScannerV5Candidate> onViewCandidate;

  @override
  Widget build(BuildContext context) {
    final candidates = result.candidates.take(3).toList(growable: false);
    final colors = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          'Which card is this?',
          style: TextStyle(
            color: colors.onSurface,
            fontSize: 19,
            fontWeight: FontWeight.w700,
            height: 1.12,
          ),
        ),
        const SizedBox(height: 5),
        Text(
          'Compare the card and number, then review your copy.',
          style: TextStyle(
            color: colors.onSurfaceVariant,
            fontSize: 12.5,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 16),
        for (var i = 0; i < candidates.length; i++) ...[
          ScannerCandidateRow(
            candidate: candidates[i],
            enabled: !addingToVault,
            onTap: () => onAddCandidate(candidates[i]),
            onView: () => onViewCandidate(candidates[i]),
          ),
          if (i != candidates.length - 1) const SizedBox(height: 8),
        ],
        const SizedBox(height: 14),
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          spacing: 12,
          runSpacing: 4,
          children: [
            TextButton(
              onPressed: addingToVault ? null : onDismiss,
              child: const Text('None of these'),
            ),
            TextButton(
              onPressed: addingToVault ? null : onRetake,
              child: const Text('Retake'),
            ),
          ],
        ),
      ],
    );
  }
}

String _candidateMeta(ScannerV5Candidate candidate) {
  return [
    if (candidate.setCode != null) candidate.setCode,
    if (candidate.number != null) '#${candidate.number}',
    if (candidate.gvId != null) candidate.gvId,
  ].join('\n');
}
