// lib/ui/widgets/async_image.dart
import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../tokens/radius.dart';

/// AsyncImage: fade-in network image with fixed layout size and error-safe fallback.
class AsyncImage extends StatefulWidget {
  final String url;
  final double width;
  final double height;
  final BoxFit fit;
  final BorderRadius? borderRadius;
  const AsyncImage(
    this.url, {
    super.key,
    required this.width,
    required this.height,
    this.fit = BoxFit.cover,
    this.borderRadius,
  });

  @override
  State<AsyncImage> createState() => _AsyncImageState();
}

class _AsyncImageState extends State<AsyncImage> {
  bool _retryOnce = false;
  late String _url;

  @override
  void initState() {
    super.initState();
    _url = widget.url;
  }

  @override
  void didUpdateWidget(covariant AsyncImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.url != widget.url) {
      _url = widget.url;
      _retryOnce = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_url.trim().isEmpty) {
      return _fallback(widget.width, widget.height);
    }
    final image = Image.network(
      _url,
      width: widget.width,
      height: widget.height,
      fit: widget.fit,
      errorBuilder: (context, error, stack) {
        if (!_retryOnce) {
          _retryOnce = true;
          // Jitter 300–700ms, then retry once with a cache-busting param
          final jitter = 300 + math.Random().nextInt(400);
          Future.delayed(Duration(milliseconds: jitter), () {
            if (!mounted) return;
            setState(() {
              final sep = _url.contains('?') ? '&' : '?';
              _url = '$_url${sep}retry=${DateTime.now().millisecondsSinceEpoch}';
            });
          });
          // Light log; avoid noisy spam
          // ignore: avoid_print
          print('[IMAGE] retry after transient error');
        }
        return _fallback(widget.width, widget.height);
      },
      frameBuilder: (context, child, frame, wasSynchronouslyLoaded) {
        if (wasSynchronouslyLoaded) return child;
        return AnimatedOpacity(
          opacity: frame == null ? 0 : 1,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeInOut,
          child: child,
        );
      },
    );
    final clipped = widget.borderRadius != null ? ClipRRect(borderRadius: widget.borderRadius!, child: image) : image;
    // Reserve space regardless of load/error to prevent layout shift.
    return SizedBox(width: widget.width, height: widget.height, child: clipped);
  }

  Widget _fallback(double w, double h) {
    return Container(
      width: w,
      height: h,
      decoration: BoxDecoration(borderRadius: GVRadius.br8, color: const Color(0x1F000000)),
      alignment: Alignment.center,
      child: const Icon(Icons.image, size: 20),
    );
  }
}
