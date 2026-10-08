import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/sales/sales_cart_service.dart';
import '../../services/sales/sales_profit_service.dart';
import '../../services/sales/sales_purchase.dart';
import 'sales_dashboard.dart';
import 'sales_profit_panel.dart';
import 'event_reports_panel.dart';
import 'cost_history_panel.dart';
import '../../services/sales/cost_correction_service.dart';
import '../../services/sales/event_service.dart';
import '../../services/sales/event_report_loader.dart';
import '../workspace/workspace_activation.dart';

/// A read-only report entry. It never creates a second editable sales desk.
class SalesReportsScreen extends StatefulWidget {
  const SalesReportsScreen({
    super.key,
    this.service,
    this.profitService,
    this.profitEnabled = kVendorProfitEnabled,
    this.eventsEnabled = kVendorEventsEnabled,
    this.eventService,
    this.eventReader,
    this.costCorrectionService,
    this.costCorrectionsEnabled = kVendorCostCorrectionsEnabled,
  });
  final SalesCartService? service;
  final SalesProfitService? profitService;
  final bool profitEnabled;
  final bool eventsEnabled;
  final EventService? eventService;
  final EventReportSource? eventReader;
  final CostCorrectionService? costCorrectionService;
  final bool costCorrectionsEnabled;
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
  EventService? _events;
  EventReportSource? _eventReader;
  bool _eventRecovery = false, _eventsVisited = false, _showEvents = false;
  CostCorrectionService? _costs;
  bool _costRecovery = false, _costsVisited = false, _showCosts = false;

  void _prepareCosts() {
    _costs ??=
        widget.costCorrectionService ??
        CostCorrectionService.supabase(_service.client);
    _profits ??=
        widget.profitService ??
        SalesProfitService(
          gateway: SupabaseSalesProfitGateway(_service.client),
        );
  }

  Future<void> _checkCostRecovery() async {
    try {
      _prepareCosts();
      final row = await _costs!.journal();
      if (mounted && !_accountChanged) {
        setState(() => _costRecovery = row?['pending'] != null);
      }
    } catch (_) {
      if (mounted && !_accountChanged && _costs != null) {
        setState(() => _costRecovery = true);
      }
    }
  }

  void _openCosts() {
    try {
      _prepareCosts();
    } catch (_) {
      /* Keep saved recovery visible even when history is unavailable. */
    }
    setState(() {
      _showCosts = true;
      _showEvents = false;
      _costsVisited = true;
    });
  }

  void _prepareEvents() {
    _events ??= widget.eventService ?? EventService.supabase(_service.client);
    _eventReader ??=
        widget.eventReader ?? EventReportReader(_service.client, _events!);
  }

  Future<void> _checkEventRecovery() async {
    try {
      _prepareEvents();
      final row = await _events!.journal();
      if (mounted && !_accountChanged) {
        setState(() => _eventRecovery = row?['pending'] != null);
      }
    } catch (_) {
      if (mounted && !_accountChanged && _events != null) {
        setState(() => _eventRecovery = true);
      }
    }
  }

  void _openEvents() {
    try {
      _prepareEvents();
    } catch (_) {
      /* Show unavailable entry without losing ordinary reports. */
    }
    setState(() {
      _showEvents = true;
      _showCosts = false;
      _eventsVisited = true;
    });
  }

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
    if (!widget.eventsEnabled) unawaited(_checkEventRecovery());
    if (!widget.profitEnabled) unawaited(_checkCostRecovery());
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
    if (widget.eventService == null) _events?.dispose();
    if (widget.costCorrectionService == null) _costs?.dispose();
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
        : Column(
            children: [
              if (widget.eventsEnabled ||
                  _eventRecovery ||
                  widget.profitEnabled ||
                  _costRecovery)
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  child: Wrap(
                    spacing: 8,
                    children: [
                      ChoiceChip(
                        label: const Text('Overview'),
                        selected: !_showEvents && !_showCosts,
                        onSelected: (_) => setState(() {
                          _showEvents = false;
                          _showCosts = false;
                        }),
                      ),
                      if (widget.eventsEnabled || _eventRecovery)
                        ChoiceChip(
                          label: Text(
                            widget.eventsEnabled
                                ? 'Events'
                                : 'Saved event edit',
                          ),
                          selected: _showEvents,
                          onSelected: (_) => _openEvents(),
                        ),
                      if (widget.profitEnabled || _costRecovery)
                        ChoiceChip(
                          label: Text(
                            widget.profitEnabled
                                ? 'Cost history'
                                : 'Saved cost correction',
                          ),
                          selected: _showCosts,
                          onSelected: (_) => _openCosts(),
                        ),
                    ],
                  ),
                ),
              Expanded(
                child: IndexedStack(
                  index: _showCosts
                      ? 2
                      : _showEvents
                      ? 1
                      : 0,
                  children: [
                    _overview(),
                    if (_eventsVisited &&
                        _events != null &&
                        _eventReader != null)
                      EventReportsPanel(
                        service: _events!,
                        reader: _eventReader!,
                        allowNewEdits: widget.eventsEnabled,
                      )
                    else
                      const Center(
                        child: Text(
                          'Event reports are unavailable. Reopen Reports to try again.',
                        ),
                      ),
                    if (_costsVisited && _costs != null)
                      CostHistoryPanel(
                        receipts: _receipts,
                        service: _costs!,
                        profitService: _profits,
                        allowNewEdits: widget.costCorrectionsEnabled,
                      )
                    else
                      const Center(
                        child: Text(
                          'Cost history is unavailable. Reopen Reports to try again.',
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
  );

  Widget _overview() => _loading && !_loaded
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
                FilledButton(onPressed: _load, child: const Text('Try again')),
              ],
            ),
          ),
        )
      : SalesDashboard(
          receipts: _receipts,
          refresh: _load,
          profitEnabled: widget.profitEnabled,
          profitService: _profits,
        );
}
