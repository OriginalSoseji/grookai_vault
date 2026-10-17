import 'dart:async';

import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../../models/card_print.dart';
import '../../services/sales/inventory_economics_service.dart';
import '../../services/sales/sales_cart_service.dart';
import '../../services/sales/sales_payments.dart';
import '../../widgets/card_surface_artwork.dart';

/// Vendor-facing acquisition, aging, and P&L workspace.
///
/// This is intentionally one native workspace: the operator can buy exact
/// cards, reconcile a lot total, inspect oldest inventory, and calculate
/// after-tax results without leaving the phone.
class InventoryEconomicsScreen extends StatefulWidget {
  const InventoryEconomicsScreen({super.key, this.service});
  final InventoryEconomicsService? service;

  @override
  State<InventoryEconomicsScreen> createState() =>
      _InventoryEconomicsScreenState();
}

class _InventoryEconomicsScreenState extends State<InventoryEconomicsScreen> {
  late final InventoryEconomicsService _service =
      widget.service ?? InventoryEconomicsService();
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventory economics'),
        actions: [
          IconButton(
            tooltip: 'Sales desk',
            icon: const Icon(Icons.point_of_sale_outlined),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
      body: Column(
        children: [
          Material(
            color: Theme.of(context).colorScheme.surfaceContainerLow,
            child: TabBar(
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              onTap: (value) => setState(() => _tab = value),
              tabs: const [
                Tab(icon: Icon(Icons.add_shopping_cart), text: 'Buy / intake'),
                Tab(icon: Icon(Icons.hourglass_bottom), text: 'Aging'),
                Tab(icon: Icon(Icons.calculate_outlined), text: 'Per-card P&L'),
              ],
            ),
          ),
          Expanded(
            child: IndexedStack(
              index: _tab,
              children: [
                _PurchasePane(service: _service),
                _AgingPane(service: _service),
                _PnlPane(service: _service),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PurchaseLine {
  _PurchaseLine({
    required this.card,
    required this.printing,
    required this.condition,
  });
  final CardPrint card;
  final Map<String, dynamic> printing;
  String condition;
  int? referenceMinor;
  int manualMinor = 0;

  String get printingId => printing['id'].toString();
  String get printingGvId =>
      (printing['printing_gv_id'] ?? printing['printingGvId'] ?? '').toString();
  String get description => '${card.name} · $printingGvId · $condition';
}

class _PurchasePane extends StatefulWidget {
  const _PurchasePane({required this.service});
  final InventoryEconomicsService service;

  @override
  State<_PurchasePane> createState() => _PurchasePaneState();
}

class _PurchasePaneState extends State<_PurchasePane> {
  final _query = TextEditingController();
  final _total = TextEditingController();
  final _seller = TextEditingController();
  final _note = TextEditingController();
  final _store = TextEditingController();
  Timer? _debounce;
  late final SalesCartService _catalog = SalesCartService(
    client: widget.service.client,
  );
  List<CardPrint> _cards = const [];
  List<Map<String, dynamic>> _printings = const [];
  final List<_PurchaseLine> _lines = [];
  CardPrint? _selected;
  String? _printingId;
  String _game = 'pokemon';
  String _condition = 'NM';
  String _mode = 'equal_split';
  String _method = 'Cash';
  bool _searching = false;
  bool _busy = false;
  bool _available = true;
  String? _error;
  Map<String, dynamic>? _receipt;

  @override
  void initState() {
    super.initState();
    unawaited(_checkAvailability());
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _query.dispose();
    _total.dispose();
    _seller.dispose();
    _note.dispose();
    _store.dispose();
    super.dispose();
  }

  Future<void> _checkAvailability() async {
    try {
      final available = await widget.service.purchaseAvailable();
      if (mounted) setState(() => _available = available);
    } catch (_) {
      if (mounted) setState(() => _available = false);
    }
  }

  void _search() {
    _debounce?.cancel();
    final query = _query.text.trim();
    if (query.length < 2) {
      setState(() => _cards = const []);
      return;
    }
    setState(() {
      _searching = true;
      _error = null;
    });
    _debounce = Timer(const Duration(milliseconds: 300), () async {
      try {
        final page = await _catalog.searchCatalogPage(query, _game);
        if (mounted) setState(() => _cards = page.cards);
      } catch (_) {
        if (mounted) setState(() => _error = 'Card search could not load.');
      } finally {
        if (mounted) setState(() => _searching = false);
      }
    });
  }

  Future<void> _choose(CardPrint card) async {
    setState(() {
      _selected = card;
      _printings = const [];
      _printingId = null;
      _error = null;
    });
    try {
      final printings = await _catalog.catalogPrintings(card.id);
      if (mounted) setState(() => _printings = printings);
    } catch (_) {
      if (mounted) setState(() => _error = 'Printing choices could not load.');
    }
  }

  int get _totalMinor => inventoryMoneyInput(_total.text) ?? 0;

  List<int> get _allocations => inventoryAllocationPreview(
    totalMinor: _totalMinor,
    referenceMinor: _lines.map((line) => line.referenceMinor ?? 0).toList(),
    manualMinor: _lines.map((line) => line.manualMinor).toList(),
    mode: _mode,
  );

  int get _allocatedTotal =>
      _allocations.fold<int>(0, (sum, value) => sum + value);

  void _addLine() {
    final card = _selected;
    final printingId = _printingId;
    if (card == null || printingId == null) {
      setState(() => _error = 'Choose the exact printing and finish first.');
      return;
    }
    if (_lines.length >= 50) {
      setState(() => _error = 'A purchase can contain up to 50 exact copies.');
      return;
    }
    final printing = _printings.firstWhere(
      (item) => item['id'].toString() == printingId,
    );
    setState(() {
      _lines.add(
        _PurchaseLine(card: card, printing: printing, condition: _condition),
      );
      _selected = null;
      _printings = const [];
      _printingId = null;
    });
  }

  Future<void> _submit() async {
    if (_lines.isEmpty) {
      setState(() => _error = 'Add at least one exact copy.');
      return;
    }
    if (_totalMinor < 1 || _allocatedTotal != _totalMinor) {
      setState(() => _error = 'Enter a total paid that reconciles exactly.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final requestId = newSaleId();
      final entries = [
        {
          'method': _method,
          'amountMinor': _totalMinor,
          'tenderedMinor': _totalMinor,
        },
      ];
      final cart = {
        'version': 4,
        'kind': 'purchase',
        'storeName': _store.text.trim().isEmpty
            ? 'Grookai Vault'
            : _store.text.trim(),
        'items': [
          for (var index = 0; index < _lines.length; index++)
            {
              'description': _lines[index].description,
              'quantity': 1,
              'unitMinor': _allocations[index],
              'referenceMinor': _lines[index].referenceMinor,
              'rateBps': _lines[index].referenceMinor == null ? null : 10000,
              'cardId': _lines[index].card.id,
              'printingId': _lines[index].printingId,
              'condition': _lines[index].condition,
              'addToVault': true,
            },
        ],
        'payments': entries,
        'note': _note.text.trim(),
        'customerId': null,
        'customer': {
          'name': _seller.text.trim(),
          'email': '',
          'phone': '',
          'wants': '',
          'notes': '',
        },
      };
      // The purchase RPC expects payment entries, with the negative balance
      // represented by the direction of the external payout.
      salesPaymentSnapshot(entries, -_totalMinor);
      final receipt = await widget.service.completePurchase({
        'id': requestId,
        'cart': cart,
      });
      if (mounted) setState(() => _receipt = receipt);
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error.toString().contains('42501')
              ? 'Purchases are not enabled for this vendor account yet.'
              : 'Purchase could not be recorded. No inventory was changed.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _reset() {
    setState(() {
      _receipt = null;
      _lines.clear();
      _total.clear();
      _seller.clear();
      _note.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_available) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Purchase intake is not enabled for this account yet. The ledger and P&L tools remain available once the vendor purchase switch is enabled.',
            textAlign: TextAlign.center,
          ),
        ),
      );
    }
    if (_receipt != null) {
      final receipt = _receipt!;
      return Center(
        child: Card(
          margin: const EdgeInsets.all(24),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.check_circle, size: 48),
                const SizedBox(height: 12),
                const Text('Purchase recorded', style: TextStyle(fontSize: 22)),
                const SizedBox(height: 8),
                Text(
                  '${receipt['number']} · ${(receipt['items'] as List).length} exact copies · USD ${inventoryMoney(receipt['purchaseMinor'] as int)}',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Every copy was assigned its own GVVI, acquisition date, and COG batch link.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: _reset,
                  child: const Text('Record another purchase'),
                ),
              ],
            ),
          ),
        ),
      );
    }
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Buy / intake', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 4),
        const Text(
          'Buy exact copies at the vendor table. Every line receives a precise COG and purchase date.',
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(
            _error!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ],
        const SizedBox(height: 16),
        LayoutBuilder(
          builder: (context, constraints) => constraints.maxWidth >= 900
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: _searchPanel()),
                    const SizedBox(width: 16),
                    SizedBox(width: 400, child: _batchPanel()),
                  ],
                )
              : Column(
                  children: [
                    _searchPanel(),
                    const SizedBox(height: 16),
                    _batchPanel(),
                  ],
                ),
        ),
      ],
    );
  }

  Widget _searchPanel() => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Text(
                'Find exact cards',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
              const Spacer(),
              DropdownButton<String>(
                value: _game,
                onChanged: _busy
                    ? null
                    : (value) {
                        if (value != null) {
                          setState(() => _game = value);
                          _search();
                        }
                      },
                items: const [
                  DropdownMenuItem(value: 'pokemon', child: Text('Pokémon')),
                  DropdownMenuItem(value: 'mtg', child: Text('Magic')),
                  DropdownMenuItem(
                    value: 'one_piece',
                    child: Text('One Piece'),
                  ),
                ],
              ),
            ],
          ),
          TextField(
            controller: _query,
            onChanged: (_) => _search(),
            decoration: const InputDecoration(
              prefixIcon: Icon(Icons.search),
              labelText: 'Card, set, number or GV-ID',
            ),
          ),
          const SizedBox(height: 8),
          if (_searching) const LinearProgressIndicator(),
          if (_selected != null) _printingEditor(),
          if (_cards.isEmpty && !_searching)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                'Search the canonical catalog, then choose the exact printing.',
              ),
            ),
          for (final card in _cards.take(30))
            ListTile(
              leading: SizedBox(
                width: 46,
                height: 64,
                child: CardSurfaceArtwork(
                  label: card.name,
                  imageUrl: card.catalogImageUrl,
                  fallbackImageUrl: card.providerFallbackImageUrl,
                  width: 46,
                  height: 64,
                  borderRadius: 6,
                ),
              ),
              title: Text(card.name),
              subtitle: Text('${card.displaySet} · ${card.displayNumber}'),
              trailing: TextButton(
                onPressed: () => _choose(card),
                child: const Text('Choose'),
              ),
            ),
        ],
      ),
    ),
  );

  Widget _printingEditor() {
    return Card(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              _selected!.name,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            DropdownButtonFormField<String>(
              initialValue: _printingId,
              decoration: const InputDecoration(
                labelText: 'Exact printing / finish',
              ),
              items: [
                for (final p in _printings)
                  DropdownMenuItem(
                    value: p['id'].toString(),
                    child: Text(
                      '${p['finish_label'] ?? p['finishLabel'] ?? 'Finish'} · ${p['printing_gv_id'] ?? p['printingGvId'] ?? ''}',
                    ),
                  ),
              ],
              onChanged: (value) => setState(() => _printingId = value),
            ),
            DropdownButtonFormField<String>(
              initialValue: _condition,
              decoration: const InputDecoration(labelText: 'Condition'),
              items: const [
                DropdownMenuItem(value: 'NM', child: Text('Near Mint')),
                DropdownMenuItem(value: 'LP', child: Text('Lightly Played')),
                DropdownMenuItem(value: 'MP', child: Text('Moderately Played')),
                DropdownMenuItem(value: 'HP', child: Text('Heavily Played')),
                DropdownMenuItem(value: 'DMG', child: Text('Damaged')),
              ],
              onChanged: (value) => setState(() => _condition = value ?? 'NM'),
            ),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: _busy ? null : _addLine,
              icon: const Icon(Icons.add),
              label: const Text('Add exact copy'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _batchPanel() {
    final allocations = _allocations;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Purchase batch',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
            ),
            const SizedBox(height: 4),
            Text(
              '${_lines.length} exact copies · allocated USD ${inventoryMoney(_allocatedTotal)}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 8),
            if (_lines.isEmpty)
              const Text('Add exact copies from the catalog.'),
            for (var index = 0; index < _lines.length; index++)
              _lineTile(index, allocations[index]),
            TextField(
              controller: _total,
              onChanged: (_) => setState(() {}),
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(
                labelText: 'Total paid to seller (USD)',
                hintText: '300.00',
              ),
            ),
            DropdownButtonFormField<String>(
              initialValue: _mode,
              decoration: const InputDecoration(labelText: 'COG allocation'),
              items: const [
                DropdownMenuItem(
                  value: 'equal_split',
                  child: Text('Equal split across copies'),
                ),
                DropdownMenuItem(
                  value: 'weighted_reference',
                  child: Text('Weighted by reference value'),
                ),
                DropdownMenuItem(
                  value: 'manual',
                  child: Text('Manual per-copy COG'),
                ),
              ],
              onChanged: (value) =>
                  setState(() => _mode = value ?? 'equal_split'),
            ),
            TextField(
              controller: _store,
              decoration: const InputDecoration(
                labelText: 'Store / venue (optional)',
              ),
            ),
            TextField(
              controller: _seller,
              decoration: const InputDecoration(
                labelText: 'Seller / source (optional)',
              ),
            ),
            DropdownButtonFormField<String>(
              initialValue: _method,
              decoration: const InputDecoration(labelText: 'Payout method'),
              items: const [
                DropdownMenuItem(value: 'Cash', child: Text('Cash')),
                DropdownMenuItem(
                  value: 'Card (external terminal)',
                  child: Text('Card / terminal'),
                ),
                DropdownMenuItem(
                  value: 'Bank / payment app',
                  child: Text('Bank / payment app'),
                ),
                DropdownMenuItem(value: 'Other', child: Text('Other')),
              ],
              onChanged: (value) => setState(() => _method = value ?? 'Cash'),
            ),
            TextField(
              controller: _note,
              maxLines: 2,
              maxLength: 500,
              decoration: const InputDecoration(labelText: 'Receipt note'),
            ),
            const SizedBox(height: 8),
            Text(
              'Reconciliation: ${_allocatedTotal == _totalMinor && _totalMinor > 0 ? 'ready' : 'enter a total that matches allocated COG'}',
              style: TextStyle(
                color: _allocatedTotal == _totalMinor && _totalMinor > 0
                    ? Colors.green
                    : Theme.of(context).colorScheme.error,
              ),
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: Text(_busy ? 'Recording…' : 'Record purchase'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _lineTile(int index, int allocation) {
    final line = _lines[index];
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 42,
            height: 58,
            child: CardSurfaceArtwork(
              label: line.card.name,
              imageUrl: line.card.catalogImageUrl,
              fallbackImageUrl: line.card.providerFallbackImageUrl,
              width: 42,
              height: 58,
              borderRadius: 6,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  line.description,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (_mode == 'weighted_reference')
                  TextField(
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(
                      labelText: 'Reference value',
                    ),
                    onChanged: (value) => setState(
                      () => line.referenceMinor = inventoryMoneyInput(value),
                    ),
                  ),
                if (_mode == 'manual')
                  TextField(
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(
                      labelText: 'Allocated COG',
                    ),
                    onChanged: (value) => setState(
                      () => line.manualMinor = inventoryMoneyInput(value) ?? 0,
                    ),
                  ),
                Text(
                  'COG USD ${inventoryMoney(allocation)}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Remove',
            onPressed: _busy
                ? null
                : () => setState(() => _lines.removeAt(index)),
            icon: const Icon(Icons.delete_outline),
          ),
        ],
      ),
    );
  }
}

class _AgingPane extends StatefulWidget {
  const _AgingPane({required this.service});
  final InventoryEconomicsService service;
  @override
  State<_AgingPane> createState() => _AgingPaneState();
}

class _AgingPaneState extends State<_AgingPane> {
  List<Map<String, dynamic>> _items = const [];
  List<Map<String, dynamic>> _batches = const [];
  bool _loading = true;
  String _sort = 'oldest';
  String? _error;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        widget.service.readInventory(sort: _sort),
        widget.service.readBatchReport(),
      ]);
      if (!mounted) return;
      setState(() {
        _items = ((results[0]['items'] as List?) ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        _batches = ((results[1]['batches'] as List?) ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        _error = null;
      });
    } catch (_) {
      if (mounted) setState(() => _error = 'Inventory aging could not load.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: _load,
    child: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Inventory aging',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
            DropdownButton<String>(
              value: _sort,
              items: const [
                DropdownMenuItem(value: 'oldest', child: Text('Oldest first')),
                DropdownMenuItem(value: 'newest', child: Text('Newest first')),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() => _sort = value);
                  unawaited(_load());
                }
              },
            ),
            IconButton(
              onPressed: _loading ? null : _load,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        const Text(
          'Find stagnant inventory and see which acquisition lots still have capital tied up.',
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        if (_loading) const LinearProgressIndicator(),
        const SizedBox(height: 12),
        Text(
          '${_items.length} active exact copies',
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        for (final item in _items) _inventoryCard(item),
        const SizedBox(height: 20),
        Text('Acquisition lots', style: Theme.of(context).textTheme.titleLarge),
        for (final batch in _batches) _batchCard(batch),
      ],
    ),
  );

  Widget _inventoryCard(Map<String, dynamic> item) {
    final cost = item['acquisitionCost'];
    final costMinor = cost is Map ? cost['minor'] as int? : null;
    final date = DateTime.tryParse(item['acquisitionDate']?.toString() ?? '');
    final age = date == null
        ? 'date unknown'
        : '${DateTime.now().difference(date.toLocal()).inDays} days';
    return Card(
      child: ListTile(
        leading: const Icon(Icons.style_outlined),
        title: Text('${item['name']} · ${item['setCode']} · ${item['number']}'),
        subtitle: Text(
          '${item['condition']} · ${item['gvviId'] ?? 'GVVI unavailable'}\nAcquired ${date?.toLocal().toString().split(' ').first ?? 'unknown'} · $age · ${item['acquisitionMethod'] ?? 'unclassified'}',
        ),
        isThreeLine: true,
        trailing: Text(
          costMinor == null ? 'COG —' : 'COG\n\$${inventoryMoney(costMinor)}',
          textAlign: TextAlign.right,
        ),
      ),
    );
  }

  Widget _batchCard(Map<String, dynamic> batch) => Card(
    child: ListTile(
      title: Text(
        '${batch['lineCount']} copies · ${batch['allocationMethod']}',
      ),
      subtitle: Text(
        'Purchased ${DateTime.tryParse(batch['purchasedAt']?.toString() ?? '')?.toLocal().toString().split(' ').first ?? 'unknown'}\n${batch['soldCount']} sold · ${batch['remainingCount']} remaining',
      ),
      trailing: Text(
        'Paid\n\$${inventoryMoney((batch['totalPaidMinor'] as num?)?.toInt() ?? 0)}',
        textAlign: TextAlign.right,
      ),
    ),
  );
}

class _PnlPane extends StatefulWidget {
  const _PnlPane({required this.service});
  final InventoryEconomicsService service;
  @override
  State<_PnlPane> createState() => _PnlPaneState();
}

class _PnlPaneState extends State<_PnlPane> {
  final _tax = TextEditingController(text: '25.00');
  final _salesTaxRate = TextEditingController(text: '0.00');
  final _fee = TextEditingController(text: '0.00');
  final _fixedFee = TextEditingController(text: '0.00');
  String _basis = 'acquired';
  String _taxMode = 'pass_through';
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _rows = const [];
  final Map<String, String> _offers = {};
  final Map<String, String> _cogInputs = {};
  final Map<String, String> _cogDates = {};
  final Map<String, String> _bulkInputs = {};
  final Set<String> _selectedSoldIds = <String>{};
  final _bulkTotal = TextEditingController();
  final _bulkDate = TextEditingController(
    text: DateTime.now().toIso8601String().substring(0, 10),
  );
  String _bulkMode = 'equal_split';
  String? _backfillBusy;

  @override
  void initState() {
    super.initState();
    unawaited(_loadSettingsAndPnl());
  }

  @override
  void dispose() {
    _tax.dispose();
    _salesTaxRate.dispose();
    _fee.dispose();
    _fixedFee.dispose();
    _bulkTotal.dispose();
    _bulkDate.dispose();
    super.dispose();
  }

  int get _taxBps => ((double.tryParse(_tax.text.trim()) ?? 25) * 100).round();
  int get _salesTaxBps =>
      ((double.tryParse(_salesTaxRate.text.trim()) ?? 0) * 100).round();
  int get _feeBps => ((double.tryParse(_fee.text.trim()) ?? 0) * 100).round();
  int get _fixedMinor => inventoryMoneyInput(_fixedFee.text) ?? 0;

  int get _bulkTotalMinor => inventoryMoneyInput(_bulkTotal.text) ?? 0;

  List<Map<String, dynamic>> get _selectedSoldRows => _rows
      .where(
        (row) =>
            _selectedSoldIds.contains(row['instanceId']) &&
            row['status'] == 'sold_unknown_cost',
      )
      .toList();

  List<int> get _bulkAllocations {
    final selected = _selectedSoldRows;
    return inventoryAllocationPreview(
      totalMinor: _bulkTotalMinor,
      referenceMinor: List<int>.filled(selected.length, 0),
      manualMinor: selected
          .map(
            (row) =>
                inventoryMoneyInput(_bulkInputs[row['instanceId']] ?? '') ?? 0,
          )
          .toList(),
      mode: _bulkMode,
    );
  }

  int get _bulkAllocatedTotal =>
      _bulkAllocations.fold<int>(0, (sum, value) => sum + value);

  Future<void> _loadSettingsAndPnl() async {
    try {
      final settings = await widget.service.readProfitSettings();
      if (mounted) {
        setState(() {
          _tax.text =
              (((settings['incomeTaxBps'] as num?)?.toDouble() ?? 2500) / 100)
                  .toStringAsFixed(2);
          _salesTaxRate.text =
              (((settings['salesTaxRateBps'] as num?)?.toDouble() ?? 0) / 100)
                  .toStringAsFixed(2);
          _fee.text =
              (((settings['sellingFeeBps'] as num?)?.toDouble() ?? 0) / 100)
                  .toStringAsFixed(2);
          _fixedFee.text = inventoryMoney(
            (settings['sellingFeeFixedMinor'] as num?)?.toInt() ?? 0,
          );
          _taxMode = settings['salesTaxMode'] == 'include_in_offer'
              ? 'include_in_offer'
              : 'pass_through';
        });
      }
    } catch (_) {
      // Defaults remain valid if the settings RPC has not reached production.
    }
    await _load();
  }

  Future<void> _saveSettings() async {
    await widget.service.saveProfitSettings(
      incomeTaxBps: _taxBps.clamp(0, 10000),
      salesTaxMode: _taxMode,
      salesTaxRateBps: _salesTaxBps.clamp(0, 10000),
      sellingFeeBps: _feeBps.clamp(0, 10000),
      sellingFeeFixedMinor: _fixedMinor.clamp(0, 1000000),
    );
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final result = await widget.service.readPnl(
        dateBasis: _basis,
        incomeTaxBps: _taxBps.clamp(0, 10000),
        salesTaxMode: _taxMode,
      );
      if (!mounted) return;
      setState(() {
        _rows = ((result['items'] as List?) ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        _error = null;
      });
    } catch (_) {
      if (mounted) setState(() => _error = 'Per-card P&L could not load.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _backfillOne(Map<String, dynamic> row) async {
    final instanceId = row['instanceId']?.toString();
    final gvviId = row['gvviId']?.toString();
    final cost = inventoryMoneyInput(_cogInputs[instanceId] ?? '');
    final date = DateTime.tryParse(
      _cogDates[instanceId] ?? row['acquisitionDate']?.toString() ?? '',
    );
    if (instanceId == null || gvviId == null || cost == null || date == null) {
      setState(
        () => _error = 'Enter an exact COG and paid date before saving.',
      );
      return;
    }
    setState(() {
      _backfillBusy = instanceId;
      _error = null;
    });
    try {
      await widget.service.backfillSoldCog(
        instanceId: instanceId,
        gvviId: gvviId,
        paidAt: date,
        costMinor: cost,
      );
      await _load();
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'Sold COG could not be saved. It may already have exact acquisition history.',
        );
      }
    } finally {
      if (mounted) setState(() => _backfillBusy = null);
    }
  }

  Future<void> _backfillBulk() async {
    final rows = _selectedSoldRows;
    final date = DateTime.tryParse(_bulkDate.text.trim());
    if (rows.isEmpty ||
        date == null ||
        _bulkTotalMinor < 0 ||
        _bulkAllocatedTotal != _bulkTotalMinor ||
        rows.any((row) => row['gvviId'] == null)) {
      setState(
        () => _error =
            'Select sold copies and enter a paid total that reconciles exactly.',
      );
      return;
    }
    setState(() {
      _backfillBusy = 'bulk';
      _error = null;
    });
    try {
      await widget.service.backfillSoldCogBatch(
        batchId: newSaleId(),
        paidAt: date,
        totalPaidMinor: _bulkTotalMinor,
        lines: [
          for (var index = 0; index < rows.length; index++)
            {
              'instanceId': rows[index]['instanceId'],
              'gvviId': rows[index]['gvviId'],
              'allocatedMinor': _bulkAllocations[index],
            },
        ],
      );
      _selectedSoldIds.clear();
      _bulkInputs.clear();
      _bulkTotal.clear();
      await _load();
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'Bulk sold COG could not be saved. Review the selected copies and try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _backfillBusy = null);
    }
  }

  int _n(Object? value) =>
      value is num ? value.toInt() : int.tryParse('$value') ?? 0;
  int? _nullable(Object? value) => value == null ? null : _n(value);
  int _effectiveFee(Map<String, dynamic> row, int saleMinor) =>
      row['sellingFeeRecorded'] == true && row['sellingFeeMinor'] != null
      ? _n(row['sellingFeeMinor'])
      : (saleMinor * _feeBps ~/ 10000) + _fixedMinor;
  int _afterTax(Map<String, dynamic> row) {
    final sale = _nullable(row['saleMinor']);
    final cost = _nullable(row['acquisitionCostMinor']);
    if (sale == null || cost == null) return 0;
    final fee = _effectiveFee(row, sale);
    final salesTax = _taxMode == 'include_in_offer'
        ? _n(row['allocatedSalesTaxMinor'])
        : 0;
    final net = sale - salesTax - fee;
    final gross = net - cost;
    return gross - (gross > 0 ? (gross * _taxBps / 10000).round() : 0);
  }

  int _taxInclusivePortion(int totalMinor) {
    final rate = _salesTaxBps / 100.0;
    if (rate <= 0) return 0;
    return (totalMinor - totalMinor / (1 + rate / 100)).round();
  }

  Future<void> _export() async {
    if (_rows.isEmpty) return;
    final headers = [
      'GVVI',
      'Card',
      'Set',
      'Number',
      'Condition',
      'Acquisition date',
      'Sale',
      'COG',
      'Sales tax',
      'Selling fee',
      'Net revenue',
      'Gross profit',
      'Income tax',
      'Profit after tax',
      'Status',
    ];
    String cell(Object? value) =>
        '"${('${value ?? ''}').replaceAll('"', '""')}"';
    final lines = <String>[headers.map(cell).join(',')];
    for (final row in _rows) {
      final sale = _nullable(row['saleMinor']);
      lines.add(
        [
          row['gvviId'],
          row['name'],
          row['setCode'],
          row['number'],
          row['condition'],
          row['acquisitionDate'],
          sale == null ? '' : inventoryMoney(sale),
          _nullable(row['acquisitionCostMinor']) == null
              ? ''
              : inventoryMoney(_n(row['acquisitionCostMinor'])),
          inventoryMoney(_n(row['allocatedSalesTaxMinor'])),
          sale == null ? '' : inventoryMoney(_effectiveFee(row, sale)),
          row['netRevenueMinor'] == null
              ? ''
              : inventoryMoney(
                  _n(row['netRevenueMinor']) -
                      (sale == null ? 0 : _effectiveFee(row, sale)),
                ),
          row['grossProfitMinor'] == null
              ? ''
              : inventoryMoney(
                  _n(row['grossProfitMinor']) -
                      (sale == null ? 0 : _effectiveFee(row, sale)),
                ),
          row['incomeTaxMinor'] == null
              ? ''
              : inventoryMoney(
                  _afterTax(row) < 0
                      ? 0
                      : ((_n(row['grossProfitMinor']) -
                                    _effectiveFee(row, sale ?? 0)) *
                                _taxBps /
                                10000)
                            .round(),
                ),
          row['profitAfterTaxMinor'] == null
              ? ''
              : inventoryMoney(_afterTax(row)),
          row['status'],
        ].map(cell).join(','),
      );
    }
    final box = context.findRenderObject() as RenderBox?;
    await SharePlus.instance.share(
      ShareParams(
        text: lines.join('\n'),
        subject: 'Grookai card P&L',
        sharePositionOrigin: box == null
            ? null
            : box.localToGlobal(Offset.zero) & box.size,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final controls = Wrap(
      spacing: 12,
      runSpacing: 8,
      children: [
        DropdownButton<String>(
          value: _basis,
          onChanged: (value) {
            if (value != null) {
              setState(() => _basis = value);
              unawaited(_load());
            }
          },
          items: const [
            DropdownMenuItem(
              value: 'acquired',
              child: Text('Acquisition date'),
            ),
            DropdownMenuItem(value: 'sold', child: Text('Sale date')),
          ],
        ),
        _settingField(_tax, 'Income tax %'),
        _settingField(_salesTaxRate, 'Sales tax %'),
        _settingField(_fee, 'Selling fee %'),
        _settingField(_fixedFee, 'Fixed fee'),
        DropdownButton<String>(
          value: _taxMode,
          onChanged: (value) {
            if (value != null) {
              setState(() => _taxMode = value);
              unawaited(_saveSettings());
              unawaited(_load());
            }
          },
          items: const [
            DropdownMenuItem(
              value: 'pass_through',
              child: Text('Sales tax pass-through'),
            ),
            DropdownMenuItem(
              value: 'include_in_offer',
              child: Text('Offer includes sales tax'),
            ),
          ],
        ),
      ],
    );
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Per-card P&L',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              IconButton(
                tooltip: 'Export CSV',
                onPressed: _rows.isEmpty ? null : _export,
                icon: const Icon(Icons.ios_share),
              ),
              IconButton(
                onPressed: _loading ? null : _load,
                icon: const Icon(Icons.refresh),
              ),
            ],
          ),
          const Text(
            'Exact GVVI cost, sale proceeds, sales tax treatment, selling fees, estimated income tax, and profit after tax.',
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(padding: const EdgeInsets.all(12), child: controls),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          if (_loading) const LinearProgressIndicator(),
          const SizedBox(height: 12),
          _totalsCard(),
          if (_selectedSoldRows.isNotEmpty ||
              _rows.any((row) => row['status'] == 'sold_unknown_cost'))
            _bulkBackfillCard(),
          const SizedBox(height: 12),
          for (final row in _rows) _pnlCard(row),
          if (!_loading && _rows.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Text('No cards match this date basis.'),
            ),
        ],
      ),
    );
  }

  Widget _settingField(TextEditingController controller, String label) =>
      SizedBox(
        width: 120,
        child: TextField(
          controller: controller,
          onSubmitted: (_) {
            unawaited(_saveSettings());
            unawaited(_load());
          },
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(labelText: label),
        ),
      );

  Widget _bulkBackfillCard() {
    final unknown = _rows
        .where((row) => row['status'] == 'sold_unknown_cost')
        .toList();
    return Card(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Bulk sold COG backfill',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(
              '${_selectedSoldRows.length} of ${unknown.length} sold cards selected. Allocate the original lot payout across exact GVVI copies.',
            ),
            Wrap(
              spacing: 12,
              runSpacing: 8,
              children: [
                TextButton(
                  onPressed: () => setState(
                    () => _selectedSoldIds.addAll(
                      unknown
                          .where((row) => row['gvviId'] != null)
                          .map((row) => row['instanceId'].toString()),
                    ),
                  ),
                  child: const Text('Select all sold unknowns'),
                ),
                SizedBox(
                  width: 130,
                  child: TextField(
                    controller: _bulkDate,
                    decoration: const InputDecoration(labelText: 'Paid date'),
                    keyboardType: TextInputType.datetime,
                  ),
                ),
                SizedBox(
                  width: 130,
                  child: TextField(
                    controller: _bulkTotal,
                    onChanged: (_) => setState(() {}),
                    decoration: const InputDecoration(labelText: 'Total paid'),
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                  ),
                ),
                DropdownButton<String>(
                  value: _bulkMode,
                  onChanged: (value) =>
                      setState(() => _bulkMode = value ?? 'equal_split'),
                  items: const [
                    DropdownMenuItem(
                      value: 'equal_split',
                      child: Text('Equal split'),
                    ),
                    DropdownMenuItem(
                      value: 'manual',
                      child: Text('Manual per card'),
                    ),
                  ],
                ),
              ],
            ),
            if (_bulkMode == 'manual')
              for (final row in _selectedSoldRows)
                SizedBox(
                  width: 180,
                  child: TextField(
                    onChanged: (value) => setState(
                      () => _bulkInputs[row['instanceId'].toString()] = value,
                    ),
                    decoration: InputDecoration(
                      labelText: '${row['name']} COG',
                    ),
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                  ),
                ),
            Text(
              'Allocated USD ${inventoryMoney(_bulkAllocatedTotal)} of USD ${inventoryMoney(_bulkTotalMinor)}',
            ),
            const SizedBox(height: 6),
            FilledButton(
              onPressed: _backfillBusy == null ? _backfillBulk : null,
              child: Text(
                _backfillBusy == 'bulk'
                    ? 'Saving lot…'
                    : 'Backfill selected sold copies',
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _totalsCard() {
    final realized = _rows.where((row) => row['status'] == 'realized');
    final netRevenue = realized.fold<int>(0, (sum, row) {
      final sale = _nullable(row['saleMinor']) ?? 0;
      final salesTax = _taxMode == 'include_in_offer'
          ? _n(row['allocatedSalesTaxMinor'])
          : 0;
      return sum + sale - salesTax - _effectiveFee(row, sale);
    });
    final cog = realized.fold<int>(
      0,
      (sum, row) => sum + _n(row['acquisitionCostMinor']),
    );
    final gross = realized.fold<int>(0, (sum, row) {
      final sale = _nullable(row['saleMinor']) ?? 0;
      final salesTax = _taxMode == 'include_in_offer'
          ? _n(row['allocatedSalesTaxMinor'])
          : 0;
      return sum +
          sale -
          salesTax -
          _effectiveFee(row, sale) -
          _n(row['acquisitionCostMinor']);
    });
    final incomeTax = realized.fold<int>(0, (sum, row) {
      final sale = _nullable(row['saleMinor']) ?? 0;
      final salesTax = _taxMode == 'include_in_offer'
          ? _n(row['allocatedSalesTaxMinor'])
          : 0;
      final grossRow =
          sale -
          salesTax -
          _effectiveFee(row, sale) -
          _n(row['acquisitionCostMinor']);
      return sum + (grossRow > 0 ? (grossRow * _taxBps / 10000).round() : 0);
    });
    final potential = _rows.where((row) => row['status'] == 'unsold').fold<int>(
      0,
      (sum, row) {
        final market = _nullable(row['marketPriceMinor']);
        final cost = _nullable(row['acquisitionCostMinor']);
        if (market == null || cost == null) return sum;
        final grossRow =
            market -
            (_taxMode == 'include_in_offer'
                ? _taxInclusivePortion(market)
                : 0) -
            (market * _feeBps ~/ 10000) -
            _fixedMinor -
            cost;
        return sum +
            grossRow -
            (grossRow > 0 ? (grossRow * _taxBps / 10000).round() : 0);
      },
    );
    final values = {
      'Net revenue': netRevenue,
      'COG': cog,
      'Gross profit': gross,
      'Income tax': incomeTax,
      'After tax': gross - incomeTax,
      'Potential unsold after tax': potential,
    };
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Wrap(
          spacing: 18,
          runSpacing: 8,
          children: [
            for (final entry in values.entries)
              Text(
                '${entry.key}\n\$${inventoryMoney(entry.value)}',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
          ],
        ),
      ),
    );
  }

  Widget _pnlCard(Map<String, dynamic> row) {
    final status = row['status']?.toString() ?? 'unknown';
    final instanceId = row['instanceId']?.toString() ?? '';
    final sale = _nullable(row['saleMinor']);
    final cost = _nullable(row['acquisitionCostMinor']);
    final afterTax = _afterTax(row);
    final offer = inventoryMoneyInput(
      _offers[row['instanceId']?.toString() ?? ''] ?? '',
    );
    final offerAfterTax = offer == null || cost == null
        ? null
        : (() {
            final salesTax = _taxMode == 'include_in_offer'
                ? _taxInclusivePortion(offer)
                : 0;
            final gross = offer - salesTax - _effectiveFee(row, offer) - cost;
            return gross - (gross > 0 ? (gross * _taxBps / 10000).round() : 0);
          })();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${row['name']} · ${row['setCode']} · ${row['number']}',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            Text(
              '${row['condition']} · ${row['gvviId'] ?? 'GVVI unavailable'} · acquired ${DateTime.tryParse(row['acquisitionDate']?.toString() ?? '')?.toLocal().toString().split(' ').first ?? 'unknown'}',
            ),
            const SizedBox(height: 6),
            if (status == 'realized')
              Text(
                'COG \$${inventoryMoney(cost ?? 0)} · sale \$${inventoryMoney(sale ?? 0)} · fee \$${inventoryMoney(_effectiveFee(row, sale ?? 0))} · after tax \$${inventoryMoney(afterTax)}',
                style: const TextStyle(fontWeight: FontWeight.w700),
              )
            else if (status == 'sold_unknown_cost') ...[
              Row(
                children: [
                  Checkbox(
                    value: _selectedSoldIds.contains(instanceId),
                    onChanged: _backfillBusy == null
                        ? (value) => setState(
                            () => value == true
                                ? _selectedSoldIds.add(instanceId)
                                : _selectedSoldIds.remove(instanceId),
                          )
                        : null,
                  ),
                  const Expanded(
                    child: Text(
                      'Sold with unknown COG. Enter the exact paid amount to complete this card.',
                    ),
                  ),
                ],
              ),
              Wrap(
                spacing: 10,
                runSpacing: 8,
                children: [
                  SizedBox(
                    width: 130,
                    child: TextField(
                      onChanged: (value) => _cogInputs[instanceId] = value,
                      decoration: const InputDecoration(labelText: 'Exact COG'),
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                    ),
                  ),
                  SizedBox(
                    width: 130,
                    child: TextField(
                      onChanged: (value) => _cogDates[instanceId] = value,
                      decoration: const InputDecoration(labelText: 'Paid date'),
                      keyboardType: TextInputType.datetime,
                    ),
                  ),
                  FilledButton(
                    onPressed: _backfillBusy == null
                        ? () => _backfillOne(row)
                        : null,
                    child: Text(
                      _backfillBusy == instanceId
                          ? 'Saving…'
                          : 'Save exact COG',
                    ),
                  ),
                ],
              ),
            ] else
              Text(
                'Unsold · COG ${cost == null ? 'unknown' : '\$${inventoryMoney(cost)}'} · market ${row['marketPriceMinor'] == null ? 'unknown' : '\$${inventoryMoney(_n(row['marketPriceMinor']))} (${row['marketPriceSource'] ?? 'governed'})'}',
              ),
            if (status == 'unsold' && cost != null)
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: const InputDecoration(
                        labelText: 'Customer offer',
                      ),
                      onChanged: (value) => setState(
                        () => _offers[row['instanceId'].toString()] = value,
                      ),
                    ),
                  ),
                  if (offerAfterTax != null)
                    Padding(
                      padding: const EdgeInsets.only(left: 8),
                      child: Text(
                        'After tax \$${inventoryMoney(offerAfterTax)}',
                      ),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
