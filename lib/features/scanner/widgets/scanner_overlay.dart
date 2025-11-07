import 'package:flutter/material.dart';
import 'package:grookai_vault/ui/app/theme.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/theme/thunder_palette.dart';

/// Subtle framing overlay for scan contexts (no permanent glow).
class ScannerOverlay extends StatelessWidget {
  final Widget child;
  final String? hint;
  const ScannerOverlay({super.key, required this.child, this.hint});

  @override
  Widget build(BuildContext context) {
    final gv = GVTheme.of(context);
    return Stack(
      children: [
        Positioned.fill(child: child),
        // Soft frame corners
        Positioned.fill(
          child: IgnorePointer(
            child: CustomPaint(
              painter: _CornerPainter(color: Thunder.accent.withOpacity(0.6)),
            ),
          ),
        ),
        if ((hint ?? '').isNotEmpty)
          Positioned(
            bottom: GVSpacing.s16,
            left: GVSpacing.s16,
            right: GVSpacing.s16,
            child: Center(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: gv.colors.card.withOpacity(0.9),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: GVSpacing.s16,
                    vertical: GVSpacing.s8,
                  ),
                  child: Text(
                    hint!,
                    style: gv.typography.caption.copyWith(color: gv.colors.textPrimary),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _CornerPainter extends CustomPainter {
  final Color color;
  const _CornerPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;
    const len = 20.0;
    final r = Rect.fromLTWH(16, 16, size.width - 32, size.height - 32);
    // Corners
    // TL
    canvas.drawLine(Offset(r.left, r.top), Offset(r.left + len, r.top), paint);
    canvas.drawLine(Offset(r.left, r.top), Offset(r.left, r.top + len), paint);
    // TR
    canvas.drawLine(Offset(r.right - len, r.top), Offset(r.right, r.top), paint);
    canvas.drawLine(Offset(r.right, r.top), Offset(r.right, r.top + len), paint);
    // BL
    canvas.drawLine(Offset(r.left, r.bottom), Offset(r.left + len, r.bottom), paint);
    canvas.drawLine(Offset(r.left, r.bottom - len), Offset(r.left, r.bottom), paint);
    // BR
    canvas.drawLine(Offset(r.right - len, r.bottom), Offset(r.right, r.bottom), paint);
    canvas.drawLine(Offset(r.right, r.bottom - len), Offset(r.right, r.bottom), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
