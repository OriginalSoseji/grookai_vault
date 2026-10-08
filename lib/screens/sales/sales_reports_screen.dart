import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/sales/sales_cart_service.dart';
import '../../services/sales/sales_profit_service.dart';
import '../../services/sales/sales_purchase.dart';
import 'sales_dashboard.dart';
import 'sales_profit_panel.dart';
import '../workspace/workspace_activation.dart';

/// A read-only report entry. It never creates a second editable sales desk.
class SalesReportsScreen extends StatefulWidget {
  const SalesReportsScreen({
    super.key,
    this.service,
    this.profitService,
    this.profitEnabled = kVendorProfitEnabled,
  });
  final SalesCartService? service;
  final SalesProfitService? profitService;
  final bool profitEnabled;
  @override
  State<SalesReportsScreen> createState() => _SalesReportsScreenState();
}

class _SalesReportsScreenState extends State<SalesReportsScreen> {
  late final SalesCartService _service = widget.service ?? SalesCartService();
  StreamSubscription<void>? _subscription;
  List<Map<String, dynamic>> _receipts = const [];
  bool _loading = true;
  bool _loaded = false;
  bool _accountChanged = false;
  String? _error;
  int _generation = 0;
  int? _activation;
  SalesProfitService? _profits;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final revision = WorkspaceActivation.of(context);
    if (_activation != null && revision != _activation) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && !_accountChanged) unawaited(_load());
      });
    }
    _activation = revision;
  }

  @override
  void initState() {
    super.initState();
    if (widget.profitEnabled) {
      try {
        _profits =
            widget.profitService ??
            SalesProfitService(
              gateway: SupabaseSalesProfitGateway(_service.client),
            );
      } catch (_) {
        // Show unavailable private history while retaining the ordinary report.
      }
    }
    _subscription = _service.accountChanges.listen((_) {
      if (!mounted) return;
      _generation++;
      setState(() {
        _accountChanged = true;
        _receipts = const [];
      });
    });
    unawaited(_load());
  }

  Future<void> _load() async {
    if (_accountChanged) return;
    final generation = ++_generation;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final book = await _service.loadReportBook();
      if (!mounted || generation != _generation || _accountChanged) return;
      final receipts = (book['receipts'] as List)
          .map((r) => Map<String, dynamic>.from(r['receipt'] as Map))
          .toList();
      for (final receipt in receipts) {
        if (isPurchaseReceipt(receipt)) {
          validatePurchaseReceipt(receipt);
        }
      }
      setState(() {
        _receipts = receipts;
        _loaded = true;
        _loading = false;
      });
    } catch (_) {
      if (!mounted || generation != _generation || _accountChanged) return;
      setState(() {
        _error = 'Reports could not load. Your receipts have not changed.';
        _loading = false;
      });
    }
  }

  @override
  void dispose() {
    _generation++;
    unawaited(_subscription?.cancel());
    if (widget.profitService == null) unawaited(_profits?.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Reports'),
      automaticallyImplyLeading: false,
      actions: [
        IconButton(
          tooltip: 'Refresh reports',
          onPressed: _loading || _accountChanged ? null : _load,
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: _accountChanged
        ? const Center(child: Text('Your account changed. Reopen reports.'))
        : _loading && !_loaded
        ? const Center(child: CircularProgressIndicator())
        : _error != null
        ? Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(_error!),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _load,
                    child: const Text('Try again'),
                  ),
                ],
              ),
            ),
          )
        : SalesDashboard(
            receipts: _receipts,
            refresh: _load,
            profitEnabled: widget.profitEnabled,
            profitService: _profits,
          ),
  );
}
