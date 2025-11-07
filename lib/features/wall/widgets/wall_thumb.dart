import 'package:flutter/material.dart';

class WallThumb extends StatelessWidget {
  final String imageUrl;
  final double borderRadius;
  const WallThumb({super.key, required this.imageUrl, this.borderRadius = 12});

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 3 / 4,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: Image.network(
          imageUrl,
          fit: BoxFit.cover,
          cacheWidth: 720,
        ),
      ),
    );
  }
}

