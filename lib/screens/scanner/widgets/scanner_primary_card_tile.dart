import 'package:flutter/material.dart';

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
  });

  final String? candidateId;
  final String? candidateName;
  final String? setCode;
  final String? number;
  final String? imageUrl;
  final bool locked;
  final Color accent;

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
      child: DecoratedBox(
        key: ValueKey('$locked:$title'),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.055),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(9),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 67,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(7),
                  color: accent.withValues(alpha: 0.13),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.12),
                  ),
                ),
                clipBehavior: Clip.antiAlias,
                child: _CardThumbnail(
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
                DecoratedBox(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: accent.withValues(alpha: 0.14),
                    border: Border.all(color: accent.withValues(alpha: 0.26)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(6),
                    child: Icon(Icons.check_rounded, color: accent, size: 16),
                  ),
                ),
              ],
            ],
          ),
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

class _CardThumbnail extends StatelessWidget {
  const _CardThumbnail({
    required this.imageUrl,
    required this.fallbackIcon,
    required this.accent,
  });

  final String? imageUrl;
  final IconData fallbackIcon;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final url = imageUrl?.trim() ?? '';
    if (url.isEmpty) return _fallback();
    return Image.network(
      url,
      fit: BoxFit.cover,
      width: double.infinity,
      height: double.infinity,
      cacheWidth: 160,
      cacheHeight: 224,
      filterQuality: FilterQuality.medium,
      gaplessPlayback: true,
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) return child;
        return _fallback();
      },
      errorBuilder: (context, error, stackTrace) => _fallback(),
    );
  }

  Widget _fallback() {
    return ColoredBox(
      color: accent.withValues(alpha: 0.12),
      child: Center(child: Icon(fallbackIcon, color: accent, size: 24)),
    );
  }
}
