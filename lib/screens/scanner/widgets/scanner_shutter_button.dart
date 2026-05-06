import 'package:flutter/material.dart';

import 'scanner_state_label.dart';

class ScannerShutterButton extends StatefulWidget {
  const ScannerShutterButton({
    super.key,
    required this.tone,
    required this.onPressed,
  });

  final ScannerV3UiTone tone;
  final VoidCallback onPressed;

  @override
  State<ScannerShutterButton> createState() => _ScannerShutterButtonState();
}

class _ScannerShutterButtonState extends State<ScannerShutterButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locked = widget.tone.locked;
    final label = locked ? 'Scan again' : 'Scan card';

    return Semantics(
      button: true,
      label: label,
      child: Tooltip(
        message: label,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: widget.onPressed,
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              final pulse = locked ? 1.0 : 0.88 + _controller.value * 0.12;
              return Transform.scale(scale: pulse, child: child);
            },
            child: DecoratedBox(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.black.withValues(alpha: 0.34),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.32),
                  width: 1.2,
                ),
                boxShadow: [
                  BoxShadow(
                    color: widget.tone.accent.withValues(alpha: 0.22),
                    blurRadius: 28,
                    spreadRadius: 2,
                  ),
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.38),
                    blurRadius: 24,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: SizedBox(
                width: 72,
                height: 72,
                child: Center(
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    curve: Curves.easeOutCubic,
                    width: locked ? 44 : 50,
                    height: locked ? 44 : 50,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: locked ? widget.tone.accent : Colors.white,
                    ),
                    child: Icon(
                      locked ? Icons.refresh_rounded : Icons.camera_alt_rounded,
                      color: locked ? const Color(0xFF101312) : Colors.black,
                      size: 22,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
