import 'package:flutter/material.dart';

typedef UrlBuilder = Future<String?> Function(String raw);

class GVImage extends StatelessWidget {
  final String? url;
  final double width;
  final double height;
  final BorderRadius? radius;
  final BoxFit fit;
  final EdgeInsetsGeometry? padding;

  const GVImage({
    super.key,
    required this.url,
    required this.width,
    required this.height,
    this.radius,
    this.fit = BoxFit.cover,
    this.padding,
  });

  static List<String> _tcgdexVariants(String u) {
    final hasExt = u.endsWith('.png') ||
        u.endsWith('.webp') ||
        u.contains('/high') ||
        u.contains('/normal');
    if (hasExt) return [u];
    return [
      '$u/high.png',
      '$u/high.webp',
      '$u/normal.png',
      '$u/normal.webp',
    ];
  }

  static List<String> _variantsFor(String? u) {
    if (u == null || u.isEmpty) return const [];
    if (u.contains('assets.tcgdex.net/')) return _tcgdexVariants(u);
    return [u];
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final r = radius ?? BorderRadius.circular(12);
    final variants = _variantsFor(url);
    Widget child;

    if (variants.isEmpty) {
      child = _placeholder(theme);
    } else {
      child = _NetworkFallbackImage(variants: variants, fit: fit, theme: theme);
    }

    final clipped = ClipRRect(borderRadius: r, child: child);
    return Padding(
      padding: padding ?? EdgeInsets.zero,
      child: SizedBox(
        width: width,
        height: height,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest,
            borderRadius: r,
          ),
          child: clipped,
        ),
      ),
    );
  }

  Widget _placeholder(ThemeData theme) => Center(
        child: Icon(
          Icons.image_not_supported_outlined,
          color: theme.colorScheme.onSurfaceVariant,
        ),
      );
}

class _NetworkFallbackImage extends StatefulWidget {
  final List<String> variants;
  final BoxFit fit;
  final ThemeData theme;
  const _NetworkFallbackImage({
    required this.variants,
    required this.fit,
    required this.theme,
  });

  @override
  State<_NetworkFallbackImage> createState() => _NetworkFallbackImageState();
}

class _NetworkFallbackImageState extends State<_NetworkFallbackImage> {
  int idx = 0;

  @override
  Widget build(BuildContext context) {
    if (idx >= widget.variants.length) {
      return Center(
        child: Icon(
          Icons.broken_image_outlined,
          color: widget.theme.colorScheme.onSurfaceVariant,
        ),
      );
    }
    final u = widget.variants[idx];
    return Image.network(
      u,
      fit: widget.fit,
      errorBuilder: (_, __, ___) {
        setState(() => idx++);
        return const SizedBox.expand();
      },
    );
  }
}
