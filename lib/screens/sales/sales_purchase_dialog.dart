import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import '../../models/card_print.dart';
import '../../services/sales/sales_cart_service.dart';
import '../../services/sales/sales_trade.dart';
import '../../services/sales/sales_purchase.dart';
import '../../services/sales/negotiated_trade.dart';
import '../../widgets/card_surface_artwork.dart';
import '../../services/sales/offer_policies.dart';
import 'sales_offer_policies.dart';

class SalesPurchaseDialog extends StatefulWidget {
  const SalesPurchaseDialog({
    super.key,
    required this.service,
    this.line,
    this.quick = false,
    this.negotiated = false,
    this.canAdd,
  });
  final SalesCartService service;
  final Map<String, dynamic>? line;
  final bool quick;

  /// Explicit agreement uses whole-line credit. Purchases retain per-unit prices.
  final bool negotiated;
  final bool Function()? canAdd;
  @override
  State<SalesPurchaseDialog> createState() => _SalesPurchaseDialogState();
}

class _SalesPurchaseDialogState extends State<SalesPurchaseDialog> {
  String get _intent => widget.negotiated ? 'trade' : 'cash';
  String get _amountField => widget.negotiated ? 'creditMinor' : 'unitMinor';
  String get _referenceField =>
      widget.negotiated ? 'valueMinor' : 'referenceMinor';
  final _query = TextEditingController(),
      _description = TextEditingController();
  final _agreed = TextEditingController(),
      _reference = TextEditingController(),
      _rate = TextEditingController();
  final _quantity = TextEditingController(text: '1');
  Timer? _timer;
  Timer? _quoteTimer;
  Map<String, dynamic>? _policy, _marketReference;
  String? _marketError, _conditionReview;
  bool _marketLoading = false, _freshPolicy = true;
  int _marketGeneration = 0;
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
    _freshPolicy = line == null;
    if (line != null) {
      _description.text = line['description'] as String;
      _agreed.text = saleMoney(line[_amountField] as int);
      _reference.text = line[_referenceField] == null
          ? ''
          : saleMoney(line[_referenceField] as int);
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
          ++_marketGeneration;
          _marketReference = null;
          _policy = null;
        });
      }
    });
    if (_cardId != null) unawaited(_loadPrintings());
    _quoteTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted && !_changed && _policy?['source'] == 'tcgplayer_market') {
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _quoteTimer?.cancel();
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
      _resetPolicy();
    });
    await _loadPrintings();
  }

  void _resetPolicy() {
    ++_marketGeneration;
    _policy = null;
    _marketReference = null;
    _marketError = null;
    _conditionReview = null;
    _marketLoading = false;
    _freshPolicy = true;
  }

  void _selectPolicy(Map<String, dynamic> policy) {
    if (!mounted || _changed) return;
    setState(() {
      _policy = validateOfferPolicy(policy);
      _conditionReview = null;
    });
    unawaited(_refreshReference());
  }

  Future<void> _refreshReference() async {
    final generation = ++_marketGeneration;
    setState(() {
      _marketReference = null;
      _marketError = null;
      _marketLoading = false;
    });
    if (_changed ||
        _policy?['source'] != 'tcgplayer_market' ||
        _manual ||
        _cardId == null ||
        _printingId == null) {
      return;
    }
    final cardId = _cardId!, printingId = _printingId!;
    setState(() => _marketLoading = true);
    try {
      final result = await widget.service.offerMarketReference(
        cardId,
        printingId,
      );
      if (!mounted || _changed || generation != _marketGeneration) return;
      if (result['status'] != 'available') {
        throw const FormatException(
          'No qualified market reference for this exact printing. You can enter agreed terms manually.',
        );
      }
      final reference = Map<String, dynamic>.from(result['reference'] as Map);
      final checked = quoteOfferPolicy(
        {
          'id': printingId,
          'name': 'Reference check',
          'intent': _intent,
          'rateBps': 10000,
          'source': 'tcgplayer_market',
          'conditionBasis': 'unspecified',
          'rounding': {'incrementMinor': 1, 'mode': 'nearest'},
          'lowValueTier': null,
        },
        {
          'intent': _intent,
          'quantity': 1,
          'cardId': cardId,
          'printingId': printingId,
          'condition': null,
        },
        reference,
        DateTime.now().millisecondsSinceEpoch,
      );
      if (checked['status'] != 'available') {
        throw const FormatException(
          'Market reference needs review. Refresh it or enter agreed terms manually.',
        );
      }
      setState(
        () => _marketReference = Map<String, dynamic>.unmodifiable(reference),
      );
    } catch (error) {
      if (mounted && !_changed && generation == _marketGeneration) {
        setState(
          () => _marketError = error is FormatException
              ? error.message
              : 'Market reference could not load. Retry or bypass the policy.',
        );
      }
    } finally {
      if (mounted && generation == _marketGeneration) {
        setState(() => _marketLoading = false);
      }
    }
  }

  Map<String, dynamic>? _proposal() {
    final policy = _policy;
    if (policy == null) return null;
    try {
      final basis = policy['conditionBasis'] == 'selected'
          ? _manual
                ? null
                : _condition
          : policy['conditionBasis'] == 'unspecified'
          ? null
          : policy['conditionBasis'];
      final amount = saleMoneyInput(_reference.text);
      final reference = policy['source'] == 'tcgplayer_market'
          ? _marketReference
          : amount == null
          ? null
          : {
              'source': 'manual',
              'amountMinor': amount,
              'currency': 'USD',
              'cardId': _manual ? null : _cardId,
              'printingId': _manual ? null : _printingId,
              'condition': basis,
              'observedAt': null,
              'publishedAt': null,
              'provenanceId': null,
            };
      return quoteOfferPolicy(
        policy,
        {
          'intent': _intent,
          'quantity': _manual ? int.tryParse(_quantity.text) : 1,
          'cardId': _manual ? null : _cardId,
          'printingId': _manual ? null : _printingId,
          'condition': _manual ? null : _condition,
        },
        reference,
        DateTime.now().millisecondsSinceEpoch,
      );
    } catch (_) {
      return {'status': 'unavailable', 'reason': 'incomplete_item'};
    }
  }

  String get _reviewKey => jsonEncode([
    _policy,
    _cardId,
    _printingId,
    _condition,
    _quantity.text,
    _policy?['source'] == 'manual' ? _reference.text : _marketReference,
  ]);
  void _useSuggestion(int? suggestion) {
    if (_changed || _loading || widget.canAdd?.call() == false) return;
    final fresh = _proposal();
    if (_policy != null &&
        (fresh?['status'] != 'available' ||
            fresh!['requiresConditionReview'] == true &&
                _conditionReview != _reviewKey)) {
      setState(
        () => _error =
            'Review the reference, condition and current offer before applying it.',
      );
      return;
    }
    final amount = fresh?['status'] == 'available'
        ? fresh!['suggestedMinor'] as int
        : suggestion;
    if (amount != null) setState(() => _agreed.text = saleMoney(amount));
  }

  String _referenceTime(String value) {
    final date = DateTime.parse(value).toUtc();
    String pad(int value) => value.toString().padLeft(2, '0');
    return '${date.year}-${pad(date.month)}-${pad(date.day)} ${pad(date.hour)}:${pad(date.minute)} UTC';
  }

  void _save() {
    if (_changed || _loading || widget.canAdd?.call() == false) return;
    try {
      final fresh = _proposal();
      final available = fresh?['status'] == 'available';
      final amount = saleMoneyInput(_agreed.text),
          reference = _policy != null
              ? (available ? fresh!['referenceMinor'] as int : null)
              : _reference.text.trim().isEmpty
              ? null
              : saleMoneyInput(_reference.text);
      final rate = _policy != null
          ? (available ? fresh!['rateBps'] as int : null)
          : _rate.text.trim().isEmpty
          ? null
          : tradeRateInput(_rate.text);
      final quantity = RegExp(r'^\d{1,3}$').hasMatch(_quantity.text)
          ? int.tryParse(_quantity.text)
          : null;
      if (amount == null ||
          quantity == null ||
          _policy == null &&
              (_reference.text.trim().isNotEmpty && reference == null ||
                  _rate.text.trim().isNotEmpty && rate == null)) {
        throw const FormatException(
          'Check the agreed price, quantity and optional offer fields.',
        );
      }
      if (!_manual && (_cardId == null || _printingId == null)) {
        throw const FormatException('Choose the exact printing first.');
      }
      final terms = {
        'description': _description.text.trim(),
        'quantity': _manual ? quantity : 1,
        _amountField: amount,
        _referenceField: reference,
        'rateBps': rate,
        'cardId': _manual ? null : _cardId,
        'printingId': _manual ? null : _printingId,
        'condition': _manual ? null : _condition,
        'addToVault': !_manual && _intake,
      };
      final line = widget.negotiated
          ? validateNegotiatedTradeLine(terms)
          : validatePurchaseItem(terms);
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
      if (widget.negotiated) {
        final value = saleMoneyInput(_reference.text),
            bps = tradeRateInput(_rate.text);
        final quantity = _manual ? int.tryParse(_quantity.text) : 1;
        if (value != null &&
            value > 0 &&
            bps != null &&
            quantity != null &&
            quantity >= 1 &&
            quantity <= 999 &&
            value * quantity <= 100000000) {
          suggestion = (value * quantity * bps + 5000) ~/ 10000;
        }
      } else {
        suggestion = purchaseOffer(
          saleMoneyInput(_reference.text),
          tradeRateInput(_rate.text),
        );
      }
    } catch (_) {
      /* Optional offer may be incomplete. */
    }
    final proposal = _proposal();
    if (_policy != null) {
      suggestion = proposal?['status'] == 'available'
          ? proposal!['suggestedMinor'] as int
          : null;
    }
    final suggested = suggestion;
    final needsReview =
        proposal?['status'] == 'available' &&
        proposal!['requiresConditionReview'] == true &&
        _conditionReview != _reviewKey;
    return AlertDialog(
      title: Text(
        widget.negotiated
            ? widget.line == null
                  ? 'Add trade item'
                  : 'Edit trade item'
            : widget.line == null
            ? 'Add purchase item'
            : 'Edit purchase item',
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
                              label: Text(
                                widget.negotiated
                                    ? 'Quick trade'
                                    : 'Quick purchase',
                              ),
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
                                  _resetPolicy();
                                });
                              },
                              child: const Text('Choose a different card'),
                            ),
                            TextField(
                              controller: _description,
                              readOnly: !_manual,
                              maxLength: 200,
                              decoration: InputDecoration(
                                labelText: widget.negotiated
                                    ? 'Trade item description'
                                    : 'Purchase item description',
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
                                    : (value) {
                                        setState(() {
                                          _printingId = value;
                                          final printing = _printings
                                              .firstWhere(
                                                (printing) =>
                                                    printing['id'] == value,
                                              );
                                          _description.text =
                                              '${_selected?.name ?? widget.line!['description'].split(' · ').first} · ${printing['printing_gv_id']}';
                                        });
                                        unawaited(_refreshReference());
                                      },
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
                            _money(
                              _agreed,
                              widget.negotiated
                                  ? 'Agreed credit for this whole line (USD)'
                                  : 'Agreed price per item (USD)',
                            ),
                            if (_manual)
                              TextField(
                                controller: _quantity,
                                maxLength: 3,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(
                                  labelText: 'Quantity',
                                ),
                                onChanged: (_) => setState(() {}),
                              ),
                            ExpansionTile(
                              maintainState: true,
                              title: const Text(
                                'Calculate an offer · optional',
                              ),
                              children: [
                                SalesOfferPolicies(
                                  service: widget.service,
                                  intent: _intent,
                                  disabled: _loading || _changed,
                                  applyDefault: _freshPolicy,
                                  select: _selectPolicy,
                                ),
                                if (_policy != null) ...[
                                  Text('Using ${_policy!['name']}'),
                                  TextButton(
                                    onPressed: _loading
                                        ? null
                                        : () => setState(_resetPolicy),
                                    child: const Text(
                                      'Bypass policy · manual terms',
                                    ),
                                  ),
                                ],
                                if (_policy?['source'] != 'tcgplayer_market')
                                  _money(
                                    _reference,
                                    'Reference value per item (USD)',
                                  ),
                                if (_policy == null)
                                  TextField(
                                    controller: _rate,
                                    maxLength: 6,
                                    keyboardType:
                                        const TextInputType.numberWithOptions(
                                          decimal: true,
                                        ),
                                    decoration: InputDecoration(
                                      labelText: widget.negotiated
                                          ? 'Trade percentage'
                                          : 'Buy percentage',
                                      suffixText: '%',
                                    ),
                                    onChanged: (_) => setState(() {}),
                                  ),
                                if (_policy?['source'] == 'manual')
                                  Text(
                                    'Entered reference · condition basis: ${_policy!['conditionBasis'] == 'selected'
                                        ? _manual
                                              ? 'unknown'
                                              : _condition
                                        : _policy!['conditionBasis']}. Enter a value for this basis; Grookai does not adjust it between conditions.',
                                  ),
                                if (_policy?['source'] ==
                                    'tcgplayer_market') ...[
                                  const Text(
                                    'TCGPlayer Market · exact printing · condition unspecified',
                                  ),
                                  if (_marketLoading)
                                    const LinearProgressIndicator(),
                                  if (_marketError != null) Text(_marketError!),
                                  TextButton(
                                    onPressed:
                                        _loading ||
                                            _marketLoading ||
                                            _printingId == null
                                        ? null
                                        : _refreshReference,
                                    child: const Text(
                                      'Refresh market reference',
                                    ),
                                  ),
                                  if (_marketReference != null)
                                    Text(
                                      'Observed ${_referenceTime(_marketReference!['observedAt'] as String)} · published ${_referenceTime(_marketReference!['publishedAt'] as String)}',
                                    ),
                                ],
                                if (proposal?['status'] == 'available') ...[
                                  Text(
                                    'Reference USD ${saleMoney(proposal!['referenceMinor'] as int)} × ${tradeRate(proposal['rateBps'] as int)}%${proposal['tierApplied'] == true ? ' · Low-value tier' : ''} · Calculated USD ${saleMoney(proposal['calculatedMinor'] as int)} ${widget.negotiated ? 'for this line' : 'per item'} · round ${proposal['rounding']['mode'] == 'down' ? 'down' : 'to nearest'} USD ${saleMoney(proposal['rounding']['incrementMinor'] as int)}',
                                  ),
                                  const Text(
                                    'Calculated value is shown to the nearest cent. The offer rounds the full percentage result once.',
                                  ),
                                  if (proposal['requiresConditionReview'] ==
                                      true)
                                    CheckboxListTile(
                                      contentPadding: EdgeInsets.zero,
                                      value: _conditionReview == _reviewKey,
                                      onChanged: _loading
                                          ? null
                                          : (value) => setState(
                                              () => _conditionReview = value!
                                                  ? _reviewKey
                                                  : null,
                                            ),
                                      title: Text(
                                        'I reviewed the ${proposal['basisCondition'] ?? 'unspecified'} reference condition for this ${_manual ? 'unspecified-condition' : _condition} item.',
                                      ),
                                    ),
                                ],
                                if (_policy != null &&
                                    proposal?['status'] != 'available' &&
                                    !_marketLoading)
                                  const Text(
                                    'No policy offer yet. Check the exact printing, reference and condition basis. You may still enter an agreed price.',
                                  ),
                                if (suggested != null)
                                  Text(
                                    'Suggested offer: USD ${saleMoney(suggested)}${saleMoneyInput(_agreed.text) != null && saleMoneyInput(_agreed.text) != suggested ? ' · Agreed price overridden' : ''}',
                                  ),
                                TextButton(
                                  onPressed:
                                      suggested == null ||
                                          needsReview ||
                                          _loading
                                      ? null
                                      : () => _useSuggestion(suggested),
                                  child: Text(
                                    widget.negotiated
                                        ? 'Use suggested credit'
                                        : 'Use suggested offer',
                                  ),
                                ),
                                Text(
                                  widget.negotiated
                                      ? 'Changing the reference, quantity or policy keeps your agreed whole-line credit.'
                                      : 'Changing the reference or percentage keeps your agreed price.',
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
                                subtitle: Text(
                                  widget.negotiated
                                      ? 'Creates one Hold copy with its agreed credit as cost when the trade completes.'
                                      : 'Creates one Hold copy with its agreed cost when the purchase completes.',
                                ),
                              ),
                            if (_manual)
                              Text(
                                widget.negotiated
                                    ? 'Quick trade lines appear on the receipt and do not create inventory.'
                                    : 'Quick purchases appear on the receipt and do not create inventory.',
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
              widget.negotiated
                  ? widget.line == null
                        ? 'Add to trade'
                        : 'Save trade item'
                  : widget.line == null
                  ? 'Add to purchase'
                  : 'Save purchase item',
            ),
          ),
      ],
    );
  }
}
