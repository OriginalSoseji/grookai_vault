import 'package:flutter/material.dart';

class FixedAspectImage extends StatelessWidget {
  final String url;
  final double borderRadius;
  final int cacheWidth;
  const FixedAspectImage({super.key, required this.url, this.borderRadius = 16, this.cacheWidth = 720});

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 3 / 4,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: Image.network(
          url,
          fit: BoxFit.cover,
          cacheWidth: cacheWidth,
        ),
      ),
    );
  }
}

