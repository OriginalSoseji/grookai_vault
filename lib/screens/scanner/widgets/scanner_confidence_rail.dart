import 'package:flutter/material.dart';

class ScannerConfidenceRail extends StatefulWidget {
  const ScannerConfidenceRail({
    super.key,
    required this.value,
    required this.accent,
    required this.indeterminate,
  });

  final double value;
  final Color accent;
  final bool indeterminate;

  @override
  State<ScannerConfidenceRail> createState() => _ScannerConfidenceRailState();
}

class _ScannerConfidenceRailState extends State<ScannerConfidenceRail>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1300),
  );

  @override
  void initState() {
    super.initState();
    if (widget.indeterminate) _controller.repeat();
  }

  @override
  void didUpdateWidget(covariant ScannerConfidenceRail oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.indeterminate && !_controller.isAnimating) {
      _controller.repeat();
    } else if (!widget.indeterminate && _controller.isAnimating) {
      _controller.stop();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(999),
      child: SizedBox(
        height: 5,
        child: LayoutBuilder(
          builder: (context, constraints) {
            return Stack(
              fit: StackFit.expand,
              children: [
                ColoredBox(color: Colors.white.withValues(alpha: 0.09)),
                if (widget.indeterminate)
                  AnimatedBuilder(
                    animation: _controller,
                    builder: (context, child) {
                      final width = constraints.maxWidth * 0.32;
                      final left =
                          (constraints.maxWidth + width) * _controller.value -
                          width;
                      return Positioned(
                        left: left,
                        width: width,
                        top: 0,
                        bottom: 0,
                        child: child!,
                      );
                    },
                    child: ColoredBox(color: widget.accent),
                  )
                else
                  FractionallySizedBox(
                    alignment: Alignment.centerLeft,
                    widthFactor: widget.value.clamp(0.0, 1.0).toDouble(),
                    child: ColoredBox(color: widget.accent),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}
