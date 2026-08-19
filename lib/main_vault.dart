part of 'main.dart';

const double _kVaultGridTileChildAspectRatio = 0.45;

String? _vaultDisplayImageUrl(Map<String, dynamic> row) {
  return normalizeDisplayImageUrl(row['photo_url']) ??
      resolveDisplayImageUrlFromRow(row);
}

String? _vaultProviderImageUrl(Map<String, dynamic> row) {
  return resolveDisplayImageUrl(
    imageUrl: row['image_url'],
    imageAltUrl: row['image_alt_url'],
    representativeImageUrl: row['representative_image_url'],
  );
}

CatalogArtworkResolution _vaultArtwork(Map<String, dynamic> row) {
  final sourceImageUrl = _vaultDisplayImageUrl(row);
  final hostedImageUrl =
      normalizeWarehouseDisplayImagePath(row['image_path']) ??
      buildCanonicalCardImageUrl(row['gv_id']);
  if (isCollectorUploadedCardImage(sourceImageUrl)) {
    return CatalogArtworkResolution(
      primaryImageUrl: sourceImageUrl,
      fallbackImageUrl: hostedImageUrl,
    );
  }
  final providerImageUrl = _vaultProviderImageUrl(row);
  final primaryImageUrl = hostedImageUrl ?? sourceImageUrl ?? providerImageUrl;
  final fallbackImageUrl =
      providerImageUrl == null || providerImageUrl == primaryImageUrl
      ? null
      : providerImageUrl;
  return CatalogArtworkResolution(
    primaryImageUrl: primaryImageUrl,
    fallbackImageUrl: fallbackImageUrl,
  );
}

class _VaultItemTile extends StatelessWidget {
  final Map<String, dynamic> row;
  final CardSurfacePricingData? pricing;
  final VoidCallback? onIncrement;
  final VoidCallback? onDecrement;
  final VoidCallback? onDelete;
  final VoidCallback? onTap;
  final VoidCallback? onScan;
  final VoidCallback? onSelectionTap;
  final bool selectionMode;
  final bool selected;
  final bool compact;

  const _VaultItemTile({
    required this.row,
    this.pricing,
    this.onIncrement,
    this.onDecrement,
    this.onDelete,
    this.onTap,
    this.onScan,
    this.onSelectionTap,
    this.selectionMode = false,
    this.selected = false,
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
    final artwork = _vaultArtwork(row);
    final printingIdentity = resolveVaultPrintingIdentityPresentation(row);

    final subtitleParts = <String>[];
    if ((displayIdentity.suffix ?? '').trim().isNotEmpty) {
      subtitleParts.add(displayIdentity.suffix!.trim());
    }
    if (set.isNotEmpty) {
      subtitleParts.add(set);
    }
    if (number.isNotEmpty) {
      subtitleParts.add('#$number');
    }
    final subtitle = subtitleParts.join(' - ');

    Widget thumb() {
      return CardSurfaceArtwork(
        label: displayIdentity.baseName,
        imageUrl: artwork.primaryImageUrl,
        fallbackImageUrl: artwork.fallbackImageUrl,
        width: compact ? 40 : 46,
        height: compact ? 56 : 64,
        borderRadius: compact ? 10 : 12,
        padding: const EdgeInsets.all(3),
        onViewDetails: onTap,
        detailsLabel: 'Your copies',
      );
    }

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: compact ? 4 : 8, vertical: 3),
      child: Dismissible(
        key: ValueKey(id),
        background: Container(
          color: colorScheme.error,
          alignment: Alignment.centerLeft,
          padding: const EdgeInsets.only(left: 16),
          child: Icon(Icons.delete, color: colorScheme.onError),
        ),
        secondaryBackground: Container(
          color: colorScheme.error,
          alignment: Alignment.centerRight,
          padding: const EdgeInsets.only(right: 16),
          child: Icon(Icons.delete, color: colorScheme.onError),
        ),
        confirmDismiss: (_) async {
          if (selectionMode || onDelete == null) {
            return false;
          }
          await Future.sync(onDelete!);
          return false;
        },
        child: Material(
          color: colorScheme.surface.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(compact ? 10 : 12),
          child: InkWell(
            borderRadius: BorderRadius.circular(compact ? 10 : 12),
            onTap: selectionMode
                ? onSelectionTap
                : (cardPrintId.isEmpty ? null : onTap),
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
                          displayIdentity.baseName,
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
                        const SizedBox(height: 2),
                        Text(
                          printingIdentity.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: printingIdentity.isExact
                                ? colorScheme.primary
                                : colorScheme.onSurface.withValues(alpha: 0.7),
                            fontWeight: FontWeight.w600,
                            fontSize: compact ? 11.5 : null,
                          ),
                        ),
                        if (pricing?.hasVisibleValue == true) ...[
                          SizedBox(height: compact ? 4 : 5),
                          CardSurfacePriceText(
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
                        Text(
                          '$cond · $ownedCount ${ownedCount == 1 ? 'copy' : 'copies'}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurface.withValues(
                              alpha: 0.62,
                            ),
                            fontWeight: FontWeight.w600,
                            fontSize: compact ? 11.5 : null,
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(width: compact ? 0 : 4),
                  if (selectionMode)
                    _VaultSelectionMark(selected: selected)
                  else
                    PopupMenuButton<_VaultGridAction>(
                      tooltip: 'Card actions',
                      icon: const Icon(Icons.more_horiz_rounded),
                      onSelected: (action) {
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
    this.selectionMode = false,
    this.selected = false,
    this.onTap,
    this.onSelectionTap,
    this.onLongPress,
    this.onScan,
    this.onIncrement,
    this.onDecrement,
    this.onDelete,
  });

  final Map<String, dynamic> row;
  final CardSurfacePricingData? pricing;
  final bool selectionMode;
  final bool selected;
  final VoidCallback? onTap;
  final VoidCallback? onSelectionTap;
  final VoidCallback? onLongPress;
  final VoidCallback? onScan;
  final VoidCallback? onIncrement;
  final VoidCallback? onDecrement;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final name = (row['name'] ?? 'Item').toString();
    final displayIdentity = resolveDisplayIdentityFromFields(
      name: name,
      variantKey: row['variant_key']?.toString(),
      printedIdentityModifier: row['printed_identity_modifier']?.toString(),
      setIdentityModel: row['set_identity_model']?.toString(),
      setCode: row['set_code']?.toString(),
      number: row['number']?.toString(),
    );
    final setCode = ((row['set_code'] ?? row['set_name']) ?? '')
        .toString()
        .trim();
    final number = (row['number'] ?? '').toString().trim();
    final artwork = _vaultArtwork(row);
    final quantity = _ownedCountForRow(row);
    final condition = (row['condition_label'] ?? 'NM').toString();
    final printingIdentity = resolveVaultPrintingIdentityPresentation(row);
    final metaParts = <String>[
      printingIdentity.label,
      if ((displayIdentity.suffix ?? '').trim().isNotEmpty)
        displayIdentity.suffix!.trim(),
      if (setCode.isNotEmpty) setCode,
      if (number.isNotEmpty) '#$number',
      if (condition.isNotEmpty) condition,
      'Qty $quantity',
    ];
    final metaLine = metaParts.join(' • ');
    return Material(
      color: colorScheme.surfaceContainerLow,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(GvGridConstants.tileTapRadius),
        side: BorderSide(
          color: colorScheme.outlineVariant.withValues(alpha: 0.34),
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(GvGridConstants.tileTapRadius),
        onTap: selectionMode ? onSelectionTap : onTap,
        onLongPress: onLongPress,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(4, 4, 4, 5),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Stack(
                children: [
                  AspectRatio(
                    aspectRatio: GvGridConstants.artworkAspectRatio,
                    child: _VaultGridArtwork(
                      imageUrl: artwork.primaryImageUrl,
                      fallbackImageUrl: artwork.fallbackImageUrl,
                      name: displayIdentity.baseName,
                      onViewDetails: onTap,
                    ),
                  ),
                  Positioned(
                    right: 4,
                    top: 4,
                    child: selectionMode
                        ? _VaultSelectionMark(selected: selected)
                        : PopupMenuButton<_VaultGridAction>(
                            tooltip: 'Card actions',
                            iconSize: 18,
                            padding: EdgeInsets.zero,
                            icon: DecoratedBox(
                              decoration: BoxDecoration(
                                color: colorScheme.surface.withValues(
                                  alpha: 0.72,
                                ),
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
              const SizedBox(height: GvGridConstants.imageToTitleGap),
              SizedBox(
                height: GvGridConstants.titleSlotHeight,
                child: Align(
                  alignment: Alignment.topLeft,
                  child: Text(
                    displayIdentity.baseName,
                    maxLines: GvGridConstants.titleMaxLines,
                    overflow: TextOverflow.ellipsis,
                    style: gvGridTitleStyle(theme),
                  ),
                ),
              ),
              const SizedBox(height: GvGridConstants.titleToSubtitleGap),
              SizedBox(
                height: GvGridConstants.subtitleSlotHeight,
                child: Align(
                  alignment: Alignment.topLeft,
                  child: Text(
                    metaLine,
                    maxLines: GvGridConstants.subtitleMaxLines,
                    overflow: TextOverflow.ellipsis,
                    style: gvGridSubtitleStyle(theme, colorScheme),
                  ),
                ),
              ),
              const SizedBox(height: GvGridConstants.subtitleToPriceGap),
              SizedBox(
                height: GvGridConstants.priceSlotHeight,
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Visibility(
                    visible: pricing?.hasVisibleValue == true,
                    maintainAnimation: true,
                    maintainState: true,
                    maintainSize: true,
                    child: CardSurfacePriceText(
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
  const _VaultGridArtwork({
    required this.imageUrl,
    this.fallbackImageUrl,
    required this.name,
    this.onViewDetails,
  });

  final String? imageUrl;
  final String? fallbackImageUrl;
  final String name;
  final VoidCallback? onViewDetails;

  @override
  Widget build(BuildContext context) {
    return CardSurfaceArtwork(
      label: name,
      imageUrl: imageUrl,
      fallbackImageUrl: fallbackImageUrl,
      borderRadius: GvGridConstants.imageRadius,
      padding: const EdgeInsets.all(1.0),
      onViewDetails: onViewDetails,
      detailsLabel: 'Your copies',
    );
  }
}

class _VaultSelectionMark extends StatelessWidget {
  const _VaultSelectionMark({required this.selected});

  final bool selected;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: selected
            ? colorScheme.primary
            : colorScheme.surface.withValues(alpha: 0.74),
        shape: BoxShape.circle,
        border: Border.all(
          color: selected ? colorScheme.primary : colorScheme.outline,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(3),
        child: Icon(
          selected ? Icons.check_rounded : Icons.add_rounded,
          size: 14,
          color: selected ? colorScheme.onPrimary : colorScheme.onSurface,
        ),
      ),
    );
  }
}

class _VaultSelectionBar extends StatelessWidget {
  const _VaultSelectionBar({
    required this.selectedCount,
    required this.visibleCount,
    required this.allVisibleSelected,
    required this.busy,
    required this.onSelectAll,
    required this.onClear,
    required this.onRemove,
    required this.onListLot,
  });

  final int selectedCount;
  final int visibleCount;
  final bool allVisibleSelected;
  final bool busy;
  final VoidCallback onSelectAll;
  final VoidCallback onClear;
  final VoidCallback onRemove;
  final VoidCallback onListLot;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 8, 8, 8),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.22),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              '$selectedCount selected · $visibleCount shown',
              style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          TextButton(
            onPressed: busy
                ? null
                : (allVisibleSelected ? onClear : onSelectAll),
            child: Text(allVisibleSelected ? 'Clear all' : 'Select all'),
          ),
          IconButton(
            tooltip: 'List selected as a lot',
            onPressed: !busy && selectedCount >= 2 ? onListLot : null,
            icon: const Icon(Icons.inventory_2_outlined),
          ),
          IconButton(
            tooltip: 'Remove selected',
            onPressed: !busy && selectedCount > 0 ? onRemove : null,
            color: colorScheme.error,
            icon: busy
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.delete_outline_rounded),
          ),
        ],
      ),
    );
  }
}

/// ---------------------- VAULT PAGE (uses view + catalog picker) ----------------------
class VaultPage extends StatefulWidget {
  const VaultPage({this.onOpenScanner, this.onOpenVaultSpecies, super.key});

  final Future<void> Function()? onOpenScanner;
  final Future<void> Function({
    required String speciesSlug,
    required String displayName,
  })?
  onOpenVaultSpecies;

  @override
  VaultPageState createState() => VaultPageState();
}

class VaultPageState extends State<VaultPage> {
  final SupabaseClient supabase = Supabase.instance.client;
  late final TextEditingController _searchController;
  bool _loading = false;
  int _reloadRequestVersion = 0;
  String? _uid;
  List<Map<String, dynamic>> _items = const [];
  Map<String, CardSurfacePricingData> _pricingByCardPrintId = const {};
  Map<String, VaultExactPricingSummary> _pricingSummaryByCardPrintId =
      const <String, VaultExactPricingSummary>{};
  Map<String, VaultSharedCardState> _sharedStateByCardPrintId =
      const <String, VaultSharedCardState>{};
  String _search = '';
  String _pokemonSearch = '';
  Set<String> _canonicalSpeciesCardPrintIds = const <String>{};
  String? _canonicalSpeciesSlug;
  String? _canonicalSpeciesLabel;
  bool _canonicalSpeciesLoading = false;
  _SortBy _sortBy = _SortBy.newest;
  _VaultStructuralView _view = _VaultStructuralView.all;
  _VaultPricingFilter _pricingFilter = _VaultPricingFilter.all;
  AppCardViewMode _cardViewMode = AppCardViewMode.grid;
  _VaultDerivedData _derivedData = const _VaultDerivedData.empty();
  final Set<String> _selectedCardPrintIds = <String>{};
  bool _selectionMode = false;
  bool _bulkArchiveBusy = false;
  bool _showBinderWhatsNew = false;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
    _searchController.addListener(_handleSearchChanged);
    _uid = supabase.auth.currentUser?.id;
    if (BinderFeatureFlags.production.personalAvailable) {
      unawaited(_loadBinderWhatsNewState());
    }
    reload();
  }

  @override
  void dispose() {
    _searchController.removeListener(_handleSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  Future<void> reload() async {
    final requestVersion = ++_reloadRequestVersion;
    if (_uid == null) {
      setState(() {
        _items = const [];
        _pricingByCardPrintId = const <String, CardSurfacePricingData>{};
        _pricingSummaryByCardPrintId =
            const <String, VaultExactPricingSummary>{};
        _derivedData = const _VaultDerivedData.empty();
        _selectedCardPrintIds.clear();
        _selectionMode = false;
      });
      return;
    }

    setState(() => _loading = true);
    try {
      final rows = await VaultCardService.getCanonicalCollectorRows(
        client: supabase,
      );
      if (!mounted || requestVersion != _reloadRequestVersion) {
        return;
      }

      setState(() {
        _items = rows;
        _selectedCardPrintIds.removeWhere(
          (id) => rows.every((row) => (row['card_id'] ?? '').toString() != id),
        );
        _recomputeDerivedData();
        _loading = false;
      });

      // Pricing and sharing are supplemental. They must never delay the
      // collector's inventory or make the Vault appear empty.
      unawaited(
        _loadSupplementalVaultState(rows: rows, requestVersion: requestVersion),
      );
    } catch (error) {
      debugPrint('vault.reload.failed: $error');
    } finally {
      if (mounted && requestVersion == _reloadRequestVersion && _loading) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _loadSupplementalVaultState({
    required List<Map<String, dynamic>> rows,
    required int requestVersion,
  }) async {
    final cardPrintIds = rows
        .map((row) => (row['card_id'] ?? '').toString())
        .where((value) => value.isNotEmpty)
        .toList(growable: false);

    final initialResults = await Future.wait<dynamic>([
      _loadVaultPricingTargets(),
      VaultCardService.getSharedStatesByCardPrintIds(
        client: supabase,
        cardPrintIds: cardPrintIds,
      ).catchError((_) => const <String, VaultSharedCardState>{}),
    ]);
    final pricingTargets = initialResults[0] as List<VaultExactPricingTarget>;
    final sharedStates = initialResults[1] as Map<String, VaultSharedCardState>;
    final exactPricing = await CardSurfacePricingService.fetchByCardPrintingIds(
      client: supabase,
      cardPrintingIds: pricingTargets.map(
        (target) => target.cardPrintingId ?? '',
      ),
    ).catchError((_) => const <String, CardSurfacePricingData>{});

    final pricingTargetsByCardPrintId =
        <String, List<VaultExactPricingTarget>>{};
    for (final target in pricingTargets) {
      pricingTargetsByCardPrintId
          .putIfAbsent(target.cardPrintId, () => <VaultExactPricingTarget>[])
          .add(target);
    }
    final pricingSummaries = <String, VaultExactPricingSummary>{
      for (final cardPrintId in cardPrintIds)
        cardPrintId: summarizeVaultExactPricing(
          targets:
              pricingTargetsByCardPrintId[cardPrintId] ??
              const <VaultExactPricingTarget>[],
          pricingByCardPrintingId: exactPricing,
        ),
    };
    final pricing = <String, CardSurfacePricingData>{};
    for (final entry in pricingSummaries.entries) {
      final surfacePricing = entry.value.asSurfacePricing(entry.key);
      if (surfacePricing != null) {
        pricing[entry.key] = surfacePricing;
      }
    }

    if (!mounted || requestVersion != _reloadRequestVersion) {
      return;
    }
    setState(() {
      _pricingByCardPrintId = pricing;
      _pricingSummaryByCardPrintId = pricingSummaries;
      _sharedStateByCardPrintId = sharedStates;
      _recomputeDerivedData();
    });
  }

  Future<List<VaultExactPricingTarget>> _loadVaultPricingTargets() async {
    List<dynamic> rawPricingTargets;
    try {
      rawPricingTargets = await supabase
          .from('v_vault_mobile_pricing_targets_v1')
          .select('instance_id,card_print_id,card_printing_id');
    } catch (_) {
      rawPricingTargets = const <dynamic>[];
    }
    return rawPricingTargets
        .whereType<Map>()
        .map((raw) => Map<String, dynamic>.from(raw))
        .map(
          (row) => VaultExactPricingTarget(
            cardPrintId: (row['card_print_id'] ?? '').toString().trim(),
            cardPrintingId:
                (row['card_printing_id'] ?? '').toString().trim().isEmpty
                ? null
                : row['card_printing_id'].toString().trim(),
          ),
        )
        .where((target) => target.cardPrintId.isNotEmpty)
        .toList(growable: false);
  }

  Future<void> openSpeciesFilter({
    required String speciesSlug,
    required String displayName,
  }) async {
    final slug = speciesSlug.trim().toLowerCase();
    if (slug.isEmpty) {
      return;
    }
    _replaceSearchControllerText('');
    setState(() {
      _view = _VaultStructuralView.pokemon;
      _canonicalSpeciesSlug = slug;
      _canonicalSpeciesLabel = displayName.trim().isEmpty
          ? slug
          : displayName.trim();
      _canonicalSpeciesCardPrintIds = const <String>{};
      _canonicalSpeciesLoading = true;
      _pokemonSearch = '';
      _search = '';
      _recomputeDerivedData();
    });

    try {
      final cardPrintIds = await GrookaiDexService.fetchCardPrintIdsForSpecies(
        client: supabase,
        speciesSlug: slug,
      );
      if (!mounted || _canonicalSpeciesSlug != slug) {
        return;
      }
      setState(() {
        _canonicalSpeciesCardPrintIds = cardPrintIds;
        _canonicalSpeciesLoading = false;
        _recomputeDerivedData();
      });
    } catch (_) {
      if (!mounted || _canonicalSpeciesSlug != slug) {
        return;
      }
      setState(() {
        _canonicalSpeciesLoading = false;
        _recomputeDerivedData();
      });
      _showVaultMutationError(
        'Unable to open the exact species filter. Try again.',
      );
    }
  }

  void _clearCanonicalSpeciesFilter() {
    if (_canonicalSpeciesSlug == null) {
      return;
    }
    setState(() {
      _canonicalSpeciesSlug = null;
      _canonicalSpeciesLabel = null;
      _canonicalSpeciesCardPrintIds = const <String>{};
      _canonicalSpeciesLoading = false;
      _recomputeDerivedData();
    });
  }

  void _recomputeDerivedData() {
    // PERFORMANCE_P3_VAULT_MEMOIZED_DERIVATIONS
    // Recomputes filtered/sorted/grouped vault rows only when source inputs change.
    final sortedRows = _sortedRows(_items);
    final searchedRows = _applyPricingFilter(_applySearch(sortedRows));
    final duplicateRows = searchedRows
        .where((row) => _ownedCountForRow(row) > 1)
        .toList(growable: false);
    final recentRows = _sortRowsByNewest(searchedRows);
    final onWallRows = _filterOnWallRows(searchedRows);
    final pokemonRows = _buildPokemonRows(_applyPricingFilter(sortedRows));
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
    var estimatedValue = 0.0;
    var pricedUniqueCount = 0;
    var pricedCopyCount = 0;
    var unpricedCopyCount = 0;
    DateTime? latestPricingObservedAt;
    DateTime? latestPricingPublishedAt;
    for (final row in _items) {
      final cardPrintId = (row['card_id'] ?? '').toString().trim();
      final pricingSummary = _pricingSummaryByCardPrintId[cardPrintId];
      final visiblePrice = pricingSummary?.totalMarketValue;
      if (visiblePrice == null || pricingSummary == null) {
        if (pricingSummary != null) {
          unpricedCopyCount += pricingSummary.unpricedCopyCount;
        }
        continue;
      }
      estimatedValue += visiblePrice;
      pricedUniqueCount += 1;
      pricedCopyCount += pricingSummary.pricedCopyCount;
      unpricedCopyCount += pricingSummary.unpricedCopyCount;
      latestPricingObservedAt = _latestVaultPricingTimestamp(
        latestPricingObservedAt,
        pricingSummary.latestObservedAt,
      );
      latestPricingPublishedAt = _latestVaultPricingTimestamp(
        latestPricingPublishedAt,
        pricingSummary.latestPublishedAt,
      );
    }
    final vaultPricingSummary = VaultExactPricingSummary(
      totalMarketValue: pricedUniqueCount == 0 ? null : estimatedValue,
      pricedCopyCount: pricedCopyCount,
      unpricedCopyCount: unpricedCopyCount,
      latestObservedAt: latestPricingObservedAt,
      latestPublishedAt: latestPricingPublishedAt,
    );

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
      estimatedValue: pricedUniqueCount == 0 ? null : estimatedValue,
      pricedCopyCount: pricedCopyCount,
      vaultPricingSummary: vaultPricingSummary,
    );
  }

  Future<void> _incQty(Map<String, dynamic> row, int delta) async {
    final vaultItemId = _vaultItemIdForRow(row);
    final cardId = (row['card_id'] ?? '').toString().trim();
    if (_uid == null || cardId.isEmpty) {
      _showVaultMutationError('Unable to update this card yet.');
      return;
    }

    try {
      if (delta > 0) {
        await VaultCardService.addOrIncrementVaultItem(
          client: supabase,
          userId: _uid!,
          cardId: cardId,
          deltaQty: delta,
          conditionLabel: (row['condition_label'] ?? 'NM').toString(),
          fallbackName: (row['name'] ?? '').toString(),
          fallbackSetName: (row['set_name'] ?? '').toString(),
          fallbackImageUrl: _vaultDisplayImageUrl(row),
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
    } catch (_) {
      _showVaultMutationError('Unable to update this card. Try again.');
    }
  }

  Future<bool> _delete(Map<String, dynamic> row) async {
    final vaultItemId = _vaultItemIdForRow(row);
    final cardId = (row['card_id'] ?? '').toString().trim();
    if (_uid == null || cardId.isEmpty) {
      _showVaultMutationError('Unable to remove this card yet.');
      return false;
    }

    final previousItems = _removeVaultRowOptimistically(row);
    try {
      await VaultCardService.archiveAllVaultItems(
        client: supabase,
        userId: _uid!,
        vaultItemId: vaultItemId,
        cardId: cardId,
      );

      await reload();
      return true;
    } catch (_) {
      _restoreVaultRowsAfterFailedDelete(previousItems);
      _showVaultMutationError('Unable to remove this card. Try again.');
      return false;
    }
  }

  List<Map<String, dynamic>> _removeVaultRowOptimistically(
    Map<String, dynamic> row,
  ) {
    final previousItems = List<Map<String, dynamic>>.from(_items);
    final cardId = (row['card_id'] ?? '').toString().trim();
    final vaultItemId = _vaultItemIdForRow(row).trim();

    if (!mounted || cardId.isEmpty) {
      return previousItems;
    }

    setState(() {
      _items = _items
          .where((item) {
            final itemCardId = (item['card_id'] ?? '').toString().trim();
            if (itemCardId == cardId) {
              return false;
            }

            final itemVaultItemId = _vaultItemIdForRow(item).trim();
            return vaultItemId.isEmpty || itemVaultItemId != vaultItemId;
          })
          .toList(growable: false);
      _selectedCardPrintIds.remove(cardId);
      _recomputeDerivedData();
    });

    return previousItems;
  }

  void _restoreVaultRowsAfterFailedDelete(
    List<Map<String, dynamic>> previousItems,
  ) {
    if (!mounted) {
      return;
    }

    setState(() {
      _items = previousItems;
      _recomputeDerivedData();
    });
  }

  void _showVaultMutationError(String message) {
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
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

    final added = await _addCatalogPickToVault(picked);
    if (!added || !mounted) {
      return;
    }

    final displayName = resolveDisplayName(picked);
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text('Added $displayName to your vault.'),
          action: SnackBarAction(
            label: '+1 more',
            onPressed: () {
              unawaited(_addCatalogPickToVault(picked));
            },
          ),
        ),
      );
  }

  Future<bool> _addCatalogPickToVault(CardPrint picked) async {
    final userId = _uid;
    if (userId == null) {
      return false;
    }

    try {
      await VaultCardService.addOrIncrementVaultItem(
        client: supabase,
        userId: userId,
        cardId: picked.id,
        deltaQty: 1,
        conditionLabel: 'NM',
        fallbackName: picked.name,
        fallbackSetName: picked.displaySet,
        fallbackImageUrl: picked.displayImage,
      );
      await reload();
      return true;
    } catch (_) {
      if (mounted) {
        final displayName = resolveDisplayName(picked);
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(content: Text('Could not add $displayName. Try again.')),
          );
      }
      return false;
    }
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

  List<Map<String, dynamic>> _applyPricingFilter(
    List<Map<String, dynamic>> rows,
  ) {
    return switch (_pricingFilter) {
      _VaultPricingFilter.all => rows,
      _VaultPricingFilter.priced =>
        rows
            .where((row) {
              final cardPrintId = (row['card_id'] ?? '').toString().trim();
              return (_pricingSummaryByCardPrintId[cardPrintId]
                          ?.pricedCopyCount ??
                      0) >
                  0;
            })
            .toList(growable: false),
      _VaultPricingFilter.unpriced =>
        rows
            .where((row) {
              final cardPrintId = (row['card_id'] ?? '').toString().trim();
              final summary = _pricingSummaryByCardPrintId[cardPrintId];
              return summary != null &&
                  summary.pricedCopyCount == 0 &&
                  summary.unpricedCopyCount > 0;
            })
            .toList(growable: false),
    };
  }

  void _handleSearchChanged() {
    final nextValue = _searchController.text;
    if (nextValue == _search && nextValue == _pokemonSearch) {
      return;
    }
    setState(() {
      _search = nextValue;
      _pokemonSearch = nextValue;
      _selectedCardPrintIds.clear();
      _recomputeDerivedData();
    });
  }

  void _setView(_VaultStructuralView view) {
    if (_view == view) {
      return;
    }

    setState(() {
      _view = view;
      _selectedCardPrintIds.clear();
    });
  }

  void _setPricingFilter(_VaultPricingFilter filter) {
    if (_pricingFilter == filter) {
      return;
    }
    setState(() {
      _pricingFilter = filter;
      _selectedCardPrintIds.clear();
      _recomputeDerivedData();
    });
  }

  void _toggleSelectionMode() {
    if (_bulkArchiveBusy) {
      return;
    }
    setState(() {
      _selectionMode = !_selectionMode;
      if (!_selectionMode) {
        _selectedCardPrintIds.clear();
      }
    });
  }

  void _toggleSelection(Map<String, dynamic> row) {
    final cardPrintId = (row['card_id'] ?? '').toString().trim();
    if (cardPrintId.isEmpty) {
      return;
    }
    setState(() {
      _selectionMode = true;
      if (_selectedCardPrintIds.contains(cardPrintId)) {
        _selectedCardPrintIds.remove(cardPrintId);
      } else {
        _selectedCardPrintIds.add(cardPrintId);
      }
    });
  }

  void _clearSelection() {
    if (_selectedCardPrintIds.isEmpty) {
      return;
    }
    setState(() {
      _selectedCardPrintIds.clear();
    });
  }

  void _selectAllVisible(List<Map<String, dynamic>> rows) {
    final visibleIds = rows
        .map((row) => (row['card_id'] ?? '').toString().trim())
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList(growable: false);
    final boundedIds = visibleIds.take(500).toSet();
    setState(() {
      _selectionMode = true;
      _selectedCardPrintIds
        ..clear()
        ..addAll(boundedIds);
    });
    if (visibleIds.length > boundedIds.length) {
      _showVaultMutationError(
        'Selected the first 500 cards. Remove them before selecting more.',
      );
    }
  }

  Future<void> _openSelectedLotPricing() async {
    final selectedRows = _items
        .where(
          (row) => _selectedCardPrintIds.contains(
            (row['card_id'] ?? '').toString().trim(),
          ),
        )
        .toList(growable: false);
    if (selectedRows.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select at least 2 cards for a lot.')),
      );
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => LotPricingScreen(
          source: GrookaiLotListingSource(
            title: _defaultLotTitle(selectedRows),
            sellerHandle: _vaultSellerHandle,
            items: selectedRows.map(_lotItemSourceForRow).toList(),
          ),
          metadata: <String, dynamic>{
            'card_print_ids': selectedRows
                .map((row) => (row['card_id'] ?? '').toString().trim())
                .where((id) => id.isNotEmpty)
                .toList(),
            'vault_item_ids': selectedRows
                .map(_vaultItemIdForRow)
                .where((id) => id.isNotEmpty)
                .toList(),
            'source': 'vault_grid_multi_select',
          },
        ),
      ),
    );
  }

  Future<void> _confirmRemoveSelected() async {
    if (_bulkArchiveBusy || _selectedCardPrintIds.isEmpty || _uid == null) {
      return;
    }
    final selectedRows = _items
        .where(
          (row) => _selectedCardPrintIds.contains(
            (row['card_id'] ?? '').toString().trim(),
          ),
        )
        .toList(growable: false);
    final copyCount = selectedRows.fold<int>(
      0,
      (sum, row) => sum + _ownedCountForRow(row),
    );
    final cardCount = selectedRows.length;
    if (cardCount == 0 || copyCount == 0) {
      _showVaultMutationError(
        'The selected cards are no longer in your Vault.',
      );
      await reload();
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Remove $copyCount ${copyCount == 1 ? 'copy' : 'copies'}?'),
        content: Text(
          'This removes all active copies of the $cardCount selected '
          '${cardCount == 1 ? 'card' : 'cards'} from your Vault and Wall. '
          'Memories and transaction history remain. You can add the cards '
          'again later.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(dialogContext).colorScheme.error,
              foregroundColor: Theme.of(dialogContext).colorScheme.onError,
            ),
            onPressed: () => Navigator.pop(dialogContext, true),
            icon: const Icon(Icons.delete_outline_rounded),
            label: const Text('Remove selected'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) {
      return;
    }

    await _removeSelectedCards(selectedRows);
  }

  Future<void> _removeSelectedCards(
    List<Map<String, dynamic>> selectedRows,
  ) async {
    final userId = _uid;
    if (userId == null || _bulkArchiveBusy) {
      return;
    }
    final selectedIds = selectedRows
        .map((row) => (row['card_id'] ?? '').toString().trim())
        .where((id) => id.isNotEmpty)
        .toSet();
    if (selectedIds.isEmpty) {
      return;
    }

    final previousItems = List<Map<String, dynamic>>.from(_items);
    setState(() {
      _bulkArchiveBusy = true;
      _items = _items
          .where(
            (row) =>
                !selectedIds.contains((row['card_id'] ?? '').toString().trim()),
          )
          .toList(growable: false);
      _recomputeDerivedData();
    });

    try {
      final result = await VaultCardService.archiveSelectedVaultCards(
        client: supabase,
        userId: userId,
        cardPrintIds: selectedIds,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _bulkArchiveBusy = false;
        _selectionMode = false;
        _selectedCardPrintIds.clear();
      });
      await reload();
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text(
              '${result.archivedInstanceCount} '
              '${result.archivedInstanceCount == 1 ? 'copy' : 'copies'} '
              'removed from your Vault.',
            ),
          ),
        );
    } catch (error) {
      debugPrint('vault.mobile.bulk_archive.failed: $error');
      if (!mounted) {
        return;
      }
      setState(() {
        _bulkArchiveBusy = false;
        _items = previousItems;
        _recomputeDerivedData();
      });
      _showVaultMutationError(
        'Nothing was removed. Refresh your Vault and try again.',
      );
    }
  }

  Future<void> _openMemoriesHome() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => CollectorMemoriesScreen()));
  }

  Future<void> _openCollectionProjects() async {
    if (BinderFeatureFlags.production.personalAvailable) {
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => const BinderLibraryScreen(
            featureFlags: BinderFeatureFlags.production,
          ),
        ),
      );
      return;
    }
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CollectionProjectsScreen(
          onOpenProject: (project) async {
            switch (project.subjectType) {
              case CollectionProjectSubjectType.set:
                await Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) =>
                        PublicSetDetailScreen(setCode: project.routeKey),
                  ),
                );
                break;
              case CollectionProjectSubjectType.species:
                await Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => GrookaiDexSpeciesScreen(
                      speciesSlug: project.routeKey,
                      initialDisplayName: project.title,
                      onOpenScanner: widget.onOpenScanner,
                      onOpenVaultSpecies: widget.onOpenVaultSpecies,
                    ),
                  ),
                );
                break;
            }
          },
        ),
      ),
    );
  }

  Future<void> _loadBinderWhatsNewState() async {
    try {
      final preferences = await SharedPreferences.getInstance();
      final dismissed =
          preferences.getBool('binders_whats_new_dismissed_v1') ?? false;
      if (mounted && !dismissed) {
        setState(() => _showBinderWhatsNew = true);
      }
    } catch (_) {
      // A missing preference store should not block the Vault.
    }
  }

  Future<void> _dismissBinderWhatsNew() async {
    setState(() => _showBinderWhatsNew = false);
    try {
      final preferences = await SharedPreferences.getInstance();
      await preferences.setBool('binders_whats_new_dismissed_v1', true);
    } catch (_) {
      // Dismissal still applies for this session.
    }
  }

  String get _vaultSellerHandle {
    final metadata = supabase.auth.currentUser?.userMetadata ?? const {};
    for (final key in const ['display_name', 'full_name', 'name', 'username']) {
      final value = (metadata[key] ?? '').toString().trim();
      if (value.isNotEmpty) {
        return value;
      }
    }
    final email = (supabase.auth.currentUser?.email ?? '').trim();
    if (email.contains('@')) {
      return email.split('@').first;
    }
    return 'Collector';
  }

  String _defaultLotTitle(List<Map<String, dynamic>> rows) {
    final setNames = rows
        .map((row) => ((row['set_name'] ?? row['set_code']) ?? '').toString())
        .where((value) => value.trim().isNotEmpty)
        .toSet();
    if (setNames.length == 1) {
      return '${setNames.single} Lot';
    }
    return '${rows.length}-Card Vault Lot';
  }

  GrookaiLotListingItemSource _lotItemSourceForRow(Map<String, dynamic> row) {
    final cardPrintId = (row['card_id'] ?? '').toString().trim();
    final price = _pricingByCardPrintId[cardPrintId]?.visibleValue ?? 0;
    return GrookaiLotListingItemSource(
      cardName: (row['name'] ?? 'Card').toString(),
      printingIdentityLabel: resolveVaultPrintingIdentityPresentation(
        row,
      ).label,
      condition: (row['condition_label'] ?? 'Raw NM').toString(),
      price: price,
      imageUrl: _vaultDisplayImageUrl(row),
    );
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
      final cardPrintId = (row['card_id'] ?? '').toString().trim();
      if (_canonicalSpeciesSlug != null &&
          !_canonicalSpeciesCardPrintIds.contains(cardPrintId)) {
        return false;
      }
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
    if (_canonicalSpeciesSlug != null) {
      return const <String>[];
    }
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
    final canOpen = _canOpenVaultRow(row);
    final selected = _selectedCardPrintIds.contains(cardPrintId);

    return _VaultItemTile(
      row: row,
      pricing: _pricingByCardPrintId[cardPrintId],
      selectionMode: _selectionMode,
      selected: selected,
      onSelectionTap: () => _toggleSelection(row),
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
        await _confirmDelete(row);
      },
      onTap: canOpen ? () => _openManageCardRow(row) : null,
    );
  }

  Widget _buildVaultGridTile(Map<String, dynamic> row) {
    final vaultItemId = _vaultItemIdForRow(row);
    final name = (row['name'] ?? 'Item').toString();
    final cardPrintId = (row['card_id'] ?? '').toString();
    final canOpen = _canOpenVaultRow(row);
    final selected = _selectedCardPrintIds.contains(cardPrintId);

    return _VaultGridTile(
      row: row,
      pricing: _pricingByCardPrintId[cardPrintId],
      selectionMode: _selectionMode,
      selected: selected,
      onTap: canOpen ? () => _openManageCardRow(row) : null,
      onSelectionTap: () => _toggleSelection(row),
      onLongPress: _selectionMode
          ? () => _toggleSelection(row)
          : () => _showVaultRowQuickActions(row),
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
        await _confirmDelete(row);
      },
    );
  }

  Future<void> _showVaultRowQuickActions(Map<String, dynamic> row) {
    final name = (row['name'] ?? 'Card').toString();
    final setName = (row['set_name'] ?? '').toString().trim();
    final gvviId = (row['gv_vi_id'] ?? '').toString().trim();
    final canOpen = _canOpenVaultRow(row);

    return showVaultQuickActionSheet(
      context: context,
      title: name,
      subtitle: setName.isEmpty ? null : setName,
      actions: [
        VaultQuickAction(
          icon: Icons.visibility_outlined,
          label: 'View',
          onPressed: canOpen ? () => _openManageCardRow(row) : null,
        ),
        VaultQuickAction(
          icon: Icons.tune_rounded,
          label: 'Set intent',
          onPressed: canOpen ? () => _openManageCardRow(row) : null,
        ),
        if (BinderFeatureFlags.production.personalAvailable)
          VaultQuickAction(
            icon: Icons.collections_bookmark_outlined,
            label: 'Add to Binder',
            onPressed: () => _addVaultRowToBinder(row),
          ),
        VaultQuickAction(
          icon: Icons.ios_share_outlined,
          label: 'Share link',
          onPressed: gvviId.isEmpty ? null : () => _shareVaultRowLink(row),
        ),
        VaultQuickAction(
          icon: Icons.delete_outline_rounded,
          label: 'Remove',
          destructive: true,
          onPressed: () async {
            await _confirmDelete(row);
          },
        ),
      ],
    );
  }

  Future<void> _addVaultRowToBinder(Map<String, dynamic> row) async {
    final cardPrintId = (row['card_id'] ?? '').toString().trim();
    if (cardPrintId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This copy needs canonical card identity first.'),
        ),
      );
      return;
    }
    final binder = await Navigator.of(context).push<BinderSummary>(
      MaterialPageRoute<BinderSummary>(
        builder: (_) => const BinderDestinationPickerScreen(),
      ),
    );
    if (!mounted || binder == null) return;
    await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => BinderExactCopyPickerScreen(
          publicId: binder.publicId,
          cardPrintId: cardPrintId,
          contextLabel: (row['name'] ?? 'this copy').toString(),
        ),
      ),
    );
  }

  Future<void> _shareVaultRowLink(Map<String, dynamic> row) async {
    final gvviId = (row['gv_vi_id'] ?? '').toString().trim();
    if (gvviId.isEmpty) {
      return;
    }

    final uri = GrookaiWebRouteService.buildUri(
      '/gvvi/${Uri.encodeComponent(gvviId)}',
    );
    await SharePlus.instance.share(
      ShareParams(
        uri: uri,
        subject: (row['name'] ?? 'Grookai Vault card').toString(),
      ),
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
          final canOpen = _canOpenVaultRow(row);
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
          final artwork = _vaultArtwork(row);
          final pricing = _pricingByCardPrintId[cardPrintId];

          return SizedBox(
            width: 140,
            child: Material(
              color: Theme.of(
                context,
              ).colorScheme.surfaceContainerHighest.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(
                GvGridConstants.tileTapRadius,
              ),
              child: InkWell(
                borderRadius: BorderRadius.circular(
                  GvGridConstants.tileTapRadius,
                ),
                onTap: canOpen ? () => _openManageCardRow(row) : null,
                child: Padding(
                  padding: const EdgeInsets.all(10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Center(
                          child: CardSurfaceArtwork(
                            label: displayIdentity.baseName,
                            imageUrl: artwork.primaryImageUrl,
                            fallbackImageUrl: artwork.fallbackImageUrl,
                            width: 88,
                            height: 118,
                            borderRadius: GvGridConstants.imageRadius,
                            padding: const EdgeInsets.all(5),
                            onViewDetails: canOpen
                                ? () => _openManageCardRow(row)
                                : null,
                            detailsLabel: 'Your copies',
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        displayIdentity.baseName,
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
                        CardSurfacePriceText(
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

  String _vaultViewLabel(_VaultStructuralView view) {
    return switch (view) {
      _VaultStructuralView.all => 'All',
      _VaultStructuralView.onWall => 'Wall',
      _VaultStructuralView.duplicates => 'Duplicates',
      _VaultStructuralView.recent => 'Recent',
      _VaultStructuralView.bySet => 'Sets',
      _VaultStructuralView.pokemon => 'Pokemon',
    };
  }

  int get _activeVaultFilterCount {
    return (_view == _VaultStructuralView.all ? 0 : 1) +
        (_pricingFilter == _VaultPricingFilter.all ? 0 : 1);
  }

  Widget _buildVaultFilterButton(ThemeData theme) {
    final colorScheme = theme.colorScheme;
    final activeCount = _activeVaultFilterCount;
    return OutlinedButton.icon(
      onPressed: _openVaultFiltersSheet,
      icon: const Icon(Icons.tune_rounded, size: 18),
      label: Text(activeCount == 0 ? 'Filters' : 'Filters · $activeCount'),
      style: OutlinedButton.styleFrom(
        visualDensity: VisualDensity.compact,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        foregroundColor: colorScheme.onSurface.withValues(alpha: 0.84),
        side: BorderSide(
          color: activeCount == 0
              ? colorScheme.outline.withValues(alpha: 0.26)
              : colorScheme.primary.withValues(alpha: 0.7),
        ),
        backgroundColor: activeCount == 0
            ? colorScheme.surfaceContainerHighest.withValues(alpha: 0.24)
            : colorScheme.primary.withValues(alpha: 0.1),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        textStyle: theme.textTheme.labelMedium?.copyWith(
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Future<void> _openVaultFiltersSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final theme = Theme.of(context);
            final colorScheme = theme.colorScheme;
            final bottomInset = MediaQuery.viewPaddingOf(context).bottom;

            void selectView(_VaultStructuralView view) {
              _setView(view);
              setSheetState(() {});
            }

            void selectPricing(_VaultPricingFilter filter) {
              _setPricingFilter(filter);
              setSheetState(() {});
            }

            return Padding(
              padding: EdgeInsets.fromLTRB(20, 4, 20, 20 + bottomInset),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Filters',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Choose how your vault is grouped.',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.64),
                      ),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      'View',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.58),
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final view in _VaultStructuralView.values)
                          GvChip(
                            label: _vaultViewLabel(view),
                            selected: _view == view,
                            onSelected: (_) => selectView(view),
                          ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Text(
                      'Pricing',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.58),
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final filter in _VaultPricingFilter.values)
                          GvChip(
                            label: switch (filter) {
                              _VaultPricingFilter.all => 'All prices',
                              _VaultPricingFilter.priced => 'Priced',
                              _VaultPricingFilter.unpriced => 'Unpriced',
                            },
                            selected: _pricingFilter == filter,
                            onSelected: (_) => selectPricing(filter),
                          ),
                      ],
                    ),
                    if (_pricingFilter == _VaultPricingFilter.unpriced) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Unpriced shows only cards where none of the active '
                        'copies has an exact market price.',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.64),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  String _formatVaultValue(double value) {
    return formatCardSurfaceMoney(value);
  }

  Future<void> _openManageCardRow(Map<String, dynamic> row) async {
    final vaultItemId = _vaultItemIdForRow(row);
    final cardPrintId = (row['card_id'] ?? '').toString().trim();
    final gvviId = (row['gv_vi_id'] ?? '').toString().trim();
    if ((vaultItemId.isEmpty || cardPrintId.isEmpty) && gvviId.isEmpty) {
      return;
    }

    if (vaultItemId.isEmpty || cardPrintId.isEmpty) {
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => VaultManageCardScreen(gvviId: gvviId),
        ),
      );
      await reload();
      return;
    }

    final ownedCount = _ownedCountForRow(row);
    if (ownedCount == 1 && gvviId.isNotEmpty) {
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => VaultManageCardScreen(gvviId: gvviId),
        ),
      );
      await reload();
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<bool>(
        builder: (_) => VaultManageCardScreen(
          vaultItemId: vaultItemId,
          cardPrintId: cardPrintId,
          ownedCount: ownedCount,
          gvviId: gvviId,
          gvId: (row['gv_id'] ?? '').toString(),
          name: (row['name'] ?? '').toString(),
          setName: (row['set_name'] ?? '').toString(),
          number: (row['number'] ?? '').toString(),
          imageUrl: _vaultDisplayImageUrl(row),
          condition: (row['condition_label'] ?? '').toString(),
        ),
      ),
    );
    await reload();
  }

  bool _canOpenVaultRow(Map<String, dynamic> row) {
    final cardPrintId = (row['card_id'] ?? '').toString().trim();
    final gvviId = (row['gv_vi_id'] ?? '').toString().trim();
    return cardPrintId.isNotEmpty || gvviId.isNotEmpty;
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

  List<Map<String, dynamic>> _visibleRowsForSelection(_VaultDerivedData data) {
    return switch (_view) {
      _VaultStructuralView.all => data.searchedRows,
      _VaultStructuralView.onWall => data.onWallRows,
      _VaultStructuralView.duplicates => data.duplicateRows,
      _VaultStructuralView.recent => data.recentRows,
      _VaultStructuralView.bySet => data.searchedRows,
      _VaultStructuralView.pokemon => data.pokemonRows,
    };
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
    final selectionRows = _visibleRowsForSelection(derivedData);
    final visibleSelectionIds = selectionRows
        .map((row) => (row['card_id'] ?? '').toString().trim())
        .where((id) => id.isNotEmpty)
        .toSet();
    final allVisibleSelected =
        visibleSelectionIds.isNotEmpty &&
        visibleSelectionIds.every(_selectedCardPrintIds.contains);
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
                _search.trim().isEmpty
                    ? 'Your vault is empty'
                    : 'No matching cards',
                _search.trim().isEmpty
                    ? 'Scan or search to add your first card.'
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
                _search.trim().isEmpty ? 'No duplicates' : 'No matching cards',
                _search.trim().isEmpty
                    ? 'Every card in your vault is one of a kind.'
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
                _search.trim().isEmpty ? 'Nothing recent' : 'No matching cards',
                _search.trim().isEmpty
                    ? 'Nothing added in the last 30 days.'
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
          if (_canonicalSpeciesSlug != null) {
            vaultContentSlivers.add(
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  child: InputChip(
                    avatar: _canonicalSpeciesLoading
                        ? const SizedBox.square(
                            dimension: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.catching_pokemon_rounded, size: 18),
                    label: Text(
                      '${_canonicalSpeciesLabel ?? _canonicalSpeciesSlug} · Exact species',
                    ),
                    onDeleted: _clearCanonicalSpeciesFilter,
                    deleteButtonTooltipMessage: 'Clear exact species filter',
                  ),
                ),
              ),
            );
            vaultContentSlivers.add(
              const SliverToBoxAdapter(child: SizedBox(height: 8)),
            );
          }
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
                              _search = suggestion;
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
                  _canonicalSpeciesLoading
                      ? 'Loading exact species'
                      : _canonicalSpeciesSlug != null
                      ? 'No owned cards for this species'
                      : _pokemonSearch.trim().isNotEmpty
                      ? 'No matching cards'
                      : 'Your vault is empty',
                  _canonicalSpeciesLoading
                      ? 'Matching your Vault against canonical Dex mappings.'
                      : _canonicalSpeciesSlug != null
                      ? 'Cards appear here only when their canonical species mapping matches.'
                      : _pokemonSearch.trim().isNotEmpty
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
        // ignore: deprecated_member_use
        cacheExtent: 960,
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 6, 14, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (BinderFeatureFlags.production.personalAvailable) ...[
                    if (_showBinderWhatsNew)
                      Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.auto_awesome_rounded),
                              const SizedBox(width: 10),
                              const Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'What’s new: Binders',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    SizedBox(height: 3),
                                    Text(
                                      'Build collection goals powered by '
                                      'exact copies in your Vault.',
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                tooltip: 'Dismiss Binder introduction',
                                onPressed: _dismissBinderWhatsNew,
                                icon: const Icon(Icons.close_rounded),
                              ),
                            ],
                          ),
                        ),
                      ),
                    GvSurface(
                      key: const ValueKey<String>('vault-binders-entry'),
                      variant: GvSurfaceVariant.grouped,
                      padding: EdgeInsets.zero,
                      child: ListTile(
                        dense: true,
                        visualDensity: VisualDensity.compact,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 2,
                        ),
                        leading: DecoratedBox(
                          decoration: BoxDecoration(
                            color: theme.colorScheme.tertiary.withValues(
                              alpha: 0.14,
                            ),
                            borderRadius: BorderRadius.circular(
                              GvRadii.control,
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(9),
                            child: Icon(
                              Icons.collections_bookmark_outlined,
                              size: 20,
                              color: theme.colorScheme.tertiary,
                            ),
                          ),
                        ),
                        title: const Text(
                          'Binders',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                        subtitle: const Text('What you’re building'),
                        trailing: const Icon(Icons.chevron_right_rounded),
                        onTap: _openCollectionProjects,
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  Text(
                    'YOUR COLLECTION',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Semantics(
                    identifier:
                        derivedData.vaultPricingSummary.totalMarketValue == null
                        ? null
                        : vaultExactPricingTotalProofKey(
                            derivedData.vaultPricingSummary,
                          ),
                    label: 'TCGPlayer Market Vault total',
                    value: derivedData.estimatedValue == null
                        ? 'Unavailable'
                        : _formatVaultValue(derivedData.estimatedValue!),
                    child: Text(
                      derivedData.estimatedValue == null
                          ? 'TCGPlayer Market'
                          : _formatVaultValue(derivedData.estimatedValue!),
                      style: theme.textTheme.headlineSmall?.copyWith(
                        color: theme.colorScheme.onSurface,
                        fontWeight: FontWeight.w700,
                        height: 1.0,
                        letterSpacing: 0,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    derivedData.estimatedValue == null
                        ? '$totalCards cards • ${_items.length} unique • $setCount sets • Value pending'
                        : '$totalCards cards • ${_items.length} unique • ${derivedData.pricedCopyCount} valued copies • 30d trend pending',
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
                            hintText: 'Search vault · by card, set, or Pokemon',
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
                      IconButton(
                        tooltip: 'Binders',
                        onPressed: _openCollectionProjects,
                        icon: Icon(
                          BinderFeatureFlags.production.personalAvailable
                              ? Icons.collections_bookmark_outlined
                              : Icons.flag_outlined,
                        ),
                      ),
                      IconButton(
                        tooltip: 'Memories',
                        onPressed: _openMemoriesHome,
                        icon: const Icon(Icons.auto_awesome_motion_outlined),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      _buildVaultFilterButton(theme),
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: _bulkArchiveBusy
                            ? null
                            : _toggleSelectionMode,
                        icon: Icon(
                          _selectionMode
                              ? Icons.check_box_rounded
                              : Icons.check_box_outline_blank_rounded,
                          size: 18,
                        ),
                        label: Text(_selectionMode ? 'Done' : 'Select'),
                        style: OutlinedButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Align(
                          alignment: Alignment.centerRight,
                          child: SharedCardViewModeButton(
                            value: _cardViewMode,
                            onChanged: (mode) {
                              setState(() {
                                _cardViewMode = mode;
                              });
                            },
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (_selectionMode) ...[
                    const SizedBox(height: 8),
                    _VaultSelectionBar(
                      selectedCount: _selectedCardPrintIds.length,
                      visibleCount: visibleSelectionIds.length,
                      allVisibleSelected: allVisibleSelected,
                      busy: _bulkArchiveBusy,
                      onSelectAll: () => _selectAllVisible(selectionRows),
                      onClear: _clearSelection,
                      onRemove: _confirmRemoveSelected,
                      onListLot: _openSelectedLotPricing,
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 8)),
          ...vaultContentSlivers,
          if (_view == _VaultStructuralView.all) ...[
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
          ],
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
    if (!mounted) {
      return false;
    }

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
      return _delete(row);
    }
    return false;
  }
}

enum _SortBy { newest, name, qty }

enum _VaultStructuralView { all, onWall, duplicates, recent, bySet, pokemon }

enum _VaultPricingFilter { all, priced, unpriced }

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
    required this.estimatedValue,
    required this.pricedCopyCount,
    required this.vaultPricingSummary,
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
      lastAddedLabel = 'No cards yet',
      estimatedValue = null,
      pricedCopyCount = 0,
      vaultPricingSummary = const VaultExactPricingSummary(
        totalMarketValue: null,
        pricedCopyCount: 0,
        unpricedCopyCount: 0,
        latestObservedAt: null,
        latestPublishedAt: null,
      );

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
  final double? estimatedValue;
  final int pricedCopyCount;
  final VaultExactPricingSummary vaultPricingSummary;
}

DateTime? _latestVaultPricingTimestamp(DateTime? left, DateTime? right) {
  if (left == null) return right;
  if (right == null) return left;
  return left.isAfter(right) ? left : right;
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
  int _searchRequestVersion = 0;
  String _languageScope = 'all';
  String _gameScope = 'pokemon';

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
    final requestVersion = ++_searchRequestVersion;
    setState(() => _loading = true);
    try {
      final resolved = await CardPrintRepository.searchCardPrintsResolved(
        client: supabase,
        options: CardSearchOptions(
          query: query,
          limit: _kSearchResolverLimit,
          languageScope: _languageScope,
          gameScope: _gameScope,
        ),
      );
      if (!mounted || requestVersion != _searchRequestVersion) {
        return;
      }
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
      if (!mounted || requestVersion != _searchRequestVersion) {
        return;
      }
      setState(() {
        _rows = resolved.rows;
        _ownershipByCardPrintId = ownershipByCardPrintId;
        _resolverMeta = resolved.meta;
        _searchError = null;
      });
    } catch (error) {
      if (!mounted || requestVersion != _searchRequestVersion) {
        return;
      }
      setState(() {
        _rows = const [];
        _ownershipByCardPrintId = const <String, OwnershipState>{};
        _resolverMeta = null;
        _searchError = _formatSearchFailure(error);
      });
    } finally {
      if (mounted && requestVersion == _searchRequestVersion) {
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

  void _handleLanguageScopeChanged(String scope) {
    final normalizedScope = _normalizeSearchLanguageScope(scope);
    if (_languageScope == normalizedScope) {
      return;
    }

    setState(() {
      _languageScope = normalizedScope;
      _rows = const [];
      _ownershipByCardPrintId = const <String, OwnershipState>{};
      _resolverMeta = null;
      _searchError = null;
    });
    _fetch(_q.text.trim());
  }

  void _handleGameScopeChanged(String scope) {
    final normalized = scope == 'one_piece' ? 'one_piece' : 'pokemon';
    if (_gameScope == normalized) {
      return;
    }
    setState(() {
      _gameScope = normalized;
      _rows = const [];
      _ownershipByCardPrintId = const <String, OwnershipState>{};
      _resolverMeta = null;
      _searchError = null;
    });
    _fetch(_q.text.trim());
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
                color: Theme.of(
                  context,
                ).colorScheme.shadow.withValues(alpha: 0.26),
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
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              child: SegmentedButton<String>(
                segments: const <ButtonSegment<String>>[
                  ButtonSegment<String>(
                    value: 'pokemon',
                    label: Text('Pokemon'),
                  ),
                  ButtonSegment<String>(
                    value: 'one_piece',
                    label: Text('One Piece'),
                  ),
                ],
                selected: <String>{_gameScope},
                showSelectedIcon: false,
                onSelectionChanged: (selection) =>
                    _handleGameScopeChanged(selection.first),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              child: _SearchLanguageScopeSelector(
                value: _languageScope,
                onChanged: _handleLanguageScopeChanged,
              ),
            ),
            if (_searchError != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    _searchError!,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.error,
                    ),
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
