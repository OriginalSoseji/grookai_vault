import 'package:flutter/material.dart';

import '../../../services/identity/catalog_artwork_resolution.dart';
import '../../../widgets/card_surface_artwork.dart';

class ScannerPrimaryCardTile extends StatelessWidget {
  const ScannerPrimaryCardTile({
    super.key,
    required this.candidateId,
    required this.candidateName,
    required this.setCode,
    required this.number,
    required this.imageUrl,
    required this.locked,
    required this.accent,
    this.gvId,
    this.onScanAgain,
  });

  final String? candidateId;
  final String? candidateName;
  final String? setCode;
  final String? number;
  final String? imageUrl;
  final String? gvId;
  final bool locked;
  final Color accent;
  final VoidCallback? onScanAgain;

  @override
  Widget build(BuildContext context) {
    final title = _displayTitle();
    final meta = [
      setCode,
      number,
    ].where((value) => value != null && value.trim().isNotEmpty).join(' • ');
    final subtitle = meta.isNotEmpty
        ? meta
        : locked
        ? 'Locked match'
        : 'Best visual match';
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 180),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      child: Padding(
        key: ValueKey('$locked:$title'),
        padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 62,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(7),
                color: accent.withValues(alpha: 0.13),
                border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
              ),
              clipBehavior: Clip.antiAlias,
              child: _CardThumbnail(
                label: title,
                gvId: gvId,
                imageUrl: imageUrl,
                fallbackIcon: locked
                    ? Icons.verified_rounded
                    : Icons.auto_awesome_rounded,
                accent: accent,
              ),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: Colors.white.withValues(alpha: 0.62),
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0,
                    ),
                  ),
                ],
              ),
            ),
            if (locked) ...[
              const SizedBox(width: 10),
              _LockedCardAction(accent: accent, onScanAgain: onScanAgain),
            ],
          ],
        ),
      ),
    );
  }

  String _displayTitle() {
    final name = candidateName?.trim() ?? '';
    if (name.isNotEmpty) return name;
    if (candidateId == null || candidateId!.isEmpty) return 'Detecting...';
    return locked ? 'Match locked' : 'Possible match';
  }
}

class _LockedCardAction extends StatelessWidget {
  const _LockedCardAction({required this.accent, required this.onScanAgain});

  final Color accent;
  final VoidCallback? onScanAgain;

  @override
  Widget build(BuildContext context) {
    if (onScanAgain == null) {
      return DecoratedBox(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: accent.withValues(alpha: 0.14),
          border: Border.all(color: accent.withValues(alpha: 0.26)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(6),
          child: Icon(Icons.check_rounded, color: accent, size: 16),
        ),
      );
    }

    return Tooltip(
      message: 'Scan again',
      child: Material(
        color: Colors.transparent,
        shape: const CircleBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onScanAgain,
          customBorder: const CircleBorder(),
          child: Ink(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: accent.withValues(alpha: 0.16),
              border: Border.all(color: accent.withValues(alpha: 0.30)),
            ),
            child: SizedBox(
              width: 38,
              height: 38,
              child: Icon(Icons.refresh_rounded, color: accent, size: 19),
            ),
          ),
        ),
      ),
    );
  }
}

class _CardThumbnail extends StatelessWidget {
  const _CardThumbnail({
    required this.label,
    required this.gvId,
    required this.imageUrl,
    required this.fallbackIcon,
    required this.accent,
  });

  final String label;
  final String? gvId;
  final String? imageUrl;
  final IconData fallbackIcon;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final artwork = resolveCatalogArtwork(
      gvId: gvId,
      providerImageUrl: imageUrl,
    );
    if (artwork.primaryImageUrl == null) return _fallback();
    return CardSurfaceArtwork(
      label: label,
      imageUrl: artwork.primaryImageUrl,
      fallbackImageUrl: artwork.fallbackImageUrl,
      borderRadius: 7,
      padding: EdgeInsets.zero,
      backgroundColor: accent.withValues(alpha: 0.12),
      enableTapToZoom: false,
      showShadow: false,
      filterQuality: FilterQuality.medium,
    );
  }

  Widget _fallback() {
    return ColoredBox(
      color: accent.withValues(alpha: 0.12),
      child: Center(child: Icon(fallbackIcon, color: accent, size: 24)),
    );
  }
}
