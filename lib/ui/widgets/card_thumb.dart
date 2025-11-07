import 'dart:math' as math;
import 'package:flutter/material.dart';

class CardThumb extends StatelessWidget {
  final String? url;
  final double? logicalWidth;
  final double? logicalHeight;

  const CardThumb({
    super.key,
    required this.url,
    this.logicalWidth = 120.0,
    this.logicalHeight,
  });

  @override
  Widget build(BuildContext context) {
    final w = logicalWidth ?? 120.0;
    final h = logicalHeight ?? (w * 4 / 3);
    final dpr = MediaQuery.maybeOf(context)?.devicePixelRatio ?? 2.0;
    final cacheW = math.max(1, (w * dpr).floor());
    final cacheH = math.max(1, (h * dpr).floor());

    Widget placeholder([Widget? icon]) => AspectRatio(
          aspectRatio: 3 / 4,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: const Color(0x11000000),
              borderRadius: BorderRadius.circular(12),
            ),
            child: icon == null
                ? const SizedBox.shrink()
                : Center(child: IconTheme.merge(data: const IconThemeData(color: Colors.black45), child: icon)),
          ),
        );

    final src = (url ?? '').trim();
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: src.isEmpty
          ? placeholder(const Icon(Icons.image))
          : Image.network(
              src,
              fit: BoxFit.cover,
              filterQuality: FilterQuality.medium,
              cacheWidth: cacheW,
              cacheHeight: cacheH,
              gaplessPlayback: true,
              loadingBuilder: (context, child, loadingProgress) {
                if (loadingProgress == null) return child;
                return Stack(
                  fit: StackFit.expand,
                  children: [
                    Opacity(opacity: 0.3, child: placeholder()),
                    Align(
                      alignment: Alignment.bottomCenter,
                      child: LinearProgressIndicator(
                        value: loadingProgress.expectedTotalBytes != null
                            ? (loadingProgress.cumulativeBytesLoaded / (loadingProgress.expectedTotalBytes!))
                            : null,
                        minHeight: 2,
                      ),
                    ),
                  ],
                );
              },
              errorBuilder: (_, __, ___) => placeholder(const Icon(Icons.broken_image)),
            ),
    );
  }
}

