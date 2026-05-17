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
  );

  @override
  void initState() {
    super.initState();
    _syncPulse();
  }

  @override
  void didUpdateWidget(covariant ScannerShutterButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.tone.locked != widget.tone.locked) {
      _syncPulse();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _syncPulse() {
    if (_controller.isAnimating) {
      _controller.stop();
    }
    _controller.value = 1.0;
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
              return child!;
            },
            child: DecoratedBox(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.black.withValues(alpha: 0.18),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.42),
                  width: 2.2,
                ),
                boxShadow: [
                  BoxShadow(
                    color: widget.tone.accent.withValues(alpha: 0.18),
                    blurRadius: 32,
                    spreadRadius: 1,
                  ),
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.42),
                    blurRadius: 28,
                    offset: const Offset(0, 12),
                  ),
                ],
              ),
              child: SizedBox(
                width: 78,
                height: 78,
                child: Center(
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    curve: Curves.easeOutCubic,
                    width: locked ? 52 : 58,
                    height: locked ? 52 : 58,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: locked ? widget.tone.accent : Colors.white,
                    ),
                    child: Icon(
                      locked ? Icons.refresh_rounded : Icons.camera_alt_rounded,
                      color: locked ? const Color(0xFF101312) : Colors.black,
                      size: 23,
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
