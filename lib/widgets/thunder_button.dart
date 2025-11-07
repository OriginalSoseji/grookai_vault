import 'package:flutter/material.dart';
import 'package:grookai_vault/theme/thunder_palette.dart';

class ThunderButton extends StatefulWidget {
  final VoidCallback? onPressed;
  final Widget child;
  const ThunderButton({super.key, required this.onPressed, required this.child});

  @override
  State<ThunderButton> createState() => _ThunderButtonState();
}

class _ThunderButtonState extends State<ThunderButton> {
  bool _down = false;
  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 160),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Thunder.accent.withOpacity(_down ? 0.8 : 0.4)),
      ),
      child: GestureDetector(
        onTapDown: (_) => setState(() => _down = true),
        onTapCancel: () => setState(() => _down = false),
        onTapUp: (_) => setState(() => _down = false),
        child: FilledButton(
          onPressed: widget.onPressed,
          child: widget.child,
        ),
      ),
    );
  }
}

