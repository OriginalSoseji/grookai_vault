import 'package:flutter/material.dart';
import 'thunder_palette.dart';

/// Light touch theme wiring for Thunder Aesthetic.
class ThunderTheme {
  static ThemeData materialDark({ThemeData? base}) {
    final seed = Thunder.accent;
    final dark = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorSchemeSeed: seed,
      scaffoldBackgroundColor: Thunder.base,
      cardColor: Thunder.surface,
    );
    final theme = (base ?? dark).copyWith(
      dividerColor: Thunder.divider,
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        titleTextStyle: (base ?? dark).textTheme.titleMedium?.copyWith(
              color: Thunder.onSurface,
              fontWeight: FontWeight.w600,
            ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: Thunder.accent,
          foregroundColor: Colors.black,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
    );
    return theme;
  }
}

