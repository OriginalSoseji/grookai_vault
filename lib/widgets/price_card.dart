import 'package:flutter/material.dart';

class PriceCard extends StatelessWidget {
  final num? gi;
  final DateTime? ts;
  final num? retailFloor;
  final num? marketFloor;
  final num? gv;
  final List<num>? trend; // oldest -> newest
  final Duration? age; // staleness
  final List<String> sources;

  const PriceCard({
    super.key,
    required this.gi,
    required this.ts,
    required this.retailFloor,
    required this.marketFloor,
    this.gv,
    this.trend,
    this.age,
    this.sources = const [],
  });

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  gi != null ? '\$${gi!.toStringAsFixed(2)}' : '-',
                  style: text.headlineSmall,
                ),
                const SizedBox(width: 8),
                _BadgesDynamic(sources: sources),
                const Spacer(),
                if (age != null)
                  Row(
                    children: [
                      Icon(Icons.circle, size: 8, color: _ageColor(context)),
                      const SizedBox(width: 6),
                      Text(_ageText(), style: text.labelSmall?.copyWith(color: _ageColor(context))),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: 8),
            if ((trend ?? const []).isNotEmpty) _Sparkline(points: trend!),
            const SizedBox(height: 8),
            _row('Retail Floor (JTCG)', retailFloor, context),
            _row('Market Floor (eBay BIN)', marketFloor, context),
            if (gv != null) _row('GV Baseline', gv, context),
            const SizedBox(height: 8),
            const _BlendInfo(),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, num? v, BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(child: Text(label, style: Theme.of(context).textTheme.bodySmall)),
          Text(v != null ? '\$${v.toStringAsFixed(2)}' : '-')
        ],
      ),
    );
  }

  Color _ageColor(BuildContext ctx) {
    if (age == null) return Theme.of(ctx).textTheme.labelSmall?.color ?? Colors.black54;
    final m = age!.inMinutes;
    if (m <= 360) return Colors.green;
    if (m <= 1440) return Colors.orange;
    return Colors.red;
  }

  String _ageText() {
    if (age == null) return '';
    final m = age!.inMinutes;
    if (m < 60) return 'Updated ${m}m ago';
    final h = age!.inHours;
    return 'Updated ${h}h ago';
  }
}

class _BadgesDynamic extends StatelessWidget {
  final List<String> sources;
  const _BadgesDynamic({required this.sources});
  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.labelSmall;
    final chips = <Widget>[];
    for (final s in sources) {
      chips.add(_pill(s, style));
      chips.add(const SizedBox(width: 4));
    }
    if (chips.isNotEmpty) chips.removeLast();
    return Row(children: chips);
  }
  Widget _pill(String t, TextStyle? s) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(color: Colors.black12, borderRadius: BorderRadius.circular(8)),
        child: Text(t, style: s),
      );
}

class _BlendInfo extends StatelessWidget {
  const _BlendInfo();
  @override
  Widget build(BuildContext context) {
    return Row(children: [
      const Text('ℹ️', style: TextStyle(fontSize: 12)),
      const SizedBox(width: 6),
      Expanded(child: Text('Grookai Index: JTCG 45% • eBay Sold 35% • GV 20% (renormalized if missing).', style: Theme.of(context).textTheme.labelSmall)),
    ]);
  }
}

class _Sparkline extends StatelessWidget {
  final List<num> points;
  const _Sparkline({required this.points});
  @override
  Widget build(BuildContext context) {
    if (points.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: 36,
      child: CustomPaint(
        painter: _SparklinePainter(points.map((e) => e.toDouble()).toList()),
      ),
    );
  }
}

class _SparklinePainter extends CustomPainter {
  final List<double> pts;
  _SparklinePainter(this.pts);
  @override
  void paint(Canvas canvas, Size size) {
    if (pts.length < 2) return;
    final minV = pts.reduce((a, b) => a < b ? a : b);
    final maxV = pts.reduce((a, b) => a > b ? a : b);
    final span = (maxV - minV).abs() < 1e-6 ? 1.0 : (maxV - minV);
    final dx = size.width / (pts.length - 1);
    final path = Path();
    for (var i = 0; i < pts.length; i++) {
      final x = i * dx;
      final y = size.height - ((pts[i] - minV) / span) * size.height;
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..color = Colors.black45;
    canvas.drawPath(path, paint);
  }
  @override
  bool shouldRepaint(covariant _SparklinePainter old) => old.pts != pts;
}

