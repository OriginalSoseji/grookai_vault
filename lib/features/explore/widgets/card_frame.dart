import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
// import 'package:grookai_vault/widgets/smart_card_image.dart';
import 'package:grookai_vault/features/explore/widgets/fixed_aspect_image.dart';

class CardFrame extends StatelessWidget {
  final String listingId;
  final String imageUrl;
  final Widget Function(BuildContext) overlays;

  const CardFrame({
    super.key,
    required this.listingId,
    required this.imageUrl,
    required this.overlays,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        // Subtle blurred backdrop
        Positioned.fill(
          child: ImageFiltered(
            imageFilter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
            child: DecoratedBox(
              decoration: BoxDecoration(
                image: DecorationImage(
                  image: CachedNetworkImageProvider(imageUrl),
                  fit: BoxFit.cover,
                ),
              ),
            ),
          ),
        ),
        // Gradient vignette to keep focus on frame
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0x80000000), Color(0x20000000), Color(0x99000000)],
            ),
          ),
        ),
        // Center 3:4 framed image
        Center(
          child: Hero(
            tag: 'listing:$listingId',
            child: FixedAspectImage(url: imageUrl, borderRadius: 16),
          ),
        ),
        // Overlay content builder
        Positioned.fill(child: overlays(context)),
      ],
    );
  }
}
