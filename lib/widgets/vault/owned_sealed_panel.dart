import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/sealed/owned_sealed_service_v1.dart';
import '../../screens/gvvi/sealed_copy_view.dart';
import '../../screens/grookai_objects/lot_pricing_screen.dart';
import '../../models/grookai_sale_listing.dart';
import '../../services/sealed/owned_sealed_lot_v1.dart';
import 'sealed_copy_details_dialog.dart';

String sealedLabel(String value) => value.replaceAll('_', ' ');
String sealedMoney(double? value, String currency) =>
    value == null ? 'Unpriced' : '$currency ${value.toStringAsFixed(2)}';
String? _moneyError(String? value) =>
    value == null ||
        value.trim().isEmpty ||
        RegExp(r'^\d{1,10}(\.\d{1,2})?$').hasMatch(value.trim())
    ? null
    : 'Enter an amount with up to two decimals';

class AddSealedButton extends StatefulWidget {
  const AddSealedButton({
    super.key,
    required this.variantId,
    required this.name,
  });
  final String variantId, name;
  @override
  State<AddSealedButton> createState() => _AddSealedButtonState();
}

class _AddSealedButtonState extends State<AddSealedButton> {
  late final Future<bool> _enabled = OwnedSealedService.supabase().canAdd();
  @override
  Widget build(BuildContext context) {
    if (!kSealedOwnershipEnabled) return const SizedBox.shrink();
    return FutureBuilder<bool>(
      future: _enabled,
      builder: (context, state) => state.data != true
          ? const SizedBox.shrink()
          : TextButton.icon(
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Add to Vault'),
              onPressed: () => showDialog<void>(
                context: context,
                barrierDismissible: false,
                builder: (_) => _SealedAddDialog(
                  variantId: widget.variantId,
                  name: widget.name,
                ),
              ),
            ),
    );
  }
}

class _SealedAddDialog extends StatefulWidget {
  const _SealedAddDialog({required this.variantId, required this.name});
  final String variantId, name;
  @override
  State<_SealedAddDialog> createState() => _SealedAddDialogState();
}

class _SealedAddDialogState extends State<_SealedAddDialog> {
  final _form = GlobalKey<FormState>();
  final _quantity = TextEditingController(text: '1'),
      _cost = TextEditingController();
  String _seal = 'unknown', _condition = 'unknown', _currency = 'USD';
  bool _busy = false, _attempted = false;
  String? _error;
  @override
  void dispose() {
    _quantity.dispose();
    _cost.dispose();
    super.dispose();
  }

  Future<void> _add() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _attempted = true;
      _error = null;
    });
    try {
      await OwnedSealedService.supabase().add(
        variantId: widget.variantId,
        quantity: int.parse(_quantity.text),
        seal: _seal,
        condition: _condition,
        acquisition: _cost.text.trim().isEmpty ? null : _cost.text.trim(),
        currency: _currency,
      );
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Added to Vault')));
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'Could not confirm addition. Retry to confirm the same copies.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: AlertDialog(
      title: const Text('Add sealed product'),
      content: SingleChildScrollView(
        child: Form(
          key: _form,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(widget.name),
              const SizedBox(height: 12),
              TextFormField(
                controller: _quantity,
                enabled: !_attempted,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Copies'),
                validator: (s) =>
                    (int.tryParse(s ?? '') ?? 0) < 1 ||
                        (int.tryParse(s ?? '') ?? 101) > 100
                    ? 'Choose 1 to 100'
                    : null,
              ),
              _Select(
                label: 'Seal',
                value: _seal,
                options: const ['unknown', 'factory_sealed', 'opened'],
                onChanged: _attempted ? null : (v) => setState(() => _seal = v),
              ),
              _Select(
                label: 'Package condition',
                value: _condition,
                options: const ['unknown', 'undamaged', 'damaged'],
                onChanged: _attempted
                    ? null
                    : (v) => setState(() => _condition = v),
              ),
              TextFormField(
                controller: _cost,
                enabled: !_attempted,
                validator: _moneyError,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: const InputDecoration(
                  labelText: 'Cost per copy (optional)',
                ),
              ),
              _Select(
                label: 'Currency',
                value: _currency,
                options: const ['USD', 'CAD', 'EUR', 'GBP', 'JPY'],
                onChanged: _attempted
                    ? null
                    : (v) => setState(() => _currency = v),
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
          onPressed: _busy ? null : () => Navigator.pop(context),
          child: const Text('Close'),
        ),
        FilledButton(
          onPressed: _busy ? null : _add,
          child: Text(
            _busy
                ? 'Confirming...'
                : _attempted
                ? 'Retry'
                : 'Add',
          ),
        ),
      ],
    ),
  );
}

class OwnedSealedPanel extends StatefulWidget {
  const OwnedSealedPanel({
    super.key,
    this.ownerId,
    this.sectionId,
    this.onTotals,
    this.reloadToken = 0,
    this.wallOnly = false,
    this.query = '',
    this.onSelectionChanged,
    this.onShareLot,
    this.selectionEpoch = 0,
  });
  final String? ownerId, sectionId;
  final int reloadToken;
  final int selectionEpoch;
  final bool wallOnly;
  final String query;
  final ValueChanged<List<OwnedSealedCopy>>? onSelectionChanged;
  final Future<void> Function()? onShareLot;
  final ValueChanged<OwnedSealedTotals?>? onTotals;
  @override
  State<OwnedSealedPanel> createState() => _OwnedSealedPanelState();
}

class _OwnedSealedPanelState extends State<OwnedSealedPanel> {
  StreamSubscription<String>? _additions;
  late final _service = OwnedSealedService.supabase();
  final _selected = <String>{};
  List<OwnedSealedCopy> _rows = [];
  final Map<String, Future<String?>> _images = {};
  int _offset = 0, _generation = 0;
  bool _busy = false, _more = false;
  String? _error;
  bool get _own =>
      widget.ownerId == null || widget.ownerId == _service.userId();
  @override
  void initState() {
    super.initState();
    if (kSealedOwnershipEnabled) {
      _additions = OwnedSealedService.additions.listen((owner) {
        if (mounted && owner == _service.userId()) {
          _offset = 0;
          _load();
        }
      });
      _load();
    }
  }

  @override
  void dispose() {
    _additions?.cancel();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant OwnedSealedPanel old) {
    super.didUpdateWidget(old);
    if (old.selectionEpoch != widget.selectionEpoch) _selected.clear();
    if (old.reloadToken != widget.reloadToken ||
        old.ownerId != widget.ownerId ||
        old.sectionId != widget.sectionId ||
        old.query != widget.query) {
      _offset = 0;
      _rows = [];
      _selected.clear();
      if (kSealedOwnershipEnabled) _load();
    }
  }

  Future<void> _load() async {
    _images.clear();
    final generation = ++_generation;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final rows = await _service.page(
        offset: _offset,
        ownerId: widget.ownerId,
        sectionId: widget.sectionId,
        wallOnly: widget.wallOnly,
        query: widget.query,
      );
      if (!mounted || generation != _generation) return;
      setState(() {
        _rows = rows;
        _more = rows.length == 50;
        _selected.clear();
      });
      widget.onSelectionChanged?.call([]);
      if (_own) {
        try {
          final totals = await _service.totals();
          if (mounted && generation == _generation) {
            widget.onTotals?.call(totals);
          }
        } catch (_) {
          if (mounted && generation == _generation) widget.onTotals?.call(null);
        }
      }
    } catch (_) {
      if (mounted && generation == _generation) {
        setState(
          () => _error =
              'Sealed inventory could not load. Your collection is unchanged.',
        );
        widget.onTotals?.call(null);
        widget.onSelectionChanged?.call([]);
      }
    } finally {
      if (mounted && generation == _generation) setState(() => _busy = false);
    }
  }

  Future<void> _removeSelected() async {
    final selected = _rows.where((r) => _selected.contains(r.id)).toList();
    final yes = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Remove ${selected.length} sealed copies?'),
        content: const Text(
          'They leave your Vault and Wall. Transaction history is preserved.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (yes != true || !mounted) return;
    setState(() => _busy = true);
    var removed = 0;
    for (final row in selected) {
      try {
        await _service.disposeCopy(row, 'remove', {});
        removed++;
      } catch (_) {
        break;
      }
    }
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$removed of ${selected.length} copies removed')),
    );
    await _load();
  }

  Future<void> _shareLot() async {
    if (widget.onShareLot != null) {
      await widget.onShareLot!();
      return;
    }
    final selected = _rows.where((r) => _selected.contains(r.id)).toList();
    if (selected.length < 2 || selected.length > kGrookaiLotMaxCards) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Choose 2 to 12 copies for a lot.')),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      final fresh = await _service.page(
        ids: selected.map((r) => r.id).toList(),
      );
      if (fresh.length != selected.length) {
        throw StateError('An owned copy changed');
      }
      final items = <GrookaiLotListingItemSource>[];
      for (final row in fresh) {
        items.add(
          sealedLotItem(
            row,
            imageUrl:
                await _service.personalImage(row) ?? await _service.image(row),
          ),
        );
      }
      if (!mounted) return;
      await Navigator.push(
        context,
        MaterialPageRoute<void>(
          builder: (_) => LotPricingScreen(
            source: GrookaiLotListingSource(title: 'Sealed lot', items: items),
            metadata: {
              'source': 'sealed_exact_copies',
              'instance_ids': fresh.map((r) => r.id).toList(),
              'sealed_variant_ids': fresh
                  .map((r) => r.text('sealed_product_variant_id'))
                  .toList(),
            },
          ),
        ),
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Lot could not be prepared. Check currency and active copies.',
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!kSealedOwnershipEnabled) return const SizedBox.shrink();
    final visible = _rows;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Sealed products',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
              ),
              if (_selected.isNotEmpty)
                IconButton(
                  tooltip: 'Share selected lot',
                  icon: const Icon(Icons.ios_share),
                  onPressed: _busy ? null : _shareLot,
                ),
              if (_selected.isNotEmpty)
                IconButton(
                  tooltip: 'Remove selected copies',
                  icon: const Icon(Icons.delete_outline),
                  onPressed: _busy ? null : _removeSelected,
                ),
              if (_own)
                IconButton(
                  tooltip: 'Sealed history',
                  icon: const Icon(Icons.history),
                  onPressed: _busy
                      ? null
                      : () => showDialog<void>(
                          context: context,
                          builder: (_) => const SealedHistoryDialog(),
                        ),
                ),
              IconButton(
                tooltip: 'Refresh sealed inventory',
                icon: const Icon(Icons.refresh),
                onPressed: _busy ? null : _load,
              ),
            ],
          ),
          if (_busy) const LinearProgressIndicator(),
          if (_error != null)
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          if (!_busy && _error == null && visible.isEmpty)
            const Padding(
              padding: EdgeInsets.all(12),
              child: Text('No sealed products on this page.'),
            ),
          for (final row in visible)
            Padding(
              key: ValueKey(row.id),
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_own)
                    Checkbox(
                      value: _selected.contains(row.id),
                      onChanged: _busy
                          ? null
                          : (v) => setState(() {
                              v == true
                                  ? _selected.add(row.id)
                                  : _selected.remove(row.id);
                              widget.onSelectionChanged?.call(
                                _rows
                                    .where((r) => _selected.contains(r.id))
                                    .toList(),
                              );
                            }),
                    ),
                  SizedBox(
                    width: 64,
                    height: 80,
                    child: FutureBuilder<String?>(
                      future: _images.putIfAbsent(
                        row.id,
                        () => _service.image(row),
                      ),
                      builder: (_, state) => state.data == null
                          ? const Icon(Icons.inventory_2_outlined)
                          : CachedNetworkImage(
                              imageUrl: state.data!,
                              fit: BoxFit.contain,
                              errorWidget: (_, _, _) =>
                                  const Icon(Icons.broken_image_outlined),
                            ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          row.identity,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        Text(
                          '${sealedLabel(row.text('seal_state'))} / ${sealedLabel(row.text('package_condition'))}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        Text(
                          'Market: ${sealedMoney(row.amount('owned_market_price'), row.text('market_currency'))}',
                        ),
                        if (row.amount('owned_market_price') == null &&
                            row.amount('reference_market_price') != null)
                          Text(
                            'Factory-sealed reference: ${sealedMoney(row.amount('reference_market_price'), row.text('market_currency'))}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        if (row.amount('asking_price_amount') != null)
                          Text(
                            'Asking: ${sealedMoney(row.amount('asking_price_amount'), row.text('asking_price_currency'))}',
                          ),
                        if (_own)
                          Wrap(
                            spacing: 4,
                            children: [
                              TextButton.icon(
                                icon: const Icon(Icons.edit_outlined, size: 18),
                                label: const Text('Manage'),
                                onPressed: _busy
                                    ? null
                                    : () async {
                                        await showDialog<void>(
                                          context: context,
                                          barrierDismissible: false,
                                          builder: (_) => _ManageSealedDialog(
                                            copy: row,
                                            service: _service,
                                          ),
                                        );
                                        if (mounted) await _load();
                                      },
                              ),
                              IconButton(
                                tooltip: 'Photos and notes',
                                icon: const Icon(Icons.photo_library_outlined),
                                onPressed: _busy
                                    ? null
                                    : () async {
                                        await showDialog<void>(
                                          context: context,
                                          barrierDismissible: false,
                                          builder: (_) =>
                                              SealedCopyDetailsDialog(
                                                copy: row,
                                              ),
                                        );
                                        if (mounted) await _load();
                                      },
                              ),
                              AddSealedButton(
                                variantId: row.text(
                                  'sealed_product_variant_id',
                                ),
                                name: row.name,
                              ),
                              IconButton(
                                tooltip: 'Wall sections',
                                icon: const Icon(
                                  Icons.dashboard_customize_outlined,
                                ),
                                onPressed: _busy
                                    ? null
                                    : () async {
                                        await showDialog<void>(
                                          context: context,
                                          builder: (_) =>
                                              _SealedSectionsDialog(copy: row),
                                        );
                                        if (mounted) await _load();
                                      },
                              ),
                            ],
                          ),
                        TextButton.icon(
                          icon: const Icon(Icons.ios_share, size: 18),
                          label: const Text('View / share'),
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute<void>(
                              builder: (_) =>
                                  SealedCopyView(copy: row, ownerTools: _own),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                tooltip: 'Previous page',
                icon: const Icon(Icons.chevron_left),
                onPressed: _busy || _offset == 0
                    ? null
                    : () {
                        _offset -= 50;
                        _load();
                      },
              ),
              Text('Page ${_offset ~/ 50 + 1}'),
              IconButton(
                tooltip: 'Next page',
                icon: const Icon(Icons.chevron_right),
                onPressed: _busy || !_more
                    ? null
                    : () {
                        _offset += 50;
                        _load();
                      },
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ManageSealedDialog extends StatefulWidget {
  const _ManageSealedDialog({required this.copy, required this.service});
  final OwnedSealedCopy copy;
  final OwnedSealedService service;
  @override
  State<_ManageSealedDialog> createState() => _ManageSealedDialogState();
}

class _ManageSealedDialogState extends State<_ManageSealedDialog> {
  final _form = GlobalKey<FormState>();
  late String _seal = widget.copy.text('seal_state'),
      _condition = widget.copy.text('package_condition'),
      _intent = widget.copy.text('intent');
  late String _currency = widget.copy.text('asking_price_currency').isEmpty
      ? 'USD'
      : widget.copy.text('asking_price_currency');
  late final _asking = TextEditingController(
    text: widget.copy.text('asking_price_amount'),
  );
  final _price = TextEditingController(),
      _counterparty = TextEditingController(),
      _received = TextEditingController(),
      _cash = TextEditingController();
  String _mode = 'settings', _cashDirection = 'none';
  bool _busy = false, _attemptedDisposition = false;
  String? _error;
  @override
  void dispose() {
    for (final c in [_asking, _price, _counterparty, _received, _cash]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
      if (_mode != 'settings') _attemptedDisposition = true;
    });
    try {
      if (_mode == 'settings') {
        await widget.service.save(
          widget.copy,
          seal: _seal,
          condition: _condition,
          intent: _intent,
          asking: _asking.text.trim().isEmpty ? null : _asking.text.trim(),
          currency: _currency,
        );
      } else {
        await widget.service.disposeCopy(widget.copy, _mode, {
          if (_mode == 'sale') ...{
            'p_sale_price': _price.text.trim(),
            'p_sale_currency': _currency,
          },
          if (_mode != 'remove' && _counterparty.text.trim().isNotEmpty)
            'p_counterparty': _counterparty.text.trim(),
          if (_mode == 'trade') ...{
            'p_trade_received': _received.text.trim(),
            if (_cashDirection != 'none') ...{
              'p_cash_direction': _cashDirection,
              'p_cash_amount': _cash.text.trim(),
              'p_cash_currency': _currency,
            },
          },
        });
      }
      if (mounted) Navigator.pop(context);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'Could not confirm this change. Retry to confirm; do not create a second transaction.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: AlertDialog(
      title: Text(widget.copy.name),
      content: SingleChildScrollView(
        child: Form(
          key: _form,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(widget.copy.identity),
              _Select(
                label: 'Action',
                value: _mode,
                options: const ['settings', 'sale', 'trade', 'remove'],
                onChanged: _busy || _attemptedDisposition
                    ? null
                    : (v) => setState(() => _mode = v),
              ),
              if (_mode == 'settings') ...[
                _Select(
                  label: 'Seal',
                  value: _seal,
                  options: const ['unknown', 'factory_sealed', 'opened'],
                  onChanged: _busy ? null : (v) => setState(() => _seal = v),
                ),
                _Select(
                  label: 'Package condition',
                  value: _condition,
                  options: const ['unknown', 'undamaged', 'damaged'],
                  onChanged: _busy
                      ? null
                      : (v) => setState(() => _condition = v),
                ),
                _Select(
                  label: 'Visibility / intent',
                  value: _intent,
                  options: const ['hold', 'showcase', 'sell', 'trade'],
                  onChanged: _busy ? null : (v) => setState(() => _intent = v),
                ),
                TextFormField(
                  controller: _asking,
                  enabled: !_busy,
                  validator: _moneyError,
                  decoration: const InputDecoration(
                    labelText: 'My price (optional)',
                  ),
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                ),
              ],
              if (_mode == 'sale')
                TextFormField(
                  controller: _price,
                  enabled: !_busy && !_attemptedDisposition,
                  validator: (v) => (double.tryParse(v ?? '') ?? 0) <= 0
                      ? 'Enter a sale price greater than zero'
                      : _moneyError(v),
                  decoration: const InputDecoration(labelText: 'Sold price'),
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                ),
              if (_mode == 'sale' || _mode == 'trade')
                TextFormField(
                  controller: _counterparty,
                  enabled: !_busy && !_attemptedDisposition,
                  maxLength: 120,
                  decoration: const InputDecoration(
                    labelText: 'To whom (optional)',
                  ),
                ),
              if (_mode == 'trade') ...[
                TextFormField(
                  controller: _received,
                  enabled: !_busy && !_attemptedDisposition,
                  maxLength: 1000,
                  validator: (v) => v == null || v.trim().isEmpty
                      ? 'Record what you received'
                      : null,
                  decoration: const InputDecoration(
                    labelText: 'Received in trade',
                  ),
                ),
                _Select(
                  label: 'Cash',
                  value: _cashDirection,
                  options: const ['none', 'received', 'paid'],
                  onChanged: _busy || _attemptedDisposition
                      ? null
                      : (v) => setState(() => _cashDirection = v),
                ),
                if (_cashDirection != 'none')
                  TextFormField(
                    controller: _cash,
                    enabled: !_busy && !_attemptedDisposition,
                    validator: (v) => (double.tryParse(v ?? '') ?? 0) <= 0
                        ? 'Enter cash amount'
                        : _moneyError(v),
                    decoration: const InputDecoration(labelText: 'Cash amount'),
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                  ),
              ],
              if (_mode != 'remove')
                _Select(
                  label: 'Currency',
                  value: _currency,
                  options: {
                    ...['USD', 'CAD', 'EUR', 'GBP', 'JPY'],
                    _currency,
                  }.toList(),
                  onChanged: _busy || _attemptedDisposition
                      ? null
                      : (v) => setState(() => _currency = v),
                ),
              if (_mode != 'settings')
                const Text(
                  'This removes the copy from your active Vault and Wall. History is retained.',
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
          onPressed: _busy ? null : () => Navigator.pop(context),
          child: const Text('Close'),
        ),
        FilledButton(
          onPressed: _busy ? null : _save,
          child: Text(
            _busy
                ? 'Confirming...'
                : _attemptedDisposition
                ? 'Retry'
                : _mode == 'settings'
                ? 'Save'
                : 'Confirm',
          ),
        ),
      ],
    ),
  );
}

class _Select extends StatelessWidget {
  const _Select({
    required this.label,
    required this.value,
    required this.options,
    required this.onChanged,
  });
  final String label, value;
  final List<String> options;
  final ValueChanged<String>? onChanged;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: DropdownButtonFormField<String>(
      initialValue: value,
      isExpanded: true,
      decoration: InputDecoration(labelText: label),
      items: options
          .map((s) => DropdownMenuItem(value: s, child: Text(sealedLabel(s))))
          .toList(),
      onChanged: onChanged == null
          ? null
          : (v) {
              if (v != null) onChanged!(v);
            },
    ),
  );
}

class _SealedSectionsDialog extends StatefulWidget {
  const _SealedSectionsDialog({required this.copy});
  final OwnedSealedCopy copy;
  @override
  State<_SealedSectionsDialog> createState() => _SealedSectionsDialogState();
}

class _SealedSectionsDialogState extends State<_SealedSectionsDialog> {
  final _client = Supabase.instance.client;
  late final Future<List<Map<String, dynamic>>> _sections = _client
      .from('wall_sections')
      .select('id,name')
      .eq('user_id', _client.auth.currentUser!.id)
      .eq('is_active', true)
      .order('position');
  late final _ids = widget.copy.sectionIds.toSet();
  bool _busy = false;
  String? _error;
  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: AlertDialog(
      title: const Text('Wall sections'),
      content: SizedBox(
        width: 340,
        child: FutureBuilder<List<Map<String, dynamic>>>(
          future: _sections,
          builder: (_, state) {
            if (state.hasError) return const Text('Sections could not load.');
            if (!state.hasData) {
              return const SizedBox(
                height: 64,
                child: Center(child: CircularProgressIndicator()),
              );
            }
            return SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (state.data!.isEmpty)
                    const Text('Create a section on your Wall first.'),
                  for (final section in state.data!)
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(section['name']?.toString() ?? 'Section'),
                      value: _ids.contains(section['id']),
                      onChanged: _busy
                          ? null
                          : (value) async {
                              setState(() {
                                _busy = true;
                                _error = null;
                              });
                              try {
                                await _client.rpc(
                                  'vault_set_copy_section_memberships_v1',
                                  params: {
                                    'p_instance_ids': [widget.copy.id],
                                    'p_section_id': section['id'],
                                    'p_add': value == true,
                                  },
                                );
                                final rows = await OwnedSealedService.supabase()
                                    .page(ids: [widget.copy.id]);
                                if (rows.length != 1 ||
                                    rows.single.sectionIds.contains(
                                          section['id'],
                                        ) !=
                                        value) {
                                  throw StateError('Section readback mismatch');
                                }
                                if (mounted) {
                                  setState(() {
                                    _ids.clear();
                                    _ids.addAll(rows.single.sectionIds);
                                  });
                                }
                              } catch (_) {
                                if (mounted) {
                                  setState(
                                    () => _error =
                                        'Section change could not be confirmed.',
                                  );
                                }
                              } finally {
                                if (mounted) setState(() => _busy = false);
                              }
                            },
                    ),
                  if (_error != null) Text(_error!),
                ],
              ),
            );
          },
        ),
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.pop(context),
          child: const Text('Done'),
        ),
      ],
    ),
  );
}
