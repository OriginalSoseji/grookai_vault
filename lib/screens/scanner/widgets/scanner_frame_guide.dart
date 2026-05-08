import 'dart:ui' as ui;

import 'package:flutter/material.dart';

class ScannerFrameGuide extends StatefulWidget {
  const ScannerFrameGuide({
    super.key,
    required this.guideRect,
    required this.quadPointsNorm,
    required this.quadPointSetsNorm,
    required this.selectedQuadNorm,
    required this.cardSelectionActive,
    required this.focusTapNorm,
    required this.accent,
    required this.edgeLocked,
    required this.locked,
  });

  final Rect guideRect;
  final List<Offset>? quadPointsNorm;
  final List<List<Offset>>? quadPointSetsNorm;
  final List<Offset>? selectedQuadNorm;
  final bool cardSelectionActive;
  final Offset? focusTapNorm;
  final Color accent;
  final bool edgeLocked;
  final bool locked;

  @override
  State<ScannerFrameGuide> createState() => _ScannerFrameGuideState();
}

class _ScannerFrameGuideState extends State<ScannerFrameGuide>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final breath = 0.62 + (_controller.value * 0.38);
        return CustomPaint(
          painter: _ScannerFrameGuidePainter(
            guideRect: widget.guideRect,
            quadPointsNorm: widget.quadPointsNorm,
            quadPointSetsNorm: widget.quadPointSetsNorm,
            selectedQuadNorm: widget.selectedQuadNorm,
            cardSelectionActive: widget.cardSelectionActive,
            focusTapNorm: widget.focusTapNorm,
            accent: widget.accent,
            edgeLocked: widget.edgeLocked,
            locked: widget.locked,
            breath: breath,
          ),
        );
      },
    );
  }
}

class _ScannerFrameGuidePainter extends CustomPainter {
  _ScannerFrameGuidePainter({
    required this.guideRect,
    required this.quadPointsNorm,
    required this.quadPointSetsNorm,
    required this.selectedQuadNorm,
    required this.cardSelectionActive,
    required this.focusTapNorm,
    required this.accent,
    required this.edgeLocked,
    required this.locked,
    required this.breath,
  });

  final Rect guideRect;
  final List<Offset>? quadPointsNorm;
  final List<List<Offset>>? quadPointSetsNorm;
  final List<Offset>? selectedQuadNorm;
  final bool cardSelectionActive;
  final Offset? focusTapNorm;
  final Color accent;
  final bool edgeLocked;
  final bool locked;
  final double breath;

  @override
  void paint(Canvas canvas, Size size) {
    final overlay = Paint()..color = Colors.black.withValues(alpha: 0.34);
    final fullPath = Path()..addRect(Offset.zero & size);
    final guidePath = Path()
      ..addRRect(RRect.fromRectAndRadius(guideRect, const Radius.circular(24)));
    canvas.drawPath(
      Path.combine(PathOperation.difference, fullPath, guidePath),
      overlay,
    );

    final edgeColor = locked || edgeLocked ? accent : Colors.white;
    final glowPaint = Paint()
      ..color = edgeColor.withValues(
        alpha: locked ? 0.34 : (0.09 + 0.13 * breath),
      )
      ..style = PaintingStyle.stroke
      ..strokeWidth = locked ? 4 : 3
      ..maskFilter = ui.MaskFilter.blur(ui.BlurStyle.outer, locked ? 9 : 5);
    canvas.drawRRect(
      RRect.fromRectAndRadius(guideRect, const Radius.circular(24)),
      glowPaint,
    );

    final borderPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.18)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;
    canvas.drawRRect(
      RRect.fromRectAndRadius(guideRect, const Radius.circular(24)),
      borderPaint,
    );

    final cornerPaint = Paint()
      ..color = edgeColor.withValues(
        alpha: locked || edgeLocked ? 0.94 : 0.42 + (0.28 * breath),
      )
      ..style = PaintingStyle.stroke
      ..strokeWidth = locked ? 4 : 3
      ..strokeCap = StrokeCap.round;
    final corner = (guideRect.width * 0.13).clamp(26.0, 48.0);
    _drawCorner(canvas, cornerPaint, guideRect.topLeft, corner, true, true);
    _drawCorner(canvas, cornerPaint, guideRect.topRight, corner, false, true);
    _drawCorner(
      canvas,
      cornerPaint,
      guideRect.bottomRight,
      corner,
      false,
      false,
    );
    _drawCorner(canvas, cornerPaint, guideRect.bottomLeft, corner, true, false);

    final pointSets = quadPointSetsNorm != null && quadPointSetsNorm!.isNotEmpty
        ? quadPointSetsNorm!
        : quadPointsNorm == null
        ? const <List<Offset>>[]
        : <List<Offset>>[quadPointsNorm!];
    for (var index = 0; index < pointSets.length; index += 1) {
      final points = pointSets[index];
      if (points.length != 4) continue;
      final isPrimary = index == 0;
      if (cardSelectionActive && !isPrimary) continue;

      final quadPath = Path();
      for (var i = 0; i < points.length; i += 1) {
        final point = Offset(
          points[i].dx * size.width,
          points[i].dy * size.height,
        );
        if (i == 0) {
          quadPath.moveTo(point.dx, point.dy);
        } else {
          quadPath.lineTo(point.dx, point.dy);
        }
      }
      quadPath.close();
      final isSelected = cardSelectionActive && isPrimary;
      if (isSelected) {
        final fillPaint = Paint()
          ..color = accent.withValues(alpha: 0.10)
          ..style = PaintingStyle.fill;
        canvas.drawPath(quadPath, fillPaint);
      }
      final quadPaint = Paint()
        ..color = accent.withValues(
          alpha: isSelected
              ? 0.94
              : locked
              ? 0.72
              : (isPrimary ? 0.62 : 0.54),
        )
        ..style = PaintingStyle.stroke
        ..strokeWidth = isSelected
            ? 3.2
            : locked
            ? 2.6
            : (isPrimary ? 2.2 : 1.9);
      canvas.drawPath(quadPath, quadPaint);
    }

    final focus = focusTapNorm;
    if (focus != null) {
      final center = Offset(focus.dx * size.width, focus.dy * size.height);
      final focusPaint = Paint()
        ..color = Colors.white.withValues(alpha: 0.82)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.4;
      canvas.drawCircle(center, 18, focusPaint);
      canvas.drawCircle(center, 3, focusPaint);
    }
  }

  void _drawCorner(
    Canvas canvas,
    Paint paint,
    Offset point,
    double length,
    bool left,
    bool top,
  ) {
    final xDir = left ? 1.0 : -1.0;
    final yDir = top ? 1.0 : -1.0;
    canvas.drawLine(point, Offset(point.dx + (length * xDir), point.dy), paint);
    canvas.drawLine(point, Offset(point.dx, point.dy + (length * yDir)), paint);
  }

  @override
  bool shouldRepaint(covariant _ScannerFrameGuidePainter oldDelegate) {
    return oldDelegate.guideRect != guideRect ||
        oldDelegate.quadPointsNorm != quadPointsNorm ||
        oldDelegate.quadPointSetsNorm != quadPointSetsNorm ||
        oldDelegate.selectedQuadNorm != selectedQuadNorm ||
        oldDelegate.cardSelectionActive != cardSelectionActive ||
        oldDelegate.focusTapNorm != focusTapNorm ||
        oldDelegate.accent != accent ||
        oldDelegate.edgeLocked != edgeLocked ||
        oldDelegate.locked != locked ||
        oldDelegate.breath != breath;
  }
}
