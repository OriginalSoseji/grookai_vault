import 'dart:async';

import 'package:flutter/material.dart';

import '../../models/binders/binder_models.dart';
import '../../services/binders/binder_repository.dart';
import '../../widgets/binders/binder_widgets.dart';

Future<bool> showBinderCustomChecklistPreview(
  BuildContext context, {
  required List<BinderCustomSlotDraft> slots,
  required String actionLabel,
}) async {
  final totalCopies = slots.fold<int>(
    0,
    (total, slot) => total + slot.requiredQuantity,
  );
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Review checklist'),
      content: SizedBox(
        width: 520,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${slots.length} ${slots.length == 1 ? 'slot' : 'slots'} · '
              '$totalCopies required ${totalCopies == 1 ? 'copy' : 'copies'}',
            ),
            const SizedBox(height: 8),
            const Text(
              'Publishing a later revision may invalidate contributions that '
              'no longer match. Vault copies are never changed.',
            ),
            const SizedBox(height: 12),
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: slots.length,
                itemBuilder: (context, index) {
                  final slot = slots[index];
                  return ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: BinderArtwork(
                      imageUrl: slot.card.hostedImageUrl,
                      fallbackImageUrl: slot.card.fallbackImageUrl,
                      size: 44,
                      semanticLabel: slot.card.name,
                    ),
                    title: Text(slot.card.name),
                    subtitle: Text(
                      [
                        if (slot.card.setLabel.isNotEmpty) slot.card.setLabel,
                        if ((slot.card.number ?? '').isNotEmpty)
                          '#${slot.card.number}',
                        slot.finish.label,
                      ].join(' · '),
                    ),
                    trailing: Text('×${slot.requiredQuantity}'),
                  );
                },
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Keep editing'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, true),
          child: Text(actionLabel),
        ),
      ],
    ),
  );
  return confirmed == true;
}

class BinderCustomChecklistEditorScreen extends StatefulWidget {
  const BinderCustomChecklistEditorScreen({
    required this.repository,
    this.initialSlots = const <BinderCustomSlotDraft>[],
    super.key,
  });

  final BinderRepository repository;
  final List<BinderCustomSlotDraft> initialSlots;

  @override
  State<BinderCustomChecklistEditorScreen> createState() =>
      _BinderCustomChecklistEditorScreenState();
}

class _BinderCustomChecklistEditorScreenState
    extends State<BinderCustomChecklistEditorScreen> {
  final TextEditingController _searchController = TextEditingController();
  late final List<BinderCustomSlotDraft> _slots =
      List<BinderCustomSlotDraft>.from(widget.initialSlots);
  Timer? _debounce;
  List<BinderCatalogCard> _results = const <BinderCatalogCard>[];
  BinderException? _error;
  bool _searching = false;
  int _searchGeneration = 0;

  int get _totalRequired =>
      _slots.fold<int>(0, (total, slot) => total + slot.requiredQuantity);

  bool get _valid =>
      _slots.isNotEmpty && _slots.length <= 1000 && _totalRequired <= 25000;

  @override
  void initState() {
    super.initState();
    unawaited(_search(''));
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () => _search(value));
  }

  Future<void> _search(String query) async {
    if (!mounted) return;
    final generation = ++_searchGeneration;
    setState(() {
      _searching = true;
      _error = null;
    });
    try {
      final results = await widget.repository.searchCustomCards(query: query);
      if (mounted && generation == _searchGeneration) {
        setState(() => _results = results);
      }
    } on BinderException catch (failure) {
      if (mounted && generation == _searchGeneration) {
        setState(() => _error = failure);
      }
    } finally {
      if (mounted && generation == _searchGeneration) {
        setState(() => _searching = false);
      }
    }
  }

  String? _conflictFor(
    BinderCatalogCard card,
    BinderFinishOption finish, {
    int? editingIndex,
  }) {
    for (var index = 0; index < _slots.length; index++) {
      if (index == editingIndex) continue;
      final existing = _slots[index];
      if (existing.card.cardPrintId != card.cardPrintId) continue;
      final existingPrinting = existing.finish.cardPrintingId;
      final nextPrinting = finish.cardPrintingId;
      if (existingPrinting == null ||
          nextPrinting == null ||
          existingPrinting == nextPrinting) {
        return existingPrinting == null || nextPrinting == null
            ? '“Any governed finish” cannot overlap a finish-specific slot '
                  'for the same card.'
            : 'That card and finish are already in this checklist.';
      }
    }
    return null;
  }

  Future<void> _chooseCard(BinderCatalogCard card, {int? editingIndex}) async {
    List<BinderFinishOption> finishes;
    try {
      finishes = await widget.repository.loadCardFinishOptions(
        card.cardPrintId,
      );
    } on BinderException catch (failure) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(failure.message)));
      }
      return;
    }
    if (!mounted) return;
    final existing = editingIndex == null ? null : _slots[editingIndex];
    var finish = finishes.firstWhere(
      (item) =>
          item.cardPrintingId ==
          (existing?.finish.cardPrintingId ?? card.preferredCardPrintingId),
      orElse: () => finishes.first,
    );
    final quantityController = TextEditingController(
      text: '${existing?.requiredQuantity ?? 1}',
    );
    final selected = await showDialog<BinderCustomSlotDraft>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(card.name),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    BinderArtwork(
                      imageUrl: card.hostedImageUrl,
                      fallbackImageUrl: card.fallbackImageUrl,
                      size: 72,
                      semanticLabel: card.name,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        [
                          if (card.setLabel.isNotEmpty) card.setLabel,
                          if ((card.number ?? '').isNotEmpty) '#${card.number}',
                        ].join(' · '),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<BinderFinishOption>(
                  key: ValueKey(
                    'custom-finish-${finish.cardPrintingId ?? 'any'}',
                  ),
                  initialValue: finish,
                  decoration: const InputDecoration(
                    labelText: 'Finish requirement',
                    helperText:
                        'Choose a governed finish, including Reverse Holo '
                        'when it exists.',
                  ),
                  items: [
                    for (final option in finishes)
                      DropdownMenuItem(
                        value: option,
                        child: Text(option.label),
                      ),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setDialogState(() => finish = value);
                    }
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: quantityController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Copies required',
                    helperText: '1–100 copies for this slot',
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
            FilledButton(
              onPressed: () {
                final quantity =
                    int.tryParse(quantityController.text.trim()) ?? 0;
                if (quantity < 1 || quantity > 100) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Quantity must be between 1 and 100.'),
                    ),
                  );
                  return;
                }
                Navigator.pop(
                  context,
                  BinderCustomSlotDraft(
                    card: card,
                    finish: finish,
                    requiredQuantity: quantity,
                  ),
                );
              },
              child: Text(editingIndex == null ? 'Add slot' : 'Update slot'),
            ),
          ],
        ),
      ),
    );
    quantityController.dispose();
    if (selected == null || !mounted) return;
    final conflict = _conflictFor(
      selected.card,
      selected.finish,
      editingIndex: editingIndex,
    );
    if (conflict != null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(conflict)));
      return;
    }
    final replacedQuantity = editingIndex == null
        ? 0
        : _slots[editingIndex].requiredQuantity;
    final nextTotal =
        _totalRequired - replacedQuantity + selected.requiredQuantity;
    if (nextTotal > 25000) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('A custom Binder can require at most 25,000 copies.'),
        ),
      );
      return;
    }
    setState(() {
      if (editingIndex == null) {
        if (_slots.length >= 1000) return;
        _slots.add(selected);
      } else {
        _slots[editingIndex] = selected;
      }
    });
  }

  Future<void> _preview() async {
    if (_slots.isEmpty) return;
    await showBinderCustomChecklistPreview(
      context,
      slots: _slots,
      actionLabel: 'Looks good',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Build custom checklist'),
        actions: [
          TextButton(
            onPressed: _valid
                ? () => Navigator.of(
                    context,
                  ).pop(List<BinderCustomSlotDraft>.unmodifiable(_slots))
                : null,
            child: const Text('Done'),
          ),
        ],
      ),
      body: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Search the Grookai catalog, choose a governed finish, '
                    'and set how many copies complete each slot.',
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    key: const ValueKey('binder-custom-card-search'),
                    controller: _searchController,
                    onChanged: _onSearchChanged,
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      labelText: 'Find a card',
                      hintText: 'Pikachu 58 or ME04 026',
                      prefixIcon: const Icon(Icons.search_rounded),
                      suffixIcon: _searching
                          ? const Padding(
                              padding: EdgeInsets.all(13),
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : null,
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      _error!.message,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          if (_results.isEmpty && !_searching)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                child: Text('No canonical cards matched that search.'),
              ),
            )
          else
            SliverList.builder(
              itemCount: _results.length,
              itemBuilder: (context, index) {
                final card = _results[index];
                return ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                  leading: BinderArtwork(
                    imageUrl: card.hostedImageUrl,
                    fallbackImageUrl: card.fallbackImageUrl,
                    size: 52,
                    semanticLabel: card.name,
                  ),
                  title: Text(card.name),
                  subtitle: Text(
                    [
                      if (card.setLabel.isNotEmpty) card.setLabel,
                      if ((card.number ?? '').isNotEmpty) '#${card.number}',
                    ].join(' · '),
                  ),
                  trailing: const Icon(Icons.add_circle_outline_rounded),
                  onTap: () => _chooseCard(card),
                );
              },
            ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 18, 16, 8),
            sliver: SliverToBoxAdapter(
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Checklist · ${_slots.length} slots · '
                      '$_totalRequired copies',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: _slots.isEmpty ? null : _preview,
                    child: const Text('Preview'),
                  ),
                ],
              ),
            ),
          ),
          if (_slots.isEmpty)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(16, 8, 16, 40),
                child: BinderStateMessage(
                  icon: Icons.playlist_add_rounded,
                  title: 'No checklist slots yet',
                  body: 'Choose a card above to add the first one.',
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 40),
              sliver: SliverReorderableList(
                itemCount: _slots.length,
                onReorder: (oldIndex, newIndex) {
                  setState(() {
                    if (newIndex > oldIndex) newIndex--;
                    final item = _slots.removeAt(oldIndex);
                    _slots.insert(newIndex, item);
                  });
                },
                itemBuilder: (context, index) {
                  final slot = _slots[index];
                  return Card(
                    key: ValueKey('custom-slot-${slot.displayKey}-$index'),
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: ReorderableDragStartListener(
                        index: index,
                        child: const Icon(Icons.drag_handle_rounded),
                      ),
                      title: Text(slot.card.name),
                      subtitle: Text(
                        [
                          slot.finish.label,
                          '${slot.requiredQuantity} '
                              '${slot.requiredQuantity == 1 ? 'copy' : 'copies'}',
                        ].join(' · '),
                      ),
                      onTap: () => _chooseCard(slot.card, editingIndex: index),
                      trailing: IconButton(
                        tooltip: 'Remove ${slot.card.name}',
                        onPressed: () => setState(() => _slots.removeAt(index)),
                        icon: const Icon(Icons.close_rounded),
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
