import 'package:flutter/material.dart';

class GlowChip extends StatelessWidget {
  final Widget label;
  final bool selected;
  final VoidCallback? onTap;
  const GlowChip({super.key, required this.label, this.selected = false, this.onTap});

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.primary;
    final shadow = selected
        ? [BoxShadow(color: color.withValues(alpha: 0.35), blurRadius: 16, spreadRadius: 1)]
        : [BoxShadow(color: Colors.transparent)];
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          boxShadow: shadow,
          border: Border.all(color: selected ? color : Theme.of(context).dividerColor),
        ),
        child: DefaultTextStyle.merge(
          style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
          child: label,
        ),
      ),
    );
  }
}
