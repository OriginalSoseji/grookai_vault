import 'dart:ui';

import 'package:flutter/material.dart';

class IdentityScannerOverlay extends StatelessWidget {
  final Rect guideRect;
  final List<Offset>? quadPointsNorm;
  final Offset? focusTapNorm;
  final Color accentColor;
  final String? guidanceText;
  final double strokeWidth;
  final bool locked;

  const IdentityScannerOverlay({
    super.key,
    required this.guideRect,
    required this.accentColor,
    this.quadPointsNorm,
    this.focusTapNorm,
    this.guidanceText,
    this.strokeWidth = 2,
    this.locked = false,
  });

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      ignoring: true,
      child: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _IdentityScannerOverlayPainter(
                guideRect: guideRect,
                accentColor: accentColor,
                quadPointsNorm: quadPointsNorm,
                focusTapNorm: focusTapNorm,
                strokeWidth: strokeWidth,
                locked: locked,
              ),
            ),
          ),
          if (guidanceText != null && guidanceText!.trim().isNotEmpty)
            Positioned(
              top: MediaQuery.of(context).padding.top + 18,
              left: 24,
              right: 24,
              child: Center(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.28),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.12),
                        ),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                        child: Text(
                          guidanceText!,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.labelLarge
                              ?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.1,
                              ),
                        ),
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

class _IdentityScannerOverlayPainter extends CustomPainter {
  final Rect guideRect;
  final Color accentColor;
  final List<Offset>? quadPointsNorm;
  final Offset? focusTapNorm;
  final double strokeWidth;
  final bool locked;

  _IdentityScannerOverlayPainter({
    required this.guideRect,
    required this.accentColor,
    required this.quadPointsNorm,
    required this.focusTapNorm,
    required this.strokeWidth,
    required this.locked,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final scrimPaint = Paint()..color = Colors.black.withOpacity(0.42);
    final clearPaint = Paint()..blendMode = BlendMode.clear;
    final overlayPath = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height));
    final frameRRect = RRect.fromRectAndRadius(
      guideRect,
      const Radius.circular(28),
    );
    overlayPath.addRRect(frameRRect);
    overlayPath.fillType = PathFillType.evenOdd;

    canvas.saveLayer(Rect.fromLTWH(0, 0, size.width, size.height), Paint());
    canvas.drawPath(overlayPath, scrimPaint);
    canvas.drawRRect(frameRRect, clearPaint);
    canvas.restore();

    final borderPaint = Paint()
      ..color = accentColor.withOpacity(locked ? 0.98 : 0.86)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;
    canvas.drawRRect(frameRRect, borderPaint);

    final cornerPaint = Paint()
      ..color = accentColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth + 0.6
      ..strokeCap = StrokeCap.round;
    const cornerLen = 18.0;
    final tl = guideRect.topLeft;
    final tr = guideRect.topRight;
    final bl = guideRect.bottomLeft;
    final br = guideRect.bottomRight;
    canvas.drawLine(tl, tl + const Offset(cornerLen, 0), cornerPaint);
    canvas.drawLine(tl, tl + const Offset(0, cornerLen), cornerPaint);
    canvas.drawLine(tr, tr - const Offset(cornerLen, 0), cornerPaint);
    canvas.drawLine(tr, tr + const Offset(0, cornerLen), cornerPaint);
    canvas.drawLine(bl, bl + const Offset(cornerLen, 0), cornerPaint);
    canvas.drawLine(bl, bl - const Offset(0, cornerLen), cornerPaint);
    canvas.drawLine(br, br - const Offset(cornerLen, 0), cornerPaint);
    canvas.drawLine(br, br - const Offset(0, cornerLen), cornerPaint);

    if (quadPointsNorm != null && quadPointsNorm!.length == 4) {
      final quadPaint = Paint()
        ..color = accentColor.withOpacity(0.72)
        ..strokeWidth = strokeWidth
        ..style = PaintingStyle.stroke;
      final quadPath = Path();
      for (var i = 0; i < quadPointsNorm!.length; i += 1) {
        final point = Offset(
          guideRect.left + quadPointsNorm![i].dx * guideRect.width,
          guideRect.top + quadPointsNorm![i].dy * guideRect.height,
        );
        if (i == 0) {
          quadPath.moveTo(point.dx, point.dy);
        } else {
          quadPath.lineTo(point.dx, point.dy);
        }
      }
      quadPath.close();
      canvas.drawPath(quadPath, quadPaint);
    }

    if (focusTapNorm != null) {
      final tapPoint = Offset(
        focusTapNorm!.dx.clamp(0.0, 1.0).toDouble() * size.width,
        focusTapNorm!.dy.clamp(0.0, 1.0).toDouble() * size.height,
      );
      final ringPaint = Paint()
        ..color = Colors.white.withOpacity(0.84)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5;
      canvas.drawCircle(tapPoint, 18, ringPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _IdentityScannerOverlayPainter oldDelegate) {
    return oldDelegate.guideRect != guideRect ||
        oldDelegate.accentColor != accentColor ||
        oldDelegate.strokeWidth != strokeWidth ||
        oldDelegate.locked != locked ||
        oldDelegate.focusTapNorm != focusTapNorm ||
        oldDelegate.quadPointsNorm != quadPointsNorm;
  }
}
