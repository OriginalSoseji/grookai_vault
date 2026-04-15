part of 'main.dart';

const double _kVaultGridTileChildAspectRatio = 0.45;

class _VaultItemTile extends StatelessWidget {
  final Map<String, dynamic> row;
  final CardSurfacePricingData? pricing;
  final VoidCallback? onIncrement;
  final VoidCallback? onDecrement;
  final VoidCallback? onDelete;
  final VoidCallback? onTap;
  final VoidCallback? onScan;
  final bool compact;

  const _VaultItemTile({
    required this.row,
    this.pricing,
    this.onIncrement,
    this.onDecrement,
    this.onDelete,
    this.onTap,
    this.onScan,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final id = (row['id'] ?? '').toString();
    final name = (row['name'] ?? 'Item').toString();
    final displayIdentity = resolveDisplayIdentityFromFields(
      name: name,
      variantKey: row['variant_key']?.toString(),
      printedIdentityModifier: row['printed_identity_modifier']?.toString(),
      setIdentityModel: row['set_identity_model']?.toString(),
      setCode: row['set_code']?.toString(),
      number: row['number']?.toString(),
    );
    final set = (row['set_name'] ?? '').toString();
    final ownedCount = _ownedCountForRow(row);
    final cond = (row['condition_label'] ?? 'NM').toString();
    final gvId = (row['gv_id'] ?? '').toString();
    final cardPrintId = (row['card_id'] ?? '').toString();
    final number = (row['number'] ?? '').toString();
    final imgUrl = (row['photo_url'] ?? row['image_url']).toString();

    final subtitleParts = <String>[];
    if (set.isNotEmpty) {
      subtitleParts.add(set);
    }
    if (number.isNotEmpty) {
      subtitleParts.add('#$number');
    }
    final subtitle = subtitleParts.join(' - ');

    Color condColor;
    switch (cond) {
      case 'NM':
        condColor = Colors.green;
        break;
      case 'LP':
        condColor = Colors.lightGreen;
        break;
      case 'MP':
        condColor = Colors.orange;
        break;
      case 'HP':
        condColor = Colors.deepOrange;
        break;
      case 'DMG':
        condColor = Colors.red;
        break;
      default:
        condColor = Colors.grey;
    }

    Widget thumb() {
      return CardSurfaceArtwork(
        label: displayIdentity.displayName,
        imageUrl: imgUrl,
        width: compact ? 40 : 46,
        height: compact ? 56 : 64,
        borderRadius: compact ? 10 : 12,
        padding: const EdgeInsets.all(3),
      );
    }

    Widget condChip() {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: condColor.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: condColor.withValues(alpha: 0.8),
            width: 0.7,
          ),
        ),
        child: Text(
          cond,
          style: theme.textTheme.labelSmall?.copyWith(
            color: condColor,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: compact ? 4 : 8, vertical: 3),
      child: Dismissible(
        key: ValueKey(id),
        background: Container(
          color: Colors.red,
          alignment: Alignment.centerLeft,
          padding: const EdgeInsets.only(left: 16),
          child: const Icon(Icons.delete, color: Colors.white),
        ),
        secondaryBackground: Container(
          color: Colors.red,
          alignment: Alignment.centerRight,
          padding: const EdgeInsets.only(right: 16),
          child: const Icon(Icons.delete, color: Colors.white),
        ),
        confirmDismiss: (_) async {
          if (onDelete == null) {
            return false;
          }
          await Future.sync(onDelete!);
          return false;
        },
        child: Material(
          color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.7),
          borderRadius: BorderRadius.circular(compact ? 10 : 12),
          child: InkWell(
            borderRadius: BorderRadius.circular(compact ? 10 : 12),
            onTap: cardPrintId.isEmpty ? null : onTap,
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: 8,
                vertical: compact ? 6 : 8,
              ),
              child: Row(
                children: [
                  thumb(),
                  SizedBox(width: compact ? 6 : 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          displayIdentity.displayName,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            height: 1.1,
                            fontSize: compact ? 13 : null,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (subtitle.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(
                            subtitle,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.7,
                              ),
                              fontSize: compact ? 11.5 : null,
                            ),
                          ),
                        ],
                        if (pricing?.hasVisibleValue == true) ...[
                          SizedBox(height: compact ? 4 : 5),
                          CardSurfacePricePill(
                            pricing: pricing,
                            size: compact
                                ? CardSurfacePriceSize.dense
                                : CardSurfacePriceSize.list,
                          ),
                        ] else if (!compact && gvId.isNotEmpty) ...[
                          const SizedBox(height: 3),
                          Text(
                            gvId,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: colorScheme.primary,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.3,
                            ),
                          ),
                        ],
                        SizedBox(height: compact ? 4 : 5),
                        Wrap(
                          spacing: 6,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            condChip(),
                            Text(
                              'Qty: $ownedCount',
                              style: theme.textTheme.bodySmall?.copyWith(
                                fontWeight: FontWeight.w600,
                                fontSize: compact ? 11.5 : null,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  SizedBox(width: compact ? 0 : 4),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: Icon(Icons.camera_alt, size: compact ? 16 : 18),
                        visualDensity: VisualDensity.compact,
                        onPressed: onScan,
                        tooltip: 'Scan (Condition + Fingerprint)',
                      ),
                      IconButton(
                        icon: Icon(Icons.add, size: compact ? 16 : 18),
                        visualDensity: VisualDensity.compact,
                        onPressed: onIncrement,
                        tooltip: 'Increase quantity',
                      ),
                      IconButton(
                        icon: Icon(Icons.remove, size: compact ? 16 : 18),
                        visualDensity: VisualDensity.compact,
                        onPressed: onDecrement,
                        tooltip: 'Decrease quantity',
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

enum _VaultGridAction { scan, add, remove, delete }

class _VaultGridTile extends StatelessWidget {
  const _VaultGridTile({
    required this.row,
    this.pricing,
    this.onTap,
    this.onScan,
    this.onIncrement,
    this.onDecrement,
    this.onDelete,
  });

  final Map<String, dynamic> row;
  final CardSurfacePricingData? pricing;
  final VoidCallback? onTap;
  final VoidCallback? onScan;
  final VoidCallback? onIncrement;
  final VoidCallback? onDecrement;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final name = (row['name'] ?? 'Item').toString();
    final setCode = ((row['set_code'] ?? row['set_name']) ?? '')
        .toString()
        .trim();
    final number = (row['number'] ?? '').toString().trim();
    final imageUrl = (row['photo_url'] ?? row['image_url']).toString();
    final quantity = _ownedCountForRow(row);
    final condition = (row['condition_label'] ?? 'NM').toString();
    final metaParts = <String>[
      if (setCode.isNotEmpty) setCode,
      if (number.isNotEmpty) '#$number',
      if (condition.isNotEmpty) condition,
      'Qty $quantity',
    ];
    final metaLine = metaParts.join(' • ');
    const imageBottomSpacing = 4.0;
    const titleSlotHeight = 29.0;
    const metaSlotHeight = 14.0;
    const priceSlotHeight = 20.0;

    return Material(
      color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.30),
      borderRadius: BorderRadius.circular(15),
      child: InkWell(
        borderRadius: BorderRadius.circular(15),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(5, 5, 5, 5),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Stack(
                children: [
                  AspectRatio(
                    aspectRatio: 0.69,
                    child: _VaultGridArtwork(imageUrl: imageUrl, name: name),
                  ),
                  Positioned(
                    right: 4,
                    top: 4,
                    child: PopupMenuButton<_VaultGridAction>(
                      tooltip: 'Card actions',
                      iconSize: 18,
                      padding: EdgeInsets.zero,
                      icon: DecoratedBox(
                        decoration: BoxDecoration(
                          color: colorScheme.surface.withValues(alpha: 0.84),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: const Padding(
                          padding: EdgeInsets.all(2.5),
                          child: Icon(Icons.more_horiz_rounded, size: 16),
                        ),
                      ),
                      onSelected: (action) async {
                        switch (action) {
                          case _VaultGridAction.scan:
                            onScan?.call();
                            break;
                          case _VaultGridAction.add:
                            onIncrement?.call();
                            break;
                          case _VaultGridAction.remove:
                            onDecrement?.call();
                            break;
                          case _VaultGridAction.delete:
                            onDelete?.call();
                            break;
                        }
                      },
                      itemBuilder: (context) => const [
                        PopupMenuItem(
                          value: _VaultGridAction.scan,
                          child: Text('Scan card'),
                        ),
                        PopupMenuItem(
                          value: _VaultGridAction.add,
                          child: Text('Add quantity'),
                        ),
                        PopupMenuItem(
                          value: _VaultGridAction.remove,
                          child: Text('Remove quantity'),
                        ),
                        PopupMenuItem(
                          value: _VaultGridAction.delete,
                          child: Text('Delete item'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: imageBottomSpacing),
              SizedBox(
                height: titleSlotHeight,
                child: Align(
                  alignment: Alignment.topLeft,
                  child: Text(
                    name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.labelMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      height: 1.05,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 1),
              SizedBox(
                height: metaSlotHeight,
                child: Align(
                  alignment: Alignment.topLeft,
                  child: Text(
                    metaLine,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.68),
                      fontSize: 10.2,
                      fontWeight: FontWeight.w600,
                      height: 1.0,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 3),
              SizedBox(
                height: priceSlotHeight,
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Visibility(
                    visible: pricing?.hasVisibleValue == true,
                    maintainAnimation: true,
                    maintainState: true,
                    maintainSize: true,
                    child: CardSurfacePricePill(
                      pricing: pricing,
                      size: CardSurfacePriceSize.grid,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VaultGridArtwork extends StatelessWidget {
  const _VaultGridArtwork({required this.imageUrl, required this.name});

  final String imageUrl;
  final String name;

  @override
  Widget build(BuildContext context) {
    return CardSurfaceArtwork(
      label: name,
      imageUrl: imageUrl,
      borderRadius: 13,
      padding: const EdgeInsets.all(1.0),
    );
  }
}

/// ---------------------- VAULT PAGE (uses view + catalog picker) ----------------------
class VaultPage extends StatefulWidget {
  const VaultPage({super.key});

  @override
  VaultPageState createState() => VaultPageState();
}

class VaultPageState extends State<VaultPage> {
  final SupabaseClient supabase = Supabase.instance.client;
  late final TextEditingController _searchController;
  bool _loading = false;
  String? _uid;
  List<Map<String, dynamic>> _items = const [];
  Map<String, CardSurfacePricingData> _pricingByCardPrintId = const {};
  Map<String, VaultSharedCardState> _sharedStateByCardPrintId =
      const <String, VaultSharedCardState>{};
  String _search = '';
  String _pokemonSearch = '';
  _SortBy _sortBy = _SortBy.newest;
  _VaultStructuralView _view = _VaultStructuralView.all;
  AppCardViewMode _cardViewMode = AppCardViewMode.grid;
  _VaultDerivedData _derivedData = const _VaultDerivedData.empty();

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
    _searchController.addListener(_handleSearchChanged);
    _uid = supabase.auth.currentUser?.id;
    reload();
  }

  @override
  void dispose() {
    _searchController.removeListener(_handleSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  Future<void> reload() async {
    if (_uid == null) {
      setState(() {
        _items = const [];
        _derivedData = const _VaultDerivedData.empty();
      });
      return;
    }

    setState(() => _loading = true);
    try {
      final rows = await VaultCardService.getCanonicalCollectorRows(
        client: supabase,
      );
      final cardPrintIds = rows
          .map((row) => (row['card_id'] ?? '').toString())
          .where((value) => value.isNotEmpty)
          .toList();
      final results = await Future.wait<dynamic>([
        CardSurfacePricingService.fetchByCardPrintIds(
          client: supabase,
          cardPrintIds: cardPrintIds,
        ).catchError((_) => const <String, CardSurfacePricingData>{}),
        VaultCardService.getSharedStatesByCardPrintIds(
          client: supabase,
          cardPrintIds: cardPrintIds,
        ).catchError((_) => const <String, VaultSharedCardState>{}),
      ]);
      final pricing = results[0] as Map<String, CardSurfacePricingData>;
      final sharedStates = results[1] as Map<String, VaultSharedCardState>;

      if (!mounted) {
        return;
      }

      setState(() {
        _items = rows;
        _pricingByCardPrintId = pricing;
        _sharedStateByCardPrintId = sharedStates;
        _recomputeDerivedData();
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _recomputeDerivedData() {
    // PERFORMANCE_P3_VAULT_MEMOIZED_DERIVATIONS
    // Recomputes filtered/sorted/grouped vault rows only when source inputs change.
    final sortedRows = _sortedRows(_items);
    final searchedRows = _applySearch(sortedRows);
    final duplicateRows = searchedRows
        .where((row) => _ownedCountForRow(row) > 1)
        .toList(growable: false);
    final recentRows = _sortRowsByNewest(searchedRows);
    final onWallRows = _filterOnWallRows(searchedRows);
    final pokemonRows = _buildPokemonRows(sortedRows);
    final pokemonSuggestions = _pokemonSuggestions(sortedRows);
    final bySetGroups = _groupRowsBySet(searchedRows);
    final totalCards = _items.fold<int>(
      0,
      (sum, row) => sum + _ownedCountForRow(row),
    );
    final setCount = _items
        .map(
          (row) =>
              ((row['set_name'] ?? row['set_code']) ?? '').toString().trim(),
        )
        .where((value) => value.isNotEmpty)
        .toSet()
        .length;

    _derivedData = _VaultDerivedData(
      sortedRows: sortedRows,
      searchedRows: searchedRows,
      duplicateRows: duplicateRows,
      recentRows: recentRows,
      onWallRows: onWallRows,
      pokemonRows: pokemonRows,
      pokemonSuggestions: pokemonSuggestions,
      bySetGroups: bySetGroups,
      totalCards: totalCards,
      setCount: setCount,
      lastAddedLabel: _lastAddedLabel(_items),
    );
  }

  Future<void> _incQty(Map<String, dynamic> row, int delta) async {
    final vaultItemId = _vaultItemIdForRow(row);
    final cardId = (row['card_id'] ?? '').toString();
    if (_uid == null || vaultItemId.isEmpty || cardId.isEmpty) {
      return;
    }

    if (delta > 0) {
      await VaultCardService.addOrIncrementVaultItem(
        client: supabase,
        userId: _uid!,
        cardId: cardId,
        deltaQty: delta,
        conditionLabel: (row['condition_label'] ?? 'NM').toString(),
        fallbackName: (row['name'] ?? '').toString(),
        fallbackSetName: (row['set_name'] ?? '').toString(),
        fallbackImageUrl: (row['photo_url'] ?? row['image_url'])?.toString(),
      );
    } else {
      await VaultCardService.archiveOneVaultItem(
        client: supabase,
        userId: _uid!,
        vaultItemId: vaultItemId,
        cardId: cardId,
      );
    }

    await reload();
  }

  Future<void> _delete(Map<String, dynamic> row) async {
    final vaultItemId = _vaultItemIdForRow(row);
    final cardId = (row['card_id'] ?? '').toString();
    if (_uid == null || vaultItemId.isEmpty || cardId.isEmpty) {
      return;
    }

    await VaultCardService.archiveAllVaultItems(
      client: supabase,
      userId: _uid!,
      vaultItemId: vaultItemId,
      cardId: cardId,
    );

    await reload();
  }

  Future<void> showAddOrEditDialog({Map<String, dynamic>? row}) async {
    if (row == null) {
      await _showCatalogPickerAndInsert();
    }
  }

  Future<void> _showCatalogPickerAndInsert() async {
    final picked = await showModalBottomSheet<CardPrint>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _CatalogPicker(),
    );
    if (picked == null || _uid == null) {
      return;
    }

    final qtyCtrl = TextEditingController(text: '1');
    final subtitleParts = <String>[];
    if (picked.displaySet.isNotEmpty) {
      subtitleParts.add(picked.displaySet);
    }
    if (picked.displayNumber.isNotEmpty) {
      subtitleParts.add('#${picked.displayNumber}');
    }
    final subtitle = subtitleParts.join(' - ');

    if (!mounted) {
      return;
    }

    final ok = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Add to Vault'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: _thumb(picked.displayImage),
              title: Text(picked.name),
              subtitle: Text(subtitle.isEmpty ? picked.displaySet : subtitle),
            ),
            TextField(
              controller: qtyCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Quantity'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Add'),
          ),
        ],
      ),
    );
    if (ok != true) {
      return;
    }

    final qty = int.tryParse(qtyCtrl.text) ?? 1;

    await VaultCardService.addOrIncrementVaultItem(
      client: supabase,
      userId: _uid!,
      cardId: picked.id,
      deltaQty: qty,
      conditionLabel: 'NM',
      fallbackName: picked.name,
      fallbackSetName: picked.displaySet,
      fallbackImageUrl: picked.displayImage,
    );

    await reload();
  }

  List<Map<String, dynamic>> _sortedRows(List<Map<String, dynamic>> rows) {
    final sorted = [...rows];

    if (_sortBy == _SortBy.name) {
      sorted.sort(
        (a, b) => (a['name'] ?? '').toString().compareTo(
          (b['name'] ?? '').toString(),
        ),
      );
      return sorted;
    }

    if (_sortBy == _SortBy.qty) {
      sorted.sort(
        (a, b) => _ownedCountForRow(a).compareTo(_ownedCountForRow(b)),
      );
      return sorted;
    }

    return _sortRowsByNewest(sorted);
  }

  List<Map<String, dynamic>> _sortRowsByNewest(
    List<Map<String, dynamic>> rows,
  ) {
    final sorted = [...rows];
    sorted.sort((a, b) {
      final aTs = DateTime.tryParse(
        (a['created_at'] ?? '').toString(),
      )?.millisecondsSinceEpoch;
      final bTs = DateTime.tryParse(
        (b['created_at'] ?? '').toString(),
      )?.millisecondsSinceEpoch;
      return (bTs ?? -1).compareTo(aTs ?? -1);
    });
    return sorted;
  }

  List<Map<String, dynamic>> _applySearch(List<Map<String, dynamic>> rows) {
    final query = _search.trim().toLowerCase();
    if (query.isEmpty) {
      return rows;
    }

    return rows.where((row) {
      final name = (row['name'] ?? '').toString().toLowerCase();
      final setName = (row['set_name'] ?? '').toString().toLowerCase();
      final setCode = (row['set_code'] ?? '').toString().toLowerCase();
      final number = (row['number'] ?? '').toString().toLowerCase();
      return name.contains(query) ||
          setName.contains(query) ||
          setCode.contains(query) ||
          number.contains(query);
    }).toList();
  }

  void _handleSearchChanged() {
    final nextValue = _searchController.text;
    if (_view == _VaultStructuralView.pokemon) {
      if (nextValue == _pokemonSearch) {
        return;
      }
      setState(() {
        _pokemonSearch = nextValue;
        _recomputeDerivedData();
      });
      return;
    }

    if (nextValue == _search) {
      return;
    }
    setState(() {
      _search = nextValue;
      _recomputeDerivedData();
    });
  }

  void _setView(_VaultStructuralView view) {
    if (_view == view) {
      return;
    }

    setState(() {
      _view = view;
    });
    _replaceSearchControllerText(_activeSearchValueForView(view));
  }

  String _activeSearchValueForView(_VaultStructuralView view) {
    return view == _VaultStructuralView.pokemon ? _pokemonSearch : _search;
  }

  void _replaceSearchControllerText(String value) {
    if (_searchController.text == value) {
      return;
    }

    _searchController.removeListener(_handleSearchChanged);
    _searchController.value = TextEditingValue(
      text: value,
      selection: TextSelection.collapsed(offset: value.length),
    );
    _searchController.addListener(_handleSearchChanged);
  }

  String _lastAddedLabel(List<Map<String, dynamic>> rows) {
    final latest = rows
        .map((row) => DateTime.tryParse((row['created_at'] ?? '').toString()))
        .whereType<DateTime>()
        .fold<DateTime?>(null, (current, value) {
          if (current == null || value.isAfter(current)) {
            return value;
          }
          return current;
        });

    if (latest == null) {
      return 'No cards yet';
    }

    final age = DateTime.now().difference(latest);
    if (age.inMinutes < 1) {
      return 'just now';
    }
    if (age.inMinutes < 60) {
      return '${age.inMinutes}m ago';
    }
    if (age.inHours < 24) {
      return '${age.inHours}h ago';
    }
    if (age.inDays < 7) {
      return '${age.inDays}d ago';
    }

    return '${latest.month}/${latest.day}/${latest.year}';
  }

  List<Map<String, dynamic>> _filterOnWallRows(
    List<Map<String, dynamic>> rows,
  ) {
    return rows.where((row) {
      final cardPrintId = (row['card_id'] ?? '').toString().trim();
      return _sharedStateByCardPrintId[cardPrintId]?.isShared == true;
    }).toList();
  }

  List<Map<String, dynamic>> _buildPokemonRows(
    List<Map<String, dynamic>> rows,
  ) {
    final query = _pokemonSearch.trim().toLowerCase();
    final filteredRows = rows.where((row) {
      if (query.isEmpty) {
        return true;
      }

      final name = (row['name'] ?? '').toString().toLowerCase();
      return name.contains(query);
    }).toList();

    filteredRows.sort((left, right) {
      final nameCompare = (left['name'] ?? '')
          .toString()
          .toLowerCase()
          .compareTo((right['name'] ?? '').toString().toLowerCase());
      if (nameCompare != 0) {
        return nameCompare;
      }

      final setCompare = (left['set_name'] ?? left['set_code'] ?? '')
          .toString()
          .toLowerCase()
          .compareTo(
            (right['set_name'] ?? right['set_code'] ?? '')
                .toString()
                .toLowerCase(),
          );
      if (setCompare != 0) {
        return setCompare;
      }

      return (left['number'] ?? '').toString().compareTo(
        (right['number'] ?? '').toString(),
      );
    });

    return filteredRows;
  }

  List<String> _pokemonSuggestions(List<Map<String, dynamic>> rows) {
    final query = _pokemonSearch.trim().toLowerCase();
    if (query.isEmpty) {
      return const <String>[];
    }

    final suggestions =
        rows
            .map((row) => (row['name'] ?? '').toString().trim())
            .where((value) => value.isNotEmpty)
            .toSet()
            .where((value) => value.toLowerCase().contains(query))
            .toList()
          ..sort((left, right) => left.compareTo(right));

    return suggestions.take(8).toList();
  }

  List<_VaultSetGroup> _groupRowsBySet(List<Map<String, dynamic>> rows) {
    final buckets = <String, List<Map<String, dynamic>>>{};

    for (final row in rows) {
      final title = ((row['set_name'] ?? row['set_code']) ?? '')
          .toString()
          .trim();
      final key = title.isEmpty ? 'Unknown set' : title;
      buckets.putIfAbsent(key, () => <Map<String, dynamic>>[]).add(row);
    }

    return buckets.entries
        .map((entry) => _VaultSetGroup(title: entry.key, rows: entry.value))
        .toList()
      ..sort((a, b) => a.title.compareTo(b.title));
  }

  Widget _buildVaultTile(Map<String, dynamic> row) {
    final vaultItemId = _vaultItemIdForRow(row);
    final name = (row['name'] ?? 'Item').toString();
    final cardPrintId = (row['card_id'] ?? '').toString();

    return _VaultItemTile(
      row: row,
      pricing: _pricingByCardPrintId[cardPrintId],
      compact: _cardViewMode == AppCardViewMode.compactList,
      onScan: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) =>
                ScanCaptureScreen(vaultItemId: vaultItemId, cardName: name),
          ),
        );
      },
      onIncrement: () => _incQty(row, 1),
      onDecrement: () => _incQty(row, -1),
      onDelete: () async {
        final ok = await _confirmDelete(row);
        if (ok) {
          await reload();
        }
      },
      onTap: cardPrintId.isEmpty ? null : () => _openManageCardRow(row),
    );
  }

  Widget _buildVaultGridTile(Map<String, dynamic> row) {
    final vaultItemId = _vaultItemIdForRow(row);
    final name = (row['name'] ?? 'Item').toString();
    final cardPrintId = (row['card_id'] ?? '').toString();

    return _VaultGridTile(
      row: row,
      pricing: _pricingByCardPrintId[cardPrintId],
      onTap: cardPrintId.isEmpty ? null : () => _openManageCardRow(row),
      onScan: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) =>
                ScanCaptureScreen(vaultItemId: vaultItemId, cardName: name),
          ),
        );
      },
      onIncrement: () => _incQty(row, 1),
      onDecrement: () => _incQty(row, -1),
      onDelete: () async {
        final ok = await _confirmDelete(row);
        if (ok) {
          await reload();
        }
      },
    );
  }

  Widget _buildRecentVaultStrip(List<Map<String, dynamic>> rows) {
    if (rows.isEmpty) {
      return const _ProductEmptyState(
        title: 'No recently added items yet',
        body: 'New additions will appear here after you scan or add cards.',
      );
    }

    final recentRows = _sortRowsByNewest(rows).take(10).toList();

    return SizedBox(
      height: 170,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: recentRows.length,
        separatorBuilder: (_, index) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final row = recentRows[index];
          final cardPrintId = (row['card_id'] ?? '').toString();
          final name = (row['name'] ?? 'Item').toString();
          final displayIdentity = resolveDisplayIdentityFromFields(
            name: name,
            variantKey: row['variant_key']?.toString(),
            printedIdentityModifier: row['printed_identity_modifier']
                ?.toString(),
            setIdentityModel: row['set_identity_model']?.toString(),
            setCode: row['set_code']?.toString(),
            number: row['number']?.toString(),
          );
          final setName = ((row['set_name'] ?? row['set_code']) ?? '')
              .toString()
              .trim();
          final imageUrl = (row['photo_url'] ?? row['image_url']).toString();
          final pricing = _pricingByCardPrintId[cardPrintId];

          return SizedBox(
            width: 140,
            child: Material(
              color: Theme.of(
                context,
              ).colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
              borderRadius: BorderRadius.circular(20),
              child: InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: cardPrintId.isEmpty
                    ? null
                    : () => _openManageCardRow(row),
                child: Padding(
                  padding: const EdgeInsets.all(10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Center(
                          child: CardSurfaceArtwork(
                            label: displayIdentity.displayName,
                            imageUrl: imageUrl,
                            width: 88,
                            height: 118,
                            borderRadius: 14,
                            padding: const EdgeInsets.all(5),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        displayIdentity.displayName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        setName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(
                            context,
                          ).colorScheme.onSurface.withValues(alpha: 0.68),
                        ),
                      ),
                      if (pricing?.hasVisibleValue == true) ...[
                        const SizedBox(height: 6),
                        CardSurfacePricePill(
                          pricing: pricing,
                          size: CardSurfacePriceSize.dense,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildVaultViewChip(_VaultStructuralView view, String label) {
    return ChoiceChip(
      label: Text(label),
      selected: _view == view,
      onSelected: (_) => _setView(view),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
      labelStyle: Theme.of(
        context,
      ).textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w600),
      labelPadding: const EdgeInsets.symmetric(horizontal: 2),
    );
  }

  Future<void> _openManageCardRow(Map<String, dynamic> row) async {
    final vaultItemId = _vaultItemIdForRow(row);
    final cardPrintId = (row['card_id'] ?? '').toString();
    if (vaultItemId.isEmpty || cardPrintId.isEmpty) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => VaultManageCardScreen(
          vaultItemId: vaultItemId,
          cardPrintId: cardPrintId,
          ownedCount: _ownedCountForRow(row),
          gvviId: (row['gv_vi_id'] ?? '').toString(),
          gvId: (row['gv_id'] ?? '').toString(),
          name: (row['name'] ?? '').toString(),
          setName: (row['set_name'] ?? '').toString(),
          number: (row['number'] ?? '').toString(),
          imageUrl: (row['photo_url'] ?? row['image_url']).toString(),
          condition: (row['condition_label'] ?? '').toString(),
        ),
      ),
    );
  }

  Widget _buildVaultMessage(String title, String body) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: _ProductEmptyState(title: title, body: body),
    );
  }

  List<Widget> _buildVaultCollectionSlivers(
    List<Map<String, dynamic>> rows, {
    required int columns,
  }) {
    if (rows.isEmpty) {
      return const <Widget>[];
    }

    if (_cardViewMode == AppCardViewMode.grid) {
      return [
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          sliver: SliverGrid(
            delegate: SliverChildBuilderDelegate(
              (context, index) => _buildVaultGridTile(rows[index]),
              childCount: rows.length,
            ),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: columns,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: _kVaultGridTileChildAspectRatio,
            ),
          ),
        ),
      ];
    }

    final childCount = rows.isEmpty ? 0 : rows.length * 2 - 1;
    return [
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 14),
        sliver: SliverList(
          delegate: SliverChildBuilderDelegate((context, index) {
            if (index.isOdd) {
              return const SizedBox(height: 6);
            }
            final rowIndex = index ~/ 2;
            return _buildVaultTile(rows[rowIndex]);
          }, childCount: childCount),
        ),
      ),
    ];
  }

  List<Widget> _buildVaultBySetSlivers(
    List<_VaultSetGroup> groups, {
    required int columns,
  }) {
    if (groups.isEmpty) {
      return [
        SliverToBoxAdapter(
          child: _buildVaultMessage(
            'No set groups yet',
            'Set grouping will appear here once matching rows are available for this view.',
          ),
        ),
      ];
    }

    final slivers = <Widget>[];
    for (var index = 0; index < groups.length; index += 1) {
      final group = groups[index];
      slivers.add(
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          sliver: SliverToBoxAdapter(
            child: _ProductSurfaceCard(
              padding: const EdgeInsets.all(14),
              child: _ProductSectionHeading(
                title: group.title,
                description: 'Grouped vault rows for this set.',
                trailing: Text(
                  '${group.rows.length}',
                  style: Theme.of(
                    context,
                  ).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ),
        ),
      );
      slivers.add(const SliverToBoxAdapter(child: SizedBox(height: 12)));
      slivers.addAll(
        _buildVaultCollectionSlivers(group.rows, columns: columns),
      );
      if (index < groups.length - 1) {
        slivers.add(const SliverToBoxAdapter(child: SizedBox(height: 12)));
      }
    }
    return slivers;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final derivedData = _derivedData;
    final searchedRows = derivedData.searchedRows;
    final onWallRows = derivedData.onWallRows;
    final pokemonRows = derivedData.pokemonRows;
    final pokemonSuggestions = derivedData.pokemonSuggestions;
    final totalCards = derivedData.totalCards;
    final setCount = derivedData.setCount;
    final columns = resolveSharedCardGridColumns(
      context,
      horizontalPadding: 28,
      minTileWidth: 96,
    );
    final vaultContentSlivers = <Widget>[];
    switch (_view) {
      case _VaultStructuralView.all:
        if (_loading) {
          vaultContentSlivers.add(
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
          );
        } else if (searchedRows.isNotEmpty) {
          vaultContentSlivers.addAll(
            _buildVaultCollectionSlivers(searchedRows, columns: columns),
          );
        } else {
          vaultContentSlivers.add(
            SliverToBoxAdapter(
              child: _buildVaultMessage(
                'No cards found in your vault',
                _search.trim().isEmpty
                    ? 'Your structural vault shell is in place. Add cards or switch views to keep building it out.'
                    : 'Try a different search term or clear the current query.',
              ),
            ),
          );
        }
        break;
      case _VaultStructuralView.duplicates:
        final duplicateRows = derivedData.duplicateRows;
        if (_loading) {
          vaultContentSlivers.add(
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
          );
        } else if (duplicateRows.isNotEmpty) {
          vaultContentSlivers.addAll(
            _buildVaultCollectionSlivers(duplicateRows, columns: columns),
          );
        } else {
          vaultContentSlivers.add(
            SliverToBoxAdapter(
              child: _buildVaultMessage(
                'No cards found in your vault',
                _search.trim().isEmpty
                    ? 'Your structural vault shell is in place. Add cards or switch views to keep building it out.'
                    : 'Try a different search term or clear the current query.',
              ),
            ),
          );
        }
        break;
      case _VaultStructuralView.recent:
        final recentRows = derivedData.recentRows;
        if (_loading) {
          vaultContentSlivers.add(
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
          );
        } else if (recentRows.isNotEmpty) {
          vaultContentSlivers.addAll(
            _buildVaultCollectionSlivers(recentRows, columns: columns),
          );
        } else {
          vaultContentSlivers.add(
            SliverToBoxAdapter(
              child: _buildVaultMessage(
                'No cards found in your vault',
                _search.trim().isEmpty
                    ? 'Your structural vault shell is in place. Add cards or switch views to keep building it out.'
                    : 'Try a different search term or clear the current query.',
              ),
            ),
          );
        }
        break;
      case _VaultStructuralView.bySet:
        final bySetGroups = derivedData.bySetGroups;
        if (_loading) {
          vaultContentSlivers.add(
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
          );
        } else {
          vaultContentSlivers.addAll(
            _buildVaultBySetSlivers(bySetGroups, columns: columns),
          );
        }
        break;
      case _VaultStructuralView.onWall:
        if (_loading) {
          vaultContentSlivers.add(
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
          );
        } else if (onWallRows.isNotEmpty) {
          vaultContentSlivers.addAll(
            _buildVaultCollectionSlivers(onWallRows, columns: columns),
          );
        } else {
          vaultContentSlivers.add(
            SliverToBoxAdapter(
              child: _buildVaultMessage(
                _search.trim().isNotEmpty
                    ? 'No wall cards match your search'
                    : 'No wall items yet',
                _search.trim().isNotEmpty
                    ? 'Try a different search or clear the current query.'
                    : 'Cards you add to your wall will appear here.',
              ),
            ),
          );
        }
        break;
      case _VaultStructuralView.pokemon:
        if (_loading) {
          vaultContentSlivers.add(
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
          );
        } else {
          if (pokemonSuggestions.isNotEmpty) {
            vaultContentSlivers.add(
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  child: Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      for (final suggestion in pokemonSuggestions)
                        ActionChip(
                          label: Text(suggestion),
                          onPressed: () {
                            _replaceSearchControllerText(suggestion);
                            setState(() {
                              _pokemonSearch = suggestion;
                              _recomputeDerivedData();
                            });
                          },
                          materialTapTargetSize:
                              MaterialTapTargetSize.shrinkWrap,
                          visualDensity: VisualDensity.compact,
                        ),
                    ],
                  ),
                ),
              ),
            );
            vaultContentSlivers.add(
              const SliverToBoxAdapter(child: SizedBox(height: 8)),
            );
          }

          if (pokemonRows.isNotEmpty) {
            vaultContentSlivers.addAll(
              _buildVaultCollectionSlivers(pokemonRows, columns: columns),
            );
          } else {
            vaultContentSlivers.add(
              SliverToBoxAdapter(
                child: _buildVaultMessage(
                  _pokemonSearch.trim().isNotEmpty
                      ? 'No matching cards'
                      : 'No cards found in your vault',
                  _pokemonSearch.trim().isNotEmpty
                      ? 'Try a different Pokemon name.'
                      : 'Add cards to start browsing by Pokemon name.',
                ),
              ),
            );
          }
        }
        break;
    }

    // PERFORMANCE_P1_VAULT_LAZY_RENDER
    // Uses sliver-based lazy rendering so Vault cards build only as needed.
    return RefreshIndicator(
      onRefresh: reload,
      child: CustomScrollView(
        physics: const BouncingScrollPhysics(
          parent: AlwaysScrollableScrollPhysics(),
        ),
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        cacheExtent: 960,
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 6, 14, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$totalCards cards • ${_items.length} unique • $setCount sets • ${derivedData.lastAddedLabel}',
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(
                        alpha: 0.66,
                      ),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          decoration: InputDecoration(
                            hintText: _view == _VaultStructuralView.pokemon
                                ? 'Search Pokemon'
                                : 'Search vault',
                            prefixIcon: const Icon(Icons.search),
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(
                              vertical: 11,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      PopupMenuButton<_SortBy>(
                        tooltip: 'Sort vault',
                        icon: const Icon(Icons.swap_vert_rounded),
                        onSelected: (value) {
                          setState(() {
                            _sortBy = value;
                            _recomputeDerivedData();
                          });
                        },
                        itemBuilder: (_) => const [
                          PopupMenuItem(
                            value: _SortBy.newest,
                            child: Text('Newest'),
                          ),
                          PopupMenuItem(
                            value: _SortBy.name,
                            child: Text('Name (A-Z)'),
                          ),
                          PopupMenuItem(
                            value: _SortBy.qty,
                            child: Text('Qty (low-high)'),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: [
                              _buildVaultViewChip(
                                _VaultStructuralView.all,
                                'All',
                              ),
                              const SizedBox(width: 6),
                              _buildVaultViewChip(
                                _VaultStructuralView.onWall,
                                'Wall',
                              ),
                              const SizedBox(width: 6),
                              _buildVaultViewChip(
                                _VaultStructuralView.duplicates,
                                'Dupes',
                              ),
                              const SizedBox(width: 6),
                              _buildVaultViewChip(
                                _VaultStructuralView.recent,
                                'Recent',
                              ),
                              const SizedBox(width: 6),
                              _buildVaultViewChip(
                                _VaultStructuralView.bySet,
                                'Sets',
                              ),
                              const SizedBox(width: 6),
                              _buildVaultViewChip(
                                _VaultStructuralView.pokemon,
                                'Pokemon',
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      SharedCardViewModeButton(
                        value: _cardViewMode,
                        onChanged: (mode) {
                          setState(() {
                            _cardViewMode = mode;
                          });
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 8)),
          ...vaultContentSlivers,
          const SliverToBoxAdapter(child: SizedBox(height: 18)),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Recently Added',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 10),
                  _buildRecentVaultStrip(_items),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: SizedBox(
              height: shellContentBottomPadding(context, extra: 8),
            ),
          ),
        ],
      ),
    );
  }

  Future<bool> _confirmDelete(Map<String, dynamic> row) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete item?'),
        content: const Text('This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok == true) {
      await _delete(row);
    }
    return ok ?? false;
  }

  Widget _thumb(String? url) {
    return CardSurfaceArtwork(
      label: 'Card',
      imageUrl: url,
      width: 44,
      height: 60,
      borderRadius: 10,
      padding: const EdgeInsets.all(3),
    );
  }
}

enum _SortBy { newest, name, qty }

enum _VaultStructuralView { all, onWall, duplicates, recent, bySet, pokemon }

class _VaultSetGroup {
  const _VaultSetGroup({required this.title, required this.rows});

  final String title;
  final List<Map<String, dynamic>> rows;
}

class _VaultDerivedData {
  const _VaultDerivedData({
    required this.sortedRows,
    required this.searchedRows,
    required this.duplicateRows,
    required this.recentRows,
    required this.onWallRows,
    required this.pokemonRows,
    required this.pokemonSuggestions,
    required this.bySetGroups,
    required this.totalCards,
    required this.setCount,
    required this.lastAddedLabel,
  });

  const _VaultDerivedData.empty()
    : sortedRows = const <Map<String, dynamic>>[],
      searchedRows = const <Map<String, dynamic>>[],
      duplicateRows = const <Map<String, dynamic>>[],
      recentRows = const <Map<String, dynamic>>[],
      onWallRows = const <Map<String, dynamic>>[],
      pokemonRows = const <Map<String, dynamic>>[],
      pokemonSuggestions = const <String>[],
      bySetGroups = const <_VaultSetGroup>[],
      totalCards = 0,
      setCount = 0,
      lastAddedLabel = 'No cards yet';

  final List<Map<String, dynamic>> sortedRows;
  final List<Map<String, dynamic>> searchedRows;
  final List<Map<String, dynamic>> duplicateRows;
  final List<Map<String, dynamic>> recentRows;
  final List<Map<String, dynamic>> onWallRows;
  final List<Map<String, dynamic>> pokemonRows;
  final List<String> pokemonSuggestions;
  final List<_VaultSetGroup> bySetGroups;
  final int totalCards;
  final int setCount;
  final String lastAddedLabel;
}

int _ownedCountForRow(Map<String, dynamic> row) {
  final ownedCount = _intValue(row['owned_count']);
  return ownedCount ?? 0;
}

String _vaultItemIdForRow(Map<String, dynamic> row) {
  final vaultItemId = (row['vault_item_id'] ?? '').toString();
  if (vaultItemId.isNotEmpty) {
    return vaultItemId;
  }

  return (row['id'] ?? '').toString();
}

int? _intValue(dynamic value) {
  if (value is int) {
    return value;
  }

  if (value is num) {
    return value.toInt();
  }

  if (value == null) {
    return null;
  }

  return int.tryParse(value.toString());
}

/// ---------------------- Catalog Picker (bottom sheet) ----------------------
class _CatalogPicker extends StatefulWidget {
  @override
  State<_CatalogPicker> createState() => _CatalogPickerState();
}

class _CatalogPickerState extends State<_CatalogPicker> {
  final SupabaseClient supabase = Supabase.instance.client;
  final OwnershipResolverAdapter _ownershipAdapter =
      OwnershipResolverAdapter.instance;
  final _q = TextEditingController();
  List<CardPrint> _rows = const [];
  Map<String, OwnershipState> _ownershipByCardPrintId =
      const <String, OwnershipState>{};
  CardSearchResolverMeta? _resolverMeta;
  bool _loading = false;
  String? _searchError;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _fetch('');
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _q.dispose();
    super.dispose();
  }

  Future<void> _fetch(String query) async {
    setState(() => _loading = true);
    try {
      final resolved = await CardPrintRepository.searchCardPrintsResolved(
        client: supabase,
        options: CardSearchOptions(query: query),
      );
      final cardPrintIds = resolved.rows
          .map((row) => row.id.trim())
          .where((id) => id.isNotEmpty)
          .toSet()
          .toList(growable: false);
      try {
        await _ownershipAdapter.primeBatch(cardPrintIds);
      } catch (error) {
        debugPrint('PERFORMANCE_P2_VAULT ownership batch prime failed: $error');
      }
      final ownershipByCardPrintId = _ownershipAdapter.snapshotForIds(
        cardPrintIds,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _rows = resolved.rows;
        _ownershipByCardPrintId = ownershipByCardPrintId;
        _resolverMeta = resolved.meta;
        _searchError = null;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _rows = const [];
        _ownershipByCardPrintId = const <String, OwnershipState>{};
        _resolverMeta = null;
        _searchError = error is Error ? error.toString() : 'Search failed.';
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _onChanged(String s) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      _fetch(s.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final padding = MediaQuery.of(context).viewInsets;
    final grouped = <_CatalogRow>[];
    String? lastSet;
    for (final card in _rows) {
      final setTitle = card.displaySet;
      if (setTitle != lastSet) {
        lastSet = setTitle;
        grouped.add(_CatalogHeaderRow(setTitle));
      }
      grouped.add(_CatalogCardRow(card));
    }

    return Padding(
      padding: EdgeInsets.only(bottom: padding.bottom),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              height: 4,
              width: 36,
              decoration: BoxDecoration(
                color: Colors.black26,
                borderRadius: BorderRadius.circular(3),
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: _CatalogSearchField(
                controller: _q,
                onChanged: _onChanged,
                onSubmitted: _fetch,
              ),
            ),
            if (_searchError != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    _searchError!,
                    style: Theme.of(
                      context,
                    ).textTheme.bodySmall?.copyWith(color: Colors.red),
                  ),
                ),
              ),
            _ResolverStatusBanner(meta: _resolverMeta, query: _q.text),
            const SizedBox(height: 8),
            if (_loading) const LinearProgressIndicator(minHeight: 2),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.all(8),
                itemCount: grouped.length,
                separatorBuilder: (_, index) => const SizedBox(height: 6),
                itemBuilder: (context, i) {
                  final row = grouped[i];
                  if (row is _CatalogHeaderRow) {
                    return _CatalogSectionHeader(row.title);
                  }
                  final card = (row as _CatalogCardRow).card;
                  return _CatalogCardTile(
                    card: card,
                    ownershipState:
                        _ownershipByCardPrintId[card.id.trim()] ??
                        _ownershipAdapter.peek(card.id),
                    viewMode: AppCardViewMode.compactList,
                    onTap: () => Navigator.pop(context, card),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
