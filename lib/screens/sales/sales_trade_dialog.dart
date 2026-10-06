import 'dart:async';
import 'package:flutter/material.dart';
import '../../models/card_print.dart';
import '../../services/sales/sales_cart_service.dart';
import '../../services/sales/sales_trade.dart';
import '../../services/sales/sales_card_reference.dart';
import 'sales_price_reference.dart';
import '../../widgets/card_surface_artwork.dart';

class SalesTradeDialog extends StatefulWidget {
  const SalesTradeDialog({
    super.key,
    required this.service,
    this.line,
    this.embedded = false,
    this.onClose,
    this.onAdded,
    this.canAdd,
  });
  final SalesCartService service;
  final SalesTradeLine? line;
  final bool embedded;
  final VoidCallback? onClose;
  final ValueChanged<SalesTradeLine>? onAdded;
  final bool Function()? canAdd;
  @override
  State<SalesTradeDialog> createState() => _SalesTradeDialogState();
}

class _SalesTradeDialogState extends State<SalesTradeDialog> {
  final _query = TextEditingController(), _name = TextEditingController();
  final _value = TextEditingController(), _rate = TextEditingController();
  final _quantity = TextEditingController(text: '1');
  Timer? _timer;
  StreamSubscription<void>? _account;
  List<CardPrint> _cards = [];
  List<Map<String, dynamic>> _printings = [];
  CardPrint? _selected;
  String? _cardId, _printingId, _error;
  String _game = 'pokemon', _condition = 'NM';
  bool _manual = false, _loading = false, _add = false, _changed = false;
  int _generation = 0;
  CardSearchPagination? _pagination;
  bool _loadingMore = false, _stale = false;

  @override
  void initState() {
    super.initState();
    final line = widget.line;
    if (line != null) {
      _name.text = line.description;
      _value.text = saleMoney(line.valueMinor);
      _rate.text = tradeRate(line.rateBps);
      _quantity.text = '${line.quantity}';
      _cardId = line.cardId;
      _printingId = line.printingId;
      _condition = line.condition ?? 'NM';
      _add = line.addToVault;
      _manual = line.cardId == null;
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
    if (_cardId != null) {
      unawaited(_loadExistingPrinting());
    }
  }

  Future<void> _loadExistingPrinting() async {
    final generation = ++_generation;
    setState(() => _loading = true);
    try {
      final options = await widget.service.catalogPrintings(_cardId!);
      if (mounted && !_changed && generation == _generation) {
        setState(() {
          _printings = options;
          if (!options.any((p) => p['id'] == _printingId)) {
            _printingId = null;
          }
        });
      }
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

  @override
  void dispose() {
    _timer?.cancel();
    unawaited(_account?.cancel());
    for (final c in [_query, _name, _value, _rate, _quantity]) {
      c.dispose();
    }
    super.dispose();
  }

  void _search() {
    _timer?.cancel();
    final generation = ++_generation;
    setState(() {
      if (_query.text.trim().length < 2) _cards = [];
      _pagination = null;
      _loadingMore = false;
      _stale = true;
      _error = null;
      _loading = _query.text.trim().length >= 2;
    });
    if (!_loading) return;
    _timer = Timer(const Duration(milliseconds: 180), () async {
      try {
        final page = await widget.service.searchCatalogPage(_query.text, _game);
        if (mounted && !_changed && generation == _generation) {
          setState(() {
            _cards = page.cards;
            _pagination = page.pagination;
            _stale = false;
          });
        }
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
    final offset = _pagination?.nextOffset;
    if (offset == null || _loadingMore || _loading || _stale) return;
    final generation = _generation;
    setState(() {
      _loadingMore = true;
      _error = null;
    });
    try {
      final page = await widget.service.searchCatalogPage(
        _query.text,
        _game,
        offset: offset,
      );
      if (!mounted || _changed || generation != _generation) return;
      final seen = _cards.map((card) => card.id).toSet();
      setState(() {
        _cards = [..._cards, ...page.cards.where((card) => seen.add(card.id))];
        _pagination = page.pagination;
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

  Future<void> _choose(CardPrint card) async {
    _timer?.cancel();
    final generation = ++_generation;
    setState(() {
      _selected = card;
      _cardId = card.id;
      _printingId = null;
      _printings = [];
      _name.text = '${card.name} · ${card.gvId}';
      _quantity.text = '1';
      _loading = true;
      _error = null;
    });
    try {
      final options = await widget.service.catalogPrintings(card.id);
      if (mounted && !_changed && generation == _generation) {
        setState(() => _printings = options);
      }
    } catch (_) {
      if (mounted && !_changed && generation == _generation) {
        setState(
          () => _error =
              'Printing options could not load. Select the card again.',
        );
      }
    } finally {
      if (mounted && generation == _generation) {
        setState(() => _loading = false);
      }
    }
  }

  void _save() {
    final value = saleMoneyInput(_value.text),
        rate = tradeRateInput(_rate.text);
    final qty = int.tryParse(_quantity.text);
    if (_changed || _loading) return;
    if (_name.text.trim().isEmpty ||
        _name.text.trim().length > 200 ||
        value == null ||
        value < 1 ||
        value > 100000000 ||
        rate == null ||
        qty == null ||
        qty < 1 ||
        qty > 999 ||
        !RegExp(r'^\d{1,3}$').hasMatch(_quantity.text) ||
        (!_manual && (_cardId == null || _printingId == null || qty != 1))) {
      setState(
        () => _error =
            'Choose a card/printing or quick description, a positive value, quantity and a trade rate from 0.01% to 100%.',
      );
      return;
    }
    if (widget.canAdd?.call() == false) {
      setState(
        () => _error =
            'Finish or recover the current deal before adding another trade.',
      );
      return;
    }
    final line = SalesTradeLine(
      description: _name.text.trim(),
      valueMinor: value,
      rateBps: rate,
      quantity: qty,
      cardId: _manual ? null : _cardId,
      printingId: _manual ? null : _printingId,
      condition: _manual ? null : _condition,
      addToVault: !_manual && _add,
    );
    if (widget.onAdded == null) {
      Navigator.pop(context, line);
      return;
    }
    widget.onAdded!(line);
    setState(() {
      _selected = null;
      _cardId = null;
      _printingId = null;
      _printings = [];
      _name.clear();
      _value.clear();
      _quantity.text = '1';
      _manual = false;
      _add = false;
      _error = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final editing = _manual || _cardId != null;
    final value = saleMoneyInput(_value.text),
        rate = tradeRateInput(_rate.text),
        qty = int.tryParse(_quantity.text);
    final credit = value != null && rate != null && qty != null
        ? (value * qty * rate + 5000) ~/ 10000
        : null;
    final content = SizedBox(
      width: 620,
      height: widget.embedded ? null : MediaQuery.sizeOf(context).height * .65,
      child: _changed
          ? const Text('Your account changed. Close and reopen the sales desk.')
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
                            label: const Text(
                              'Quick trade · enter card and value',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _query,
                            onChanged: (_) => _search(),
                            decoration: const InputDecoration(
                              labelText: 'Search canonical card',
                              prefixIcon: Icon(Icons.search),
                            ),
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
                            onChanged: (v) {
                              _game = v!;
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
                          if (_pagination?.nextOffset != null)
                            TextButton(
                              onPressed: _loading || _loadingMore || _stale
                                  ? null
                                  : _more,
                              child: Text(
                                _loadingMore ? 'Loading more…' : 'Load more',
                              ),
                            ),
                          if (_cards.isNotEmpty && !_stale)
                            Text(
                              _pagination == null
                                  ? '${_cards.length} top matches · Narrow by set or number.'
                                  : '${_cards.length} of ${_pagination!.total} results',
                            ),
                          if (_cards.isEmpty && !_loading)
                            const Padding(
                              padding: EdgeInsets.all(16),
                              child: Text(
                                'Search by name, number or GV-ID, or use Quick trade.',
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
                              setState(() {
                                _manual = false;
                                _cardId = null;
                                _printingId = null;
                                _selected = null;
                                _loading = false;
                                _add = false;
                                _name.clear();
                                _cards = [];
                              });
                            },
                            child: const Text('Choose a different card'),
                          ),
                          TextField(
                            controller: _name,
                            readOnly: !_manual,
                            maxLength: 200,
                            decoration: const InputDecoration(
                              labelText: 'Trade card / item',
                            ),
                          ),
                          if (!_manual) ...[
                            if (_printings.isNotEmpty)
                              DropdownButtonFormField<String>(
                                initialValue: _printingId,
                                isExpanded: true,
                                decoration: const InputDecoration(
                                  labelText: 'Exact printing',
                                ),
                                items: _printings
                                    .map(
                                      (p) => DropdownMenuItem(
                                        value: p['id'] as String,
                                        child: Text('${p['printing_gv_id']}'),
                                      ),
                                    )
                                    .toList(),
                                onChanged: (v) => setState(() {
                                  _printingId = v;
                                  final printing = _printings.firstWhere(
                                    (p) => p['id'] == v,
                                  );
                                  final cardName =
                                      _selected?.name ??
                                      widget.line!.description
                                          .split(' · ')
                                          .first;
                                  _name.text =
                                      '$cardName · ${printing['printing_gv_id']}';
                                }),
                              ),
                            if (!_loading &&
                                _printings.isEmpty &&
                                _printingId == null)
                              const Text(
                                'No eligible printing. Choose another card or use Quick trade.',
                              ),
                            DropdownButtonFormField<String>(
                              initialValue: _condition,
                              decoration: const InputDecoration(
                                labelText: 'Condition',
                              ),
                              items: ['NM', 'LP', 'MP', 'HP', 'DMG']
                                  .map(
                                    (s) => DropdownMenuItem(
                                      value: s,
                                      child: Text(s),
                                    ),
                                  )
                                  .toList(),
                              onChanged: (v) => setState(() => _condition = v!),
                            ),
                            CheckboxListTile(
                              value: _add,
                              onChanged: (v) => setState(() => _add = v!),
                              contentPadding: EdgeInsets.zero,
                              title: const Text(
                                'Add this trade card to my Vault',
                              ),
                              subtitle: const Text(
                                'Creates one Hold copy only when this deal is recorded.',
                              ),
                            ),
                          ],
                          const SizedBox(height: 12),
                          if (_name.text.trim().isNotEmpty)
                            SalesTcgplayerLink(
                              reference: SalesCardReference(
                                name: _selected?.name ?? _name.text.trim(),
                                setName: _selected?.displaySet,
                                number: _selected?.displayNumber,
                              ),
                            ),
                          TextField(
                            controller: _value,
                            maxLength: 10,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            onChanged: (_) => setState(() {}),
                            decoration: const InputDecoration(
                              labelText: 'Agreed card value (USD each)',
                              helperText:
                                  'Your agreed valuation, not an automatic market quote.',
                            ),
                          ),
                          if (_manual)
                            TextField(
                              controller: _quantity,
                              maxLength: 3,
                              keyboardType: TextInputType.number,
                              onChanged: (_) => setState(() {}),
                              decoration: const InputDecoration(
                                labelText: 'Trade quantity',
                              ),
                            ),
                          TextField(
                            controller: _rate,
                            maxLength: 6,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            onChanged: (_) => setState(() {}),
                            decoration: const InputDecoration(
                              labelText: 'Trade-in percentage',
                              suffixText: '%',
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            credit == null
                                ? 'Enter value and percentage to calculate credit.'
                                : '${qty ?? 1} × USD ${saleMoney(value!)} × ${tradeRate(rate!)}%\nTrade credit: USD ${saleMoney(credit)}',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          if (_manual)
                            const Padding(
                              padding: EdgeInsets.only(top: 12),
                              child: Text(
                                'Quick trades are recorded on the receipt; they do not create catalog or Vault inventory.',
                              ),
                            ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
    final actions = <Widget>[
      TextButton(
        onPressed: widget.onClose ?? () => Navigator.pop(context),
        child: Text(widget.embedded ? 'Back to stock' : 'Cancel'),
      ),
      if (editing && !_changed)
        FilledButton(
          onPressed: _loading ? null : _save,
          child: const Text('Add trade to deal'),
        ),
    ];
    return widget.embedded
        ? Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Take a trade-in',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 12),
                Expanded(child: content),
                Wrap(spacing: 8, children: actions),
              ],
            ),
          )
        : AlertDialog(
            title: const Text('Take a trade-in'),
            content: content,
            actions: actions,
          );
  }
}
