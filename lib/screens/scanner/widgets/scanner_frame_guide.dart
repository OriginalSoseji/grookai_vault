import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

class ScannerFrameGuide extends StatefulWidget {
  const ScannerFrameGuide({
    super.key,
    required this.guideRect,
    required this.cameraViewportRect,
    required this.guidedSlotQuadsNorm,
    required this.activeGuidedSlotIndex,
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
  final Rect cameraViewportRect;
  final List<List<Offset>> guidedSlotQuadsNorm;
  final int activeGuidedSlotIndex;
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
  );

  bool get _shouldAnimate => false;

  @override
  void initState() {
    super.initState();
    _syncAnimation();
  }

  @override
  void didUpdateWidget(covariant ScannerFrameGuide oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.edgeLocked != widget.edgeLocked ||
        oldWidget.locked != widget.locked) {
      _syncAnimation();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _syncAnimation() {
    if (_shouldAnimate) {
      if (!_controller.isAnimating) {
        _controller.repeat(reverse: true);
      }
      return;
    }
    if (_controller.isAnimating) {
      _controller.stop();
    }
    _controller.value = 1.0;
  }

  @override
  Widget build(BuildContext context) {
    if (!_shouldAnimate) {
      return _paint(breath: 1.0, willChange: false);
    }
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final breath = 0.62 + (_controller.value * 0.38);
        return _paint(breath: breath, willChange: true);
      },
    );
  }

  Widget _paint({required double breath, required bool willChange}) {
    return CustomPaint(
      isComplex: true,
      willChange: willChange,
      painter: _ScannerFrameGuidePainter(
        guideRect: widget.guideRect,
        cameraViewportRect: widget.cameraViewportRect,
        guidedSlotQuadsNorm: widget.guidedSlotQuadsNorm,
        activeGuidedSlotIndex: widget.activeGuidedSlotIndex,
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
  }
}

class _ScannerFrameGuidePainter extends CustomPainter {
  _ScannerFrameGuidePainter({
    required this.guideRect,
    required this.cameraViewportRect,
    required this.guidedSlotQuadsNorm,
    required this.activeGuidedSlotIndex,
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
  final Rect cameraViewportRect;
  final List<List<Offset>> guidedSlotQuadsNorm;
  final int activeGuidedSlotIndex;
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
    final overlay = Paint()..color = Colors.black.withValues(alpha: 0.22);
    final fullPath = Path()..addRect(Offset.zero & size);
    final slotRects = _guidedSlotRects();
    final guidePath = Path();
    if (slotRects.isEmpty) {
      guidePath.addRRect(
        RRect.fromRectAndRadius(guideRect, const Radius.circular(24)),
      );
    } else {
      for (final rect in slotRects) {
        guidePath.addRRect(
          RRect.fromRectAndRadius(rect, const Radius.circular(18)),
        );
      }
    }
    canvas.drawPath(
      Path.combine(PathOperation.difference, fullPath, guidePath),
      overlay,
    );

    final edgeColor = locked || edgeLocked ? accent : Colors.white;
    if (slotRects.isEmpty) {
      _drawGuideFrame(canvas, guideRect, edgeColor, radius: 24);
    } else {
      for (var index = 0; index < slotRects.length; index += 1) {
        _drawSlotFrame(
          canvas,
          slotRects[index],
          edgeColor,
          index: index,
          active: index == activeGuidedSlotIndex,
        );
      }
    }

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
          cameraViewportRect.left + (points[i].dx * cameraViewportRect.width),
          cameraViewportRect.top + (points[i].dy * cameraViewportRect.height),
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
              ? 0.86
              : locked
              ? 0.64
              : (isPrimary ? 0.54 : 0.42),
        )
        ..style = PaintingStyle.stroke
        ..strokeWidth = isSelected
            ? 2.6
            : locked
            ? 2.2
            : (isPrimary ? 1.8 : 1.5);
      canvas.drawPath(quadPath, quadPaint);
    }

    final focus = focusTapNorm;
    if (focus != null) {
      final center = Offset(
        cameraViewportRect.left + (focus.dx * cameraViewportRect.width),
        cameraViewportRect.top + (focus.dy * cameraViewportRect.height),
      );
      final focusPaint = Paint()
        ..color = Colors.white.withValues(alpha: 0.82)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.4;
      canvas.drawCircle(center, 18, focusPaint);
      canvas.drawCircle(center, 3, focusPaint);
    }
  }

  List<Rect> _guidedSlotRects() {
    final rects = <Rect>[];
    for (final slot in guidedSlotQuadsNorm) {
      if (slot.length != 4) continue;
      final rect = _quadRectInCameraViewport(slot);
      if (rect != null) rects.add(rect);
    }
    return rects;
  }

  Rect? _quadRectInCameraViewport(List<Offset> points) {
    var minX = double.infinity;
    var minY = double.infinity;
    var maxX = double.negativeInfinity;
    var maxY = double.negativeInfinity;
    for (final point in points) {
      final x = cameraViewportRect.left + (point.dx * cameraViewportRect.width);
      final y = cameraViewportRect.top + (point.dy * cameraViewportRect.height);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    if (!minX.isFinite ||
        !minY.isFinite ||
        !maxX.isFinite ||
        !maxY.isFinite ||
        maxX <= minX ||
        maxY <= minY) {
      return null;
    }
    return Rect.fromLTRB(minX, minY, maxX, maxY);
  }

  void _drawGuideFrame(
    Canvas canvas,
    Rect rect,
    Color edgeColor, {
    required double radius,
  }) {
    final glowPaint = Paint()
      ..color = edgeColor.withValues(
        alpha: locked ? 0.26 : (0.06 + 0.08 * breath),
      )
      ..style = PaintingStyle.stroke
      ..strokeWidth = locked ? 3 : 2
      ..maskFilter = ui.MaskFilter.blur(ui.BlurStyle.outer, locked ? 8 : 4);
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, Radius.circular(radius)),
      glowPaint,
    );

    final borderPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, Radius.circular(radius)),
      borderPaint,
    );

    final cornerPaint = Paint()
      ..color = edgeColor.withValues(
        alpha: locked || edgeLocked ? 0.82 : 0.34 + (0.20 * breath),
      )
      ..style = PaintingStyle.stroke
      ..strokeWidth = locked ? 3.0 : 2.2
      ..strokeCap = StrokeCap.round;
    final corner = (rect.width * 0.09).clamp(20.0, 36.0);
    _drawCorner(canvas, cornerPaint, rect.topLeft, corner, true, true);
    _drawCorner(canvas, cornerPaint, rect.topRight, corner, false, true);
    _drawCorner(canvas, cornerPaint, rect.bottomRight, corner, false, false);
    _drawCorner(canvas, cornerPaint, rect.bottomLeft, corner, true, false);
  }

  void _drawSlotFrame(
    Canvas canvas,
    Rect rect,
    Color edgeColor, {
    required int index,
    required bool active,
  }) {
    final activeColor = active ? edgeColor : Colors.white;
    final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(18));
    final fillPaint = Paint()
      ..color = Colors.white.withValues(alpha: active ? 0.035 : 0.020)
      ..style = PaintingStyle.fill;
    canvas.drawRRect(rrect, fillPaint);

    final borderPaint = Paint()
      ..color = activeColor.withValues(alpha: active ? 0.82 : 0.44)
      ..style = PaintingStyle.stroke
      ..strokeWidth = active ? 2.2 : 1.4
      ..strokeCap = StrokeCap.round;
    canvas.drawRRect(rrect, borderPaint);

    final cornerPaint = Paint()
      ..color = activeColor.withValues(alpha: active ? 0.92 : 0.58)
      ..style = PaintingStyle.stroke
      ..strokeWidth = active ? 2.7 : 2.0
      ..strokeCap = StrokeCap.round;
    final corner = (rect.width * 0.12).clamp(16.0, 30.0);
    _drawCorner(canvas, cornerPaint, rect.topLeft, corner, true, true);
    _drawCorner(canvas, cornerPaint, rect.topRight, corner, false, true);
    _drawCorner(canvas, cornerPaint, rect.bottomRight, corner, false, false);
    _drawCorner(canvas, cornerPaint, rect.bottomLeft, corner, true, false);

    final labelPainter = TextPainter(
      text: TextSpan(
        text: '${index + 1}',
        style: TextStyle(
          color: Colors.black.withValues(alpha: 0.74),
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 0,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    final labelWidth = math.max(22.0, labelPainter.width + 11);
    final labelHeight = math.max(22.0, labelPainter.height + 6);
    final labelRect = Rect.fromLTWH(
      rect.left + 8,
      rect.top + 8,
      labelWidth,
      labelHeight,
    );
    final labelPaint = Paint()
      ..color = activeColor.withValues(alpha: active ? 0.88 : 0.62)
      ..style = PaintingStyle.fill;
    canvas.drawRRect(
      RRect.fromRectAndRadius(labelRect, const Radius.circular(999)),
      labelPaint,
    );
    labelPainter.paint(
      canvas,
      Offset(
        labelRect.center.dx - (labelPainter.width / 2),
        labelRect.center.dy - (labelPainter.height / 2),
      ),
    );
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
        oldDelegate.cameraViewportRect != cameraViewportRect ||
        oldDelegate.guidedSlotQuadsNorm != guidedSlotQuadsNorm ||
        oldDelegate.activeGuidedSlotIndex != activeGuidedSlotIndex ||
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
