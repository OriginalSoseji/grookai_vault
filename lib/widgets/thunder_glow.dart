import 'package:flutter/material.dart';
import 'package:grookai_vault/theme/thunder_palette.dart';

/// Adds a very soft aura on focus/press only. Idle = no glow.
class ThunderGlow extends StatefulWidget {
  final Widget child;
  final Color color;
  final double intensity; // 0..1
  final VoidCallback? onTap;
  const ThunderGlow({super.key, required this.child, this.color = Thunder.accent, this.intensity = 0.4, this.onTap});

  @override
  State<ThunderGlow> createState() => _ThunderGlowState();
}

class _ThunderGlowState extends State<ThunderGlow> {
  bool _down = false;
  @override
  Widget build(BuildContext context) {
    final blur = _down ? 14.0 * widget.intensity : 0.0;
    return GestureDetector(
      onTapDown: (_) => setState(() => _down = true),
      onTapCancel: () => setState(() => _down = false),
      onTapUp: (_) => setState(() => _down = false),
      onTap: widget.onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        decoration: BoxDecoration(
          boxShadow: blur > 0
              ? [BoxShadow(color: widget.color.withOpacity(0.6 * widget.intensity), blurRadius: blur)]
              : const [],
        ),
        child: widget.child,
      ),
    );
  }
}

