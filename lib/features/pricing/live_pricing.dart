/* lib/features/pricing/live_pricing.dart
   Grookai Vault — Live Pricing (ticker + chart) */

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:fl_chart/fl_chart.dart';

// ---------- Models ----------
class PricePoint {
  final DateTime t;
  final double y;
  PricePoint(this.t, this.y);
}
extension _NumX on num? { double get d => (this ?? 0).toDouble(); }
String _money(num? v, {String currency = 'USD'}) {
  final n = NumberFormat.currency(symbol: currency == 'USD' ? '\$' : '');
  return n.format((v ?? 0).toDouble());
}
Color _deltaColor(num? pct) {
  if (pct == null) return Colors.grey;
  return pct >= 0 ? Colors.green : Colors.red;
}

// ---------- Repository ----------
class PricingRepo {
  final SupabaseClient _supa;
  PricingRepo(this._supa);

  Future<Map<String, dynamic>?> ticker24h(String setCode, String number) async {
    final rows = await _supa.from('v_ticker_24h').select()
      .eq('set_code', setCode).eq('number', number).limit(1);
    if (rows.isEmpty) return null;
    return (rows.first as Map<String, dynamic>);
  }

  Future<String?> cardPrintId(String setCode, String number) async {
    final rows = await _supa.from('card_prints').select('id')
      .eq('set_code', setCode).eq('number', number).limit(1);
    if (rows.isEmpty) return null;
    return (rows.first as Map<String, dynamic>)['id'] as String?;
  }

  Future<List<PricePoint>> history(
      String setCode, String number, {String source = 'tcgplayer', int hours = 168}) async {
    final res = await _supa.rpc('card_history', params: {
      '_set_code': setCode, '_number': number, '_source': source, '_hours': hours,
    });
    final list = (res as List).map((e) => PricePoint(
      DateTime.parse(e['ts'] as String), (e['market'] as num?)?.d ?? 0)).toList();
    return list;
  }

  Stream<Map<String, dynamic>> subscribeTicksByPrintId(String cardPrintId) {
    final controller = StreamController<Map<String, dynamic>>.broadcast();
    final channel = _supa.channel('ticks_$cardPrintId')
      ..onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'card_price_ticks',
        filter: PostgresChangeFilter.eq('card_print_id', cardPrintId),
        callback: (payload) => controller.add(payload.newRecord),
      )
      ..subscribe();
    controller.onCancel = () => _supa.removeChannel(channel);
    return controller.stream;
  }
}

// ---------- UI: Price pill ----------
class PricePill extends StatelessWidget {
  final num? market; final num? pctChange24h; final String currency;
  const PricePill({super.key, this.market, this.pctChange24h, this.currency = 'USD'});
  @override
  Widget build(BuildContext context) {
    final color = _deltaColor(pctChange24h);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).dividerColor.withOpacity(.2)),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Text(_money(market, currency: currency), style: const TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(width: 8),
        Icon(pctChange24h != null && pctChange24h! >= 0 ? Icons.arrow_upward : Icons.arrow_downward,
            size: 16, color: color),
        Text(pctChange24h == null ? '—' : '${pctChange24h!.toStringAsFixed(2)}%',
            style: TextStyle(color: color, fontWeight: FontWeight.w600))
      ]),
    );
  }
}

// ---------- UI: Ticker list tile ----------
class TickerListTile extends StatefulWidget {
  final String setCode; final String number; final String source;
  const TickerListTile({super.key, required this.setCode, required this.number, this.source = 'tcgplayer'});
  @override State<TickerListTile> createState() => _TickerListTileState();
}
class _TickerListTileState extends State<TickerListTile> {
  late final PricingRepo repo; Map<String, dynamic>? _ticker;
  StreamSubscription<Map<String, dynamic>>? _sub;

  @override void initState() { super.initState(); repo = PricingRepo(Supabase.instance.client); _load(); }
  Future<void> _load() async {
    final t = await repo.ticker24h(widget.setCode, widget.number);
    if (!mounted) return; setState(() => _ticker = t);
    final printId = await repo.cardPrintId(widget.setCode, widget.number);
    if (printId != null) {
      _sub = repo.subscribeTicksByPrintId(printId).listen((tick) {
        if (!mounted) return;
        setState(() { _ticker = {...?_ticker, 'market_now': tick['market'], 'last_updated': tick['captured_at']}; });
      });
    }
  }
  @override void dispose() { _sub?.cancel(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final title = Text('${widget.setCode.toUpperCase()}  #${widget.number}',
        style: const TextStyle(fontWeight: FontWeight.w600));
    final subtitle = _ticker == null
        ? const Text('Loading…')
        : Text('Last updated: ${_ticker!['last_updated'] ?? '—'}',
            style: Theme.of(context).textTheme.bodySmall);
    return ListTile(
      leading: const Icon(Icons.show_chart_rounded),
      title: title, subtitle: subtitle,
      trailing: PricePill(
        market: _ticker?['market_now'] as num?, pctChange24h: _ticker?['pct_change_24h'] as num?, currency: 'USD',
      ),
      onTap: () => Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => CardPriceChartPage(setCode: widget.setCode, number: widget.number, source: widget.source),
      )),
    );
  }
}

// ---------- UI: Chart page ----------
class CardPriceChartPage extends StatefulWidget {
  final String setCode; final String number; final String source;
  const CardPriceChartPage({super.key, required this.setCode, required this.number, this.source = 'tcgplayer'});
  @override State<CardPriceChartPage> createState() => _CardPriceChartPageState();
}
class _CardPriceChartPageState extends State<CardPriceChartPage> {
  late final PricingRepo repo; List<PricePoint> _data = [];
  StreamSubscription<Map<String, dynamic>>? _sub;

  @override void initState() { super.initState(); repo = PricingRepo(Supabase.instance.client); _bootstrap(); }
  Future<void> _bootstrap() async {
    final pts = await repo.history(widget.setCode, widget.number, source: widget.source, hours: 168);
    if (!mounted) return; setState(() => _data = pts);
    final printId = await repo.cardPrintId(widget.setCode, widget.number);
    if (printId != null) {
      _sub = repo.subscribeTicksByPrintId(printId).listen((tick) {
        if (!mounted) return;
        setState(() { _data = List.of(_data)
          ..add(PricePoint(DateTime.parse(tick['captured_at'] as String), (tick['market'] as num?)?.d ?? 0)); });
      });
    }
  }
  @override void dispose() { _sub?.cancel(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Price — ${widget.setCode.toUpperCase()} #${widget.number}')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: _data.isEmpty ? const Center(child: CircularProgressIndicator()) : _LineChart(data: _data),
      ),
    );
  }
}

class _LineChart extends StatelessWidget {
  final List<PricePoint> data;
  const _LineChart({required this.data});
  @override Widget build(BuildContext context) {
    if (data.isEmpty) return const SizedBox.shrink();
    final start = data.first.t;
    final spots = <FlSpot>[];
    for (final p in data) {
      final x = p.t.difference(start).inMinutes / 60.0; // hours from start
      spots.add(FlSpot(x, p.y));
    }
    final minY = data.map((e) => e.y).reduce((a, b) => a < b ? a : b);
    final maxY = data.map((e) => e.y).reduce((a, b) => a > b ? a : b);

    String xLabel(double x) {
      final dt = start.add(Duration(minutes: (x * 60).round()));
      return DateFormat('MM/dd HH:mm').format(dt);
    }

    return LineChart(LineChartData(
      lineTouchData: LineTouchData(
        touchTooltipData: LineTouchTooltipData(
          getTooltipItems: (spots) => spots.map((s) {
            final dt = start.add(Duration(minutes: (s.x * 60).round()));
            return LineTooltipItem(
              '${DateFormat('MM/dd HH:mm').format(dt)}\\n${_money(s.y)}',
              const TextStyle(fontWeight: FontWeight.w600),
            );
          }).toList(),
        ),
      ),
      gridData: FlGridData(show: true, drawVerticalLine: false),
      titlesData: FlTitlesData(
        bottomTitles: AxisTitles(sideTitles: SideTitles(
          showTitles: true,
          interval: (spots.length / 6).ceilToDouble().clamp(1, 24),
          getTitlesWidget: (v, meta) =>
              SideTitleWidget(axisSide: meta.axisSide, child: Text(xLabel(v), style: const TextStyle(fontSize: 10))),
        )),
        leftTitles: AxisTitles(sideTitles: SideTitles(
          showTitles: true, reservedSize: 44,
          getTitlesWidget: (v, meta) => SideTitleWidget(axisSide: meta.axisSide, child: Text(_money(v))),
        )),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
      ),
      minY: (minY * 0.95), maxY: (maxY * 1.05),
      lineBarsData: [ LineChartBarData(spots: spots, isCurved: true, barWidth: 2.5, dotData: const FlDotData(show: false)) ],
    ));
  }
}

// ---------- Demo page (optional) ----------
class PricingDemoPage extends StatelessWidget {
  const PricingDemoPage({super.key});
  @override Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Grookai Vault — Live Pricing')),
      body: ListView(children: const [
        SizedBox(height: 12),
        TickerListTile(setCode: 'sv6', number: '1'),
        Divider(),
        TickerListTile(setCode: 'sv6', number: '12'),
        Divider(),
        TickerListTile(setCode: 'sv7', number: '15'),
        SizedBox(height: 24),
      ]),
    );
  }
}
