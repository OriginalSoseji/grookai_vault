import 'package:flutter/material.dart';

import 'gv_tokens.dart';

class GvGridConstants {
  const GvGridConstants._();

  static const double artworkAspectRatio = 2.5 / 3.5;
  static const double cardAspectRatio = artworkAspectRatio;
  static const double imageRadius = GvRadii.artwork;
  static const double tileTapRadius = GvRadii.artwork;

  static const double imageToTitleGap = 6;
  static const double titleToSubtitleGap = 3;
  static const double subtitleToPriceGap = 2;

  static const int titleMaxLines = 2;
  static const int subtitleMaxLines = 1;

  static const FontWeight titleWeight = FontWeight.w600;
  static const double subtitleOpacity = 0.60;

  static const double gridSpacing = 6;
  static const double gridOuterPadding = 10;
  static const double gridChildAspectRatio = 0.52;

  static const double titleSlotHeight = 38;
  static const double subtitleSlotHeight = 17;
  static const double priceSlotHeight = 20;
  static const double ownershipSlotHeight = 44;

  static double catalogTileMainAxisExtent(double tileWidth) {
    return tileWidth / artworkAspectRatio +
        imageToTitleGap +
        titleSlotHeight +
        titleToSubtitleGap +
        subtitleSlotHeight +
        subtitleToPriceGap +
        priceSlotHeight +
        ownershipSlotHeight;
  }
}

TextStyle? gvGridTitleStyle(ThemeData theme) {
  return theme.textTheme.titleMedium?.copyWith(
    fontWeight: GvGridConstants.titleWeight,
    height: 1.04,
    letterSpacing: 0,
  );
}

TextStyle? gvGridSubtitleStyle(ThemeData theme, ColorScheme colorScheme) {
  return theme.textTheme.labelSmall?.copyWith(
    color: colorScheme.onSurface.withValues(
      alpha: GvGridConstants.subtitleOpacity,
    ),
    fontWeight: FontWeight.w600,
    letterSpacing: 0,
  );
}
