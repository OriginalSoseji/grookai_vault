import 'package:flutter/material.dart';

import '../../../services/scanner_v5/scanner_v5_identity_service.dart';
import 'scanner_candidate_row.dart';
import 'scanner_v5_palette.dart';

class ScannerResultSheet extends StatelessWidget {
  const ScannerResultSheet({
    required this.result,
    required this.addingToVault,
    required this.onAddCandidate,
    required this.onDismiss,
    required this.onRetake,
    required this.onShowAlternates,
    required this.showExactAlternates,
    super.key,
  });

  final ScannerV5IdentifyResult result;
  final bool addingToVault;
  final ValueChanged<ScannerV5Candidate> onAddCandidate;
  final VoidCallback onDismiss;
  final VoidCallback onRetake;
  final VoidCallback onShowAlternates;
  final bool showExactAlternates;

  @override
  Widget build(BuildContext context) {
    final candidates = result.candidates;
    if (candidates.isEmpty) {
      return const SizedBox.shrink();
    }
    final isExact = result.mode == 'ocr_exact';
    return AnimatedSlide(
      duration: const Duration(milliseconds: 240),
      curve: Curves.easeOut,
      offset: Offset.zero,
      child: Align(
        alignment: Alignment.bottomCenter,
        child: DecoratedBox(
          decoration: const BoxDecoration(
            color: ScannerV5Palette.sheet,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            border: Border(top: BorderSide(color: ScannerV5Palette.hairline)),
          ),
          child: SafeArea(
            top: false,
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
                        color: Colors.white.withValues(alpha: 0.18),
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
                    )
                  else
                    _PickerSheet(
                      result: result,
                      addingToVault: addingToVault,
                      onAddCandidate: onAddCandidate,
                      onDismiss: onDismiss,
                      onRetake: onRetake,
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
  });

  final ScannerV5Candidate candidate;
  final List<ScannerV5Candidate> alternateCandidates;
  final bool addingToVault;
  final bool showAlternates;
  final VoidCallback onAdd;
  final ValueChanged<ScannerV5Candidate> onAddAlternate;
  final VoidCallback onShowAlternates;
  final VoidCallback onScanNext;

  @override
  Widget build(BuildContext context) {
    final imageUrl = candidate.imageUrl;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        const Row(
          children: [
            Icon(
              Icons.verified_rounded,
              color: ScannerV5Palette.green,
              size: 17,
            ),
            SizedBox(width: 7),
            Text(
              'EXACT NUMBER MATCH',
              style: TextStyle(
                color: ScannerV5Palette.green,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.88,
                height: 1,
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: SizedBox(
                width: 92,
                height: 129,
                child: imageUrl == null
                    ? const ColoredBox(color: ScannerV5Palette.row)
                    : Image.network(imageUrl, fit: BoxFit.cover),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    candidate.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: ScannerV5Palette.text,
                      fontSize: 19,
                      fontWeight: FontWeight.w700,
                      height: 1.1,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    _candidateMeta(candidate),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: ScannerV5Palette.dim(0.6),
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
        SizedBox(
          height: 52,
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
              backgroundColor: ScannerV5Palette.text,
              foregroundColor: ScannerV5Palette.bg,
              disabledBackgroundColor: ScannerV5Palette.text.withValues(
                alpha: 0.42,
              ),
              disabledForegroundColor: ScannerV5Palette.bg.withValues(
                alpha: 0.75,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(15),
              ),
              textStyle: const TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            TextButton(
              onPressed: showAlternates ? null : onShowAlternates,
              child: const Text('Not this card?'),
            ),
            const Spacer(),
            TextButton(onPressed: onScanNext, child: const Text('Scan next')),
          ],
        ),
        if (showAlternates) ...[
          const SizedBox(height: 8),
          if (alternateCandidates.isEmpty)
            Text(
              'No alternate candidates in this scan.',
              style: TextStyle(
                color: ScannerV5Palette.dim(0.6),
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
              ),
              const SizedBox(height: 8),
            ],
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
  });

  final ScannerV5IdentifyResult result;
  final bool addingToVault;
  final ValueChanged<ScannerV5Candidate> onAddCandidate;
  final VoidCallback onDismiss;
  final VoidCallback onRetake;

  @override
  Widget build(BuildContext context) {
    final candidates = result.candidates.take(3).toList(growable: false);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text(
          'Which card is this?',
          style: TextStyle(
            color: ScannerV5Palette.text,
            fontSize: 19,
            fontWeight: FontWeight.w700,
            height: 1.12,
          ),
        ),
        const SizedBox(height: 5),
        Text(
          'We found ${candidates.length} close matches - tap yours',
          style: TextStyle(
            color: ScannerV5Palette.dim(0.6),
            fontSize: 12.5,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 16),
        for (var i = 0; i < candidates.length; i++) ...[
          ScannerCandidateRow(
            candidate: candidates[i],
            bestMatch: i == 0,
            enabled: !addingToVault,
            onTap: () => onAddCandidate(candidates[i]),
          ),
          if (i != candidates.length - 1) const SizedBox(height: 8),
        ],
        const SizedBox(height: 14),
        Row(
          children: [
            TextButton(
              onPressed: onDismiss,
              child: const Text('None of these'),
            ),
            const Spacer(),
            TextButton(onPressed: onRetake, child: const Text('Retake')),
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
  ].join(' · ');
}
