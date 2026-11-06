import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/gvvi/vendor_pricing_workspace_service.dart';
import '../../services/vault/vault_card_service.dart';
import '../../services/intake/intake_models.dart';
import '../../services/scanner_v5/scanner_v5_identity_service.dart';
import '../../services/public/public_card_printing_options_service.dart';
import '../intake/intake_screens.dart';
import '../gvvi/vendor_pricing_workspace_screen.dart';
import '../../widgets/pricing/card_marketplace_sheet.dart';

class CollectorWorkspaceScreen extends StatefulWidget {
  const CollectorWorkspaceScreen({
    super.key,
    this.cardPrintIds = const {},
    this.service = const VendorPricingWorkspaceService(),
  });
  final Set<String> cardPrintIds;
  final VendorPricingWorkspaceService service;
  @override
  State<CollectorWorkspaceScreen> createState() =>
      _CollectorWorkspaceScreenState();
}

class _CollectorWorkspaceScreenState extends State<CollectorWorkspaceScreen> {
  VendorPricingWorkspaceService get _service => widget.service;
  final _selected = <String>{};
  final _agreed = <String, String>{};
  final _incoming = <Map<String, dynamic>>[];
  final _cash = TextEditingController();
  List<VendorPricingWorkspaceRow> _rows = [];
  String _query = '', _cashDirection = 'none';
  String? _error, _status;
  bool _loading = true, _busy = false;
  bool _restoredDraft = false;
  final String _ownerId = Supabase.instance.client.auth.currentUser?.id ?? '';
  String get _draftKey => 'collector_trade_v1:$_ownerId';
  List<VendorPricingWorkspaceRow> get _chosen =>
      _rows.where((row) => _selected.contains(row.instanceId)).toList();
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _cash.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await _service.load();
      final prefs = await SharedPreferences.getInstance();
      Map? draft;
      if (!_restoredDraft) {
        try {
          final raw = prefs.getString(_draftKey);
          final decoded = raw == null ? null : jsonDecode(raw);
          draft = decoded is Map ? decoded : null;
        } catch (_) {
          _status =
              'Local trade draft could not be restored. Your Vault copies are available.';
        }
      }
      if (!mounted) return;
      setState(() {
        _rows = List.of(data.rows);
        if (!_restoredDraft && draft != null) {
          _selected.clear();
          _selected.addAll(
            (draft['selected'] is List ? draft['selected'] as List : [])
                .whereType<String>()
                .where((id) => _rows.any((row) => row.instanceId == id)),
          );
          _agreed
            ..clear()
            ..addAll(
              (draft['agreed'] is Map ? draft['agreed'] as Map : {}).map(
                (key, value) => MapEntry('$key', '$value'),
              ),
            );
          _incoming
            ..clear()
            ..addAll(
              (draft['incoming'] as List? ?? []).whereType<Map>().map(
                (row) => Map<String, dynamic>.from(row),
              ),
            );
          _cashDirection =
              ['none', 'paid', 'received'].contains(draft['cashDirection'])
              ? draft['cashDirection']
              : 'none';
          _cash.text = draft['cash']?.toString() ?? '';
          _status =
              'Private trade draft restored. Only active owned copies are selected.';
        }
        _restoredDraft = true;
        _selected.removeWhere(
          (id) => !_rows.any((row) => row.instanceId == id),
        );
        _loading = false;
        _error = null;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = 'Copies or the local draft could not be loaded. Retry.';
        });
      }
    }
  }

  Future<void> _saveDraft() async {
    try {
      if (_ownerId != Supabase.instance.client.auth.currentUser?.id) {
        throw StateError('owner changed');
      }
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _draftKey,
        jsonEncode({
          'selected': _selected.toList(),
          'agreed': _agreed,
          'incoming': _incoming,
          'cashDirection': _cashDirection,
          'cash': _cash.text,
        }),
      );
      if (mounted) {
        setState(() => _status = 'Private draft saved on this device.');
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Draft could not be saved on this device.');
      }
    }
  }

  Future<void> _bulkIntent() async {
    String intent = 'hold';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, set) => AlertDialog(
          title: Text(
            'Review ${_selected.length} exact ${_selected.length == 1 ? 'copy' : 'copies'}',
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Trade, Sell and Showcase publish these copies on your Wall. Hold keeps them private.',
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: intent,
                  items: ['hold', 'trade', 'sell', 'showcase']
                      .map(
                        (value) =>
                            DropdownMenuItem(value: value, child: Text(value)),
                      )
                      .toList(),
                  onChanged: (value) => set(() => intent = value!),
                ),
                for (final row in _chosen)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(row.displayName),
                    subtitle: Text(
                      '${row.gvviId} · ${row.printingLabel} · ${row.conditionLabel}',
                    ),
                  ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Keep editing'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Apply to selected copies'),
            ),
          ],
        ),
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await VaultCardService.saveVaultItemInstancesIntentBulk(
        client: Supabase.instance.client,
        instanceIds: _selected,
        intent: intent,
      );
      final data = await _service.load();
      if (mounted) {
        setState(() {
          _rows = List.of(data.rows);
          _status = '${_selected.length} copies updated.';
        });
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'Copies could not all be verified. Reload before retrying.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _recordOutcome() async {
    if (_chosen.length != 1) return;
    final row = _chosen.single;
    final submission = await showExactCopyDispositionSheet(context, row);
    if (submission == null || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _service.disposeCopy(row: row, submission: submission);
      if (mounted) {
        setState(() {
          _rows.removeWhere((value) => value.instanceId == row.instanceId);
          _selected.remove(row.instanceId);
          _status = 'Outcome recorded for ${row.gvviId}.';
        });
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'Outcome could not be confirmed. Reload the exact copy before retrying.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _addIncoming() async {
    final candidate = await Navigator.of(context).push<ScannerV5Candidate>(
      MaterialPageRoute(builder: (_) => const IntakeCardSearch()),
    );
    if (candidate?.cardId == null || !mounted) return;
    try {
      final finishes = await PublicCardPrintingOptionsService.fetch(
        client: Supabase.instance.client,
        cardPrintIds: [candidate!.cardId!],
      );
      if (!mounted) return;
      final finish = await showModalBottomSheet<Map<String, dynamic>>(
        context: context,
        showDragHandle: true,
        builder: (sheetContext) => SafeArea(
          child: ListView(
            shrinkWrap: true,
            children: [
              ListTile(
                title: Text(candidate.name),
                subtitle: const Text('Choose the incoming printing'),
              ),
              for (final finish in finishes)
                ListTile(
                  title: Text(
                    '${finish['finish_label'] ?? finish['finish_key']}',
                  ),
                  onTap: () => Navigator.pop(sheetContext, finish),
                ),
            ],
          ),
        ),
      );
      if (finish != null && mounted) {
        setState(
          () => _incoming.add({
            'id': newIntakeId(),
            'cardId': candidate.cardId,
            'gvId': candidate.gvId,
            'name': candidate.name,
            'set': candidate.setCode,
            'number': candidate.number,
            'printingId': finish['id'],
            'finish': finish['finish_label'] ?? finish['finish_key'],
            'imageUrl': candidate.imageUrl,
            'agreed': '',
          }),
        );
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = 'Incoming printing options could not be loaded.',
        );
      }
    }
  }

  int? _total(Iterable<String> amounts) {
    var total = 0;
    try {
      for (final amount in amounts) {
        final cents = parseIntakeMoney(amount);
        if (cents == null) return null;
        total += cents;
      }
    } catch (_) {
      return null;
    }
    return total;
  }

  @override
  Widget build(BuildContext context) {
    final chosen = _chosen;
    final priced = chosen
        .where((row) => !row.isGraded && row.marketPrice != null)
        .toList();
    final market = priced.fold<double>(0, (sum, row) => sum + row.marketPrice!);
    final give = _total(chosen.map((row) => _agreed[row.instanceId] ?? ''));
    final receive = _total(_incoming.map((row) => '${row['agreed'] ?? ''}'));
    int? cash;
    try {
      cash = _cashDirection == 'none' ? 0 : parseIntakeMoney(_cash.text);
    } catch (_) {
      cash = null;
    }
    final difference = give == null || receive == null || cash == null
        ? null
        : receive -
              give +
              (_cashDirection == 'received'
                  ? cash
                  : _cashDirection == 'paid'
                  ? -cash
                  : 0);
    final filtered = _rows
        .where(
          (row) =>
              (widget.cardPrintIds.isEmpty ||
                  widget.cardPrintIds.contains(row.cardPrintId)) &&
              '${row.displayName} ${row.setName} ${row.gvviId} ${row.printingLabel}'
                  .toLowerCase()
                  .contains(_query.toLowerCase()),
        )
        .toList();
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Collector workspace'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Select copies'),
              Tab(text: 'Trade workspace'),
            ],
          ),
          actions: [
            IconButton(
              tooltip: 'Save private trade draft',
              onPressed: _busy ? null : _saveDraft,
              icon: const Icon(Icons.save_outlined),
            ),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  if (_error != null)
                    MaterialBanner(
                      content: Text(_error!),
                      actions: [
                        TextButton(
                          onPressed: _load,
                          child: const Text('Reload'),
                        ),
                      ],
                    ),
                  if (_status != null)
                    Padding(
                      padding: const EdgeInsets.all(8),
                      child: Text(_status!),
                    ),
                  Expanded(
                    child: TabBarView(
                      children: [
                        ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            TextField(
                              decoration: const InputDecoration(
                                labelText: 'Find an exact copy',
                                hintText: 'Card, set, finish or GVVI',
                              ),
                              onChanged: (value) =>
                                  setState(() => _query = value),
                            ),
                            const SizedBox(height: 12),
                            if (filtered.isEmpty)
                              const Text(
                                'No active copies match. Clear the search or add a card to your Vault.',
                              ),
                            for (final row in filtered)
                              CheckboxListTile(
                                contentPadding: EdgeInsets.zero,
                                value: _selected.contains(row.instanceId),
                                onChanged: _busy
                                    ? null
                                    : (value) => setState(() {
                                        value!
                                            ? _selected.add(row.instanceId)
                                            : _selected.remove(row.instanceId);
                                      }),
                                title: Row(
                                  children: [
                                    if (row.imageUrl != null) ...[
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(6),
                                        child: Image.network(
                                          row.imageUrl!,
                                          width: 42,
                                          height: 59,
                                          fit: BoxFit.contain,
                                          errorBuilder: (_, error, stack) =>
                                              const SizedBox(
                                                width: 42,
                                                height: 59,
                                              ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                    ],
                                    Expanded(child: Text(row.displayName)),
                                  ],
                                ),
                                subtitle: Text(
                                  '${row.gvviId}\n${row.printingLabel} · ${row.conditionLabel}${row.isGraded ? ' · Slab' : ''}',
                                ),
                                secondary: row.cardPrintingId == null
                                    ? null
                                    : IconButton(
                                        tooltip: 'TCGplayer condition listings',
                                        icon: const Icon(Icons.open_in_new),
                                        onPressed: () => showModalBottomSheet<void>(
                                          context: context,
                                          showDragHandle: true,
                                          isScrollControlled: true,
                                          builder: (_) => CardMarketplaceSheet(
                                            cardPrintId: row.cardPrintId,
                                            cardPrintingId: row.cardPrintingId!,
                                            identity:
                                                '${row.displayName} · ${row.printingLabel}',
                                            imageUrl: row.imageUrl,
                                            contextLabel: row.setName,
                                            condition: row.conditionLabel,
                                          ),
                                        ),
                                      ),
                              ),
                          ],
                        ),
                        ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            Text(
                              'You give · ${chosen.length} exact ${chosen.length == 1 ? 'copy' : 'copies'}',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            if (chosen.isEmpty)
                              const Text(
                                'Choose your outgoing copies in Select copies.',
                              ),
                            for (final row in chosen)
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 6,
                                ),
                                child: _TradeArtworkField(
                                  imageUrl: row.imageUrl,
                                  child: TextFormField(
                                    initialValue: _agreed[row.instanceId],
                                    key: ValueKey(row.instanceId),
                                    keyboardType:
                                        const TextInputType.numberWithOptions(
                                          decimal: true,
                                        ),
                                    decoration: InputDecoration(
                                      labelText:
                                          '${row.displayName} · agreed USD',
                                      helperText:
                                          '${row.gvviId} · ${row.printingLabel}',
                                    ),
                                    onChanged: (value) => setState(
                                      () => _agreed[row.instanceId] = value,
                                    ),
                                  ),
                                ),
                              ),
                            const Divider(height: 32),
                            Text(
                              'You receive',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            for (final row in _incoming)
                              Row(
                                children: [
                                  Expanded(
                                    child: _TradeArtworkField(
                                      imageUrl: row['imageUrl']?.toString(),
                                      child: TextFormField(
                                        key: ValueKey(row['id']),
                                        initialValue: '${row['agreed']}',
                                        keyboardType:
                                            const TextInputType.numberWithOptions(
                                              decimal: true,
                                            ),
                                        decoration: InputDecoration(
                                          labelText:
                                              '${row['name']} · agreed USD',
                                          helperText:
                                              '${row['set']} · ${row['number']} · ${row['finish']}',
                                        ),
                                        onChanged: (value) => setState(
                                          () => row['agreed'] = value,
                                        ),
                                      ),
                                    ),
                                  ),
                                  IconButton(
                                    tooltip: 'Remove incoming card',
                                    onPressed: () =>
                                        setState(() => _incoming.remove(row)),
                                    icon: const Icon(Icons.close),
                                  ),
                                ],
                              ),
                            OutlinedButton.icon(
                              onPressed: _addIncoming,
                              icon: const Icon(Icons.add),
                              label: const Text('Choose incoming card'),
                            ),
                            const SizedBox(height: 16),
                            DropdownButtonFormField<String>(
                              isExpanded: true,
                              initialValue: _cashDirection,
                              decoration: const InputDecoration(
                                labelText: 'Cash in this trade',
                              ),
                              items: const [
                                DropdownMenuItem(
                                  value: 'none',
                                  child: Text('No cash'),
                                ),
                                DropdownMenuItem(
                                  value: 'received',
                                  child: Text('Cash you receive'),
                                ),
                                DropdownMenuItem(
                                  value: 'paid',
                                  child: Text('Cash you pay'),
                                ),
                              ],
                              onChanged: (value) =>
                                  setState(() => _cashDirection = value!),
                            ),
                            if (_cashDirection != 'none')
                              TextField(
                                controller: _cash,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                      decimal: true,
                                    ),
                                decoration: const InputDecoration(
                                  labelText: 'Cash amount · USD',
                                ),
                                onChanged: (_) => setState(() {}),
                              ),
                            const SizedBox(height: 16),
                            _TradeValueLine(
                              label: 'Agreed outgoing',
                              value: intakeMoney(give),
                            ),
                            _TradeValueLine(
                              label: 'Agreed incoming',
                              value: intakeMoney(receive),
                            ),
                            const Divider(),
                            _TradeValueLine(
                              label: 'Net received minus given',
                              value: difference == null
                                  ? 'Enter all agreed values'
                                  : 'USD ${(difference / 100).toStringAsFixed(2)}',
                            ),
                            const SizedBox(height: 10),
                            const Text(
                              'Agreed values are your negotiation notes. Market references stay separate. Save this draft, then record each actual outcome through Sold / Traded. Incoming cards require their own reviewed Vault add.',
                            ),
                            TextButton(
                              onPressed: () async {
                                final prefs =
                                    await SharedPreferences.getInstance();
                                await prefs.remove(_draftKey);
                                if (mounted) {
                                  setState(() {
                                    _incoming.clear();
                                    _selected.clear();
                                    _agreed.clear();
                                    _cash.clear();
                                    _cashDirection = 'none';
                                    _status = 'Local trade draft cleared.';
                                  });
                                }
                              },
                              child: const Text('Clear trade draft'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
        bottomNavigationBar: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  '${chosen.length} selected · ${priced.length} priced · ${chosen.length - priced.length} without a qualified raw reference',
                ),
                Text(
                  priced.isEmpty
                      ? 'Selected market value unavailable'
                      : 'Qualified market subtotal: USD ${market.toStringAsFixed(2)}',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    color: Theme.of(context).colorScheme.tertiary,
                  ),
                ),
                Wrap(
                  spacing: 8,
                  children: [
                    TextButton(
                      onPressed: _busy || chosen.isEmpty
                          ? null
                          : () => setState(_selected.clear),
                      child: const Text('Clear selection'),
                    ),
                    OutlinedButton(
                      onPressed: _busy || chosen.isEmpty ? null : _bulkIntent,
                      child: const Text('Review bulk intent'),
                    ),
                    FilledButton(
                      onPressed: _busy || chosen.length != 1
                          ? null
                          : _recordOutcome,
                      child: const Text('Sold / Traded'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _TradeValueLine extends StatelessWidget {
  const _TradeValueLine({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Wrap(
      alignment: WrapAlignment.spaceBetween,
      spacing: 16,
      runSpacing: 4,
      children: [
        Text(label),
        Text(value, style: Theme.of(context).textTheme.titleSmall),
      ],
    ),
  );
}

class _TradeArtworkField extends StatelessWidget {
  const _TradeArtworkField({required this.imageUrl, required this.child});
  final String? imageUrl;
  final Widget child;
  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: SizedBox(
          width: 42,
          height: 59,
          child: (imageUrl ?? '').isEmpty
              ? const Icon(Icons.image_outlined)
              : Image.network(
                  imageUrl!,
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) =>
                      const Icon(Icons.image_not_supported_outlined),
                ),
        ),
      ),
      const SizedBox(width: 12),
      Expanded(child: child),
    ],
  );
}
