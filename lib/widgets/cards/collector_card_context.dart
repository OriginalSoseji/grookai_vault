import 'package:flutter/material.dart';

/// Compact identity retained inside collector task sheets.
class CollectorCardContext extends StatelessWidget {
  const CollectorCardContext({
    super.key,
    required this.name,
    required this.contextLabel,
    this.imageUrl,
  });
  final String name, contextLabel;
  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final placeholder = Container(
      color: theme.colorScheme.surfaceContainerHighest,
      child: Icon(
        Icons.image_outlined,
        size: 20,
        color: theme.colorScheme.onSurfaceVariant,
      ),
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 18),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: SizedBox(
              width: 58,
              height: 81,
              child: imageUrl == null || imageUrl!.isEmpty
                  ? placeholder
                  : Image.network(
                      imageUrl!,
                      fit: BoxFit.contain,
                      errorBuilder: (_, error, stack) => placeholder,
                    ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  contextLabel,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
