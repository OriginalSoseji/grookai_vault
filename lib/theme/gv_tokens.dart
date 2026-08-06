import 'package:flutter/material.dart';

class GvRadii {
  const GvRadii._();

  static const double control = 10;
  static const double surface = 12;
  static const double artwork = 16;
  static const double floating = 20;
  static const double pill = 999;
}

class GvPalette {
  const GvPalette._();

  static const Color blue = Color(0xFF6CAEFF);
  static const Color mint = Color(0xFF5ED3B3);
  static const Color gold = Color(0xFFE6B85C);

  static ColorScheme scheme(Brightness brightness) {
    final base = ColorScheme.fromSeed(seedColor: blue, brightness: brightness);

    if (brightness == Brightness.dark) {
      return base.copyWith(
        primary: blue,
        onPrimary: const Color(0xFF071827),
        primaryContainer: const Color(0xFF173857),
        onPrimaryContainer: const Color(0xFFD7E9FF),
        secondary: mint,
        onSecondary: const Color(0xFF062019),
        secondaryContainer: const Color(0xFF123B31),
        onSecondaryContainer: const Color(0xFFC8F6E8),
        tertiary: gold,
        onTertiary: const Color(0xFF241A04),
        tertiaryContainer: const Color(0xFF463713),
        onTertiaryContainer: const Color(0xFFFFE8A9),
        surface: const Color(0xFF090C10),
        onSurface: const Color(0xFFF1F4F8),
        surfaceContainerLowest: const Color(0xFF07090C),
        surfaceContainerLow: const Color(0xFF0E1319),
        surfaceContainer: const Color(0xFF121820),
        surfaceContainerHigh: const Color(0xFF171F29),
        surfaceContainerHighest: const Color(0xFF1D2732),
        onSurfaceVariant: const Color(0xFFBAC3CF),
        outline: const Color(0xFF667383),
        outlineVariant: const Color(0xFF303B47),
        shadow: Colors.black,
      );
    }

    return base.copyWith(
      primary: const Color(0xFF245F9F),
      onPrimary: Colors.white,
      primaryContainer: const Color(0xFFD6E8FF),
      onPrimaryContainer: const Color(0xFF0A315A),
      secondary: const Color(0xFF267A64),
      onSecondary: Colors.white,
      secondaryContainer: const Color(0xFFC7F2E5),
      onSecondaryContainer: const Color(0xFF0A493B),
      tertiary: const Color(0xFF8B650F),
      onTertiary: Colors.white,
      tertiaryContainer: const Color(0xFFFFE5A2),
      onTertiaryContainer: const Color(0xFF4B3600),
      surface: const Color(0xFFF7F9FC),
      onSurface: const Color(0xFF151A20),
      surfaceContainerLowest: Colors.white,
      surfaceContainerLow: const Color(0xFFF0F3F7),
      surfaceContainer: const Color(0xFFE9EDF2),
      surfaceContainerHigh: const Color(0xFFE2E7ED),
      surfaceContainerHighest: const Color(0xFFD9E0E8),
      onSurfaceVariant: const Color(0xFF4D5865),
      outline: const Color(0xFF73808F),
      outlineVariant: const Color(0xFFC4CDD7),
      shadow: const Color(0xFF101820),
    );
  }
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
