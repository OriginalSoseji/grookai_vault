import "dart:math" as math;
import "package:flutter/material.dart";
import "package:supabase_flutter/supabase_flutter.dart";

/// Source-agnostic price chart:
/// - Resolve card_id from (setCode, number) if needed
/// - Load time series from prices(card_id)
/// - Load latest from v_latest_price_pref (prefers tcgdex)
class CardPriceChartPage extends StatefulWidget {
  final String setCode;
  final String number;
  final String? cardId; // optional override

  const CardPriceChartPage({
    super.key,
    required this.setCode,
    required this.number,
    this.cardId,
  });

  @override
  State<CardPriceChartPage> createState() => _CardPriceChartPageState();
}

class _CardPriceChartPageState extends State<CardPriceChartPage> {
  final supabase = Supabase.instance.client;

  String? _cardId;
  bool _loading = true;
  String? _error;

  // Data
  List<_PricePoint> _series = [];
  num? _latest;     // from v_latest_price_pref
  String? _source;  // source of the latest row
  DateTime? _latestTs;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    setState(() { _loading = true; _error = null; });

    try {
      // 1) Resolve card_id
      String? cardId = widget.cardId;
      if (cardId == null || cardId.isEmpty) {
        final rows = await supabase
          .from("card_prints")
          .select("id")
          .eq("set_code", widget.setCode)
          .eq("number", widget.number)
          .limit(1);
        if (rows is List && rows.isNotEmpty) {
          cardId = rows.first["id"]?.toString();
        }
      }
      if (cardId == null || cardId.isEmpty) {
        throw Exception("Could not resolve card_id for ${widget.setCode} #${widget.number}");
      }
      _cardId = cardId;

      // 2) Load preferred latest (source-agnostic)
      final latest = await supabase
        .from("v_latest_price_pref")
        .select("market_price, source, ts")
        .eq("card_id", cardId)
        .limit(1);
      if (latest is List && latest.isNotEmpty) {
        final row = latest.first;
        _latest = (row["market_price"] ?? 0) as num;
        _source = row["source"]?.toString();
        final tsRaw = row["ts"]?.toString();
        _latestTs = tsRaw != null ? DateTime.tryParse(tsRaw) : null;
      }

      // 3) Load full time series for this card
      final series = await supabase
        .from("prices")
        .select("ts, market_price")
        .eq("card_id", cardId)
        .order("ts", ascending: true);

      _series = [];
      if (series is List) {
        for (final r in series) {
          final tsRaw = r["ts"]?.toString();
          final dt = tsRaw != null ? DateTime.tryParse(tsRaw) : null;
          final p  = r["market_price"];
          if (dt != null && p is num) {
            _series.add(_PricePoint(dt, p.toDouble()));
          }
        }
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = "${widget.setCode} · #${widget.number}";
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [
          IconButton(
            tooltip: "Refresh",
            icon: const Icon(Icons.refresh),
            onPressed: _loading ? null : _init,
          )
        ],
      ),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : _error != null
          ? _errorView()
          : _contentView(),
    );
  }

  Widget _errorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Text("Price view error:\n$_error", textAlign: TextAlign.center),
      ),
    );
  }

  Widget _contentView() {
    final latestLine = _latest != null ? "\$${_latest!.toStringAsFixed(2)}" : "—";
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _kv("Card ID", _cardId ?? "—"),
        const SizedBox(height: 8),
        _kv("Latest (preferred)", latestLine),
        _kv("Source", _source ?? "—"),
        _kv("As of", _latestTs?.toLocal().toString() ?? "—"),
        const SizedBox(height: 16),
        if (_series.length >= 2) _chartCard(_series) else _noSeriesCard(),
      ],
    );
  }

  Widget _kv(String k, String v) {
    return Row(
      children: [
        SizedBox(width: 150, child: Text(k, style: const TextStyle(color: Colors.black54))),
        Expanded(child: Text(v, style: const TextStyle(fontWeight: FontWeight.w600))),
      ],
    );
  }

  Widget _noSeriesCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Text(
          "Not enough points to draw a chart yet.",
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ),
    );
  }

  Widget _chartCard(List<_PricePoint> points) {
    // Compute bounds
    double minY = points.first.price, maxY = points.first.price;
    DateTime minX = points.first.ts,   maxX = points.first.ts;
    for (final p in points) {
      if (p.price < minY) minY = p.price;
      if (p.price > maxY) maxY = p.price;
      if (p.ts.isBefore(minX)) minX = p.ts;
      if (p.ts.isAfter(maxX))  maxX = p.ts;
    }
    // Expand a bit for nice padding
    final double pad = (maxY - minY) * 0.08;
    minY -= pad;
    maxY += pad;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Price over time", style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            SizedBox(
              height: 220,
              child: CustomPaint(
                painter: _SparklinePainter(points, minX, maxX, minY, maxY),
                child: Container(),
              ),
            ),
            const SizedBox(height: 8),
            Text("Points: ${points.length}"),
          ],
        ),
      ),
    );
  }
}

class _PricePoint {
  final DateTime ts;
  final double price;
  _PricePoint(this.ts, this.price);
}

class _SparklinePainter extends CustomPainter {
  final List<_PricePoint> pts;
  final DateTime minX, maxX;
  final double minY, maxY;

  _SparklinePainter(this.pts, this.minX, this.maxX, this.minY, this.maxY);

  @override
  void paint(Canvas canvas, Size size) {
    if (pts.isEmpty) return;

    final double w = size.width;
    final double h = size.height;
    final double dx = (maxX.millisecondsSinceEpoch - minX.millisecondsSinceEpoch).toDouble();
    final double dy = (maxY - minY);

    final Paint line = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..color = Colors.blueAccent;

    final Paint fill = Paint()
      ..style = PaintingStyle.fill
      ..color = Colors.blueAccent.withOpacity(0.12);

    final Path path = Path();
    final Path fillPath = Path();

    for (int i = 0; i < pts.length; i++) {
      final p = pts[i];
      final double tx = (p.ts.millisecondsSinceEpoch - minX.millisecondsSinceEpoch).toDouble();
      final double x = dx == 0.0 ? 0.0 : (tx / dx) * (w - 1.0);
      final double yNorm = dy == 0.0 ? 0.5 : (p.price - minY) / dy;
      final double y = math.max(0.0, math.min(h, h - yNorm * (h - 1.0)));

      if (i == 0) {
        path.moveTo(x, y);
        fillPath.moveTo(x, h);
        fillPath.lineTo(x, y);
      } else {
        path.lineTo(x, y);
        fillPath.lineTo(x, y);
      }
      if (i == pts.length - 1) {
        fillPath.lineTo(x, h);
        fillPath.close();
      }
    }

    canvas.drawPath(fillPath, fill);
    canvas.drawPath(path, line);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
