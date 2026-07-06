import 'package:flutter/material.dart';

class GvRadii {
  const GvRadii._();

  static const double control = 10;
  static const double surface = 16;
  static const double artwork = 22;
  static const double floating = 26;
  static const double pill = 999;
}

class GvOpacity {
  const GvOpacity._();

  static const double primary = 1.0;
  static const double secondary = 0.64;
  static const double tertiary = 0.40;
  static const double hairline = 0.50;
}

class GvSpacing {
  const GvSpacing._();

  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 22;
  static const double bottomChromeInset = 118;
}

class GvText {
  const GvText._();

  static const double minReadable = 11.5;
  static const FontWeight regular = FontWeight.w400;
  static const FontWeight medium = FontWeight.w500;
  static const FontWeight semibold = FontWeight.w600;
  static const FontWeight bold = FontWeight.w700;
}

Color gvTextColor(ColorScheme colorScheme, double opacity) {
  return colorScheme.onSurface.withValues(alpha: opacity);
}

BorderSide gvHairline(
  ColorScheme colorScheme, {
  double alpha = GvOpacity.hairline,
}) {
  return BorderSide(color: colorScheme.outlineVariant.withValues(alpha: alpha));
}
