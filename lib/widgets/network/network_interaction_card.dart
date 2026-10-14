import 'package:flutter/material.dart';

import '../../theme/gv_grid_constants.dart';
import '../../utils/display_image_contract.dart';
import '../card_surface_artwork.dart';

enum NetworkInteractionCardLayout { feed, grid }

class NetworkInteractionCard extends StatelessWidget {
  const NetworkInteractionCard({
    required this.title,
    required this.imageLabel,
    required this.onPressed,
    this.imageUrl,
    this.fallbackImageUrl,
    this.metadata,
    this.topContext,
    this.onTopContextPressed,
    this.supportingInfo,
    this.actionBar,
    this.layout = NetworkInteractionCardLayout.feed,
    super.key,
  });

  final String title;
  final String imageLabel;
  final VoidCallback onPressed;
  final String? imageUrl;
  final String? fallbackImageUrl;
  final String? metadata;
  final Widget? topContext;
  final VoidCallback? onTopContextPressed;
  final Widget? supportingInfo;
  final Widget? actionBar;
  final NetworkInteractionCardLayout layout;

  bool get _isGrid => layout == NetworkInteractionCardLayout.grid;

  @override
  Widget build(BuildContext context) {
    if (!_isGrid) {
      return _buildSocialFeed(context);
    }

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final radius = BorderRadius.circular(GvGridConstants.tileTapRadius);
    const sidePadding = 0.0;
    const aspectRatio = GvGridConstants.cardAspectRatio;
    const contentHorizontalPadding = 1.0;

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: sidePadding),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onPressed,
              borderRadius: radius,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: radius,
                      boxShadow: [
                        BoxShadow(
                          color: colorScheme.shadow.withValues(alpha: 0.10),
                          blurRadius: _isGrid ? 16 : 24,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: radius,
                      child: AspectRatio(
                        aspectRatio: aspectRatio,
                        child: _NetworkPosterArtwork(
                          label: imageLabel,
                          imageUrl: imageUrl,
                          fallbackImageUrl: fallbackImageUrl,
                        ),
                      ),
                    ),
                  ),
                  SizedBox(height: _isGrid ? 6 : 7),
                  Padding(
                    padding: EdgeInsets.symmetric(
                      horizontal: contentHorizontalPadding,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleLarge?.copyWith(
                            color: colorScheme.onSurface,
                            fontWeight: FontWeight.w700,
                            height: 1.03,
                            letterSpacing: 0,
                            fontSize: _isGrid ? 17.8 : 21.5,
                          ),
                        ),
                        if ((metadata ?? '').trim().isNotEmpty) ...[
                          const SizedBox(height: 3),
                          Text(
                            metadata!,
                            maxLines: _isGrid ? 1 : 2,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.62,
                              ),
                              fontWeight: FontWeight.w500,
                              letterSpacing: 0.05,
                              fontSize: _isGrid ? 11.8 : 12.6,
                              height: 1.28,
                            ),
                          ),
                        ],
                        if (supportingInfo != null) ...[
                          const SizedBox(height: 3),
                          DefaultTextStyle.merge(
                            style:
                                theme.textTheme.bodySmall?.copyWith(
                                  color: colorScheme.onSurface.withValues(
                                    alpha: 0.56,
                                  ),
                                  fontWeight: FontWeight.w500,
                                  height: 1.26,
                                ) ??
                                const TextStyle(),
                            child: supportingInfo!,
                          ),
                        ],
                        if (topContext != null) ...[
                          SizedBox(height: _isGrid ? 5 : 7),
                          onTopContextPressed == null
                              ? topContext!
                              : Material(
                                  color: Colors.transparent,
                                  child: InkWell(
                                    borderRadius: BorderRadius.circular(16),
                                    onTap: onTopContextPressed,
                                    child: topContext!,
                                  ),
                                ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (actionBar != null) ...[
            SizedBox(height: _isGrid ? 4 : 5),
            Padding(
              padding: EdgeInsets.symmetric(
                horizontal: contentHorizontalPadding,
              ),
              child: actionBar!,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSocialFeed(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final header = topContext == null
        ? null
        : ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 44),
            child: Align(
              alignment: Alignment.centerLeft,
              child: onTopContextPressed == null
                  ? topContext!
                  : Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(10),
                        onTap: onTopContextPressed,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: topContext!,
                        ),
                      ),
                    ),
            ),
          );

    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: colorScheme.outlineVariant.withValues(alpha: 0.34),
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (header != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: header,
            ),
          Material(
            color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.34),
            child: InkWell(
              onTap: onPressed,
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return SizedBox(
                    width: constraints.maxWidth,
                    child: AspectRatio(
                      aspectRatio: GvGridConstants.cardAspectRatio,
                      child: _NetworkPosterArtwork(
                        label: imageLabel,
                        imageUrl: imageUrl,
                        fallbackImageUrl: fallbackImageUrl,
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          if (actionBar != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 3, 12, 0),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 44),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: actionBar!,
                ),
              ),
            ),
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onPressed,
              child: Padding(
                padding: EdgeInsets.fromLTRB(
                  12,
                  actionBar == null ? 12 : 2,
                  12,
                  15,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: colorScheme.onSurface,
                        fontWeight: FontWeight.w700,
                        fontSize: 17.5,
                        height: 1.16,
                        letterSpacing: 0,
                      ),
                    ),
                    if ((metadata ?? '').trim().isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(
                        metadata!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.62),
                          fontWeight: FontWeight.w500,
                          height: 1.25,
                        ),
                      ),
                    ],
                    if (supportingInfo != null) ...[
                      const SizedBox(height: 5),
                      DefaultTextStyle.merge(
                        style:
                            theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.58,
                              ),
                              fontWeight: FontWeight.w500,
                              height: 1.25,
                            ) ??
                            const TextStyle(),
                        child: supportingInfo!,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NetworkPosterArtwork extends StatelessWidget {
  const _NetworkPosterArtwork({
    required this.label,
    required this.imageUrl,
    required this.fallbackImageUrl,
  });

  final String label;
  final String? imageUrl;
  final String? fallbackImageUrl;

  @override
  Widget build(BuildContext context) {
    final resolvedImageUrl = normalizeDisplayImageUrl(imageUrl);
    final resolvedFallbackImageUrl = normalizeDisplayImageUrl(fallbackImageUrl);
    final hasImage =
        (resolvedImageUrl ?? '').isNotEmpty ||
        (resolvedFallbackImageUrl ?? '').isNotEmpty;
    if (!hasImage) {
      return _NetworkPosterFallback(label: label);
    }

    return CardSurfaceArtwork(
      label: label,
      imageUrl: resolvedImageUrl,
      fallbackImageUrl: resolvedFallbackImageUrl,
      borderRadius: 0,
      padding: EdgeInsets.zero,
      frame: CardArtworkFrame.none,
      enableTapToZoom: false,
      filterQuality: FilterQuality.low,
    );
  }
}

class _NetworkPosterFallback extends StatelessWidget {
  const _NetworkPosterFallback({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.62),
        border: Border.all(
          color: colorScheme.outlineVariant.withValues(alpha: 0.18),
        ),
      ),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Text(
            label,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: colorScheme.onPrimaryContainer.withValues(alpha: 0.88),
              fontWeight: FontWeight.w700,
              height: 1.15,
              letterSpacing: 0,
            ),
          ),
        ),
      ),
    );
  }
}
