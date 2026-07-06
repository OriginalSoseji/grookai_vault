import 'package:flutter/material.dart';

import '../../../services/scanner_v5/scanner_v5_identity_service.dart';
import 'scanner_v5_palette.dart';

class ScannerCandidateRow extends StatelessWidget {
  const ScannerCandidateRow({
    required this.candidate,
    required this.onTap,
    this.bestMatch = false,
    this.enabled = true,
    super.key,
  });

  final ScannerV5Candidate candidate;
  final VoidCallback onTap;
  final bool bestMatch;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final imageUrl = candidate.imageUrl;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            color: bestMatch
                ? ScannerV5Palette.selectedRow
                : ScannerV5Palette.row.withValues(alpha: 0.74),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: bestMatch
                  ? ScannerV5Palette.blue.withValues(alpha: 0.45)
                  : ScannerV5Palette.hairline,
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(9),
                  child: SizedBox(
                    width: 54,
                    height: 76,
                    child: imageUrl == null
                        ? const ColoredBox(color: ScannerV5Palette.sheet)
                        : Image.network(imageUrl, fit: BoxFit.cover),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (bestMatch) ...[
                        const _BestMatchChip(),
                        const SizedBox(height: 7),
                      ],
                      Text(
                        candidate.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: ScannerV5Palette.text,
                          fontSize: 14.5,
                          fontWeight: FontWeight.w700,
                          height: 1.15,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        _candidateMeta(candidate),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: ScannerV5Palette.dim(0.6),
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          height: 1.2,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                enabled
                    ? const Icon(
                        Icons.add_circle_outline_rounded,
                        color: ScannerV5Palette.text,
                        size: 24,
                      )
                    : SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: ScannerV5Palette.dim(0.75),
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

class _BestMatchChip extends StatelessWidget {
  const _BestMatchChip();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: ScannerV5Palette.blue.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
      ),
      child: const Padding(
        padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Text(
          'BEST MATCH',
          style: TextStyle(
            color: ScannerV5Palette.blue,
            fontSize: 9.5,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
            height: 1,
          ),
        ),
      ),
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
