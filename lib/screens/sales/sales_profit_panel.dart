import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../../services/sales/sales_profit.dart';
import '../../services/sales/sales_profit_service.dart';
import '../../services/sales/sales_purchase.dart';

const kVendorProfitEnabled = bool.fromEnvironment('GV_VENDOR_PROFIT_V1');

class SalesProfitPanel extends StatefulWidget {
  const SalesProfitPanel({
    super.key,
    required this.receipts,
    required this.service,
  });
  final List<Map<String, dynamic>> receipts;
  final SalesProfitService? service;
  @override
  State<SalesProfitPanel> createState() => _SalesProfitPanelState();
}

class _SalesProfitPanelState extends State<SalesProfitPanel> {
  StreamSubscription<void>? _subscription;
  Map<String, Object?>? _summary;
  String? _error;
  bool _loading = true, _closed = false;
  int _generation = 0;
  @override
  void initState() {
    super.initState();
    _bind();
    unawaited(_load());
  }

  void _bind() {
    _subscription = widget.service?.accountChanges.listen((_) {
      if (!mounted) return;
      _generation++;
      setState(() {
        _closed = true;
        _summary = null;
        _error = null;
        _loading = false;
      });
    });
  }

  @override
  void didUpdateWidget(covariant SalesProfitPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.service != oldWidget.service) {
      unawaited(_subscription?.cancel());
      _closed = false;
      _bind();
      unawaited(_load());
    } else if (!listEquals(widget.receipts, oldWidget.receipts)) {
      unawaited(_load());
    }
  }

  Future<void> _load() async {
    if (_closed) return;
    final generation = ++_generation;
    setState(() {
      _loading = true;
      _summary = null;
      _error = null;
    });
    try {
      final service = widget.service;
      if (service == null) throw const SalesProfitUnavailable();
      final receipts = (jsonDecode(jsonEncode(widget.receipts)) as List)
          .map((row) => Map<String, dynamic>.from(row as Map))
          .toList();
      final ids = receipts
          .where((row) => !isPurchaseReceipt(row))
          .map((row) => row['id'] as String)
          .toSet()
          .toList();
      final snapshots = await service.read(
        ids,
        isCurrent: () => mounted && generation == _generation && !_closed,
      );
      if (!mounted || generation != _generation || _closed) return;
      final summary = salesProfit(receipts, snapshots);
      setState(() {
        _summary = summary;
        _loading = false;
      });
    } catch (error) {
      if (!mounted || generation != _generation || _closed) return;
      setState(() {
        _loading = false;
        _error = error is FormatException
            ? 'Recorded sales need review. Profit is unavailable until they reconcile.'
            : const SalesProfitUnavailable().toString();
      });
    }
  }

  @override
  void dispose() {
    _generation++;
    unawaited(_subscription?.cancel());
    super.dispose();
  }

  Widget _metric(String label, String value) => Padding(
    padding: const EdgeInsets.only(top: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelLarge),
        SelectableText(value, style: Theme.of(context).textTheme.headlineSmall),
      ],
    ),
  );
  @override
  Widget build(BuildContext context) {
    final summary = _summary;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Known-cost profit',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 4),
            const Text(
              'Private · Uses cost recorded when each sale completed.',
            ),
            if (_closed) ...[
              const SizedBox(height: 12),
              const Text('Your account changed. Reopen Reports.'),
            ] else if (_loading) ...[
              const SizedBox(height: 12),
              const LinearProgressIndicator(),
              const Text('Loading private cost history…'),
            ] else if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!),
              TextButton(
                onPressed: _load,
                child: const Text('Refresh cost history'),
              ),
            ] else if (summary != null && summary['receipts'] == 0) ...[
              const SizedBox(height: 12),
              const Text('No sales match these filters.'),
            ] else if (summary != null) ...[
              _metric(
                'Profit on covered sales',
                summary['knownProfitMinor'] == null
                    ? 'Unavailable'
                    : 'USD ${profitMoney(summary['knownProfitMinor'] as String)}',
              ),
              const SizedBox(height: 8),
              Text(
                '${summary['knownLines']} of ${summary['totalLines']} '
                '${summary['totalLines'] == 1 ? 'sale line has' : 'sale lines have'} usable USD cost. '
                '${summary['knownUnits']} of ${summary['totalUnits']} '
                '${summary['totalUnits'] == '1' ? 'unit' : 'units'} covered.',
              ),
              _metric(
                'Covered sales',
                'USD ${profitMoney(summary['knownSalesMinor'] as String)}',
              ),
              _metric(
                'Recorded cost of covered sales',
                'USD ${profitMoney(summary['knownCostMinor'] as String)}',
              ),
              _metric(
                'Sales without usable cost',
                'USD ${profitMoney(summary['unknownSalesMinor'] as String)}',
              ),
              const SizedBox(height: 12),
              const Text(
                'This is partial profit when cost is missing. Taxes, payment movements, '
                'trade credit and event expenses are separate.',
              ),
              for (final reason in summary['reasons'] as List)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        costGapLabel(reason['reason'] as String),
                        style: Theme.of(context).textTheme.labelLarge,
                      ),
                      Text(
                        '${reason['lines']} ${reason['lines'] == 1 ? 'sale line' : 'sale lines'} '
                        '· USD ${profitMoney(reason['salesMinor'] as String)}',
                      ),
                    ],
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}
