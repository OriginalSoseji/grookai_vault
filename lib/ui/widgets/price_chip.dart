// lib/ui/widgets/price_chip.dart
import 'package:flutter/material.dart';
import '../app/theme.dart';
import '../tokens/radius.dart';
import '../tokens/spacing.dart';

class PriceChip extends StatelessWidget {
  final String label;
  final bool positive; // true => success color, false => danger/accent
  const PriceChip({super.key, required this.label, this.positive = true});

  @override
  Widget build(BuildContext context) {
    final gv = GVTheme.of(context);
    final bg = (positive ? gv.colors.success : gv.colors.accent).withValues(alpha: 0.12);
    final fg = positive ? gv.colors.success : gv.colors.accent;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: GVSpacing.s8, vertical: GVSpacing.s4),
      decoration: BoxDecoration(color: bg, borderRadius: GVRadius.br12),
      child: Text(label, style: gv.typography.footnote.copyWith(color: fg, fontWeight: FontWeight.w600)),
    );
  }
}
