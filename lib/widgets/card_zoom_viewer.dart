import 'package:flutter/material.dart';

Future<void> showCardImageZoom(
  BuildContext context, {
  required String label,
  String? imageUrl,
}) async {
  final resolvedUrl = (imageUrl ?? '').trim();
  if (resolvedUrl.isEmpty) {
    return;
  }

  await showDialog<void>(
    context: context,
    useRootNavigator: true,
    barrierDismissible: true,
    barrierColor: Colors.black.withValues(alpha: 0.78),
    builder: (dialogContext) {
      return _CardZoomDialog(label: label, imageUrl: resolvedUrl);
    },
  );
}

class _CardZoomDialog extends StatelessWidget {
  const _CardZoomDialog({required this.label, required this.imageUrl});

  final String label;
  final String imageUrl;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

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
                  child: InteractiveViewer(
                    minScale: 1,
                    maxScale: 4,
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
                              color: colorScheme.surfaceContainerHighest
                                  .withValues(alpha: 0.38),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(10),
                              child: Image.network(
                                imageUrl,
                                fit: BoxFit.contain,
                                errorBuilder: (context, error, stackTrace) =>
                                    Center(
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
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  label,
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
