import 'package:flutter/material.dart';

/// Backward-compatible PriceCard with header polish:
/// - Accepts legacy names (gi, ts, gv) and new names (giMid, observedAt, gvBaseline)
/// - Adds optional trend (oldest→newest), pct7d, age, and dynamic sources
class PriceCard extends StatelessWidget {
  // New names
  final num? giMid;
  final DateTime? observedAt;
  final num? retailFloor;
  final num? marketFloor;
  final num? gvBaseline;

  // Legacy names (compat)
  final num? gi;
  final DateTime? ts;
  final num? gv;

  // Header polish
  final List<num>? trend;       // oldest → newest
  final double? pct7d;          // percent change over window
  final Duration? age;          // staleness
  final List<String>? sources;  // dynamic badges: ['JTCG','eBay','GV']

  const PriceCard({
    super.key,
    // legacy
    this.gi,
    this.ts,
    this.gv,
    // new
    this.giMid,
    this.observedAt,
    required this.retailFloor,
    required this.marketFloor,
    this.gvBaseline,
    // polish (optional)
    this.trend,
    this.pct7d,
    this.age,
    this.sources,
  });

  const PriceCard.shimmer({super.key})
      : gi = null, ts = null, gv = null,
        giMid = null, observedAt = null,
        retailFloor = null, marketFloor = null,
        gvBaseline = null,
        trend = const [], pct7d = null, age = null, sources = const [];

  num? get _mid => giMid ?? gi;
  DateTime? get _ts => observedAt ?? ts;
  num? get _gv => gvBaseline ?? gv;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Card(
      elevation: 0.8,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Headline row: Index, arrow% and timestamp
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(_mid != null ? _money(_mid!) : '—', style: text.headlineSmall),
                const SizedBox(width: 8),
                _Delta(pct7d: pct7d),
                const Spacer(),
                if (_ts != null) _Updated(age: age, ts: _ts!),
              ],
            ),
            const SizedBox(height: 8),

            // Sparkline (trend)
            if ((trend ?? const []).isNotEmpty) _Sparkline(points: trend!),
            if ((trend ?? const []).isNotEmpty) const SizedBox(height: 8),

            // Floors + optional GV
            _line(context, 'Retail Floor (JTCG)', retailFloor),
            _line(context, 'Market Floor (eBay BIN)', marketFloor),
            if (_gv != null) _line(context, 'GV Baseline', _gv),

            const SizedBox(height: 8),

            // Dynamic badges + blend note
            Row(
              children: [
                _Badges(sources: sources ?? const ['JTCG','eBay'] + ( (_gv!=null) ? ['GV'] : [] )),
                const SizedBox(width: 8),
                const Expanded(child: _BlendInfo()),
              ],
            ),
          ],
        ),
      ),
    );
  }

  static String _money(num v) => '\$${v.toStringAsFixed(2)}';

  Widget _line(BuildContext context, String label, num? v) {
    final small = Theme.of(context).textTheme.bodySmall;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(child: Text(label, style: small)),
          Text(v != null ? _money(v) : '—'),
        ],
      ),
    );
  }
}

class _Delta extends StatelessWidget {
  final double? pct7d;
  const _Delta({this.pct7d});

  @override
  Widget build(BuildContext context) {
    if (pct7d == null) return const SizedBox.shrink();
    final v = pct7d!;
    final up = v >= 0;
    final color = up ? Colors.green : Colors.red;
    final arrow = up ? Icons.trending_up : Icons.trending_down;
    return Row(
      children: [
        Icon(arrow, size: 16, color: color),
        const SizedBox(width: 4),
        Text('${v.abs().toStringAsFixed(1)}%', style: TextStyle(color: color)),
      ],
    );
  }
}

class _Updated extends StatelessWidget {
  final Duration? age;
  final DateTime ts;
  const _Updated({required this.age, required this.ts});

  Color _ageColor() {
    if (age == null) return Colors.black54;
    final m = age!.inMinutes;
    if (m <= 360) return Colors.green;   // ≤ 6h
    if (m <= 1440) return Colors.orange; // ≤ 24h
    return Colors.red;                   // > 24h
  }

  @override
  Widget build(BuildContext context) {
    final small = Theme.of(context).textTheme.labelSmall;
    final pretty = ts.toLocal().toString().split('.').first;
    return Row(
      children: [
        Icon(Icons.circle, size: 8, color: _ageColor()),
        const SizedBox(width: 6),
        Text('Updated $pretty', style: small),
      ],
    );
  }
}

class _Badges extends StatelessWidget {
  final List<String> sources;
  const _Badges({required this.sources});

  @override
  Widget build(BuildContext context) {
    final s = Theme.of(context).textTheme.labelSmall;
    return Row(
      children: [
        for (int i=0;i<sources.length;i++) ...[
          _pill(sources[i], s),
          if (i < sources.length-1) const SizedBox(width: 4),
        ]
      ],
    );
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
    final small = Theme.of(context).textTheme.labelSmall;
    return Text(
      'Grookai Index = JTCG 45% • eBay Sold 35% • GV 20% (renormalized if missing).',
      style: small,
      overflow: TextOverflow.ellipsis,
      maxLines: 2,
    );
  }
}

// Lightweight sparkline painter (no deps)
class _Sparkline extends StatelessWidget {
  final List<num> points; // oldest → newest
  const _Sparkline({required this.points});
  @override
  Widget build(BuildContext context) {
    if (points.length < 2) return const SizedBox.shrink();
    return SizedBox(height: 36, child: CustomPaint(painter: _SparklinePainter(points)));
  }
}

class _SparklinePainter extends CustomPainter {
  final List<num> pts;
  _SparklinePainter(this.pts);
  @override
  void paint(Canvas canvas, Size size) {
    final points = pts.map((e) => e.toDouble()).toList();
    final minV = points.reduce((a,b) => a < b ? a : b);
    final maxV = points.reduce((a,b) => a > b ? a : b);
    final span = (maxV - minV).abs() < 1e-6 ? 1.0 : (maxV - minV);
    final dx = size.width / (points.length - 1);
    final path = Path();
    for (var i = 0; i < points.length; i++) {
      final x = i * dx;
      final y = size.height - ((points[i] - minV) / span) * size.height;
      if (i == 0) path.moveTo(x, y); else path.lineTo(x, y);
    }
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = Colors.black45;
    canvas.drawPath(path, paint);
  }
  @override
  bool shouldRepaint(covariant _SparklinePainter old) => old.pts != pts;
}

