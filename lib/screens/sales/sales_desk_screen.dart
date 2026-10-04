import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../services/gvvi/vendor_pricing_workspace_service.dart';
import '../../services/sales/sales_cart_service.dart';
import '../../services/sales/sales_trade.dart';
import '../../widgets/card_surface_artwork.dart';
import 'sales_dashboard.dart';
import 'sales_catalog_dialog.dart';
import 'sales_trade_dialog.dart';
import 'sales_price_reference.dart';

class SalesDeskScreen extends StatefulWidget {
  const SalesDeskScreen({super.key, this.service});
  final SalesCartService? service;
  @override
  State<SalesDeskScreen> createState() => _SalesDeskScreenState();
}

class _SalesDeskScreenState extends State<SalesDeskScreen> {
  late final SalesCartService _service = widget.service ?? SalesCartService();
  final _search = TextEditingController();
  final _store = TextEditingController();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _wants = TextEditingController();
  final _tax = TextEditingController(text: '0.00');
  final _note = TextEditingController();
  final List<SalesCartLine> _lines = [];
  final List<SalesTradeLine> _trades = [];
  SalesDeskData? _data;
  Map<String, dynamic>? _pending, _receipt, _customer;
  bool _loading = true, _busy = false, _showCart = false;
  bool _accountChanged = false, _dashboard = false, _editing = false;
  StreamSubscription<void>? _accountSubscription;
  String? _error;
  String _method = 'Cash';
  bool get _locked =>
      _accountChanged ||
      _editing ||
      _busy ||
      _pending != null ||
      _receipt != null;

  @override
  void initState() {
    super.initState();
    _search.addListener(_filter);
    _accountSubscription = _service.accountChanges.listen((_) {
      if (mounted) {
        setState(() => _accountChanged = true);
        final route = ModalRoute.of(context);
        if (route != null) {
          Navigator.of(context).popUntil((candidate) => candidate == route);
        }
      }
    });
    unawaited(_load());
  }

  @override
  void dispose() {
    unawaited(_accountSubscription?.cancel());
    for (final c in [
      _search,
      _store,
      _name,
      _email,
      _phone,
      _wants,
      _tax,
      _note,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  void _filter() => setState(() {});
  void _message(String message) {
    if (mounted) setState(() => _error = message);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _service.load();
      if (!mounted) return;
      setState(() {
        _data = data;
        if (_store.text.isEmpty) _store.text = data.storeName;
        _pending = data.pending;
        if (_pending != null) {
          final cart = _pending!['cart'] as Map;
          _store.text = cart['storeName'] as String;
          _method = cart['method'] as String;
          _tax.text = saleMoney(cart['taxMinor'] as int);
          _note.text = cart['note'] as String;
          _trades
            ..clear()
            ..addAll(
              (cart['trades'] as List? ?? []).map(
                (item) => SalesTradeLine.fromJson(item as Map),
              ),
            );
          final customer = cart['customer'] as Map;
          _name.text = customer['name'] as String;
          _email.text = customer['email'] as String;
          _phone.text = customer['phone'] as String;
          _wants.text = customer['wants'] as String;
          _customer = cart['customerId'] == null
              ? null
              : {
                  'id': cart['customerId'],
                  ...Map<String, dynamic>.from(customer),
                };
          _lines
            ..clear()
            ..addAll(
              (cart['items'] as List).map(
                (item) => SalesCartLine(
                  description: item['description'] as String,
                  unitMinor: item['unitMinor'] as int,
                  quantity: item['quantity'] as int,
                  instanceId: item['instanceId'] as String?,
                ),
              ),
            );
        }
      });
      if (data.pending != null) {
        final receipt = await _service.recover(data.pending!['id'] as String);
        if (!mounted) return;
        setState(() {
          _receipt = receipt;
          _showCart = true;
        });
        if (receipt == null) {
          _message(
            'A previous sale needs verification. Retry it before starting another sale.',
          );
        }
      }
    } catch (_) {
      _message(
        'Could not open the sales desk. Check your connection and retry.',
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _edit({VendorPricingWorkspaceRow? copy, int? index}) async {
    if (_locked) return;
    if (index == null && _lines.length >= 50) {
      _message('A sale can contain up to 50 lines.');
      return;
    }
    if (copy != null &&
        _lines.any((line) => line.instanceId == copy.instanceId)) {
      _message('That exact copy is already in your cart.');
      return;
    }
    final old = index == null ? null : _lines[index];
    setState(() => _editing = true);
    final line = await showDialog<SalesCartLine>(
      context: context,
      builder: (_) =>
          _SaleLineDialog(copy: copy ?? _copyFor(old?.instanceId), line: old),
    );
    if (!mounted) return;
    setState(() => _editing = false);
    if (line == null || _accountChanged) return;
    setState(() {
      if (index == null) {
        _lines.add(line);
      } else {
        _lines[index] = line;
      }
      _error = null;
    });
  }

  Future<void> _catalog() async {
    if (_locked || _lines.length >= 50) return;
    setState(() => _editing = true);
    final result = await showDialog<SalesCatalogResult>(
      context: context,
      barrierDismissible: false,
      builder: (_) => SalesCatalogDialog(service: _service),
    );
    if (!mounted) return;
    setState(() => _editing = false);
    if (_accountChanged || result == null) return;
    setState(() {
      if (result.line != null &&
          !_lines.any((line) => line.instanceId == result.line!.instanceId)) {
        _lines.add(result.line!);
      }
    });
    await _load();
    if (mounted && !_accountChanged) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Copy ${result.gvviId} added${result.line == null ? ' to your Vault' : ' to your cart'}.',
          ),
        ),
      );
    }
  }

  Future<void> _trade({int? index}) async {
    if (_locked ||
        _data?.tradesAvailable != true ||
        (index == null && _trades.length >= 50)) {
      return;
    }
    setState(() => _editing = true);
    final line = await showDialog<SalesTradeLine>(
      context: context,
      builder: (_) => SalesTradeDialog(
        service: _service,
        line: index == null ? null : _trades[index],
      ),
    );
    if (!mounted) return;
    setState(() {
      _editing = false;
      if (line != null && !_accountChanged) {
        if (index == null) {
          _trades.add(line);
        } else {
          _trades[index] = line;
        }
        _error = null;
      }
    });
  }

  Widget _tradeSummary(int total) {
    final credit = _trades.fold<int>(0, (n, t) => n + t.creditMinor);
    final balance = total - credit;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final trade in _trades)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  trade.description,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                if (trade.condition != null)
                  Text('Condition: ${trade.condition}'),
                Text(
                  '${trade.quantity} × USD ${saleMoney(trade.valueMinor)} × ${tradeRate(trade.rateBps)}% = USD ${saleMoney(trade.creditMinor)} credit',
                ),
              ],
            ),
          ),
        const Divider(),
        Text('Purchase total: USD ${saleMoney(total)}'),
        Text('Trade credit: − USD ${saleMoney(credit)}'),
        const SizedBox(height: 8),
        Text(
          balance < 0
              ? 'Pay customer: USD ${saleMoney(-balance)}'
              : balance == 0
              ? 'Even trade · no money due'
              : 'Customer pays: USD ${saleMoney(balance)}',
          style: Theme.of(context).textTheme.titleLarge,
        ),
      ],
    );
  }

  Future<void> _complete() async {
    if (_busy || _receipt != null) return;
    if (_pending == null) {
      final tax = saleMoneyInput(_tax.text);
      if (_store.text.trim().isEmpty || _lines.isEmpty || tax == null) {
        _message(
          'Enter your store name, add at least one item, and check the tax amount.',
        );
        return;
      }
      final total = _lines.fold<int>(
        tax,
        (sum, line) => sum + line.quantity * line.unitMinor,
      );
      if (total > 100000000) {
        _message('A sale must be no more than USD 1,000,000.');
        return;
      }
      final credit = _trades.fold<int>(0, (n, t) => n + t.creditMinor);
      if (credit > 100000000 ||
          _trades.fold<int>(0, (n, t) => n + t.valueMinor * t.quantity) >
              100000000 ||
          (_trades.isNotEmpty && _note.text.trim().length > 350)) {
        _message(
          'Trade value and credit must be at most USD 1,000,000. Trade receipts allow a note up to 350 characters.',
        );
        return;
      }
      final balance = total - credit;
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(
            _trades.isEmpty ? 'Record this sale?' : 'Review the full deal',
          ),
          content: _trades.isNotEmpty
              ? SizedBox(
                  width: 540,
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _tradeSummary(total),
                        const SizedBox(height: 16),
                        Text(
                          'Confirm the trade cards have been received${balance > 0
                              ? ' and USD ${saleMoney(balance)} received by $_method'
                              : balance < 0
                              ? ' and USD ${saleMoney(-balance)} paid to the customer by $_method'
                              : ''}. '
                          '${_trades.where((t) => t.addToVault).length} incoming copies will be added to your Vault; '
                          '${_lines.where((l) => l.instanceId != null).length} outgoing copies will be marked sold. '
                          'This records the exchange and does not move money.',
                        ),
                      ],
                    ),
                  ),
                )
              : Text(
                  'Confirm you received USD ${saleMoney(total)} by $_method. '
                  '${_lines.where((l) => l.instanceId != null).length} Vault copies will be marked sold and one receipt saved. '
                  'This does not charge a card.',
                ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Back'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(
                _trades.isNotEmpty
                    ? 'Exchange completed · Record deal'
                    : 'Payment received · Record sale',
              ),
            ),
          ],
        ),
      );
      if (confirmed != true || !mounted) return;
      _pending = {
        'id': newSaleId(),
        'cart': {
          'version': _trades.isEmpty ? 1 : 2,
          if (_trades.isNotEmpty)
            'trades': _trades.map((t) => t.toJson()).toList(),
          'storeName': _store.text.trim(),
          'items': _lines.map((line) => line.toJson()).toList(),
          'method': _method,
          'taxMinor': tax,
          'note': _note.text.trim(),
          'customerId': _customer?['id'],
          'customer': {
            'name': _name.text.trim(),
            'email': _email.text.trim(),
            'phone': _phone.text.trim(),
            'wants': _wants.text.trim(),
            'notes': '',
          },
        },
      };
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      // Persist the exact id and payload before any request can reach the server.
      await _service.stage(_pending!);
      final receipt = await _service.complete(_pending!);
      if (mounted) {
        setState(() {
          _receipt = receipt;
          _showCart = true;
        });
      }
    } on PostgrestException catch (error) {
      // These are authoritative transaction failures, not lost HTTP responses.
      if (const {
        '22023',
        'PT409',
        '23514',
        '23505',
        'P0002',
        '42501',
      }.contains(error.code)) {
        try {
          await _service.clearPending(_pending!['id'] as String);
          if (mounted) setState(() => _pending = null);
        } catch (_) {
          /* Keep the exact pending payload when local recovery fails. */
        }
        _message(
          'The sale was not recorded. Review availability and amounts, then try again. Your cart is still here.',
        );
      } else {
        _message(
          'Sale status is unconfirmed. Retry this same sale to recover its receipt without recording it twice.',
        );
      }
    } catch (_) {
      _message(
        'Sale status is unconfirmed. Retry this same sale to recover its receipt without recording it twice.',
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _newSale() async {
    if (_busy || _receipt == null || _pending == null) return;
    setState(() => _busy = true);
    try {
      await _service.clearPending(_pending!['id'] as String);
      if (!mounted) return;
      setState(() {
        _lines.clear();
        _trades.clear();
        _pending = null;
        _receipt = null;
        _customer = null;
        _name.clear();
        _email.clear();
        _phone.clear();
        _wants.clear();
        _note.clear();
        _tax.text = '0.00';
        _showCart = false;
      });
      await _load();
    } catch (_) {
      _message('The receipt is saved. Retry starting a new sale.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _chooseCustomer() async {
    final customer = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (_) => _CustomerPicker(customers: _data?.customers ?? []),
    );
    if (customer == null || !mounted) return;
    setState(() {
      _customer = customer;
      _name.text = customer['name'] as String;
      _email.text = customer['email'] as String;
      _phone.text = customer['phone'] as String;
      _wants.text = customer['wants'] as String;
    });
  }

  Widget _field(
    TextEditingController controller,
    String label,
    int limit, {
    TextInputType? keyboard,
    bool readOnly = false,
    ValueChanged<String>? onChanged,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: TextField(
      controller: controller,
      enabled: !_locked,
      readOnly: readOnly,
      keyboardType: keyboard,
      maxLength: limit,
      onChanged: onChanged,
      decoration: InputDecoration(
        labelText: label,
        counterText: '',
        border: const OutlineInputBorder(),
      ),
    ),
  );

  Widget _inventory() {
    final query = _search.text.trim().toLowerCase();
    final rows = (_data?.rows ?? <VendorPricingWorkspaceRow>[])
        .where(
          (row) =>
              '${row.displayName} ${row.gvId} ${row.gvviId} ${row.setName ?? ''}'
                  .toLowerCase()
                  .contains(query),
        )
        .toList();
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Your cards. Ready to sell.',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              const Text(
                'Tap to add, or hold a card and drag it into the cart.',
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _search,
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.search),
                  labelText: 'Find a card, GV-ID or copy ID',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _locked || _lines.length >= 50 ? null : _catalog,
                icon: const Icon(Icons.search),
                label: const Text('Search catalog & add a card'),
              ),
              const SizedBox(height: 8),
              FilledButton.icon(
                onPressed: _locked ? null : () => _edit(),
                icon: const Icon(Icons.add),
                label: const Text('Quick-add unlisted item'),
              ),
            ],
          ),
        ),
        Expanded(
          child: rows.isEmpty
              ? Center(
                  child: Text(
                    query.isEmpty
                        ? 'No Vault cards yet. Use Quick-add to start a sale.'
                        : 'No matching copies.',
                  ),
                )
              : GridView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 230,
                    mainAxisExtent: 420,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemCount: rows.length,
                  itemBuilder: (context, index) {
                    final row = rows[index],
                        selected = _lines.any(
                          (line) => line.instanceId == rows[index].instanceId,
                        );
                    final card = Card(
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: _locked || selected
                            ? null
                            : () => _edit(copy: row),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Center(
                                  child: AspectRatio(
                                    aspectRatio: .69,
                                    child: CardSurfaceArtwork(
                                      label: row.displayName,
                                      imageUrl: row.imageUrl,
                                      fallbackImageUrl: row.fallbackImageUrl,
                                      enableTapToZoom: false,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                row.displayName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.titleSmall,
                              ),
                              Text(
                                '${row.conditionLabel} · ${row.printingLabel}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                row.gvviId,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.labelSmall,
                              ),
                              const SizedBox(height: 6),
                              SalesVendorPrice(copy: row),
                              SalesTcgplayerLink(
                                reference: salesCopyReference(row),
                              ),
                              SizedBox(
                                width: double.infinity,
                                child: FilledButton.tonalIcon(
                                  onPressed: _locked || selected
                                      ? null
                                      : () => _edit(copy: row),
                                  icon: Icon(
                                    selected
                                        ? Icons.check
                                        : Icons.add_shopping_cart,
                                    size: 18,
                                  ),
                                  label: Text(
                                    selected ? 'In cart' : 'Add to sale',
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                    return LongPressDraggable<VendorPricingWorkspaceRow>(
                      key: ValueKey('drag-${row.instanceId}'),
                      data: row,
                      maxSimultaneousDrags: _locked || selected ? 0 : 1,
                      feedback: Material(
                        elevation: 12,
                        borderRadius: BorderRadius.circular(16),
                        child: SizedBox(
                          width: 140,
                          height: 210,
                          child: Padding(
                            padding: const EdgeInsets.all(8),
                            child: CardSurfaceArtwork(
                              label: row.displayName,
                              imageUrl: row.imageUrl,
                              fallbackImageUrl: row.fallbackImageUrl,
                              enableTapToZoom: false,
                            ),
                          ),
                        ),
                      ),
                      childWhenDragging: Opacity(opacity: .35, child: card),
                      child: card,
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _cart() {
    if (_receipt != null) return _receiptView();
    final subtotal = _lines.fold<int>(
      0,
      (sum, line) => sum + line.unitMinor * line.quantity,
    );
    return ListView(
      key: const Key('sales-cart-scroll'),
      padding: const EdgeInsets.all(20),
      children: [
        Text('Sale cart', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 8),
        if (_pending != null) ...[
          const Text(
            'This sale is preserved for recovery. Retry the same request to check or finish it.',
          ),
          const SizedBox(height: 12),
          Text(
            '${((_pending!['cart'] as Map)['items'] as List).length} sale lines pending verification',
          ),
        ],
        if (_lines.isEmpty && _pending == null)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Text('Add Vault cards or quick-add an item to begin.'),
          ),
        for (var i = 0; i < _lines.length; i++) _cartLine(i),
        OutlinedButton.icon(
          onPressed: _locked ? null : () => _edit(),
          icon: const Icon(Icons.add),
          label: const Text('Quick-add item'),
        ),
        const Divider(height: 32),
        if (_data?.tradesAvailable == true || _trades.isNotEmpty) ...[
          Row(
            children: [
              Expanded(
                child: Text(
                  'Customer trade-ins',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              OutlinedButton.icon(
                onPressed: _locked || _trades.length >= 50
                    ? null
                    : () => _trade(),
                icon: const Icon(Icons.swap_horiz),
                label: const Text('Add trade-in'),
              ),
            ],
          ),
          for (var i = 0; i < _trades.length; i++)
            Card(
              child: ListTile(
                title: Text(_trades[i].description),
                subtitle: Text(
                  '${_trades[i].quantity} × USD ${saleMoney(_trades[i].valueMinor)} at ${tradeRate(_trades[i].rateBps)}%\n'
                  'USD ${saleMoney(_trades[i].creditMinor)} trade credit${_trades[i].addToVault ? ' · add to Vault' : ''}',
                ),
                onTap: _locked ? null : () => _trade(index: i),
                trailing: IconButton(
                  tooltip: 'Remove trade ${i + 1}',
                  icon: const Icon(Icons.close),
                  onPressed: _locked
                      ? null
                      : () => setState(() => _trades.removeAt(i)),
                ),
              ),
            ),
          const Divider(height: 32),
        ],
        _field(_store, 'Store name on receipt', 120),
        DropdownButtonFormField<String>(
          initialValue: _method,
          isExpanded: true,
          decoration: const InputDecoration(
            labelText: 'Payment / payout method',
            border: OutlineInputBorder(),
          ),
          items:
              const [
                    'Cash',
                    'Card (external terminal)',
                    'Bank / payment app',
                    'Other',
                  ]
                  .map(
                    (method) =>
                        DropdownMenuItem(value: method, child: Text(method)),
                  )
                  .toList(),
          onChanged: _locked
              ? null
              : (value) => setState(() => _method = value!),
        ),
        const SizedBox(height: 12),
        _field(
          _tax,
          'Tax collected (USD)',
          10,
          keyboard: const TextInputType.numberWithOptions(decimal: true),
          onChanged: (_) => setState(() {}),
        ),
        Text('Subtotal: USD ${saleMoney(subtotal)}'),
        if (_trades.isNotEmpty)
          _tradeSummary(subtotal + (saleMoneyInput(_tax.text) ?? 0)),
        if (_trades.isEmpty)
          Text(
            'Total: USD ${saleMoney(subtotal + (saleMoneyInput(_tax.text) ?? 0))}',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
        const SizedBox(height: 20),
        ExpansionTile(
          tilePadding: EdgeInsets.zero,
          title: const Text('Customer & receipt details'),
          subtitle: Text(
            _customer?['name'] as String? ??
                'Optional · build your customer book',
          ),
          children: [
            if (_customer == null)
              TextButton.icon(
                onPressed: _locked ? null : _chooseCustomer,
                icon: const Icon(Icons.person_search),
                label: const Text('Choose saved customer'),
              ),
            if (_customer != null)
              TextButton(
                onPressed: _locked
                    ? null
                    : () => setState(() {
                        _customer = null;
                        _name.clear();
                        _email.clear();
                        _phone.clear();
                        _wants.clear();
                      }),
                child: const Text('Use a new customer instead'),
              ),
            _field(_name, 'Customer name', 120, readOnly: _customer != null),
            _field(
              _email,
              'Email',
              254,
              keyboard: TextInputType.emailAddress,
              readOnly: _customer != null,
            ),
            _field(
              _phone,
              'Phone',
              40,
              keyboard: TextInputType.phone,
              readOnly: _customer != null,
            ),
            _field(
              _wants,
              'Cards they are looking for',
              1000,
              readOnly: _customer != null,
            ),
            _field(_note, 'Receipt note', _trades.isEmpty ? 500 : 350),
          ],
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed:
              _busy ||
                  (_pending == null &&
                      (_lines.isEmpty || _data?.available != true))
              ? null
              : _complete,
          icon: _busy
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.receipt_long),
          label: Text(
            _busy
                ? 'Saving sale…'
                : _pending != null
                ? 'Retry / recover this sale'
                : 'Review & record sale',
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'Collect payment using cash or your own terminal. Recording a sale marks selected Vault copies sold and saves one account receipt.',
        ),
      ],
    );
  }

  Widget _dropCart({required Widget child, bool compact = false}) =>
      DragTarget<VendorPricingWorkspaceRow>(
        key: ValueKey(compact ? 'cart-drop-compact' : 'cart-drop'),
        onWillAcceptWithDetails: (details) =>
            !_locked &&
            _lines.length < 50 &&
            !_lines.any((line) => line.instanceId == details.data.instanceId),
        onAcceptWithDetails: (details) {
          if (compact) setState(() => _showCart = true);
          unawaited(_edit(copy: details.data));
        },
        builder: (context, candidates, rejected) => AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          decoration: BoxDecoration(
            color: candidates.isEmpty
                ? null
                : Theme.of(context).colorScheme.primaryContainer,
            border: Border.all(
              width: 2,
              color: candidates.isEmpty
                  ? Colors.transparent
                  : Theme.of(context).colorScheme.primary,
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Material(type: MaterialType.transparency, child: child),
        ),
      );

  VendorPricingWorkspaceRow? _copyFor(String? instanceId) {
    if (instanceId == null) return null;
    for (final copy in _data?.rows ?? <VendorPricingWorkspaceRow>[]) {
      if (copy.instanceId == instanceId) return copy;
    }
    return null;
  }

  Widget _cartLine(int index) {
    final line = _lines[index];
    final copy = _copyFor(line.instanceId);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            if (line.instanceId != null)
              SizedBox(
                width: 46,
                height: 66,
                child: CardSurfaceArtwork(
                  label: line.description,
                  imageUrl: line.imageUrl,
                  fallbackImageUrl: line.fallbackImageUrl,
                  enableTapToZoom: false,
                ),
              ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    line.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (copy != null) SalesVendorPrice(copy: copy),
                  Text(
                    'Checkout: ${line.quantity} × USD ${saleMoney(line.unitMinor)}',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  if (copy != null)
                    SalesTcgplayerLink(reference: salesCopyReference(copy)),
                  Text(
                    line.gvviId ?? 'Quick-added item',
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ],
              ),
            ),
            Column(
              children: [
                IconButton(
                  tooltip: 'Edit sale line',
                  onPressed: _locked ? null : () => _edit(index: index),
                  icon: const Icon(Icons.edit_outlined),
                ),
                IconButton(
                  tooltip: 'Remove sale line',
                  onPressed: _locked
                      ? null
                      : () => setState(() => _lines.removeAt(index)),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _receiptView() => ListView(
    padding: const EdgeInsets.all(24),
    children: [
      const Icon(Icons.check_circle, size: 56, color: Colors.green),
      const SizedBox(height: 12),
      Text('Sale recorded', style: Theme.of(context).textTheme.headlineMedium),
      const Text(
        'Your receipt is saved to your account. Selected Vault copies are marked sold.',
      ),
      const SizedBox(height: 24),
      SelectableText(saleReceiptText(_receipt!)),
      const SizedBox(height: 24),
      Builder(
        builder: (context) => FilledButton.icon(
          onPressed: () async {
            try {
              final box = context.findRenderObject()! as RenderBox;
              await SharePlus.instance.share(
                ShareParams(
                  text: saleReceiptText(_receipt!),
                  subject: 'Receipt ${_receipt!['number']}',
                  sharePositionOrigin:
                      box.localToGlobal(Offset.zero) & box.size,
                ),
              );
            } catch (_) {
              _message(
                'Sharing could not open. You can copy the receipt instead.',
              );
            }
          },
          icon: const Icon(Icons.ios_share),
          label: const Text('Share receipt · text or email'),
        ),
      ),
      TextButton.icon(
        onPressed: () async {
          await Clipboard.setData(
            ClipboardData(text: saleReceiptText(_receipt!)),
          );
          _message('Receipt copied.');
        },
        icon: const Icon(Icons.copy),
        label: const Text('Copy receipt'),
      ),
      TextButton(
        onPressed: () async {
          if (!await launchUrl(
            Uri.parse('https://grookaivault.com/account/store/receipts/start'),
            mode: LaunchMode.externalApplication,
          )) {
            _message('Could not open the account receipt desk.');
          }
        },
        child: const Text('All receipts & customers'),
      ),
      const SizedBox(height: 12),
      FilledButton(
        onPressed: _busy ? null : _newSale,
        child: const Text('Start next sale'),
      ),
    ],
  );

  @override
  Widget build(BuildContext context) => PopScope(
    canPop:
        (_lines.isEmpty && _trades.isEmpty) ||
        _pending != null ||
        _receipt != null,
    onPopInvokedWithResult: (didPop, result) async {
      if (didPop) return;
      final leave = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Leave this cart?'),
          content: const Text(
            'This sale has not been recorded. Leaving clears the unsold cart.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Keep selling'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Leave'),
            ),
          ],
        ),
      );
      if (leave == true && context.mounted) {
        setState(() {
          _lines.clear();
          _trades.clear();
        });
        Navigator.of(context).pop();
      }
    },
    child: _accountChanged
        ? const Scaffold(
            body: SafeArea(
              child: Center(
                child: Text(
                  'Your account changed. Close and reopen the sales desk.',
                ),
              ),
            ),
          )
        : Scaffold(
            appBar: AppBar(
              title: const Text('Sales desk'),
              actions: [
                IconButton(
                  tooltip: _dashboard ? 'Back to selling' : 'Sales dashboard',
                  onPressed: _data == null || _busy
                      ? null
                      : () => setState(() => _dashboard = !_dashboard),
                  icon: Icon(
                    _dashboard ? Icons.point_of_sale : Icons.insights_outlined,
                  ),
                ),
                IconButton(
                  tooltip: 'Refresh cards',
                  onPressed: _loading || _locked ? null : _load,
                  icon: const Icon(Icons.refresh),
                ),
              ],
            ),
            body: SafeArea(
              child: Column(
                children: [
                  if (_error != null)
                    MaterialBanner(
                      content: Text(_error!),
                      actions: [
                        TextButton(
                          onPressed: () => setState(() => _error = null),
                          child: const Text('Dismiss'),
                        ),
                      ],
                    ),
                  Expanded(
                    child: _loading
                        ? const Center(child: CircularProgressIndicator())
                        : _data == null
                        ? Center(
                            child: FilledButton(
                              onPressed: _load,
                              child: const Text('Retry'),
                            ),
                          )
                        : !_data!.available && _pending == null
                        ? const Center(
                            child: Padding(
                              padding: EdgeInsets.all(24),
                              child: Text(
                                'The sales desk is not available yet. Existing Vendor Mode sales and receipts are unchanged.',
                              ),
                            ),
                          )
                        : _dashboard
                        ? SalesDashboard(
                            receipts: [...?_data?.receipts, ?_receipt],
                            refresh: _load,
                          )
                        : LayoutBuilder(
                            builder: (context, constraints) {
                              if (constraints.maxWidth >= 900) {
                                return Row(
                                  children: [
                                    Expanded(child: _inventory()),
                                    const VerticalDivider(width: 1),
                                    SizedBox(
                                      width: 390,
                                      child: _dropCart(child: _cart()),
                                    ),
                                  ],
                                );
                              }
                              return Column(
                                children: [
                                  if (!_showCart)
                                    _dropCart(
                                      compact: true,
                                      child: ListTile(
                                        leading: const Icon(
                                          Icons.shopping_cart_outlined,
                                        ),
                                        title: Text(
                                          'Drop here to add · ${_lines.length} in cart',
                                        ),
                                        trailing: const Icon(
                                          Icons.chevron_right,
                                        ),
                                        onTap: () =>
                                            setState(() => _showCart = true),
                                      ),
                                    ),
                                  Padding(
                                    padding: const EdgeInsets.all(8),
                                    child: SegmentedButton<bool>(
                                      segments: [
                                        const ButtonSegment(
                                          value: false,
                                          label: Text('Cards'),
                                          icon: Icon(Icons.style_outlined),
                                        ),
                                        ButtonSegment(
                                          value: true,
                                          label: Text(
                                            'Cart (${_lines.length})',
                                          ),
                                          icon: const Icon(
                                            Icons.shopping_cart_outlined,
                                          ),
                                        ),
                                      ],
                                      selected: {_showCart},
                                      onSelectionChanged: (values) => setState(
                                        () => _showCart = values.single,
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    child: _showCart ? _cart() : _inventory(),
                                  ),
                                ],
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
          ),
  );
}

class _SaleLineDialog extends StatefulWidget {
  const _SaleLineDialog({this.copy, this.line});
  final VendorPricingWorkspaceRow? copy;
  final SalesCartLine? line;
  @override
  State<_SaleLineDialog> createState() => _SaleLineDialogState();
}

class _SaleLineDialogState extends State<_SaleLineDialog> {
  late final _description = TextEditingController(
    text: widget.line?.description ?? widget.copy?.displayName ?? '',
  );
  late final _price = TextEditingController(
    text: widget.line == null ? '' : saleMoney(widget.line!.unitMinor),
  );
  late final _quantity = TextEditingController(
    text: '${widget.line?.quantity ?? 1}',
  );
  String? _error;
  bool get _exact => widget.copy != null || widget.line?.instanceId != null;
  @override
  void dispose() {
    _description.dispose();
    _price.dispose();
    _quantity.dispose();
    super.dispose();
  }

  void _save() {
    final price = saleMoneyInput(_price.text),
        quantity = int.tryParse(_quantity.text);
    if (_description.text.trim().isEmpty ||
        price == null ||
        price <= 0 ||
        quantity == null ||
        quantity < 1 ||
        quantity > 999) {
      setState(
        () => _error =
            'Enter an item name, positive price and quantity from 1 to 999.',
      );
      return;
    }
    Navigator.pop(
      context,
      SalesCartLine(
        description: _description.text.trim(),
        unitMinor: price,
        quantity: _exact ? 1 : quantity,
        instanceId: widget.copy?.instanceId ?? widget.line?.instanceId,
        gvviId: widget.copy?.gvviId ?? widget.line?.gvviId,
        imageUrl: widget.copy?.imageUrl ?? widget.line?.imageUrl,
        fallbackImageUrl:
            widget.copy?.fallbackImageUrl ?? widget.line?.fallbackImageUrl,
      ),
    );
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text(_exact ? 'Add card to sale' : 'Quick-add item'),
    content: SizedBox(
      width: 420,
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_exact) Text(widget.copy?.gvviId ?? widget.line!.gvviId ?? ''),
            if (!_exact)
              const Text(
                'Sell an item without adding it to your Vault or publishing a listing.',
              ),
            const SizedBox(height: 16),
            if (widget.copy != null) ...[
              SalesVendorPrice(copy: widget.copy!),
              SalesTcgplayerLink(reference: salesCopyReference(widget.copy!)),
              const Text(
                'Check the set, card number, finish and condition on TCGplayer.',
              ),
              const SizedBox(height: 12),
            ],
            TextField(
              controller: _description,
              autofocus: !_exact,
              maxLength: 200,
              decoration: const InputDecoration(labelText: 'Card / item name'),
            ),
            TextField(
              controller: _price,
              autofocus: _exact,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(
                labelText: 'Actual sale price (USD)',
              ),
              onSubmitted: (_) => _save(),
            ),
            if (widget.copy?.askingPrice != null &&
                widget.copy?.currency == 'USD')
              TextButton(
                onPressed: () =>
                    _price.text = widget.copy!.askingPrice!.toStringAsFixed(2),
                child: Text(
                  'Use asking price: USD ${widget.copy!.askingPrice!.toStringAsFixed(2)}',
                ),
              ),
            if (!_exact)
              TextField(
                controller: _quantity,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Quantity'),
              ),
            if (_error != null)
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
          ],
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(onPressed: _save, child: const Text('Add to cart')),
    ],
  );
}

class _CustomerPicker extends StatefulWidget {
  const _CustomerPicker({required this.customers});
  final List<Map<String, dynamic>> customers;
  @override
  State<_CustomerPicker> createState() => _CustomerPickerState();
}

class _CustomerPickerState extends State<_CustomerPicker> {
  String _query = '';
  @override
  Widget build(BuildContext context) {
    final matches = widget.customers
        .where(
          (c) => '${c['name']} ${c['email']} ${c['phone']}'
              .toLowerCase()
              .contains(_query.toLowerCase()),
        )
        .take(100)
        .toList();
    return AlertDialog(
      title: const Text('Saved customers'),
      content: SizedBox(
        width: 420,
        height: 400,
        child: Column(
          children: [
            TextField(
              decoration: const InputDecoration(
                labelText: 'Name, email or phone',
              ),
              onChanged: (value) => setState(() => _query = value),
            ),
            Expanded(
              child: matches.isEmpty
                  ? const Center(child: Text('No matching customers.'))
                  : ListView.builder(
                      itemCount: matches.length,
                      itemBuilder: (context, index) {
                        final c = matches[index];
                        return ListTile(
                          title: Text(c['name'] as String),
                          subtitle: Text('${c['email']} ${c['phone']}'),
                          onTap: () => Navigator.pop(context, c),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
      ],
    );
  }
}
