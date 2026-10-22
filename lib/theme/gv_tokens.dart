import 'package:flutter/material.dart';

import 'gv_typography.dart';

class GvRadii {
  const GvRadii._();

  static const double control = 8;
  static const double surface = 8;
  static const double artwork = 10;
  static const double floating = 16;
  static const double pill = 999;
}

class GvPalette {
  const GvPalette._();

  static const Color ink = Color(0xFF080B09);
  static const Color bone = Color(0xFFF4F5ED);
  static const Color electric = Color(0xFFB7F23A);
  static const Color market = Color(0xFFF0AF6E);

  // Legacy names remain aliases while older surfaces migrate to the launch
  // identity. This keeps every existing feature on one visual contract.
  static const Color blue = electric;
  static const Color mint = electric;
  static const Color gold = market;

  static ColorScheme scheme(Brightness brightness) {
    final base = ColorScheme.fromSeed(seedColor: blue, brightness: brightness);

    if (brightness == Brightness.dark) {
      return base.copyWith(
        primary: electric,
        onPrimary: ink,
        primaryContainer: const Color(0xFF283915),
        onPrimaryContainer: const Color(0xFFE6FFB1),
        secondary: bone,
        onSecondary: ink,
        secondaryContainer: const Color(0xFF272B25),
        onSecondaryContainer: bone,
        tertiary: market,
        onTertiary: ink,
        tertiaryContainer: const Color(0xFF4A321C),
        onTertiaryContainer: const Color(0xFFFFE2C2),
        surface: ink,
        onSurface: bone,
        surfaceContainerLowest: const Color(0xFF050705),
        surfaceContainerLow: const Color(0xFF101310),
        surfaceContainer: const Color(0xFF151915),
        surfaceContainerHigh: const Color(0xFF1B201B),
        surfaceContainerHighest: const Color(0xFF242A23),
        onSurfaceVariant: const Color(0xFFB7BCAE),
        outline: const Color(0xFF777D70),
        outlineVariant: const Color(0xFF343A32),
        shadow: Colors.black,
      );
    }

    return base.copyWith(
      primary: const Color(0xFF466D00),
      onPrimary: Colors.white,
      primaryContainer: const Color(0xFFDDF7A3),
      onPrimaryContainer: const Color(0xFF182600),
      secondary: ink,
      onSecondary: bone,
      secondaryContainer: const Color(0xFFE5E7DC),
      onSecondaryContainer: ink,
      tertiary: const Color(0xFF8B4F13),
      onTertiary: Colors.white,
      tertiaryContainer: const Color(0xFFFFDCC0),
      onTertiaryContainer: const Color(0xFF2D1600),
      surface: bone,
      onSurface: ink,
      surfaceContainerLowest: const Color(0xFFFCFDF6),
      surfaceContainerLow: const Color(0xFFEEEFE7),
      surfaceContainer: const Color(0xFFE6E8DE),
      surfaceContainerHigh: const Color(0xFFDCDED3),
      surfaceContainerHighest: const Color(0xFFD1D4C8),
      onSurfaceVariant: const Color(0xFF50564C),
      outline: const Color(0xFF70766B),
      outlineVariant: const Color(0xFFC2C6B9),
      shadow: ink,
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
    fontFamily: GvTypography.fontFamily,
  );

  return base.copyWith(
    scaffoldBackgroundColor: colorScheme.surface,
    appBarTheme: AppBarTheme(
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      toolbarHeight: 48,
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
        fontSize: 20,
        fontWeight: FontWeight.w900,
        letterSpacing: -0.65,
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
        fontWeight: FontWeight.w900,
        letterSpacing: -0.65,
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
