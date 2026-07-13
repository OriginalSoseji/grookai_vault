import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'grookai_object_skin.dart';

/// Fixed-size (400x560) decorative shell shared by every generated card
/// object (Memory, For Sale, Lot) in all three skins. Content is passed in
/// as [child] — the frame owns background, border, shadow, and the skin's
/// corner treatment. Content widgets stay skin-agnostic aside from reading
/// [GrookaiObjectTokens] for color/type — see grookai_object_atoms.dart.
class GrookaiObjectFrame extends StatelessWidget {
  static const double width = 400;
  static const double height = 560;

  final GrookaiObjectSkin skin;
  final Widget child;
  final EdgeInsets padding;

  /// Kraft-only, hang-tag detail: For Sale / Lot objects show a circular
  /// "hole punch" at top-center. Memory objects should leave this false.
  final bool holePunch;

  const GrookaiObjectFrame({
    super.key,
    required this.skin,
    required this.child,
    this.padding = const EdgeInsets.all(28),
    this.holePunch = false,
  });

  @override
  Widget build(BuildContext context) {
    final t = grookaiObjectTokens[skin]!;
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        gradient: t.background,
        borderRadius: BorderRadius.circular(t.cornerRadius),
        border: t.cornerStyle == CardCornerStyle.doubleBorder
            ? null // Ivory draws its border as an inset overlay below instead
            : Border.all(color: t.borderColor, width: t.borderWidth),
        boxShadow: t.shadow,
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          ..._cornerDecoration(t),
          if (holePunch)
            Positioned(
              top: 20,
              left: width / 2 - 10,
              child: Container(
                width: 20,
                height: 20,
                decoration: const BoxDecoration(
                  color: Color(0xFF16171A),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black54,
                      blurRadius: 4,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
              ),
            ),
          Padding(padding: padding, child: child),
        ],
      ),
    );
  }

  List<Widget> _cornerDecoration(GrookaiObjectTokens t) {
    switch (t.cornerStyle) {
      case CardCornerStyle.brackets:
        // Four L-shaped brackets, 16px in from each corner, 16px arms.
        return [
          for (final corner in _Corner.values)
            Positioned(
              top: corner.top ? 16 : null,
              bottom: !corner.top ? 16 : null,
              left: corner.left ? 16 : null,
              right: !corner.left ? 16 : null,
              child: _CornerBracket(color: t.cornerAccent, corner: corner),
            ),
        ];
      case CardCornerStyle.doubleBorder:
        return [
          Positioned.fill(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  border: Border.all(color: t.borderColor, width: 1),
                ),
              ),
            ),
          ),
          Positioned.fill(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  border: Border.all(color: t.cornerAccent, width: 1),
                ),
              ),
            ),
          ),
        ];
      case CardCornerStyle.dashedBorder:
        return [
          Positioned.fill(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: CustomPaint(
                painter: _DashedBorderPainter(color: t.cornerAccent, radius: 4),
              ),
            ),
          ),
        ];
    }
  }
}

enum _Corner {
  topLeft(top: true, left: true),
  topRight(top: true, left: false),
  bottomLeft(top: false, left: true),
  bottomRight(top: false, left: false);

  final bool top;
  final bool left;
  const _Corner({required this.top, required this.left});
}

class _CornerBracket extends StatelessWidget {
  final Color color;
  final _Corner corner;
  const _CornerBracket({required this.color, required this.corner});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 16,
      height: 16,
      child: CustomPaint(
        painter: _BracketPainter(color: color, corner: corner),
      ),
    );
  }
}

class _BracketPainter extends CustomPainter {
  final Color color;
  final _Corner corner;
  _BracketPainter({required this.color, required this.corner});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;
    final path = Path();
    switch (corner) {
      case _Corner.topLeft:
        path.moveTo(0, size.height);
        path.lineTo(0, 4);
        path.quadraticBezierTo(0, 0, 4, 0);
        path.lineTo(size.width, 0);
        break;
      case _Corner.topRight:
        path.moveTo(0, 0);
        path.lineTo(size.width - 4, 0);
        path.quadraticBezierTo(size.width, 0, size.width, 4);
        path.lineTo(size.width, size.height);
        break;
      case _Corner.bottomLeft:
        path.moveTo(size.width, size.height);
        path.lineTo(4, size.height);
        path.quadraticBezierTo(0, size.height, 0, size.height - 4);
        path.lineTo(0, 0);
        break;
      case _Corner.bottomRight:
        path.moveTo(0, size.height);
        path.lineTo(size.width - 4, size.height);
        path.quadraticBezierTo(
          size.width,
          size.height,
          size.width,
          size.height - 4,
        );
        path.lineTo(size.width, 0);
        break;
    }
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _BracketPainter oldDelegate) => false;
}

class _DashedBorderPainter extends CustomPainter {
  final Color color;
  final double radius;
  _DashedBorderPainter({required this.color, required this.radius});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;
    final rrect = RRect.fromRectAndRadius(
      Offset.zero & size,
      Radius.circular(radius),
    );
    const dashWidth = 6.0, dashGap = 5.0;
    final path = Path()..addRRect(rrect);
    for (final metric in path.computeMetrics()) {
      double distance = 0;
      while (distance < metric.length) {
        final next = math.min(distance + dashWidth, metric.length);
        canvas.drawPath(metric.extractPath(distance, next), paint);
        distance = next + dashGap;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DashedBorderPainter oldDelegate) => false;
}
