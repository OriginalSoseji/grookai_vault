import 'package:flutter/material.dart';

import 'card_zoom_viewer.dart';

class CardSurfaceArtwork extends StatelessWidget {
  const CardSurfaceArtwork({
    required this.label,
    this.imageUrl,
    this.width,
    this.height,
    this.borderRadius = 14,
    this.padding = const EdgeInsets.all(3),
    this.backgroundColor,
    this.enableTapToZoom = true,
    this.showZoomAffordance = false,
    super.key,
  });

  final String label;
  final String? imageUrl;
  final double? width;
  final double? height;
  final double borderRadius;
  final EdgeInsetsGeometry padding;
  final Color? backgroundColor;
  final bool enableTapToZoom;
  final bool showZoomAffordance;

  bool get _hasImage => (imageUrl ?? '').trim().isNotEmpty;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final child = Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color:
            backgroundColor ??
            colorScheme.surfaceContainerHighest.withValues(alpha: 0.34),
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.10)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          Positioned.fill(
            child: Padding(
              padding: padding,
              child: _hasImage
                  ? Image.network(
                      imageUrl!,
                      fit: BoxFit.contain,
                      alignment: Alignment.center,
                      errorBuilder: (context, error, stackTrace) =>
                          _ArtworkFallback(
                            label: label,
                            compact: height != null && height! <= 80,
                          ),
                    )
                  : _ArtworkFallback(
                      label: label,
                      compact: height != null && height! <= 80,
                    ),
            ),
          ),
          if (showZoomAffordance && _hasImage)
            Positioned(
              right: 6,
              top: 6,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.36),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Padding(
                  padding: EdgeInsets.all(4),
                  child: Icon(
                    Icons.open_in_full_rounded,
                    size: 14,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
        ],
      ),
    );

    if (!_hasImage || !enableTapToZoom) {
      return child;
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () =>
            showCardImageZoom(context, label: label, imageUrl: imageUrl),
        borderRadius: BorderRadius.circular(borderRadius),
        child: child,
      ),
    );
  }
}

class _ArtworkFallback extends StatelessWidget {
  const _ArtworkFallback({required this.label, required this.compact});

  final String label;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Center(
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: compact ? 6 : 10),
        child: Text(
          label,
          maxLines: compact ? 2 : 3,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.6),
            fontWeight: FontWeight.w700,
            height: 1.2,
          ),
        ),
      ),
    );
  }
}
