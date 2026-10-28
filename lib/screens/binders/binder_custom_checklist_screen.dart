import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';

import '../../models/binders/binder_models.dart';
import '../../services/binders/binder_display_identity.dart';
import '../../services/binders/binder_repository.dart';
import '../../widgets/binders/binder_widgets.dart';
import '../../widgets/binders/binder_page_arrangement.dart';
import '../../widgets/binders/binder_slot_choice_sheet.dart';
import '../../widgets/binders/binder_pocket_sheet.dart';

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
                  final identity = resolveBinderCatalogCardIdentity(slot.card);
                  return ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: BinderArtwork(
                      imageUrl: slot.card.hostedImageUrl,
                      fallbackImageUrl: slot.card.fallbackImageUrl,
                      size: 44,
                      semanticLabel: identity.displayName,
                    ),
                    title: Text(identity.displayName),
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
    extends State<BinderCustomChecklistEditorScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _checklistSearchController =
      TextEditingController();
  String _checklistQuery = '';
  String? _revealSlotKey;
  int _revealVersion = 0;
  late final List<BinderCustomSlotDraft> _slots =
      List<BinderCustomSlotDraft>.from(widget.initialSlots);
  Timer? _debounce;
  List<BinderCatalogCard> _results = const <BinderCatalogCard>[];
  BinderException? _error;
  bool _searching = false;
  int _searchGeneration = 0;
  String? _choosingCardId;
  bool _loadingFinishes = false;
  late final TabController _tabs;
  late int _visibleView;
  bool _allowExit = false;
  bool _confirmingExit = false;
  late final List<String> _initialSignature;

  List<String> _draftSignature(List<BinderCustomSlotDraft> slots) => [
    for (final slot in slots) '${slot.displayKey}:${slot.requiredQuantity}',
  ];

  bool get _hasChanges =>
      !listEquals(_draftSignature(_slots), _initialSignature);

  void _exit([List<BinderCustomSlotDraft>? result]) {
    if (_allowExit) return;
    setState(() => _allowExit = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) Navigator.of(context).pop(result);
    });
  }

  Future<void> _confirmExit() async {
    if (_confirmingExit) return;
    _confirmingExit = true;
    final discard = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Discard checklist changes?'),
        content: const Text(
          'Your changes to cards, finishes, quantities and order have not been kept. Use Done to return them to the Binder setup.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep editing'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Discard changes'),
          ),
        ],
      ),
    );
    _confirmingExit = false;
    if (mounted && discard == true) _exit();
  }

  int get _totalRequired =>
      _slots.fold<int>(0, (total, slot) => total + slot.requiredQuantity);

  bool get _valid =>
      _slots.isNotEmpty && _slots.length <= 1000 && _totalRequired <= 25000;

  @override
  void initState() {
    super.initState();
    _initialSignature = _draftSignature(widget.initialSlots);
    _visibleView = widget.initialSlots.isEmpty ? 0 : 1;
    _tabs = TabController(length: 3, initialIndex: _visibleView, vsync: this);
    _tabs.addListener(_onViewChanged);
    unawaited(_search(''));
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _tabs.dispose();
    _searchController.dispose();
    _checklistSearchController.dispose();
    super.dispose();
  }

  void _onViewChanged() {
    if (_visibleView == _tabs.index) return;
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() => _visibleView = _tabs.index);
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    // Invalidate an in-flight request immediately, including during debounce.
    ++_searchGeneration;
    setState(() {
      _searching = true;
      _results = const [];
      _error = null;
    });
    _debounce = Timer(const Duration(milliseconds: 300), () => _search(value));
  }

  Future<void> _search(String query) async {
    if (!mounted) return;
    final generation = ++_searchGeneration;
    setState(() {
      _searching = true;
      _error = null;
      _results = const [];
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
    if (_choosingCardId != null) return;
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    setState(() {
      _choosingCardId = card.cardPrintId;
      _loadingFinishes = true;
    });
    BinderCustomSlotDraft? selected;
    try {
      final finishes = await widget.repository.loadCardFinishOptions(
        card.cardPrintId,
      );
      if (!mounted || _confirmingExit) return;
      setState(() => _loadingFinishes = false);
      selected = await showModalBottomSheet<BinderCustomSlotDraft>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        constraints: const BoxConstraints(maxWidth: 640),
        builder: (context) => BinderSlotChoiceSheet(
          card: card,
          finishes: finishes,
          existing: editingIndex == null ? null : _slots[editingIndex],
        ),
      );
    } on BinderException catch (failure) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(failure.message)));
      }
    } finally {
      if (mounted) {
        setState(() {
          _choosingCardId = null;
          _loadingFinishes = false;
        });
      }
    }
    final selection = selected;
    if (selection == null || !mounted) return;
    final conflict = _conflictFor(
      selection.card,
      selection.finish,
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
        _totalRequired - replacedQuantity + selection.requiredQuantity;
    if (nextTotal > 25000) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('A custom Binder can require at most 25,000 copies.'),
        ),
      );
      return;
    }
    if (editingIndex == null && _slots.length >= 1000) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('A custom Binder can contain at most 1,000 slots.'),
        ),
      );
      return;
    }
    setState(() {
      if (editingIndex == null) {
        _slots.add(selection);
        _checklistSearchController.clear();
        _checklistQuery = '';
      } else {
        _slots[editingIndex] = selection;
      }
    });
    if (editingIndex == null) _tabs.animateTo(1);
  }

  Future<void> _preview() async {
    if (_slots.isEmpty) return;
    await showBinderCustomChecklistPreview(
      context,
      slots: _slots,
      actionLabel: 'Looks good',
    );
  }

  void _removeSlot(int index) {
    if (_choosingCardId != null) return;
    final removed = _slots[index];
    setState(() => _slots.removeAt(index));
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        duration: const Duration(seconds: 8),
        backgroundColor: Theme.of(context).colorScheme.surfaceContainerLow,
        content: Text(
          '${resolveBinderCatalogCardIdentity(removed.card).displayName} · ${removed.finish.label} removed from the draft.',
        ),
        action: SnackBarAction(
          label: 'Undo',
          textColor: Theme.of(context).colorScheme.primary,
          onPressed: () {
            if (!mounted || _choosingCardId != null) return;
            final conflict = _conflictFor(removed.card, removed.finish);
            if (conflict != null ||
                _slots.length >= 1000 ||
                _totalRequired + removed.requiredQuantity > 25000) {
              messenger.showSnackBar(
                SnackBar(
                  content: Text(
                    conflict ?? 'This draft has reached its checklist limit.',
                  ),
                ),
              );
              return;
            }
            setState(
              () => _slots.insert(index.clamp(0, _slots.length), removed),
            );
          },
        ),
      ),
    );
  }

  Widget _emptyChecklist() => Padding(
    padding: const EdgeInsets.all(24),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const BinderStateMessage(
          icon: Icons.playlist_add_rounded,
          title: 'No checklist slots yet',
          body: 'Choose a card and finish to start your collection goal.',
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: () => _tabs.animateTo(0),
          icon: const Icon(Icons.search_rounded),
          label: const Text('Find cards'),
        ),
      ],
    ),
  );

  Widget _findCards() => CustomScrollView(
    key: const PageStorageKey('binder-find-cards'),
    primary: false,
    slivers: [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
        sliver: SliverToBoxAdapter(
          child: TextField(
            key: const ValueKey('binder-custom-card-search'),
            controller: _searchController,
            onChanged: _onSearchChanged,
            onSubmitted: (value) {
              _debounce?.cancel();
              _search(value);
            },
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              labelText: 'Find a card',
              hintText: 'Pikachu 58 or ME04 026',
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      tooltip: 'Clear card search',
                      onPressed: () {
                        _searchController.clear();
                        _onSearchChanged('');
                      },
                      icon: const Icon(Icons.close_rounded),
                    )
                  : null,
            ),
          ),
        ),
      ),
      if (_searching)
        SliverList.list(
          children: [
            for (var i = 0; i < 3; i++)
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 9,
                ),
                child: Semantics(
                  label: i == 0 ? 'Searching cards' : null,
                  excludeSemantics: true,
                  child: Row(
                    children: [
                      Container(
                        width: 52,
                        height: 62,
                        decoration: BoxDecoration(
                          color: Theme.of(
                            context,
                          ).colorScheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              height: 14,
                              width: 150,
                              color: Theme.of(
                                context,
                              ).colorScheme.surfaceContainerHighest,
                            ),
                            const SizedBox(height: 9),
                            Container(
                              height: 12,
                              width: 210,
                              color: Theme.of(
                                context,
                              ).colorScheme.surfaceContainerHighest,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        )
      else if (_error != null)
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _error!.message,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
                TextButton.icon(
                  onPressed: () => _search(_searchController.text),
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Retry card search'),
                ),
              ],
            ),
          ),
        )
      else if (_results.isEmpty)
        const SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text('No canonical cards matched that search.'),
          ),
        )
      else
        SliverList.builder(
          itemCount: _results.length,
          itemBuilder: (context, index) {
            final card = _results[index];
            final identity = resolveBinderCatalogCardIdentity(card);
            return ListTile(
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 4,
              ),
              leading: BinderArtwork(
                imageUrl: card.hostedImageUrl,
                fallbackImageUrl: card.fallbackImageUrl,
                size: 52,
                semanticLabel: identity.displayName,
              ),
              title: Text(identity.displayName),
              subtitle: Text(
                [
                  if (card.setLabel.isNotEmpty) card.setLabel,
                  if ((card.number ?? '').isNotEmpty) '#${card.number}',
                  if ((card.rarity ?? '').isNotEmpty) card.rarity!,
                ].join(' · '),
              ),
              trailing: _loadingFinishes && _choosingCardId == card.cardPrintId
                  ? const SizedBox.square(
                      dimension: 24,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.add_circle_outline_rounded),
              enabled: _choosingCardId == null,
              onTap: () => _chooseCard(card),
            );
          },
        ),
      const SliverToBoxAdapter(child: SizedBox(height: 24)),
    ],
  );

  void _showInArrange(BinderCustomSlotDraft slot) {
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      _revealSlotKey = slot.displayKey;
      ++_revealVersion;
    });
    _tabs.animateTo(2);
  }

  Future<void> _inspectSlot(BinderCustomSlotDraft slot) async {
    if (_choosingCardId != null) return;
    final index = _slots.indexWhere(
      (item) => item.displayKey == slot.displayKey,
    );
    if (index < 0) return;
    final action = await showBinderPocketSheet(
      context,
      slot: slot,
      pocketNumber: index + 1,
      canEdit: true,
    );
    if (!mounted || action != BinderPocketAction.edit) return;
    final current = _slots.indexWhere(
      (item) => item.displayKey == slot.displayKey,
    );
    if (current >= 0) {
      await _chooseCard(_slots[current].card, editingIndex: current);
    }
  }

  List<int> get _matchingChecklistIndices {
    final terms = _checklistQuery.trim().toLowerCase().split(RegExp(r'\s+'));
    return [
      for (var i = 0; i < _slots.length; i++)
        if (terms.every(
          [
            resolveBinderCatalogCardIdentity(_slots[i].card).displayName,
            _slots[i].card.setLabel,
            if ((_slots[i].card.number ?? '').isNotEmpty)
              '#${_slots[i].card.number}',
            _slots[i].finish.label,
          ].join(' ').toLowerCase().contains,
        ))
          i,
    ];
  }

  Widget _checklist() {
    final indices = _matchingChecklistIndices;
    final filtered = _checklistQuery.trim().isNotEmpty;
    return CustomScrollView(
      key: const PageStorageKey('binder-checklist-slots'),
      primary: false,
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      slivers: [
        if (_slots.isNotEmpty)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    key: const ValueKey('binder-checklist-search'),
                    controller: _checklistSearchController,
                    onChanged: (value) =>
                        setState(() => _checklistQuery = value),
                    textInputAction: TextInputAction.search,
                    onSubmitted: (_) =>
                        FocusManager.instance.primaryFocus?.unfocus(),
                    decoration: InputDecoration(
                      labelText: 'Search checklist',
                      hintText: 'Name, set, number or finish',
                      prefixIcon: const Icon(Icons.search_rounded),
                      suffixIcon: _checklistQuery.isEmpty
                          ? null
                          : IconButton(
                              tooltip: 'Clear checklist search',
                              onPressed: () {
                                _checklistSearchController.clear();
                                setState(() => _checklistQuery = '');
                              },
                              icon: const Icon(Icons.close_rounded),
                            ),
                    ),
                  ),
                  if (filtered)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Semantics(
                        liveRegion: true,
                        child: Text(
                          '${indices.length} of ${_slots.length} slots · Original pocket numbers',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        if (_slots.isEmpty)
          SliverToBoxAdapter(child: _emptyChecklist())
        else if (indices.isEmpty)
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                'No checklist slots match. Try another name, set, number or finish.',
              ),
            ),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(0, 8, 0, 24),
            sliver: filtered
                ? SliverList.builder(
                    itemCount: indices.length,
                    itemBuilder: (_, index) =>
                        _checklistRow(indices[index], canReorder: false),
                  )
                : SliverReorderableList(
                    itemCount: _slots.length,
                    onReorderItem: (oldIndex, newIndex) {
                      if (_choosingCardId != null) return;
                      setState(() {
                        final item = _slots.removeAt(oldIndex);
                        _slots.insert(newIndex, item);
                      });
                    },
                    itemBuilder: (_, index) =>
                        _checklistRow(index, canReorder: true),
                  ),
          ),
      ],
    );
  }

  Widget _checklistRow(int index, {required bool canReorder}) {
    final slot = _slots[index];
    final identity = resolveBinderCatalogCardIdentity(slot.card);
    return ReorderableDelayedDragStartListener(
      key: ValueKey('custom-slot-${slot.displayKey}'),
      index: index,
      enabled: canReorder && _choosingCardId == null,
      child: Column(
        children: [
          ListTile(
            contentPadding: const EdgeInsets.fromLTRB(16, 8, 4, 8),
            leading: BinderArtwork(
              imageUrl: slot.card.hostedImageUrl,
              fallbackImageUrl: slot.card.fallbackImageUrl,
              size: 52,
              semanticLabel: identity.displayName,
            ),
            title: Text('${index + 1}. ${identity.displayName}'),
            subtitle: Text(
              [
                [
                  if (slot.card.setLabel.isNotEmpty) slot.card.setLabel,
                  if ((slot.card.number ?? '').isNotEmpty)
                    '#${slot.card.number}',
                ].join(' · '),
                '${slot.finish.label} · ${slot.requiredQuantity} ${slot.requiredQuantity == 1 ? 'copy' : 'copies'}',
              ].where((line) => line.isNotEmpty).join('\n'),
            ),
            onTap: _choosingCardId != null
                ? null
                : () => _chooseCard(slot.card, editingIndex: index),
            trailing: PopupMenuButton<String>(
              tooltip: 'Options for ${identity.displayName}',
              enabled: _choosingCardId == null,
              onSelected: (action) {
                if (action == 'edit') {
                  _chooseCard(slot.card, editingIndex: index);
                } else if (action == 'locate') {
                  _showInArrange(slot);
                } else if (action == 'inspect') {
                  _inspectSlot(slot);
                } else if (action == 'remove') {
                  _removeSlot(index);
                }
              },
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'locate', child: Text('Show in Arrange')),
                PopupMenuItem(value: 'inspect', child: Text('Inspect card')),
                PopupMenuItem(value: 'edit', child: Text('Edit requirement')),
                PopupMenuItem(value: 'remove', child: Text('Remove slot')),
              ],
              icon: const Icon(Icons.more_horiz_rounded),
            ),
          ),
          const Divider(height: 1, indent: 16, endIndent: 16),
        ],
      ),
    );
  }

  Widget _arrangement() => SingleChildScrollView(
    key: const PageStorageKey('binder-arrangement-scroll'),
    primary: false,
    padding: const EdgeInsets.all(16),
    child: _slots.isEmpty
        ? _emptyChecklist()
        : BinderPageArrangement(
            key: const ValueKey('binder-editor-arrangement'),
            slots: _slots,
            revealSlotKey: _revealSlotKey,
            revealVersion: _revealVersion,
            onInspect: _inspectSlot,
            onMove: (from, to) => setState(() {
              final slot = _slots.removeAt(from);
              _slots.insert(to, slot);
            }),
          ),
  );

  @override
  Widget build(BuildContext context) => PopScope<List<BinderCustomSlotDraft>>(
    canPop: _allowExit || !_hasChanges,
    onPopInvokedWithResult: (didPop, result) {
      if (!didPop && !_allowExit && _hasChanges) _confirmExit();
    },
    child: Scaffold(
      appBar: AppBar(
        toolbarHeight: 48,
        title: const Text('Custom checklist'),
        actions: [
          TextButton(
            onPressed: _valid && _choosingCardId == null
                ? () => _exit(List<BinderCustomSlotDraft>.unmodifiable(_slots))
                : null,
            child: const Text('Done'),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 840),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 4, 0),
                  child: Row(
                    children: [
                      Expanded(
                        child: Semantics(
                          liveRegion: true,
                          child: Text(
                            '${_slots.length} ${_slots.length == 1 ? 'slot' : 'slots'} · $_totalRequired ${_totalRequired == 1 ? 'copy' : 'copies'}',
                            style: Theme.of(context).textTheme.labelLarge,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: _slots.isEmpty || _choosingCardId != null
                            ? null
                            : _preview,
                        child: const Text('Preview'),
                      ),
                    ],
                  ),
                ),
                TabBar(
                  controller: _tabs,
                  tabs: const [
                    Tab(key: ValueKey('binder-view-find'), text: 'Find cards'),
                    Tab(
                      key: ValueKey('binder-view-checklist'),
                      text: 'Checklist',
                    ),
                    Tab(key: ValueKey('binder-view-arrange'), text: 'Arrange'),
                  ],
                ),
                Expanded(
                  child: IndexedStack(
                    index: _visibleView,
                    children: [_findCards(), _checklist(), _arrangement()],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}
