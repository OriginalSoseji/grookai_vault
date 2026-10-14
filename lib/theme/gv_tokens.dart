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
        primary: const Color(0xFF59D7C1),
        onPrimary: const Color(0xFF071713),
        primaryContainer: const Color(0xFF153B34),
        onPrimaryContainer: const Color(0xFFC9F8EE),
        secondary: const Color(0xFF76E4D0),
        onSecondary: const Color(0xFF062019),
        secondaryContainer: const Color(0xFF123B31),
        onSecondaryContainer: const Color(0xFFC8F6E8),
        tertiary: gold,
        onTertiary: const Color(0xFF241A04),
        tertiaryContainer: const Color(0xFF463713),
        onTertiaryContainer: const Color(0xFFFFE8A9),
        surface: const Color(0xFF0B0F14),
        onSurface: const Color(0xFFF5F1E8),
        surfaceContainerLowest: const Color(0xFF090D12),
        surfaceContainerLow: const Color(0xFF10161D),
        surfaceContainer: const Color(0xFF131A22),
        surfaceContainerHigh: const Color(0xFF17202A),
        surfaceContainerHighest: const Color(0xFF1C2732),
        onSurfaceVariant: const Color(0xFFA9B4C0),
        outline: const Color(0xFF657280),
        outlineVariant: const Color(0xFF2B3642),
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

/// The shared visual contract for the V2 collector surfaces.
///
/// It intentionally stays independent of the user's legacy light-theme
/// preference while the new shell is rolled out screen by screen.
ThemeData buildGvRedesignV2Theme() {
  final colorScheme = GvPalette.scheme(Brightness.dark);
  final base = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: colorScheme,
  );

  return base.copyWith(
    scaffoldBackgroundColor: colorScheme.surface,
    appBarTheme: AppBarTheme(
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      toolbarHeight: 46,
      titleSpacing: 20,
      backgroundColor: colorScheme.surface,
      foregroundColor: colorScheme.onSurface,
      shape: Border(
        bottom: BorderSide(
          color: colorScheme.outlineVariant.withValues(alpha: 0.72),
        ),
      ),
      titleTextStyle: base.textTheme.titleLarge?.copyWith(
        color: colorScheme.onSurface,
        fontSize: 19,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.25,
      ),
      iconTheme: IconThemeData(color: colorScheme.onSurfaceVariant, size: 20),
      actionsIconTheme: IconThemeData(
        color: colorScheme.onSurfaceVariant,
        size: 20,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: colorScheme.surfaceContainerLow,
      hintStyle: TextStyle(
        color: colorScheme.onSurface.withValues(alpha: 0.44),
      ),
      prefixIconColor: colorScheme.onSurfaceVariant,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(GvRadii.control),
        borderSide: BorderSide(
          color: colorScheme.outlineVariant.withValues(alpha: 0.86),
        ),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(GvRadii.control),
        borderSide: BorderSide(
          color: colorScheme.outlineVariant.withValues(alpha: 0.86),
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(GvRadii.control),
        borderSide: BorderSide(color: colorScheme.primary, width: 1.3),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    ),
    dividerTheme: DividerThemeData(
      color: colorScheme.outlineVariant.withValues(alpha: 0.72),
      thickness: 1,
      space: 1,
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: colorScheme.surfaceContainerLow,
      modalBackgroundColor: colorScheme.surfaceContainerLow,
      surfaceTintColor: Colors.transparent,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: colorScheme.surfaceContainerLow,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(GvRadii.surface),
        side: BorderSide(color: colorScheme.outlineVariant),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(44, 48),
        foregroundColor: colorScheme.onPrimary,
        backgroundColor: colorScheme.primary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(GvRadii.control),
        ),
        textStyle: const TextStyle(fontWeight: FontWeight.w800),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(44, 44),
        foregroundColor: colorScheme.onSurface,
        side: BorderSide(color: colorScheme.outlineVariant),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(GvRadii.control),
        ),
      ),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: IconButton.styleFrom(
        minimumSize: const Size(44, 44),
        foregroundColor: colorScheme.onSurfaceVariant,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(GvRadii.control),
        ),
      ),
    ),
    textTheme: base.textTheme.copyWith(
      headlineSmall: base.textTheme.headlineSmall?.copyWith(
        color: colorScheme.onSurface,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.3,
      ),
      titleLarge: base.textTheme.titleLarge?.copyWith(
        color: colorScheme.onSurface,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.2,
      ),
      titleMedium: base.textTheme.titleMedium?.copyWith(
        color: colorScheme.onSurface,
        fontWeight: FontWeight.w700,
      ),
      bodyLarge: base.textTheme.bodyLarge?.copyWith(
        color: colorScheme.onSurface,
      ),
      bodyMedium: base.textTheme.bodyMedium?.copyWith(
        color: colorScheme.onSurface,
      ),
      labelLarge: base.textTheme.labelLarge?.copyWith(
        color: colorScheme.onSurface,
        fontWeight: FontWeight.w700,
      ),
    ),
  );
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
