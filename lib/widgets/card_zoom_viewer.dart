import 'package:flutter/material.dart';

class CardZoomGalleryItem {
  const CardZoomGalleryItem({required this.label, this.imageUrl});

  final String label;
  final String? imageUrl;

  String get resolvedImageUrl => (imageUrl ?? '').trim();
}

Future<void> showCardImageZoom(
  BuildContext context, {
  required String label,
  String? imageUrl,
}) async {
  final resolvedUrl = (imageUrl ?? '').trim();
  if (resolvedUrl.isEmpty) {
    return;
  }

  await showCardImageGallery(
    context,
    items: <CardZoomGalleryItem>[
      CardZoomGalleryItem(label: label, imageUrl: resolvedUrl),
    ],
  );
}

Future<void> showCardImageGallery(
  BuildContext context, {
  required List<CardZoomGalleryItem> items,
  int initialIndex = 0,
}) async {
  if (items.isEmpty) {
    return;
  }

  final safeInitialIndex = initialIndex.clamp(0, items.length - 1);
  await showDialog<void>(
    context: context,
    useRootNavigator: true,
    barrierDismissible: true,
    barrierColor: Colors.black.withValues(alpha: 0.78),
    builder: (dialogContext) {
      return _CardZoomDialog(items: items, initialIndex: safeInitialIndex);
    },
  );
}

class _CardZoomDialog extends StatefulWidget {
  const _CardZoomDialog({required this.items, required this.initialIndex});

  final List<CardZoomGalleryItem> items;
  final int initialIndex;

  @override
  State<_CardZoomDialog> createState() => _CardZoomDialogState();
}

class _CardZoomDialogState extends State<_CardZoomDialog> {
  late final PageController _pageController;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex.clamp(0, widget.items.length - 1);
    _pageController = PageController(initialPage: _currentIndex);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      _precacheAround(_currentIndex);
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _precacheAround(int index) {
    for (final targetIndex in <int>[index - 1, index, index + 1]) {
      if (targetIndex < 0 || targetIndex >= widget.items.length) {
        continue;
      }
      final imageUrl = widget.items[targetIndex].resolvedImageUrl;
      if (imageUrl.isEmpty) {
        continue;
      }
      precacheImage(NetworkImage(imageUrl), context);
    }
  }

  Future<void> _animateToIndex(int index) async {
    if (index < 0 ||
        index >= widget.items.length ||
        !_pageController.hasClients) {
      return;
    }

    await _pageController.animateToPage(
      index,
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final currentItem = widget.items[_currentIndex];
    final hasPrevious = _currentIndex > 0;
    final hasNext = _currentIndex < widget.items.length - 1;

    return SafeArea(
      child: Material(
        color: Colors.transparent,
        child: Center(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Align(
                  alignment: Alignment.centerRight,
                  child: IconButton(
                    tooltip: 'Close',
                    onPressed: () =>
                        Navigator.of(context, rootNavigator: true).pop(),
                    icon: const Icon(Icons.close_rounded),
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.white.withValues(alpha: 0.14),
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Flexible(
                  child: SizedBox(
                    width: 480,
                    child: PageView.builder(
                      // SET_BIG_MODE_PREV_NEXT_V1
                      // Fullscreen set viewer now preserves current browse
                      // ordering and supports previous/next swipe navigation.
                      controller: _pageController,
                      itemCount: widget.items.length,
                      allowImplicitScrolling: true,
                      onPageChanged: (index) {
                        setState(() {
                          _currentIndex = index;
                        });
                        _precacheAround(index);
                      },
                      itemBuilder: (context, index) {
                        return _CardZoomPage(item: widget.items[index]);
                      },
                    ),
                  ),
                ),
                if (widget.items.length > 1) ...[
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _GalleryArrowButton(
                        icon: Icons.chevron_left_rounded,
                        enabled: hasPrevious,
                        onPressed: hasPrevious
                            ? () => _animateToIndex(_currentIndex - 1)
                            : null,
                      ),
                      const SizedBox(width: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 7,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.10),
                          ),
                        ),
                        child: Text(
                          '${_currentIndex + 1} of ${widget.items.length}',
                          style: Theme.of(context).textTheme.labelLarge
                              ?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      _GalleryArrowButton(
                        icon: Icons.chevron_right_rounded,
                        enabled: hasNext,
                        onPressed: hasNext
                            ? () => _animateToIndex(_currentIndex + 1)
                            : null,
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 12),
                Text(
                  currentItem.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
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

class _CardZoomPage extends StatelessWidget {
  const _CardZoomPage({required this.item});

  final CardZoomGalleryItem item;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final imageUrl = item.resolvedImageUrl;

    return InteractiveViewer(
      minScale: 1,
      maxScale: 4,
      panEnabled: false,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 440),
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.18),
              blurRadius: 36,
              offset: const Offset(0, 18),
            ),
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: AspectRatio(
            aspectRatio: 3 / 4,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerHighest.withValues(
                  alpha: 0.38,
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: imageUrl.isEmpty
                    ? Center(
                        child: Text(
                          item.label,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(
                                color: colorScheme.onSurfaceVariant,
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                      )
                    : Image.network(
                        imageUrl,
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) => Center(
                          child: Icon(
                            Icons.broken_image_outlined,
                            size: 44,
                            color: colorScheme.onSurfaceVariant,
                          ),
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

class _GalleryArrowButton extends StatelessWidget {
  const _GalleryArrowButton({
    required this.icon,
    required this.enabled,
    this.onPressed,
  });

  final IconData icon;
  final bool enabled;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: enabled
          ? (icon == Icons.chevron_left_rounded ? 'Previous card' : 'Next card')
          : null,
      onPressed: onPressed,
      icon: Icon(icon),
      style: IconButton.styleFrom(
        foregroundColor: enabled
            ? Colors.white
            : Colors.white.withValues(alpha: 0.38),
        backgroundColor: Colors.white.withValues(alpha: enabled ? 0.12 : 0.06),
      ),
    );
  }
}
