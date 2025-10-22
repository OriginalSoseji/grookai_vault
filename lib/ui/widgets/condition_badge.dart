// lib/ui/widgets/condition_badge.dart
import 'package:flutter/material.dart';
import '../app/theme.dart';
import '../tokens/spacing.dart';
import '../tokens/radius.dart';

class ConditionBadge extends StatelessWidget {
  final String condition; // e.g., NM, LP, MP, HP, DMG
  const ConditionBadge({super.key, required this.condition});

  @override
  Widget build(BuildContext context) {
    final gv = GVTheme.of(context);
    Color base;
    switch (condition.toUpperCase()) {
      case 'NM':
        base = gv.colors.success;
        break;
      case 'LP':
      case 'MP':
        base = gv.colors.warning;
        break;
      case 'HP':
      case 'DMG':
        base = gv.colors.danger;
        break;
      default:
        base = gv.colors.textSecondary;
    }
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: GVSpacing.s8,
        vertical: GVSpacing.s4,
      ),
      decoration: BoxDecoration(
        color: base.withValues(alpha: 0.12),
        borderRadius: GVRadius.br8,
      ),
      child: Text(
        condition.toUpperCase(),
        style: gv.typography.caption.copyWith(
          color: base,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}
