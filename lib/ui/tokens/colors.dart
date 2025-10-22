// lib/ui/tokens/colors.dart
import 'package:flutter/material.dart';

class GVPalette {
  final Color bg;
  final Color card;
  final Color textPrimary;
  final Color textSecondary;
  final Color accent;
  final Color success;
  final Color warning;
  final Color danger;

  const GVPalette({
    required this.bg,
    required this.card,
    required this.textPrimary,
    required this.textSecondary,
    required this.accent,
    required this.success,
    required this.warning,
    required this.danger,
  });

  static const light = GVPalette(
    bg: Color(0xFFF7F8FA),
    card: Color(0xFFFFFFFF),
    textPrimary: Color(0xFF0B1220),
    textSecondary: Color(0xFF475569),
    // Electric blue accent
    accent: Color(0xFF00A2FF),
    success: Color(0xFF16A34A),
    warning: Color(0xFFEAB308),
    danger: Color(0xFFDC2626),
  );

  static const dark = GVPalette(
    bg: Color(0xFF0B0F14),
    card: Color(0xFF11161C),
    textPrimary: Color(0xFFE6EAF0),
    textSecondary: Color(0xFFA3AEC2),
    // Electric blue accent (dark)
    accent: Color(0xFF00A2FF),
    success: Color(0xFF22C55E),
    warning: Color(0xFFF59E0B),
    danger: Color(0xFFEF4444),
  );
}
