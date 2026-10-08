import 'dart:async';
import 'package:flutter/material.dart';
import '../../models/card_print.dart';
import '../../services/sales/sales_cart_service.dart';
import '../../services/sales/sales_trade.dart';
import '../../services/sales/sales_purchase.dart';
import '../../widgets/card_surface_artwork.dart';
import 'sales_offer_presets.dart';

class SalesPurchaseDialog extends StatefulWidget {
  const SalesPurchaseDialog({
    super.key,
    required this.service,
    this.line,
    this.quick = false,
    this.canAdd,
  });
  final SalesCartService service;
  final Map<String, dynamic>? line;
  final bool quick;
  final bool Function()? canAdd;
  @override
  State<SalesPurchaseDialog> createState() => _SalesPurchaseDialogState();
}

class _SalesPurchaseDialogState extends State<SalesPurchaseDialog> {
  final _query = TextEditingController(),
      _description = TextEditingController();
  final _agreed = TextEditingController(),
      _reference = TextEditingController(),
      _rate = TextEditingController();
  final _quantity = TextEditingController(text: '1');
  Timer? _timer;
  StreamSubscription<void>? _account;
  List<CardPrint> _cards = [];
  List<Map<String, dynamic>> _printings = [];
  CardPrint? _selected;
  String? _cardId, _printingId, _error;
  String _game = 'pokemon', _condition = 'NM';
  bool _manual = false,
      _loading = false,
      _loadingMore = false,
      _stale = true,
      _changed = false,
      _intake = false;
  int _generation = 0;
  int? _nextOffset;

  @override
  void initState() {
    super.initState();
    _manual = widget.quick;
    final line = widget.line;
    if (line != null) {
      _description.text = line['description'] as String;
      _agreed.text = saleMoney(line['unitMinor'] as int);
      _reference.text = line['referenceMinor'] == null
          ? ''
          : saleMoney(line['referenceMinor'] as int);
      _rate.text = line['rateBps'] == null
          ? ''
          : tradeRate(line['rateBps'] as int);
      _quantity.text = '${line['quantity']}';
      _cardId = line['cardId'] as String?;
      _printingId = line['printingId'] as String?;
      _condition = line['condition'] as String? ?? 'NM';
      _intake = line['addToVault'] as bool;
      _manual = _cardId == null;
    }
    _account = widget.service.accountChanges.listen((_) {
      if (mounted) {
        setState(() {
          _changed = true;
          _cards = [];
          _selected = null;
        });
      }
    });
    if (_cardId != null) unawaited(_loadPrintings());
  }

  @override
  void dispose() {
    _timer?.cancel();
    unawaited(_account?.cancel());
    for (final controller in [
      _query,
      _description,
      _agreed,
      _reference,
      _rate,
      _quantity,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  void _search() {
    _timer?.cancel();
    final generation = ++_generation;
    setState(() {
      _cards = [];
      _nextOffset = null;
      _stale = true;
      _loadingMore = false;
      _error = null;
      _loading = _query.text.trim().length >= 2;
    });
    if (!_loading) return;
    _timer = Timer(const Duration(milliseconds: 180), () async {
      try {
        final page = await widget.service.searchCatalogPage(_query.text, _game);
        if (!mounted || _changed || generation != _generation) return;
        setState(() {
          _cards = page.cards;
          _nextOffset = page.pagination?.nextOffset;
          _stale = false;
        });
      } catch (_) {
        if (mounted && !_changed && generation == _generation) {
          setState(() => _error = 'Search could not load. Try again.');
        }
      } finally {
        if (mounted && generation == _generation) {
          setState(() => _loading = false);
        }
      }
    });
  }

  Future<void> _more() async {
    if (_nextOffset == null || _loading || _loadingMore || _stale || _changed) {
      return;
    }
    final generation = _generation;
    setState(() {
      _loadingMore = true;
      _error = null;
    });
    try {
      final page = await widget.service.searchCatalogPage(
        _query.text,
        _game,
        offset: _nextOffset!,
      );
      if (!mounted || _changed || generation != _generation) return;
      final seen = _cards.map((card) => card.id).toSet();
      setState(() {
        _cards = [..._cards, ...page.cards.where((card) => seen.add(card.id))];
        _nextOffset = page.pagination?.nextOffset;
      });
    } catch (_) {
      if (mounted && !_changed && generation == _generation) {
        setState(
          () => _error = 'More results could not load. Retry Load more.',
        );
      }
    } finally {
      if (mounted && generation == _generation) {
        setState(() => _loadingMore = false);
      }
    }
  }

  Future<void> _loadPrintings() async {
    final generation = ++_generation;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final options = await widget.service.catalogPrintings(_cardId!);
      if (!mounted || _changed || generation != _generation) return;
      setState(() {
        _printings = options;
        if (!options.any((printing) => printing['id'] == _printingId)) {
          _printingId = null;
        }
      });
    } catch (_) {
      if (mounted && !_changed && generation == _generation) {
        setState(() {
          _printingId = null;
          _error = 'Printing could not be verified. Choose the card again.';
        });
      }
    } finally {
      if (mounted && generation == _generation) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _choose(CardPrint card) async {
    if (_loading || _stale || _changed) return;
    _timer?.cancel();
    setState(() {
      _selected = card;
      _cardId = card.id;
      _printingId = null;
      _printings = [];
      _description.text = card.name;
      _quantity.text = '1';
      _agreed.clear();
      _reference.clear();
      _rate.clear();
      _manual = false;
      _intake = false;
    });
    await _loadPrintings();
  }

  void _save() {
    if (_changed || _loading || widget.canAdd?.call() == false) return;
    try {
      final amount = saleMoneyInput(_agreed.text),
          reference = _reference.text.trim().isEmpty
              ? null
              : saleMoneyInput(_reference.text);
      final rate = _rate.text.trim().isEmpty
          ? null
          : tradeRateInput(_rate.text);
      final quantity = RegExp(r'^\d{1,3}$').hasMatch(_quantity.text)
          ? int.tryParse(_quantity.text)
          : null;
      if (amount == null ||
          quantity == null ||
          _reference.text.trim().isNotEmpty && reference == null ||
          _rate.text.trim().isNotEmpty && rate == null) {
        throw const FormatException(
          'Check the agreed price, quantity and optional offer fields.',
        );
      }
      if (!_manual && (_cardId == null || _printingId == null)) {
        throw const FormatException('Choose the exact printing first.');
      }
      final line = validatePurchaseItem({
        'description': _description.text.trim(),
        'quantity': _manual ? quantity : 1,
        'unitMinor': amount,
        'referenceMinor': reference,
        'rateBps': rate,
        'cardId': _manual ? null : _cardId,
        'printingId': _manual ? null : _printingId,
        'condition': _manual ? null : _condition,
        'addToVault': !_manual && _intake,
      });
      Navigator.pop(context, line);
    } catch (error) {
      setState(
        () => _error = error is FormatException
            ? error.message
            : error.toString(),
      );
    }
  }

  Widget _money(TextEditingController controller, String label) => TextField(
    controller: controller,
    maxLength: 10,
    keyboardType: const TextInputType.numberWithOptions(decimal: true),
    decoration: InputDecoration(labelText: label),
    onChanged: (_) => setState(() {}),
  );

  @override
  Widget build(BuildContext context) {
    final editing = _manual || _cardId != null;
    int? suggestion;
    try {
      suggestion = purchaseOffer(
        saleMoneyInput(_reference.text),
        tradeRateInput(_rate.text),
      );
    } catch (_) {
      /* Optional offer may be incomplete. */
    }
    final suggested = suggestion;
    return AlertDialog(
      title: Text(
        widget.line == null ? 'Add purchase item' : 'Edit purchase item',
      ),
      content: SizedBox(
        width: 620,
        height: MediaQuery.sizeOf(context).height * .65,
        child: _changed
            ? const Text(
                'Your account changed. Close and reopen the sales desk.',
              )
            : Column(
                children: [
                  if (_loading) const LinearProgressIndicator(),
                  if (_error != null)
                    Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  Expanded(
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (!editing) ...[
                            OutlinedButton.icon(
                              onPressed: () {
                                ++_generation;
                                _timer?.cancel();
                                setState(() {
                                  _manual = true;
                                  _loading = false;
                                });
                              },
                              icon: const Icon(Icons.edit_note),
                              label: const Text('Quick purchase'),
                            ),
                            TextField(
                              controller: _query,
                              decoration: const InputDecoration(
                                labelText: 'Find incoming card',
                                prefixIcon: Icon(Icons.search),
                              ),
                              onChanged: (_) => _search(),
                            ),
                            DropdownButton<String>(
                              value: _game,
                              items: const [
                                DropdownMenuItem(
                                  value: 'pokemon',
                                  child: Text('Pokémon'),
                                ),
                                DropdownMenuItem(
                                  value: 'mtg',
                                  child: Text('Magic'),
                                ),
                                DropdownMenuItem(
                                  value: 'one_piece',
                                  child: Text('One Piece'),
                                ),
                              ],
                              onChanged: (value) {
                                _game = value!;
                                _search();
                              },
                            ),
                            for (final card in _cards)
                              ListTile(
                                leading: SizedBox(
                                  width: 45,
                                  height: 64,
                                  child: CardSurfaceArtwork(
                                    label: card.name,
                                    imageUrl: card.catalogImageUrl,
                                    fallbackImageUrl:
                                        card.providerFallbackImageUrl,
                                    enableTapToZoom: false,
                                  ),
                                ),
                                title: Text(card.name),
                                subtitle: Text(
                                  '${card.displaySet} · ${card.displayNumber}\n${card.gvId}',
                                ),
                                onTap: _loading || _stale
                                    ? null
                                    : () => _choose(card),
                              ),
                            if (_nextOffset != null)
                              TextButton(
                                onPressed: _loading || _loadingMore || _stale
                                    ? null
                                    : _more,
                                child: Text(
                                  _loadingMore ? 'Loading more…' : 'Load more',
                                ),
                              ),
                            if (_cards.isEmpty && !_loading)
                              const Padding(
                                padding: EdgeInsets.all(12),
                                child: Text(
                                  'Search by name, set, number or Grookai ID.',
                                ),
                              ),
                          ] else ...[
                            if (_selected != null)
                              Center(
                                child: SizedBox(
                                  width: 100,
                                  height: 140,
                                  child: CardSurfaceArtwork(
                                    label: _selected!.name,
                                    imageUrl: _selected!.catalogImageUrl,
                                    fallbackImageUrl:
                                        _selected!.providerFallbackImageUrl,
                                    enableTapToZoom: false,
                                  ),
                                ),
                              ),
                            TextButton(
                              onPressed: () {
                                ++_generation;
                                _timer?.cancel();
                                setState(() {
                                  _manual = false;
                                  _selected = null;
                                  _cardId = null;
                                  _printingId = null;
                                  _printings = [];
                                  _cards = [];
                                  _loading = false;
                                  _intake = false;
                                  _description.clear();
                                  _agreed.clear();
                                  _reference.clear();
                                  _rate.clear();
                                });
                              },
                              child: const Text('Choose a different card'),
                            ),
                            TextField(
                              controller: _description,
                              readOnly: !_manual,
                              maxLength: 200,
                              decoration: const InputDecoration(
                                labelText: 'Purchase item description',
                              ),
                            ),
                            if (!_manual) ...[
                              DropdownButtonFormField<String>(
                                key: ValueKey(
                                  'printing:$_cardId:${_printings.length}:$_printingId',
                                ),
                                initialValue: _printingId,
                                isExpanded: true,
                                decoration: const InputDecoration(
                                  labelText: 'Exact printing',
                                ),
                                items: _printings
                                    .map(
                                      (printing) => DropdownMenuItem(
                                        value: printing['id'] as String,
                                        child: Text(
                                          '${printing['printing_gv_id']}',
                                        ),
                                      ),
                                    )
                                    .toList(),
                                onChanged: _loading
                                    ? null
                                    : (value) => setState(() {
                                        _printingId = value;
                                        final printing = _printings.firstWhere(
                                          (printing) => printing['id'] == value,
                                        );
                                        _description.text =
                                            '${_selected?.name ?? widget.line!['description'].split(' · ').first} · ${printing['printing_gv_id']}';
                                      }),
                              ),
                              if (!_loading && _printings.isEmpty)
                                const Text(
                                  'No eligible printing. Choose another card or use Quick purchase.',
                                ),
                              DropdownButtonFormField<String>(
                                initialValue: _condition,
                                decoration: const InputDecoration(
                                  labelText: 'Condition',
                                ),
                                items: ['NM', 'LP', 'MP', 'HP', 'DMG']
                                    .map(
                                      (value) => DropdownMenuItem(
                                        value: value,
                                        child: Text(value),
                                      ),
                                    )
                                    .toList(),
                                onChanged: (value) =>
                                    setState(() => _condition = value!),
                              ),
                            ],
                            _money(_agreed, 'Agreed price per item (USD)'),
                            if (_manual)
                              TextField(
                                controller: _quantity,
                                maxLength: 3,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(
                                  labelText: 'Quantity',
                                ),
                              ),
                            ExpansionTile(
                              title: const Text(
                                'Calculate an offer · optional',
                              ),
                              children: [
                                SalesOfferPresets(
                                  service: widget.service,
                                  disabled: _loading || _changed,
                                  select: (rate) => setState(
                                    () => _rate.text = tradeRate(rate),
                                  ),
                                ),
                                _money(
                                  _reference,
                                  'Reference value per item (USD)',
                                ),
                                TextField(
                                  controller: _rate,
                                  maxLength: 6,
                                  keyboardType:
                                      const TextInputType.numberWithOptions(
                                        decimal: true,
                                      ),
                                  decoration: const InputDecoration(
                                    labelText: 'Buy percentage',
                                    suffixText: '%',
                                  ),
                                  onChanged: (_) => setState(() {}),
                                ),
                                if (suggested != null)
                                  Text(
                                    'Suggested offer: USD ${saleMoney(suggested)}${saleMoneyInput(_agreed.text) != null && saleMoneyInput(_agreed.text) != suggested ? ' · Agreed price overridden' : ''}',
                                  ),
                                TextButton(
                                  onPressed: suggested == null
                                      ? null
                                      : () => setState(
                                          () => _agreed.text = saleMoney(
                                            suggested,
                                          ),
                                        ),
                                  child: const Text('Use suggested offer'),
                                ),
                                const Text(
                                  'Changing the reference or percentage keeps your agreed price.',
                                ),
                              ],
                            ),
                            if (!_manual)
                              CheckboxListTile(
                                value: _intake,
                                onChanged: (value) =>
                                    setState(() => _intake = value!),
                                contentPadding: EdgeInsets.zero,
                                title: const Text('Add this copy to my Vault'),
                                subtitle: const Text(
                                  'Creates one Hold copy with its agreed cost when the purchase completes.',
                                ),
                              ),
                            if (_manual)
                              const Text(
                                'Quick purchases appear on the receipt and do not create inventory.',
                              ),
                          ],
                        ],
                      ),
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
        if (editing && !_changed)
          FilledButton(
            onPressed: _loading ? null : _save,
            child: Text(
              widget.line == null ? 'Add to purchase' : 'Save purchase item',
            ),
          ),
      ],
    );
  }
}
