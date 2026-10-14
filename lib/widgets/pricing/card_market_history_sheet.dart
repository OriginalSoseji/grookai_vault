import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/pricing/card_sold_comps_service.dart';
import '../../services/pricing/card_personal_sales_service.dart';

typedef CardMarketHistoryLoader =
    Future<List<Map<String, dynamic>>> Function(
      String cardPrintingId,
      int days,
    );
typedef CardPersonalSalesLoader =
    Future<List<CardPersonalSaleRecord>> Function(String cardPrintingId);

@immutable
class CardMarketHistoryPoint {
  const CardMarketHistoryPoint({
    required this.observedOn,
    required this.price,
    this.lowPrice,
    this.midPrice,
    this.highPrice,
  });

  final DateTime observedOn;
  final double price;
  final double? lowPrice;
  final double? midPrice;
  final double? highPrice;
}

enum _HistoryMetric {
  market('Market'),
  low('Low'),
  mid('Mid'),
  high('High');

  const _HistoryMetric(this.label);
  final String label;

  double? value(CardMarketHistoryPoint point) => switch (this) {
    market => point.price,
    low => point.lowPrice,
    mid => point.midPrice,
    high => point.highPrice,
  };
}

List<CardMarketHistoryPoint> parseCardMarketHistoryRows(
  Iterable<Map<String, dynamic>> rows,
) {
  final points = <CardMarketHistoryPoint>[];
  for (final row in rows) {
    final dateText = row['observed_on']?.toString().trim() ?? '';
    final parsedDate = DateTime.tryParse(dateText);
    final rawPrice = row['market_price'];
    final price = rawPrice is num
        ? rawPrice.toDouble()
        : double.tryParse(rawPrice?.toString() ?? '');
    if (parsedDate == null || price == null || !price.isFinite || price <= 0) {
      continue;
    }
    points.add(
      CardMarketHistoryPoint(
        observedOn: parsedDate.toLocal(),
        price: price,
        lowPrice: _optionalPositivePrice(row['low_price']),
        midPrice: _optionalPositivePrice(row['mid_price']),
        highPrice: _optionalPositivePrice(row['high_price']),
      ),
    );
  }
  points.sort((left, right) => left.observedOn.compareTo(right.observedOn));
  return List.unmodifiable(points);
}

double? _optionalPositivePrice(Object? raw) {
  final value = raw is num ? raw.toDouble() : double.tryParse('$raw');
  return value != null && value.isFinite && value > 0 ? value : null;
}

class CardMarketHistorySheet extends StatefulWidget {
  const CardMarketHistorySheet({
    super.key,
    required this.cardName,
    required this.printingLabel,
    required this.cardPrintingId,
    this.loader,
    this.loadPersonalSales,
    this.openSoldSearch,
    this.loadSoldComps,
  });

  final String cardName;
  final String printingLabel;
  final String cardPrintingId;
  final CardMarketHistoryLoader? loader;
  final CardPersonalSalesLoader? loadPersonalSales;
  final Future<void> Function()? openSoldSearch;
  final Future<CardSoldCompsResult> Function()? loadSoldComps;

  @override
  State<CardMarketHistorySheet> createState() => _CardMarketHistorySheetState();
}

class _CardMarketHistorySheetState extends State<CardMarketHistorySheet> {
  static const _periods = <int>[7, 30, 90, 180, 365, 3650];
  int _days = 30;
  _HistoryMetric _selectedMetric = _HistoryMetric.market;
  bool _loading = true;
  String? _error;
  List<CardMarketHistoryPoint> _points = const [];
  bool _compsLoading = false;
  String? _compsError;
  CardSoldCompsResult? _comps;
  bool _personalSalesLoading = false;
  String? _personalSalesError;
  List<CardPersonalSaleRecord> _personalSales = const [];

  @override
  void initState() {
    super.initState();
    _load();
    if (widget.loadPersonalSales != null) {
      unawaited(_loadPersonalSales());
    }
  }

  Future<List<Map<String, dynamic>>> _defaultLoad(
    String printingId,
    int days,
  ) async {
    final response = await Supabase.instance.client.rpc(
      'get_market_price_history_v1',
      params: {'p_card_printing_id': printingId, 'p_days': days},
    );
    return (response as List<dynamic>)
        .whereType<Map>()
        .map((row) => Map<String, dynamic>.from(row))
        .toList(growable: false);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows = await (widget.loader ?? _defaultLoad)(
        widget.cardPrintingId,
        _days,
      );
      if (!mounted) return;
      final points = parseCardMarketHistoryRows(rows);
      setState(() {
        _points = points;
        if (_selectedMetric != _HistoryMetric.market &&
            !points.any((point) => _selectedMetric.value(point) != null)) {
          _selectedMetric = _HistoryMetric.market;
        }
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error =
            'Price history could not load. Check your connection and retry.';
        _loading = false;
      });
    }
  }

  Future<void> _loadSoldComps() async {
    final loader = widget.loadSoldComps;
    if (loader == null || _compsLoading) return;
    setState(() {
      _compsLoading = true;
      _compsError = null;
    });
    try {
      final result = await loader();
      if (!mounted) return;
      setState(() => _comps = result);
    } catch (_) {
      if (!mounted) return;
      setState(() => _compsError = 'Sold comps are unavailable right now.');
    } finally {
      if (mounted) setState(() => _compsLoading = false);
    }
  }

  Future<void> _loadPersonalSales() async {
    final loader = widget.loadPersonalSales;
    if (loader == null || _personalSalesLoading) return;
    setState(() {
      _personalSalesLoading = true;
      _personalSalesError = null;
    });
    try {
      final sales = await loader(widget.cardPrintingId);
      if (!mounted) return;
      setState(() => _personalSales = sales);
    } catch (_) {
      if (!mounted) return;
      setState(() => _personalSalesError = 'Your sale history is unavailable.');
    } finally {
      if (mounted) setState(() => _personalSalesLoading = false);
    }
  }

  String _money(double value) => '\$${value.toStringAsFixed(2)}';

  String _saleMoney(double value, String currency) => currency == 'USD'
      ? _money(value)
      : '$currency ${value.toStringAsFixed(2)}';

  String _periodLabel(int days) => switch (days) {
    365 => '1y',
    3650 => 'All',
    _ => '${days}d',
  };

  String _date(DateTime value) =>
      '${_month(value.month)} ${value.day}, ${value.year}';

  String _month(int month) => const <String>[
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ][month - 1];

  Widget _metric(String label, String value, ColorScheme colors) => Expanded(
    child: Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colors.surfaceContainerHighest.withValues(alpha: 0.48),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelSmall),
          const SizedBox(height: 4),
          Text(value, style: Theme.of(context).textTheme.titleMedium),
        ],
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final availableMetrics = _HistoryMetric.values
        .where(
          (metric) =>
              metric == _HistoryMetric.market ||
              _points.any((point) => metric.value(point) != null),
        )
        .toList(growable: false);
    final plottedPoints = _points
        .map((point) => (point: point, value: _selectedMetric.value(point)))
        .where((entry) => entry.value != null)
        .map(
          (entry) => CardMarketHistoryPoint(
            observedOn: entry.point.observedOn,
            price: entry.value!,
          ),
        )
        .toList(growable: false);
    final first = plottedPoints.isEmpty ? null : plottedPoints.first;
    final last = plottedPoints.isEmpty ? null : plottedPoints.last;
    final low = plottedPoints.isEmpty
        ? null
        : plottedPoints.map((point) => point.price).reduce(math.min);
    final high = plottedPoints.isEmpty
        ? null
        : plottedPoints.map((point) => point.price).reduce(math.max);
    final change = first == null || last == null
        ? null
        : last.price - first.price;
    final percent = first == null || last == null || first.price == 0
        ? null
        : change! / first.price * 100;

    return DraggableScrollableSheet(
      initialChildSize: 0.76,
      minChildSize: 0.52,
      maxChildSize: 0.96,
      expand: false,
      builder: (context, scrollController) => Material(
        color: colors.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(26)),
        child: ListView(
          controller: scrollController,
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
          children: [
            Center(
              child: Container(
                width: 38,
                height: 4,
                decoration: BoxDecoration(
                  color: colors.onSurface.withValues(alpha: 0.20),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              'Price history',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 4),
            Text(
              '${widget.cardName} · ${widget.printingLabel}',
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: colors.onSurfaceVariant),
            ),
            const SizedBox(height: 4),
            Text(
              'TCGPlayer Market · exact printing',
              style: Theme.of(
                context,
              ).textTheme.labelMedium?.copyWith(color: colors.primary),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              children: [
                for (final period in _periods)
                  ChoiceChip(
                    key: Key('market_history_range_$period'),
                    label: Text(_periodLabel(period)),
                    selected: _days == period,
                    onSelected: _loading
                        ? null
                        : (_) {
                            setState(() => _days = period);
                            _load();
                          },
                  ),
              ],
            ),
            if (!_loading && _points.isNotEmpty) ...[
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                children: [
                  for (final metric in availableMetrics)
                    ChoiceChip(
                      key: Key('market_series_${metric.name}'),
                      label: Text(metric.label),
                      selected: _selectedMetric == metric,
                      onSelected: (_) =>
                          setState(() => _selectedMetric = metric),
                    ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Daily source price fields; these are not individual sale records.',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: colors.onSurfaceVariant,
                ),
              ),
            ],
            const SizedBox(height: 16),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 44),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              _HistoryMessage(
                message: _error!,
                actionLabel: 'Retry',
                onPressed: _load,
              )
            else if (_points.isEmpty)
              const _HistoryMessage(
                message:
                    'No qualified TCGPlayer Market history for this exact printing in this date range.',
              )
            else ...[
              if (last != null) ...[
                Text(
                  _money(last.price),
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  'Latest ${_selectedMetric.label} observation · ${_date(last.observedOn)}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                ),
              ],
              const SizedBox(height: 14),
              SizedBox(
                height: 170,
                child: Semantics(
                  label: _historyChartLabel(
                    _selectedMetric.label,
                    plottedPoints,
                    _money,
                  ),
                  child: ExcludeSemantics(
                    child: CustomPaint(
                      painter: _MarketHistoryPainter(
                        points: plottedPoints,
                        lineColor: colors.primary,
                        gridColor: colors.outlineVariant,
                      ),
                      child: const SizedBox.expand(),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _metric('Low', _money(low!), colors),
                  const SizedBox(width: 8),
                  _metric('High', _money(high!), colors),
                  const SizedBox(width: 8),
                  _metric(
                    'Change',
                    '${change! >= 0 ? '+' : ''}${_money(change)} (${percent! >= 0 ? '+' : ''}${percent.toStringAsFixed(1)}%)',
                    colors,
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                '${plottedPoints.length} qualified daily observations · ${_date(first!.observedOn)} – ${_date(last!.observedOn)}',
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: colors.onSurfaceVariant),
              ),
            ],
            const SizedBox(height: 18),
            Text(
              'This chart shows daily TCGPlayer Market observations, not individual completed sales. eBay active asking prices are separate and are not sold comps.',
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: colors.onSurfaceVariant),
            ),
            if (widget.loadPersonalSales != null) ...[
              const SizedBox(height: 18),
              Text(
                'Your recorded sales',
                key: const Key('personal_sales_heading'),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 4),
              Text(
                'Private sales you recorded in Grookai for this exact printing. This is your history, not marketwide comps.',
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: colors.onSurfaceVariant),
              ),
              const SizedBox(height: 8),
              if (_personalSalesLoading)
                const Center(child: CircularProgressIndicator())
              else if (_personalSalesError != null)
                TextButton.icon(
                  key: const Key('retry_personal_sales'),
                  onPressed: _loadPersonalSales,
                  icon: const Icon(Icons.refresh),
                  label: Text('Retry · $_personalSalesError'),
                )
              else if (_personalSales.isEmpty)
                const Text('No recorded sales for this exact printing yet.')
              else
                for (final sale in _personalSales)
                  ListTile(
                    key: Key('personal_sale_${sale.id}'),
                    contentPadding: EdgeInsets.zero,
                    title: Text(_date(sale.soldAt)),
                    subtitle: Text(
                      [
                        if (sale.condition?.isNotEmpty ?? false)
                          sale.condition!,
                        if (sale.askingPrice != null)
                          'Your asking price was ${_saleMoney(sale.askingPrice!, sale.currency)}',
                        'Recorded in Grookai',
                      ].join(' · '),
                    ),
                    trailing: Text(
                      _saleMoney(sale.price, sale.currency),
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
            ],
            if (widget.loadSoldComps != null) ...[
              const SizedBox(height: 16),
              Text(
                'Individual sold comps',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 4),
              Text(
                'Completed sales are separate from the exact-printing Market history above. Confirm the match before relying on a result.',
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: colors.onSurfaceVariant),
              ),
              const SizedBox(height: 8),
              if (_comps == null && !_compsLoading && _compsError == null)
                OutlinedButton.icon(
                  key: const Key('load_sold_comps'),
                  onPressed: _loadSoldComps,
                  icon: const Icon(Icons.receipt_long_rounded),
                  label: const Text('Load recent sold comps'),
                ),
              if (_compsLoading)
                const Center(child: CircularProgressIndicator()),
              if (_compsError != null)
                TextButton.icon(
                  onPressed: _loadSoldComps,
                  icon: const Icon(Icons.refresh),
                  label: Text('Retry · $_compsError'),
                ),
              if (_comps != null)
                _SoldCompsList(result: _comps!, money: _money, date: _date),
            ],
            if (widget.openSoldSearch != null) ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(
                key: const Key('open_ebay_sold_search'),
                onPressed: widget.openSoldSearch,
                icon: const Icon(Icons.open_in_new_rounded),
                label: const Text('Search eBay sold listings'),
              ),
              Text(
                'Opens eBay for your review. Results are not imported into Grookai pricing.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: colors.onSurfaceVariant,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SoldCompsList extends StatelessWidget {
  const _SoldCompsList({
    required this.result,
    required this.money,
    required this.date,
  });

  final CardSoldCompsResult result;
  final String Function(double) money;
  final String Function(DateTime) date;

  @override
  Widget build(BuildContext context) {
    if (result.sales.isEmpty) {
      return const Text('No recent sold comps were returned.');
    }
    final textTheme = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Matched product: ${result.productName}',
          style: textTheme.labelLarge,
        ),
        for (final candidate in result.matchCandidates.take(3))
          Text('Possible match: $candidate', style: textTheme.labelSmall),
        const SizedBox(height: 6),
        for (final sale in result.sales.take(20))
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(
              sale.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            subtitle: Text(
              [
                sale.condition,
                sale.variant,
                sale.language,
                if (sale.soldAt != null) date(sale.soldAt!),
              ].whereType<String>().join(' · '),
            ),
            trailing: Text(money(sale.totalPrice ?? sale.price)),
          ),
        Text(
          '${result.totalSales ?? result.sales.length} sales${result.salesHistoryStatus == 'limited' ? ' · limited history sample' : ''}',
          style: textTheme.labelSmall,
        ),
      ],
    );
  }
}

String _historyChartLabel(
  String metric,
  List<CardMarketHistoryPoint> points,
  String Function(double) money,
) {
  if (points.isEmpty) return 'No market history observations';
  return 'TCGPlayer $metric history from ${money(points.first.price)} to ${money(points.last.price)}, ${points.length} daily observations';
}

class _HistoryMessage extends StatelessWidget {
  const _HistoryMessage({
    required this.message,
    this.actionLabel,
    this.onPressed,
  });

  final String message;
  final String? actionLabel;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 28),
    child: Column(
      children: [
        Text(message, textAlign: TextAlign.center),
        if (actionLabel != null && onPressed != null) ...[
          const SizedBox(height: 8),
          TextButton(onPressed: onPressed, child: Text(actionLabel!)),
        ],
      ],
    ),
  );
}

class _MarketHistoryPainter extends CustomPainter {
  const _MarketHistoryPainter({
    required this.points,
    required this.lineColor,
    required this.gridColor,
  });

  final List<CardMarketHistoryPoint> points;
  final Color lineColor;
  final Color gridColor;

  @override
  void paint(Canvas canvas, Size size) {
    const inset = 12.0;
    final chart = Rect.fromLTWH(
      inset,
      inset,
      math.max(0, size.width - inset * 2),
      math.max(0, size.height - inset * 2),
    );
    final gridPaint = Paint()
      ..color = gridColor
      ..strokeWidth = 1;
    for (var index = 0; index < 3; index++) {
      final y = chart.top + chart.height * index / 2;
      canvas.drawLine(Offset(chart.left, y), Offset(chart.right, y), gridPaint);
    }
    if (points.isEmpty) return;
    final values = points.map((point) => point.price).toList(growable: false);
    final minimum = values.reduce(math.min);
    final maximum = values.reduce(math.max);
    final range = maximum - minimum;
    final positions = <Offset>[];
    for (var index = 0; index < values.length; index++) {
      final x = values.length == 1
          ? chart.center.dx
          : chart.left + chart.width * index / (values.length - 1);
      final normalized = range == 0 ? 0.5 : (values[index] - minimum) / range;
      final y = chart.bottom - chart.height * normalized;
      positions.add(Offset(x, y));
    }
    if (positions.length > 1) {
      final path = Path()..moveTo(positions.first.dx, positions.first.dy);
      for (final point in positions.skip(1)) {
        path.lineTo(point.dx, point.dy);
      }
      canvas.drawPath(
        path,
        Paint()
          ..color = lineColor
          ..strokeWidth = 3
          ..strokeCap = StrokeCap.round
          ..strokeJoin = StrokeJoin.round
          ..style = PaintingStyle.stroke,
      );
    }
    canvas.drawCircle(positions.last, 4, Paint()..color = lineColor);
  }

  @override
  bool shouldRepaint(covariant _MarketHistoryPainter oldDelegate) =>
      oldDelegate.points != points ||
      oldDelegate.lineColor != lineColor ||
      oldDelegate.gridColor != gridColor;
}
