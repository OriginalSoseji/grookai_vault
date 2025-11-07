import 'package:flutter/material.dart';

class GlowButton extends StatelessWidget {
  final Widget child;
  final VoidCallback? onPressed;
  final bool focused;
  const GlowButton({super.key, required this.child, this.onPressed, this.focused = false});

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.primary;
    final shadow = focused
        ? [BoxShadow(color: color.withValues(alpha: 0.35), blurRadius: 18, spreadRadius: 1)]
        : [const BoxShadow(color: Colors.transparent)];
    return GestureDetector(
      onTap: onPressed,
      child: AnimatedScale(
        duration: const Duration(milliseconds: 120),
        scale: focused ? 0.98 : 1.0,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(14),
            boxShadow: shadow,
          ),
          child: DefaultTextStyle.merge(
            style: TextStyle(color: Theme.of(context).colorScheme.onPrimary, fontWeight: FontWeight.w600),
            child: child,
          ),
        ),
      ),
    );
  }
}
