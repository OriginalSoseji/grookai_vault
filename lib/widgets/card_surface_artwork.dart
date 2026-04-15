import 'package:flutter/material.dart';

import 'card_zoom_viewer.dart';

const double _kCardSurfaceArtworkAspectRatio = 0.69;

class CardSurfaceArtwork extends StatelessWidget {
  const CardSurfaceArtwork({
    required this.label,
    this.imageUrl,
    this.width,
    this.height,
    this.borderRadius = 16,
    this.padding = const EdgeInsets.all(1.5),
    this.backgroundColor,
    this.enableTapToZoom = true,
    this.showZoomAffordance = false,
    this.showShadow = true,
    this.filterQuality = FilterQuality.low,
    this.onTapToZoom,
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
  final bool showShadow;
  final FilterQuality filterQuality;
  final VoidCallback? onTapToZoom;

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
            colorScheme.surfaceContainerLow.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.04)),
        boxShadow: showShadow
            ? [
                BoxShadow(
                  color: colorScheme.shadow.withValues(alpha: 0.02),
                  blurRadius: 12,
                  offset: const Offset(0, 6),
                ),
              ]
            : const [],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          Positioned.fill(
            child: LayoutBuilder(
              builder: (context, constraints) {
                // PERFORMANCE_P1_IMAGE_DECODE
                // Applies decode-size hints for card artwork on scroll-heavy
                // surfaces so thumbnails do not decode at source resolution.
                final cacheWidth = _resolvedCacheWidth(context, constraints);
                final cacheHeight = _resolvedCacheHeight(context, constraints);
                final compact =
                    (height != null && height! <= 80) ||
                    (constraints.hasBoundedHeight &&
                        constraints.maxHeight <= 80);

                return Padding(
                  padding: padding,
                  child: _hasImage
                      ? Image.network(
                          imageUrl!,
                          fit: BoxFit.contain,
                          alignment: Alignment.center,
                          cacheWidth: cacheWidth,
                          cacheHeight: cacheHeight,
                          filterQuality: filterQuality,
                          errorBuilder: (context, error, stackTrace) =>
                              _ArtworkFallback(label: label, compact: compact),
                        )
                      : _ArtworkFallback(label: label, compact: compact),
                );
              },
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
        onTap:
            onTapToZoom ??
            () => showCardImageZoom(context, label: label, imageUrl: imageUrl),
        borderRadius: BorderRadius.circular(borderRadius),
        child: child,
      ),
    );
  }

  int? _resolvedCacheWidth(BuildContext context, BoxConstraints constraints) {
    final logicalWidth = _resolvedLogicalWidth(constraints);
    if (logicalWidth == null || !logicalWidth.isFinite || logicalWidth <= 0) {
      return null;
    }
    final devicePixelRatio = MediaQuery.of(context).devicePixelRatio;
    return ((logicalWidth * devicePixelRatio).round().clamp(1, 4096) as num)
        .toInt();
  }

  int? _resolvedCacheHeight(BuildContext context, BoxConstraints constraints) {
    final logicalHeight = _resolvedLogicalHeight(constraints);
    if (logicalHeight == null ||
        !logicalHeight.isFinite ||
        logicalHeight <= 0) {
      return null;
    }
    final devicePixelRatio = MediaQuery.of(context).devicePixelRatio;
    return ((logicalHeight * devicePixelRatio).round().clamp(1, 4096) as num)
        .toInt();
  }

  double? _resolvedLogicalWidth(BoxConstraints constraints) {
    if (width != null && width! > 0) {
      return width;
    }
    if (constraints.hasBoundedWidth && constraints.maxWidth > 0) {
      return constraints.maxWidth;
    }
    if (height != null && height! > 0) {
      return height! * _kCardSurfaceArtworkAspectRatio;
    }
    if (constraints.hasBoundedHeight && constraints.maxHeight > 0) {
      return constraints.maxHeight * _kCardSurfaceArtworkAspectRatio;
    }
    return null;
  }

  double? _resolvedLogicalHeight(BoxConstraints constraints) {
    if (height != null && height! > 0) {
      return height;
    }
    if (constraints.hasBoundedHeight && constraints.maxHeight > 0) {
      return constraints.maxHeight;
    }
    if (width != null && width! > 0) {
      return width! / _kCardSurfaceArtworkAspectRatio;
    }
    if (constraints.hasBoundedWidth && constraints.maxWidth > 0) {
      return constraints.maxWidth / _kCardSurfaceArtworkAspectRatio;
    }
    return null;
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
            color: colorScheme.onSurface.withValues(alpha: 0.56),
            fontWeight: FontWeight.w600,
            height: 1.2,
          ),
        ),
      ),
    );
  }
}
