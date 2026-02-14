import 'dart:ui';

import 'package:flutter/material.dart';

class ConditionCaptureOverlay extends StatelessWidget {
  final Rect guideRect;
  final String statusText;
  final bool isReady;
  final OverlayMode mode;
  final List<Offset>? quadPointsNorm;
  final Offset? focusTapNorm;

  const ConditionCaptureOverlay({
    super.key,
    required this.guideRect,
    required this.statusText,
    this.isReady = false,
    this.mode = OverlayMode.neutral,
    this.quadPointsNorm,
    this.focusTapNorm,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return IgnorePointer(
      ignoring: true,
      child: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _OverlayPainter(
                guideRect: guideRect,
                colorScheme: theme.colorScheme,
                isReady: isReady,
                mode: mode,
                quadPointsNorm: quadPointsNorm,
                focusTapNorm: focusTapNorm,
              ),
            ),
          ),
        Positioned(
          left: 0,
          right: 0,
          top: MediaQuery.of(context).padding.top + 12,
          child: Center(
            child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 180),
                transitionBuilder: (child, animation) => ScaleTransition(
                  scale: animation,
                  child: FadeTransition(opacity: animation, child: child),
                ),
                child: Container(
                  key: ValueKey(statusText),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surface.withOpacity(0.72),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                      color: theme.colorScheme.onSurface.withOpacity(0.15),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: theme.colorScheme.shadow.withOpacity(0.08),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Text(
                    statusText,
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: theme.colorScheme.onSurface,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

enum OverlayMode { neutral, ready, warn }

class _OverlayPainter extends CustomPainter {
  final Rect guideRect;
  final ColorScheme colorScheme;
  final bool isReady;
  final OverlayMode mode;
  final List<Offset>? quadPointsNorm;
  final Offset? focusTapNorm;

  _OverlayPainter({
    required this.guideRect,
    required this.colorScheme,
    required this.isReady,
    required this.mode,
    required this.quadPointsNorm,
    required this.focusTapNorm,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final scrimPaint = Paint()..color = colorScheme.onSurface.withOpacity(0.4);
    final clearPaint = Paint()..blendMode = BlendMode.clear;
    final overlay = Path()..addRect(Rect.fromLTWH(0, 0, size.width, size.height));
    final guideRRect = RRect.fromRectAndRadius(guideRect, const Radius.circular(24));
    overlay.addRRect(guideRRect);
    overlay.fillType = PathFillType.evenOdd;
    canvas.saveLayer(Rect.fromLTWH(0, 0, size.width, size.height), Paint());
    canvas.drawPath(overlay, scrimPaint);
    canvas.drawRRect(guideRRect, clearPaint);
    canvas.restore();

    final borderColor = switch (mode) {
      OverlayMode.ready => colorScheme.primary,
      OverlayMode.warn => colorScheme.error.withOpacity(0.9),
      _ => isReady ? colorScheme.primary : colorScheme.onSurface.withOpacity(0.8),
    };
    final borderPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;
    canvas.drawRRect(guideRRect, borderPaint);

    final tickPaint = Paint()
      ..color = isReady ? colorScheme.primary : colorScheme.onSurface.withOpacity(0.9)
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    const tickLen = 18.0;
    final tl = guideRect.topLeft;
    final tr = guideRect.topRight;
    final bl = guideRect.bottomLeft;
    final br = guideRect.bottomRight;
    canvas.drawLine(tl, tl + const Offset(tickLen, 0), tickPaint);
    canvas.drawLine(tl, tl + const Offset(0, tickLen), tickPaint);
    canvas.drawLine(tr, tr - const Offset(tickLen, 0), tickPaint);
    canvas.drawLine(tr, tr + const Offset(0, tickLen), tickPaint);
    canvas.drawLine(bl, bl + const Offset(tickLen, 0), tickPaint);
    canvas.drawLine(bl, bl - const Offset(0, tickLen), tickPaint);
    canvas.drawLine(br, br - const Offset(tickLen, 0), tickPaint);
    canvas.drawLine(br, br - const Offset(0, tickLen), tickPaint);

    final center = guideRect.center;
    final centerPaint = Paint()
      ..color = colorScheme.primary.withOpacity(0.9)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, 3, centerPaint);
    final crossPaint = Paint()
      ..color = colorScheme.onSurface.withOpacity(0.8)
      ..strokeWidth = 1.6;
    canvas.drawLine(center + const Offset(-6, 0), center + const Offset(6, 0), crossPaint);
    canvas.drawLine(center + const Offset(0, -6), center + const Offset(0, 6), crossPaint);

    if (quadPointsNorm != null && quadPointsNorm!.length == 4) {
      final quadPaint = Paint()
        ..color = colorScheme.primary.withOpacity(0.8)
        ..strokeWidth = 2
        ..style = PaintingStyle.stroke;
      final path = Path();
      for (var i = 0; i < quadPointsNorm!.length; i++) {
        final p = Offset(
          guideRect.left + quadPointsNorm![i].dx * guideRect.width,
          guideRect.top + quadPointsNorm![i].dy * guideRect.height,
        );
        if (i == 0) {
          path.moveTo(p.dx, p.dy);
        } else {
          path.lineTo(p.dx, p.dy);
        }
      }
      path.close();
      canvas.drawPath(path, quadPaint);
    }

    if (focusTapNorm != null) {
      final tapPoint = Offset(
        focusTapNorm!.dx.clamp(0.0, 1.0).toDouble() * size.width,
        focusTapNorm!.dy.clamp(0.0, 1.0).toDouble() * size.height,
      );

      final ringPaint = Paint()
        ..color = Colors.white.withOpacity(0.85)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.8;
      final dotPaint = Paint()
        ..color = Colors.white.withOpacity(0.9)
        ..style = PaintingStyle.fill;
      final tickPaint = Paint()
        ..color = Colors.white.withOpacity(0.85)
        ..strokeWidth = 1.8
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;

      const ringRadius = 18.0;
      const innerRadius = 3.0;
      const tickInner = 20.0;
      const tickOuter = 28.0;

      canvas.drawCircle(tapPoint, ringRadius, ringPaint);
      canvas.drawCircle(tapPoint, innerRadius, dotPaint);
      canvas.drawLine(
        Offset(tapPoint.dx, tapPoint.dy - tickOuter),
        Offset(tapPoint.dx, tapPoint.dy - tickInner),
        tickPaint,
      );
      canvas.drawLine(
        Offset(tapPoint.dx + tickInner, tapPoint.dy),
        Offset(tapPoint.dx + tickOuter, tapPoint.dy),
        tickPaint,
      );
      canvas.drawLine(
        Offset(tapPoint.dx, tapPoint.dy + tickInner),
        Offset(tapPoint.dx, tapPoint.dy + tickOuter),
        tickPaint,
      );
      canvas.drawLine(
        Offset(tapPoint.dx - tickOuter, tapPoint.dy),
        Offset(tapPoint.dx - tickInner, tapPoint.dy),
        tickPaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _OverlayPainter oldDelegate) {
    return oldDelegate.guideRect != guideRect ||
        oldDelegate.colorScheme != colorScheme ||
        oldDelegate.isReady != isReady ||
        oldDelegate.mode != mode ||
        oldDelegate.quadPointsNorm != quadPointsNorm ||
        oldDelegate.focusTapNorm != focusTapNorm;
  }
}
