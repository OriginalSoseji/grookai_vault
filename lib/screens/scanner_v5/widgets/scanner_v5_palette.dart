import 'package:flutter/material.dart';

class ScannerV5Palette {
  const ScannerV5Palette._();

  static const bg = Color(0xFF0A0B0C);
  static const frozenBg = Color(0xFF0C0D0F);
  static const sheet = Color(0xFF16181B);
  static const row = Color(0xFF1A1C20);
  static const selectedRow = Color(0xFF1D2024);
  static const text = Color(0xFFE9EBED);
  static const blue = Color(0xFF82B4EE);
  static const green = Color(0xFF8FCBA0);
  static const amber = Color(0xFFF0AF6E);
  static const hairline = Color(0x0FFFFFFF);

  static Color dim(double opacity) => text.withValues(alpha: opacity);
}
