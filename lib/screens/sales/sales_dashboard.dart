import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import '../../services/sales/sales_cart_service.dart';
import '../../services/sales/sales_report.dart';

class SalesDashboard extends StatefulWidget {
  const SalesDashboard({
    super.key,
    required this.receipts,
    required this.refresh,
  });
  final List<Map<String, dynamic>> receipts;
  final Future<void> Function() refresh;
  @override
  State<SalesDashboard> createState() => _SalesDashboardState();
}

class _SalesDashboardState extends State<SalesDashboard> {
  final _search = TextEditingController();
  String _period = 'Today';
  String? _method;
  DateTimeRange? _custom;
  int _page = 0;
  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  SalesReport get report {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = DateTime(now.year, now.month, now.day + 1);
    final start = switch (_period) {
      'Yesterday' => DateTime(now.year, now.month, now.day - 1),
      '7 days' => DateTime(now.year, now.month, now.day - 6),
      '30 days' => DateTime(now.year, now.month, now.day - 29),
      'All time' => DateTime(1970),
      'Custom' => _custom!.start,
      _ => today,
    };
    final end = _period == 'Yesterday'
        ? today
        : _period == 'Custom'
        ? DateTime(_custom!.end.year, _custom!.end.month, _custom!.end.day + 1)
        : tomorrow;
    return SalesReport(
      widget.receipts,
      start: start,
      end: end,
      query: _search.text,
      method: _method,
    );
  }

  Future<void> _export(BuildContext anchor, SalesReport data) async {
    final box = anchor.findRenderObject()! as RenderBox;
    try {
      await SharePlus.instance.share(
        ShareParams(
          files: [
            XFile.fromData(
              Uint8List.fromList(utf8.encode(data.csv())),
              mimeType: 'text/csv',
            ),
          ],
          fileNameOverrides: [
            'Grookai-sales-${DateTime.now().toIso8601String().substring(0, 10)}.csv',
          ],
          sharePositionOrigin: box.localToGlobal(Offset.zero) & box.size,
        ),
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Export could not open. Please try again.'),
          ),
        );
      }
    }
  }

  Future<void> _detail(Map<String, dynamic> receipt) => showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(receipt['number'] as String),
      content: SizedBox(
        width: 540,
        child: SingleChildScrollView(
          child: SelectableText(saleReceiptText(receipt)),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () =>
              Clipboard.setData(ClipboardData(text: saleReceiptText(receipt))),
          child: const Text('Copy receipt'),
        ),
        Builder(
          builder: (anchor) => FilledButton.icon(
            icon: const Icon(Icons.ios_share),
            label: const Text('Share receipt'),
            onPressed: () async {
              final box = anchor.findRenderObject()! as RenderBox;
              try {
                await SharePlus.instance.share(
                  ShareParams(
                    text: saleReceiptText(receipt),
                    subject: 'Receipt ${receipt['number']}',
                    sharePositionOrigin:
                        box.localToGlobal(Offset.zero) & box.size,
                  ),
                );
              } catch (_) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Sharing could not open. Use Copy receipt.',
                      ),
                    ),
                  );
                }
              }
            },
          ),
        ),
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Close'),
        ),
      ],
    ),
  );

  Widget _stat(
    String label,
    String value,
    IconData icon, {
    required double width,
  }) => SizedBox(
    width: width,
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 12),
            Text(value, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 4),
            Text(label),
          ],
        ),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final data = report;
    final colors = Theme.of(context).colorScheme;
    final available = MediaQuery.sizeOf(context).width - 40;
    final columns = available >= 1100
        ? 6
        : available >= 600
        ? 3
        : 2;
    final metricWidth = (available - (columns - 1) * 8) / columns;
    final chartWidth = (available - 48).clamp(576.0, 1440.0);
    final max = data.hourlySales.fold<int>(1, (a, b) => a > b ? a : b);
    final page = _page.clamp(
      0,
      data.rows.isEmpty ? 0 : (data.rows.length - 1) ~/ 25,
    );
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(
          'Your sales, at a glance',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        const SizedBox(height: 6),
        const Text(
          'Saved in-person receipts · USD · Times use this device’s time zone.\n'
          'Vendor-recorded exchanges. Online orders, unreceipted sales, refunds and Stripe payouts are not included.',
        ),
        const SizedBox(height: 20),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            for (final period in [
              'Today',
              'Yesterday',
              '7 days',
              '30 days',
              'All time',
            ])
              ChoiceChip(
                label: Text(period),
                selected: _period == period,
                onSelected: (_) => setState(() {
                  _period = period;
                  _page = 0;
                }),
              ),
            ActionChip(
              label: Text(
                _period == 'Custom'
                    ? '${_custom!.start.month}/${_custom!.start.day} – ${_custom!.end.month}/${_custom!.end.day}'
                    : 'Date range',
              ),
              avatar: const Icon(Icons.date_range, size: 18),
              onPressed: () async {
                final dates = await showDateRangePicker(
                  context: context,
                  firstDate: DateTime(2000),
                  lastDate: DateTime.now(),
                  initialDateRange: _custom,
                );
                if (dates != null && mounted) {
                  setState(() {
                    _period = 'Custom';
                    _custom = dates;
                    _page = 0;
                  });
                }
              },
            ),
            IconButton(
              tooltip: 'Refresh sales',
              onPressed: widget.refresh,
              icon: const Icon(Icons.refresh),
            ),
            Builder(
              builder: (anchor) => OutlinedButton.icon(
                onPressed: data.rows.isEmpty
                    ? null
                    : () => _export(anchor, data),
                icon: const Icon(Icons.download_outlined),
                label: const Text('Export CSV'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _stat(
              'Sales after discounts',
              'USD ${saleMoney(data.salesMinor)}',
              Icons.trending_up,
              width: metricWidth,
            ),
            _stat(
              'Transactions',
              '${data.transactions}',
              Icons.receipt_long_outlined,
              width: metricWidth,
            ),
            _stat(
              'Cards / items sold',
              '${data.units}',
              Icons.style_outlined,
              width: metricWidth,
            ),
            _stat(
              'Average sale',
              'USD ${saleMoney(data.averageMinor)}',
              Icons.bar_chart,
              width: metricWidth,
            ),
            _stat(
              'Tax collected',
              'USD ${saleMoney(data.taxMinor)}',
              Icons.account_balance_outlined,
              width: metricWidth,
            ),
            _stat(
              'Total received',
              'USD ${saleMoney(data.totalMinor)}',
              Icons.payments_outlined,
              width: metricWidth,
            ),
            if (data.tradeCreditMinor > 0 || data.paidToCustomerMinor > 0) ...[
              _stat(
                'Trade credit accepted',
                'USD ${saleMoney(data.tradeCreditMinor)}',
                Icons.swap_horiz,
                width: metricWidth,
              ),
              _stat(
                'Paid to customers',
                'USD ${saleMoney(data.paidToCustomerMinor)}',
                Icons.payments,
                width: metricWidth,
              ),
              _stat(
                'Net money received',
                'USD ${saleMoney(data.totalMinor - data.paidToCustomerMinor)}',
                Icons.account_balance_wallet,
                width: metricWidth,
              ),
            ],
          ],
        ),
        const SizedBox(height: 20),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Sales by hour',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const Text(
                  'Sales after discounts, excluding tax. Tap a bar for details. Multiple days are combined by local hour.',
                ),
                const SizedBox(height: 20),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: SizedBox(
                    width: chartWidth,
                    height: 170,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        for (var hour = 0; hour < 24; hour++)
                          Tooltip(
                            triggerMode: TooltipTriggerMode.tap,
                            message:
                                '${hour.toString().padLeft(2, '0')}:00 · USD ${saleMoney(data.hourlySales[hour])} · ${data.hourlyTransactions[hour]} transactions',
                            child: Semantics(
                              label:
                                  '$hour hours: ${data.hourlyTransactions[hour]} transactions, USD ${saleMoney(data.hourlySales[hour])}',
                              child: SizedBox(
                                width: chartWidth / 24,
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    Container(
                                      width: chartWidth / 24 - 10,
                                      height:
                                          3 +
                                          125 * data.hourlySales[hour] / max,
                                      decoration: BoxDecoration(
                                        color: data.hourlySales[hour] == 0
                                            ? colors.outlineVariant
                                            : colors.primary,
                                        borderRadius: BorderRadius.circular(5),
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      '${hour.toString().padLeft(2, '0')}h',
                                      style: Theme.of(
                                        context,
                                      ).textTheme.labelSmall,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 8,
          children: [
            for (final payment in data.payments.entries)
              Chip(
                avatar: const Icon(Icons.payments_outlined, size: 18),
                label: Text('${payment.key} · USD ${saleMoney(payment.value)}'),
              ),
          ],
        ),
        const SizedBox(height: 20),
        Text(
          'Transaction history',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _search,
          onChanged: (_) => setState(() => _page = 0),
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.search),
            labelText: 'Find a receipt, customer or card',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final method in [
              null,
              'Cash',
              'Card (external terminal)',
              'Bank / payment app',
              'Other',
              'Split payment',
            ])
              ChoiceChip(
                label: Text(method ?? 'All payments'),
                selected: _method == method,
                onSelected: (_) => setState(() {
                  _method = method;
                  _page = 0;
                }),
              ),
          ],
        ),
        const SizedBox(height: 8),
        if (data.rows.isEmpty)
          const Padding(
            padding: EdgeInsets.all(32),
            child: Text(
              'No receipts match this view. Your next recorded sale will appear here.',
            ),
          ),
        for (final receipt in data.rows.skip(page * 25).take(25))
          Card(
            child: ListTile(
              isThreeLine: true,
              leading: CircleAvatar(
                backgroundColor: colors.primaryContainer,
                child: Icon(
                  Icons.receipt_long,
                  color: colors.onPrimaryContainer,
                ),
              ),
              title: Text(
                '${receipt['customerName'] == '' ? 'Walk-up sale' : receipt['customerName']} · USD ${saleMoney(receipt['totalMinor'] as int)}',
              ),
              subtitle: Text(
                '${receipt['number']}\n${DateTime.parse(receipt['createdAt'] as String).toLocal().toString().substring(0, 16)} · ${receipt['method']}',
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _detail(receipt),
            ),
          ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            TextButton(
              onPressed: page == 0
                  ? null
                  : () => setState(() => _page = page - 1),
              child: const Text('Previous'),
            ),
            Text('${data.transactions} transactions · Page ${page + 1}'),
            TextButton(
              onPressed: (page + 1) * 25 >= data.rows.length
                  ? null
                  : () => setState(() => _page = page + 1),
              child: const Text('Next'),
            ),
          ],
        ),
      ],
    );
  }
}
