import 'package:grookai_vault/widgets/smart_card_image.dart';
import "package:flutter/material.dart";
import "image_best.dart";

/// Consistent thumbnail for card rows.
/// Usage: leading: thumbFromRow(row),
Widget thumbFromRow(Map row, {double size = 56}) {
  final url = imageBestFromRow(row);
  if (url.isEmpty) {
    return Builder(builder: (context) {
      return Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Icon(Icons.image_not_supported),
      );
    });
  }
  return ClipRRect(
    borderRadius: BorderRadius.circular(8),
    child: SmartCardImage.network(
      url,
      width: size,
      height: size,
      fit: BoxFit.cover,
    ),
  );
}
