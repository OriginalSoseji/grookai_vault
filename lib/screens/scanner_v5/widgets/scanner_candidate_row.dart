import 'package:flutter/material.dart';

import '../../../services/identity/catalog_artwork_resolution.dart';
import '../../../services/identity/display_identity.dart';
import '../../../services/scanner_v5/scanner_v5_identity_service.dart';
import '../../../widgets/card_surface_artwork.dart';
import '../../../theme/gv_tokens.dart';

class ScannerCandidateRow extends StatelessWidget {
  const ScannerCandidateRow({
    required this.candidate,
    required this.onTap,
    this.bestMatch = false,
    this.enabled = true,
    this.onView,
    super.key,
  });

  final ScannerV5Candidate candidate;
  final VoidCallback onTap;
  final bool bestMatch;
  final bool enabled;
  final VoidCallback? onView;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final displayIdentity = resolveDisplayIdentityFromFields(
      name: candidate.name,
      variantKey: candidate.variantKey,
      printedIdentityModifier: candidate.printedIdentityModifier,
    );
    final artwork = resolveCatalogArtwork(
      gvId: candidate.gvId,
      providerImageUrl: candidate.imageUrl,
    );
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(GvRadii.surface),
        child: Ink(
          decoration: BoxDecoration(
            color: colors.surfaceContainer,
            borderRadius: BorderRadius.circular(GvRadii.surface),
            border: Border.all(
              color: bestMatch ? colors.primary : colors.outlineVariant,
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Row(
              children: [
                CardSurfaceArtwork(
                  label: displayIdentity.displayName,
                  imageUrl: artwork.primaryImageUrl,
                  fallbackImageUrl: artwork.fallbackImageUrl,
                  width: 54,
                  height: 76,
                  borderRadius: GvRadii.artwork,
                  padding: EdgeInsets.zero,
                  backgroundColor: colors.surfaceContainerLow,
                  enableTapToZoom: false,
                  showShadow: false,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (bestMatch) ...[
                        Text(
                          'Closest match',
                          style: Theme.of(context).textTheme.labelSmall,
                        ),
                        const SizedBox(height: 7),
                      ],
                      Text(
                        displayIdentity.displayName,
                        style: TextStyle(
                          color: colors.onSurface,
                          fontSize: 14.5,
                          fontWeight: FontWeight.w700,
                          height: 1.15,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        _candidateMeta(candidate),
                        style: TextStyle(
                          color: colors.onSurfaceVariant,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          height: 1.2,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Review this copy',
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: enabled
                              ? colors.primary
                              : colors.onSurfaceVariant,
                        ),
                      ),
                      if (onView != null)
                        TextButton(
                          onPressed: enabled ? onView : null,
                          child: const Text('View card & market'),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                enabled
                    ? Icon(
                        Icons.chevron_right,
                        color: colors.onSurfaceVariant,
                        size: 24,
                      )
                    : SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: colors.onSurfaceVariant,
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

String _candidateMeta(ScannerV5Candidate candidate) {
  return [
    if (candidate.setCode != null) candidate.setCode,
    if (candidate.number != null) '#${candidate.number}',
  ].join(' · ');
}
