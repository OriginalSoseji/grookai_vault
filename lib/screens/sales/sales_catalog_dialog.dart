import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/sales/sales_card_reference.dart';
import 'sales_price_reference.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/card_print.dart';
import '../../services/sales/sales_cart_service.dart';
import '../../widgets/card_surface_artwork.dart';

class SalesCatalogResult {
  const SalesCatalogResult(this.line, this.gvviId, this.instanceId);
  final SalesCartLine? line;
  final String gvviId;
  final String instanceId;
}

class SalesCatalogDialog extends StatefulWidget {
  const SalesCatalogDialog({
    super.key,
    required this.service,
    this.onAdded,
    this.canAddToCart,
    this.initialQuery = '',
  });
  final SalesCartService service;
  final ValueChanged<SalesCatalogResult>? onAdded;
  final bool Function()? canAddToCart;
  final String initialQuery;
  @override
  State<SalesCatalogDialog> createState() => _SalesCatalogDialogState();
}

class _SalesCatalogDialogState extends State<SalesCatalogDialog> {
  final _query = TextEditingController(), _price = TextEditingController();
  final _searchFocus = FocusNode();
  Timer? _debounce;
  StreamSubscription<void>? _account;
  List<CardPrint> _cards = [];
  List<Map<String, dynamic>> _printings = [];
  CardPrint? _selected;
  Map<String, dynamic>? _pending;
  String _game = 'pokemon', _condition = 'NM', _action = 'cart';
  String? _printing, _error;
  int _generation = 0;
  int _added = 0;
  CardSearchPagination? _pagination;
  bool _loadingMore = false;
  bool _loading = true, _busy = false, _changed = false;

  @override
  void initState() {
    super.initState();
    _query.text = widget.initialQuery;
    _account = widget.service.accountChanges.listen((_) {
      if (mounted) {
        setState(() {
          _changed = true;
          _cards = [];
          _selected = null;
          _pending = null;
        });
      }
    });
    unawaited(_recoverDraft());
  }

  @override
  void dispose() {
    _debounce?.cancel();
    unawaited(_account?.cancel());
    _query.dispose();
    _price.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  Future<void> _recoverDraft() async {
    try {
      final pending = await widget.service.pendingCatalogAdd();
      if (mounted && !_changed) setState(() => _pending = pending);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'Could not check previous adds. Close and reopen catalog search.',
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
    if (mounted &&
        !_changed &&
        _pending == null &&
        _error == null &&
        _query.text.trim().length >= 2) {
      _search();
    }
  }

  void _search() {
    _debounce?.cancel();
    final generation = ++_generation;
    setState(() {
      _cards = [];
      _pagination = null;
      _loadingMore = false;
      _selected = null;
      _printing = null;
      _price.clear();
      _error = null;
      _loading = _query.text.trim().length >= 2;
    });
    if (!_loading) return;
    _debounce = Timer(const Duration(milliseconds: 350), () async {
      try {
        final page = await widget.service.searchCatalogPage(_query.text, _game);
        if (mounted && !_changed && generation == _generation) {
          setState(() {
            _cards = page.cards;
            _pagination = page.pagination;
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
    if (offset == null || _loadingMore || _busy) return;
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
          () => _error = 'More results could not load. Try Load more again.',
        );
      }
    } finally {
      if (mounted && generation == _generation) {
        setState(() => _loadingMore = false);
      }
    }
  }

  Future<void> _choose(CardPrint card) async {
    final generation = ++_generation;
    _debounce?.cancel();
    setState(() {
      _selected = card;
      _loadingMore = false;
      _price.clear();
      _printings = [];
      _printing = null;
      _loading = true;
      _error = null;
    });
    try {
      final options = await widget.service.catalogPrintings(card.id);
      if (mounted && !_changed && generation == _generation) {
        setState(() => _printings = options);
      }
    } catch (_) {
      if (mounted && generation == _generation) {
        setState(
          () => _error =
              'Could not load printing choices. Select the card again to retry.',
        );
      }
    } finally {
      if (mounted && generation == _generation) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _save() async {
    if (_busy || _changed) return;
    Map<String, dynamic>? request = _pending;
    if ((request?['action'] ?? _action) == 'cart' &&
        widget.canAddToCart?.call() == false) {
      setState(
        () => _error =
            'The cart has 50 lines. Finish this sale or add to your Vault.',
      );
      return;
    }
    if (request == null) {
      final price = saleMoneyInput(_price.text);
      if (_selected == null ||
          _printing == null ||
          (_action != 'vault' && (price == null || price <= 0))) {
        setState(
          () => _error = 'Choose the printing and enter a positive USD price.',
        );
        return;
      }
      request = {
        'id': newSaleId(),
        'card': {
          'cardId': _selected!.id,
          'printingId': _printing,
          'condition': _condition,
          'intent': _action == 'listing' ? 'sell' : 'hold',
          'priceMinor': _action == 'listing' ? price : null,
        },
        'action': _action,
        'price': price,
        'name': _selected!.name,
        'image': _selected!.catalogImageUrl,
        'fallback': _selected!.providerFallbackImageUrl,
      };
    }
    final saved = request;
    setState(() {
      _busy = true;
      _error = null;
    });
    var staged = false;
    try {
      await widget.service.stageCatalogAdd(saved);
      staged = true;
      if (mounted && !_changed) setState(() => _pending = saved);
      final result = await widget.service.completeCatalogAdd(saved);
      await widget.service.clearCatalogAdd(saved['id'] as String);
      if (!mounted || _changed) return;
      final added = SalesCatalogResult(
        saved['action'] == 'cart'
            ? SalesCartLine(
                description: saved['name'] as String,
                unitMinor: saved['price'] as int,
                instanceId: result['instanceId'] as String,
                gvviId: result['gvviId'] as String,
                imageUrl: saved['image'] as String?,
                fallbackImageUrl: saved['fallback'] as String?,
              )
            : null,
        result['gvviId'] as String,
        result['instanceId'] as String,
      );
      if (widget.onAdded == null) {
        Navigator.pop(context, added);
      } else {
        widget.onAdded!(added);
        setState(() {
          _added++;
          _pending = null;
          _selected = null;
          _printing = null;
          _printings = [];
          _price.clear();
        });
        _searchFocus.requestFocus();
      }
    } on PostgrestException catch (error) {
      // These are authoritative transaction rejections. Network failures keep
      // the exact request locked for recovery; never generate a replacement.
      if (const {'22023', '42501', '22P02'}.contains(error.code)) {
        try {
          await widget.service.clearCatalogAdd(saved['id'] as String);
          if (mounted && !_changed) {
            setState(() {
              _pending = null;
              _error =
                  'The card could not be added. Check its printing and your access, then try again.';
            });
          }
        } catch (_) {
          if (mounted && !_changed) {
            setState(() => _error = 'The saved add still needs recovery.');
          }
        }
      } else if (mounted && !_changed) {
        setState(
          () => _error =
              'Add is unconfirmed. Recover this saved request before adding another copy.',
        );
      }
    } catch (_) {
      if (mounted && !_changed) {
        setState(
          () => _error = staged
              ? 'Add is unconfirmed. Recover this saved request before adding another copy.'
              : 'Could not preserve the request. No new add was sent. Reopen catalog search.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: Dialog(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 820, maxHeight: 760),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: _changed
              ? const Center(
                  child: Text(
                    'Your account changed. Close and reopen the sales desk.',
                  ),
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Find a catalog card',
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                        ),
                        IconButton(
                          tooltip: 'Close catalog',
                          onPressed: _busy
                              ? null
                              : () => Navigator.pop(context),
                          icon: const Icon(Icons.close),
                        ),
                      ],
                    ),
                    const Text(
                      'Choose the exact card and printing. Each add creates one physical copy in your Vault.',
                    ),
                    const SizedBox(height: 12),
                    if (_pending == null) ...[
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _query,
                              focusNode: _searchFocus,
                              enabled: !_busy,
                              autofocus: true,
                              onChanged: (_) => _search(),
                              decoration: const InputDecoration(
                                labelText: 'Name, card number or GV-ID',
                                prefixIcon: Icon(Icons.search),
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
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
                            onChanged: _busy
                                ? null
                                : (value) {
                                    _game = value!;
                                    _search();
                                  },
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                    ],
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Text(
                          _error!,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                          ),
                        ),
                      ),
                    if (_loading || _busy) const LinearProgressIndicator(),
                    if (_added > 0)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Text(
                          '$_added ${_added == 1 ? 'copy' : 'copies'} added · Choose another card or close to return to your sale.',
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ),
                      ),
                    if (_pending == null &&
                        _selected == null &&
                        _cards.isNotEmpty)
                      Text(
                        _pagination == null
                            ? '${_cards.length} top matches · Narrow by set or card number.'
                            : '${_cards.length} of ${_pagination!.total} results',
                      ),
                    Expanded(
                      child: _pending != null
                          ? Center(
                              child: Text(
                                'Saved request: ${_pending!['name']}\nRecover it to confirm the same copy was added.',
                                textAlign: TextAlign.center,
                              ),
                            )
                          : _selected == null
                          ? _cards.isEmpty
                                ? Center(
                                    child: Text(
                                      _loading
                                          ? 'Searching catalog…'
                                          : _query.text.trim().length < 2
                                          ? 'Search by name, set, number or exact Grookai ID.'
                                          : 'No matching cards. Refine your search.',
                                    ),
                                  )
                                : ListView.builder(
                                    itemCount:
                                        _cards.length +
                                        (_pagination?.nextOffset == null
                                            ? 0
                                            : 1),
                                    itemBuilder: (context, index) {
                                      if (index == _cards.length) {
                                        return TextButton.icon(
                                          onPressed: _loadingMore
                                              ? null
                                              : _more,
                                          icon: const Icon(Icons.expand_more),
                                          label: Text(
                                            _loadingMore
                                                ? 'Loading more…'
                                                : 'Load more',
                                          ),
                                        );
                                      }
                                      final card = _cards[index];
                                      return Card(
                                        child: ListTile(
                                          contentPadding: const EdgeInsets.all(
                                            12,
                                          ),
                                          leading: SizedBox(
                                            width: 48,
                                            height: 68,
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
                                          isThreeLine: true,
                                          trailing: const Icon(
                                            Icons.chevron_right,
                                          ),
                                          onTap: () => _choose(card),
                                        ),
                                      );
                                    },
                                  )
                          : ListView(
                              children: [
                                TextButton.icon(
                                  onPressed: _busy
                                      ? null
                                      : () => setState(() {
                                          _generation++;
                                          _selected = null;
                                          _loading = false;
                                        }),
                                  icon: const Icon(Icons.arrow_back),
                                  label: const Text('Back to results'),
                                ),
                                SizedBox(
                                  height: 170,
                                  child: Center(
                                    child: AspectRatio(
                                      aspectRatio: .69,
                                      child: CardSurfaceArtwork(
                                        label: _selected!.name,
                                        imageUrl: _selected!.catalogImageUrl,
                                        fallbackImageUrl:
                                            _selected!.providerFallbackImageUrl,
                                        enableTapToZoom: false,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  _selected!.name,
                                  textAlign: TextAlign.center,
                                  style: Theme.of(context).textTheme.titleLarge,
                                ),
                                Text(
                                  '${_selected!.displaySet} · ${_selected!.displayNumber}\n${_selected!.gvId}',
                                  textAlign: TextAlign.center,
                                ),
                                SalesTcgplayerLink(
                                  reference: SalesCardReference(
                                    name: _selected!.name,
                                    setName: _selected!.displaySet,
                                    number: _selected!.displayNumber,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                if (!_loading && _printings.isEmpty)
                                  const Text(
                                    'No eligible printing is available. This card cannot be added here yet.',
                                  ),
                                DropdownButtonFormField<String>(
                                  key: ValueKey(_selected!.id),
                                  initialValue: _printing,
                                  isExpanded: true,
                                  decoration: const InputDecoration(
                                    labelText: 'Exact printing / finish',
                                    border: OutlineInputBorder(),
                                  ),
                                  items: _printings
                                      .map(
                                        (p) => DropdownMenuItem(
                                          value: p['id'] as String,
                                          child: Text(
                                            '${p['finish_label']} · ${p['printing_gv_id']}',
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      )
                                      .toList(),
                                  onChanged: (value) =>
                                      setState(() => _printing = value),
                                ),
                                const SizedBox(height: 12),
                                DropdownButtonFormField<String>(
                                  initialValue: _condition,
                                  decoration: const InputDecoration(
                                    labelText: 'Condition',
                                    border: OutlineInputBorder(),
                                  ),
                                  items: ['NM', 'LP', 'MP', 'HP', 'DMG']
                                      .map(
                                        (c) => DropdownMenuItem(
                                          value: c,
                                          child: Text(c),
                                        ),
                                      )
                                      .toList(),
                                  onChanged: (value) =>
                                      setState(() => _condition = value!),
                                ),
                                const SizedBox(height: 12),
                                DropdownButtonFormField<String>(
                                  initialValue: _action,
                                  isExpanded: true,
                                  decoration: const InputDecoration(
                                    labelText: 'After adding',
                                    border: OutlineInputBorder(),
                                  ),
                                  items: const [
                                    DropdownMenuItem(
                                      value: 'cart',
                                      child: Text('Add to this sale cart'),
                                    ),
                                    DropdownMenuItem(
                                      value: 'vault',
                                      child: Text('Keep in my Vault'),
                                    ),
                                    DropdownMenuItem(
                                      value: 'listing',
                                      child: Text('Mark for sale in my Vault'),
                                    ),
                                  ],
                                  onChanged: (value) =>
                                      setState(() => _action = value!),
                                ),
                                if (_action != 'vault') ...[
                                  const SizedBox(height: 12),
                                  TextField(
                                    controller: _price,
                                    keyboardType:
                                        const TextInputType.numberWithOptions(
                                          decimal: true,
                                        ),
                                    decoration: InputDecoration(
                                      labelText: _action == 'cart'
                                          ? 'Actual sale price (USD)'
                                          : 'Asking price (USD)',
                                      border: const OutlineInputBorder(),
                                    ),
                                  ),
                                ],
                                if (_action == 'listing')
                                  const Padding(
                                    padding: EdgeInsets.only(top: 8),
                                    child: Text(
                                      'Uses your existing profile sharing settings. Select it separately to list it in your store.',
                                    ),
                                  ),
                              ],
                            ),
                    ),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed:
                          _busy ||
                              _loading ||
                              (_pending == null && _printing == null)
                          ? null
                          : _save,
                      icon: Icon(_pending != null ? Icons.refresh : Icons.add),
                      label: Text(
                        _pending != null
                            ? 'Recover saved add'
                            : _action == 'cart'
                            ? 'Add copy to Vault & cart'
                            : _action == 'listing'
                            ? 'Add copy for sale'
                            : 'Add copy to Vault',
                      ),
                    ),
                  ],
                ),
        ),
      ),
    ),
  );
}
