import 'package:flutter/material.dart';

enum NetworkInteractionCardLayout { feed, compactFeed, grid }

class NetworkInteractionCard extends StatelessWidget {
  const NetworkInteractionCard({
    required this.title,
    required this.imageLabel,
    required this.onPressed,
    this.imageUrl,
    this.metadata,
    this.topContext,
    this.heroHook,
    this.supportingInfo,
    this.actionBar,
    this.layout = NetworkInteractionCardLayout.feed,
    super.key,
  });

  final String title;
  final String imageLabel;
  final VoidCallback onPressed;
  final String? imageUrl;
  final String? metadata;
  final Widget? topContext;
  final Widget? heroHook;
  final Widget? supportingInfo;
  final Widget? actionBar;
  final NetworkInteractionCardLayout layout;

  bool get _isGrid => layout == NetworkInteractionCardLayout.grid;
  bool get _isCompactFeed => layout == NetworkInteractionCardLayout.compactFeed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final radius = BorderRadius.circular(_isGrid ? 24 : 28);
    final sidePadding = _isGrid ? 0.0 : (_isCompactFeed ? 10.0 : 0.0);
    final aspectRatio = _isGrid ? 0.74 : (_isCompactFeed ? 0.80 : 0.715);
    final contentHorizontalPadding = _isGrid ? 2.0 : 2.0;

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: sidePadding),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (topContext != null) ...[
            Padding(
              padding: EdgeInsets.symmetric(
                horizontal: contentHorizontalPadding,
              ),
              child: topContext!,
            ),
            SizedBox(height: _isGrid ? 6 : 7),
          ],
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
                          color: colorScheme.shadow.withValues(alpha: 0.16),
                          blurRadius: _isGrid ? 20 : 30,
                          offset: const Offset(0, 14),
                        ),
                        BoxShadow(
                          color: colorScheme.primary.withValues(alpha: 0.07),
                          blurRadius: _isGrid ? 28 : 40,
                          spreadRadius: -8,
                          offset: const Offset(0, 16),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: radius,
                      child: AspectRatio(
                        aspectRatio: aspectRatio,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            _NetworkPosterArtwork(
                              label: imageLabel,
                              imageUrl: imageUrl,
                            ),
                            if (heroHook != null)
                              Positioned(
                                top: _isGrid ? 10 : 12,
                                left: _isGrid ? 10 : 12,
                                child: heroHook!,
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  SizedBox(height: _isGrid ? 7 : 8),
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
                            fontWeight: FontWeight.w800,
                            height: 1.04,
                            letterSpacing: -0.42,
                            fontSize: _isGrid ? 18.5 : 23,
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
                              fontSize: _isGrid ? 12 : 13,
                              height: 1.34,
                            ),
                          ),
                        ],
                        if (supportingInfo != null) ...[
                          const SizedBox(height: 4),
                          DefaultTextStyle.merge(
                            style:
                                theme.textTheme.bodySmall?.copyWith(
                                  color: colorScheme.onSurface.withValues(
                                    alpha: 0.52,
                                  ),
                                  fontWeight: FontWeight.w500,
                                  height: 1.3,
                                ) ??
                                const TextStyle(),
                            child: supportingInfo!,
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
            SizedBox(height: _isGrid ? 5 : 6),
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
}

class _NetworkPosterArtwork extends StatelessWidget {
  const _NetworkPosterArtwork({required this.label, required this.imageUrl});

  final String label;
  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    final hasImage = (imageUrl ?? '').trim().isNotEmpty;
    if (!hasImage) {
      return _NetworkPosterFallback(label: label);
    }

    return DecoratedBox(
      decoration: const BoxDecoration(color: Colors.black),
      child: Image.network(
        imageUrl!,
        fit: BoxFit.cover,
        alignment: Alignment.center,
        filterQuality: FilterQuality.medium,
        errorBuilder: (context, error, stackTrace) =>
            _NetworkPosterFallback(label: label),
      ),
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
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            colorScheme.primaryContainer.withValues(alpha: 0.85),
            colorScheme.secondaryContainer.withValues(alpha: 0.72),
            colorScheme.surfaceContainerHighest.withValues(alpha: 0.94),
          ],
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
              letterSpacing: -0.3,
            ),
          ),
        ),
      ),
    );
  }
}
