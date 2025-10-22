import 'package:flutter/material.dart';

/// Simple square reticle overlay for camera preview.
class ScanFrame extends StatelessWidget {
  final double size;
  final double strokeWidth;
  final Color color;
  const ScanFrame({super.key, this.size = 240, this.strokeWidth = 3, this.color = Colors.white});

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Center(
        child: CustomPaint(
          size: Size.square(size),
          painter: _ScanFramePainter(strokeWidth: strokeWidth, color: color.withValues(alpha: 0.9)),
        ),
      ),
    );
  }
}

class _ScanFramePainter extends CustomPainter {
  final double strokeWidth;
  final Color color;
  _ScanFramePainter({required this.strokeWidth, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;
    final r = Rect.fromLTWH(0, 0, size.width, size.height);
    // Draw corner marks
    const corner = 18.0;
    // Top-left
    canvas.drawLine(Offset(r.left, r.top), Offset(r.left + corner, r.top), paint);
    canvas.drawLine(Offset(r.left, r.top), Offset(r.left, r.top + corner), paint);
    // Top-right
    canvas.drawLine(Offset(r.right, r.top), Offset(r.right - corner, r.top), paint);
    canvas.drawLine(Offset(r.right, r.top), Offset(r.right, r.top + corner), paint);
    // Bottom-left
    canvas.drawLine(Offset(r.left, r.bottom), Offset(r.left + corner, r.bottom), paint);
    canvas.drawLine(Offset(r.left, r.bottom), Offset(r.left, r.bottom - corner), paint);
    // Bottom-right
    canvas.drawLine(Offset(r.right, r.bottom), Offset(r.right - corner, r.bottom), paint);
    canvas.drawLine(Offset(r.right, r.bottom), Offset(r.right, r.bottom - corner), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
