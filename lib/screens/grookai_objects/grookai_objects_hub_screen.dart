import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/grookai_memory_card.dart';
import '../../models/grookai_sale_listing.dart';
import '../../services/public/card_surface_pricing_service.dart';
import '../../services/vault/vault_card_service.dart';
import '../../utils/display_image_contract.dart';
import '../../widgets/card_surface_artwork.dart';
import 'collector_memories_screen.dart';
import 'for_sale_terms_screen.dart';
import 'lot_pricing_screen.dart';
import 'memory_card_capture_screen.dart';

enum _ObjectsBuilderMode { memory, sale, lot }

const int _maxLotCards = 12;

class GrookaiObjectsHubScreen extends StatefulWidget {
  const GrookaiObjectsHubScreen({super.key});

  @override
  State<GrookaiObjectsHubScreen> createState() =>
      _GrookaiObjectsHubScreenState();
}

class _GrookaiObjectsHubScreenState extends State<GrookaiObjectsHubScreen> {
  final SupabaseClient _client = Supabase.instance.client;
  final TextEditingController _searchController = TextEditingController();
  final Set<String> _selectedLotRowKeys = <String>{};
  final Map<String, String> _rowErrors = <String, String>{};

  _ObjectsBuilderMode _mode = _ObjectsBuilderMode.memory;
  bool _loading = false;
  String _search = '';
  String? _error;
  List<Map<String, dynamic>> _rows = const [];
  Map<String, CardSurfacePricingData> _pricingByCardPrintId = const {};

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_handleSearchChanged);
    _loadRows();
  }

  @override
  void dispose() {
    _searchController.removeListener(_handleSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadRows() async {
    if (_client.auth.currentUser == null) {
      setState(() {
        _rows = const [];
        _pricingByCardPrintId = const {};
        _loading = false;
        _error = null;
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows = await VaultCardService.getCanonicalCollectorRows(
        client: _client,
      );
      final cardPrintIds = rows
          .map(_cardPrintIdForRow)
          .where((id) => id.isNotEmpty)
          .toSet();
      final pricing = await CardSurfacePricingService.fetchByCardPrintIds(
        client: _client,
        cardPrintIds: cardPrintIds,
      ).catchError((_) => const <String, CardSurfacePricingData>{});
      if (!mounted) {
        return;
      }
      setState(() {
        _rows = rows;
        _pricingByCardPrintId = pricing;
        _selectedLotRowKeys.removeWhere(
          (key) => rows.every((row) => _rowKey(row) != key),
        );
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = 'Unable to load your vault cards. Pull to refresh.';
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _handleSearchChanged() {
    setState(() {
      _search = _searchController.text;
    });
  }

  void _setMode(_ObjectsBuilderMode mode) {
    if (_mode == mode) {
      return;
    }
    setState(() {
      _mode = mode;
      _rowErrors.clear();
    });
  }

  List<Map<String, dynamic>> get _visibleRows {
    final query = _search.trim().toLowerCase();
    if (query.isEmpty) {
      return _rows;
    }
    return _rows
        .where((row) {
          final name = _cardNameForRow(row).toLowerCase();
          final setName = ((row['set_name'] ?? row['set_code']) ?? '')
              .toString()
              .toLowerCase();
          final number = (row['number'] ?? '').toString().toLowerCase();
          return name.contains(query) ||
              setName.contains(query) ||
              number.contains(query);
        })
        .toList(growable: false);
  }

  bool _ensureUsableExactCopy(Map<String, dynamic> row) {
    final rowKey = _rowKey(row);
    final gvviId = _gvviIdForRow(row);
    final cardPrintId = _cardPrintIdForRow(row);
    if (gvviId.isNotEmpty && cardPrintId.isNotEmpty) {
      setState(() {
        _rowErrors.remove(rowKey);
      });
      return true;
    }
    setState(() {
      _rowErrors[rowKey] =
          'This card needs an exact copy before creating this object.';
    });
    return false;
  }

  Future<void> _handleRowTap(Map<String, dynamic> row) async {
    switch (_mode) {
      case _ObjectsBuilderMode.memory:
        await _openMemory(row);
      case _ObjectsBuilderMode.sale:
        await _openSale(row);
      case _ObjectsBuilderMode.lot:
        _toggleLotRow(row);
    }
  }

  Future<void> _openMemory(Map<String, dynamic> row) async {
    if (!_ensureUsableExactCopy(row)) {
      return;
    }
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => MemoryCardCaptureScreen(
          gvviId: _gvviIdForRow(row),
          cardPrintId: _cardPrintIdForRow(row),
          source: GrookaiMemoryCardSource(
            cardName: _cardNameForRow(row),
            setLine: _setLineForRow(row),
            cardImageUrl: _displayImageUrlForRow(row),
            authorName: _sellerHandle,
          ),
        ),
      ),
    );
  }

  Future<void> _openSale(Map<String, dynamic> row) async {
    if (!_ensureUsableExactCopy(row)) {
      return;
    }
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ForSaleTermsScreen(
          gvviId: _gvviIdForRow(row),
          source: GrookaiSaleListingSource(
            cardName: _cardNameForRow(row),
            setLine: _setLineForRow(row),
            cardImageUrl: _displayImageUrlForRow(row),
            sellerHandle: _sellerHandle,
          ),
        ),
      ),
    );
  }

  void _toggleLotRow(Map<String, dynamic> row) {
    if (!_ensureUsableExactCopy(row)) {
      return;
    }
    final rowKey = _rowKey(row);
    if (!_selectedLotRowKeys.contains(rowKey) &&
        _selectedLotRowKeys.length >= _maxLotCards) {
      setState(() {
        _rowErrors[rowKey] = 'Lots can include up to $_maxLotCards cards.';
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lots can include up to 12 cards.')),
      );
      return;
    }
    setState(() {
      if (_selectedLotRowKeys.contains(rowKey)) {
        _selectedLotRowKeys.remove(rowKey);
      } else {
        _selectedLotRowKeys.add(rowKey);
      }
    });
  }

  Future<void> _openLotPricing() async {
    final selectedRows = _rows
        .where((row) => _selectedLotRowKeys.contains(_rowKey(row)))
        .toList(growable: false);
    if (selectedRows.length < 2) {
      return;
    }
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => LotPricingScreen(
          source: GrookaiLotListingSource(
            title: _defaultLotTitle(selectedRows),
            sellerHandle: _sellerHandle,
            items: selectedRows.map(_lotItemSourceForRow).toList(),
          ),
          metadata: <String, dynamic>{
            'card_print_ids': selectedRows
                .map(_cardPrintIdForRow)
                .where((id) => id.isNotEmpty)
                .toList(growable: false),
            'gvvi_ids': selectedRows
                .map(_gvviIdForRow)
                .where((id) => id.isNotEmpty)
                .toList(growable: false),
            'source': 'grookai_objects_embedded_builder',
          },
        ),
      ),
    );
  }

  Future<void> _openMemoriesHome() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => CollectorMemoriesScreen()));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final visibleRows = _visibleRows;
    final selectedLotCount = _selectedLotRowKeys.length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Grookai Objects'),
        actions: [
          IconButton(
            tooltip: 'Memories',
            onPressed: _openMemoriesHome,
            icon: const Icon(Icons.auto_awesome_motion_outlined),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadRows,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
            children: [
              Text(
                'Build from your vault',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                _modeDescription,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 14),
              SegmentedButton<_ObjectsBuilderMode>(
                segments: const [
                  ButtonSegment(
                    value: _ObjectsBuilderMode.memory,
                    icon: Icon(Icons.auto_awesome_outlined),
                    label: Text('Memory'),
                  ),
                  ButtonSegment(
                    value: _ObjectsBuilderMode.sale,
                    icon: Icon(Icons.sell_outlined),
                    label: Text('Sale'),
                  ),
                  ButtonSegment(
                    value: _ObjectsBuilderMode.lot,
                    icon: Icon(Icons.inventory_2_outlined),
                    label: Text('Lot'),
                  ),
                ],
                selected: {_mode},
                onSelectionChanged: (values) => _setMode(values.single),
                showSelectedIcon: false,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _searchController,
                decoration: const InputDecoration(
                  hintText: 'Search owned cards',
                  prefixIcon: Icon(Icons.search_rounded),
                  isDense: true,
                ),
              ),
              if (_mode == _ObjectsBuilderMode.lot) ...[
                const SizedBox(height: 10),
                _LotActionBar(
                  selectedCount: selectedLotCount,
                  maxCount: _maxLotCards,
                  onClear: selectedLotCount == 0
                      ? null
                      : () => setState(_selectedLotRowKeys.clear),
                  onPriceLot: selectedLotCount < 2 ? null : _openLotPricing,
                ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 12),
                _HubMessage(
                  icon: Icons.error_outline_rounded,
                  title: 'Unable to load cards',
                  body: _error!,
                  actionLabel: 'Try again',
                  onAction: _loadRows,
                ),
              ],
              if (_client.auth.currentUser == null) ...[
                const SizedBox(height: 18),
                const _HubMessage(
                  icon: Icons.lock_outline_rounded,
                  title: 'Sign in to build objects',
                  body:
                      'Grookai Objects are created from cards already in your private vault.',
                ),
              ] else if (_loading) ...[
                const SizedBox(height: 32),
                const Center(child: CircularProgressIndicator()),
              ] else if (visibleRows.isEmpty && _error == null) ...[
                const SizedBox(height: 18),
                _HubMessage(
                  icon: Icons.style_outlined,
                  title: _search.trim().isEmpty
                      ? 'No owned cards yet'
                      : 'No matching cards',
                  body: _search.trim().isEmpty
                      ? 'Add cards to your vault first, then come back here to build Memory, Sale, and Lot objects.'
                      : 'Try another card, set, or number.',
                ),
              ] else ...[
                const SizedBox(height: 12),
                for (final row in visibleRows) ...[
                  _ObjectCardPickerRow(
                    row: row,
                    title: _cardNameForRow(row),
                    subtitle: _setLineForRow(row),
                    condition: _conditionForRow(row),
                    imageUrl: _displayImageUrlForRow(row),
                    selected: _selectedLotRowKeys.contains(_rowKey(row)),
                    selectionMode: _mode == _ObjectsBuilderMode.lot,
                    price: _pricingByCardPrintId[_cardPrintIdForRow(row)]
                        ?.visibleValue,
                    error: _rowErrors[_rowKey(row)],
                    actionLabel: _rowActionLabel,
                    onTap: () => _handleRowTap(row),
                  ),
                  const SizedBox(height: 10),
                ],
              ],
            ],
          ),
        ),
      ),
    );
  }

  String get _modeDescription {
    return switch (_mode) {
      _ObjectsBuilderMode.memory =>
        'Tap one owned card to create a private collector memory.',
      _ObjectsBuilderMode.sale =>
        'Tap one owned card to set price, condition, and buyer contact.',
      _ObjectsBuilderMode.lot =>
        'Select two or more owned cards, then price the bundle.',
    };
  }

  String get _rowActionLabel {
    return switch (_mode) {
      _ObjectsBuilderMode.memory => 'Create Memory',
      _ObjectsBuilderMode.sale => 'List for Sale',
      _ObjectsBuilderMode.lot => 'Select',
    };
  }

  String get _sellerHandle {
    final metadata = _client.auth.currentUser?.userMetadata ?? const {};
    for (final key in const ['display_name', 'full_name', 'name', 'username']) {
      final value = (metadata[key] ?? '').toString().trim();
      if (value.isNotEmpty) {
        return value;
      }
    }
    final email = (_client.auth.currentUser?.email ?? '').trim();
    if (email.contains('@')) {
      return email.split('@').first;
    }
    return 'Collector';
  }

  GrookaiLotListingItemSource _lotItemSourceForRow(Map<String, dynamic> row) {
    final cardPrintId = _cardPrintIdForRow(row);
    return GrookaiLotListingItemSource(
      cardName: _cardNameForRow(row),
      condition: _conditionForRow(row),
      price: _pricingByCardPrintId[cardPrintId]?.visibleValue ?? 0,
      imageUrl: _displayImageUrlForRow(row),
    );
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
}

class _ObjectCardPickerRow extends StatelessWidget {
  const _ObjectCardPickerRow({
    required this.row,
    required this.title,
    required this.subtitle,
    required this.condition,
    required this.imageUrl,
    required this.selected,
    required this.selectionMode,
    required this.actionLabel,
    required this.onTap,
    this.price,
    this.error,
  });

  final Map<String, dynamic> row;
  final String title;
  final String subtitle;
  final String condition;
  final String? imageUrl;
  final bool selected;
  final bool selectionMode;
  final String actionLabel;
  final VoidCallback onTap;
  final double? price;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final hasError = (error ?? '').isNotEmpty;

    return Material(
      color: selected
          ? colorScheme.primary.withValues(alpha: 0.12)
          : colorScheme.surfaceContainerHighest.withValues(alpha: 0.28),
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CardSurfaceArtwork(
                    label: title,
                    imageUrl: imageUrl,
                    width: 58,
                    height: 80,
                    borderRadius: 8,
                    padding: EdgeInsets.zero,
                    showShadow: false,
                    enableTapToZoom: false,
                    frame: CardArtworkFrame.soft,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          subtitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            _SmallPill(label: condition),
                            if (price != null)
                              _SmallPill(
                                label: '\$${price!.toStringAsFixed(2)}',
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (selectionMode)
                    Icon(
                      selected
                          ? Icons.check_circle_rounded
                          : Icons.radio_button_unchecked_rounded,
                      color: selected
                          ? colorScheme.primary
                          : colorScheme.onSurfaceVariant,
                    )
                  else
                    Text(
                      actionLabel,
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: colorScheme.primary,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                ],
              ),
              if (hasError) ...[
                const SizedBox(height: 10),
                Text(
                  error!,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.error,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _LotActionBar extends StatelessWidget {
  const _LotActionBar({
    required this.selectedCount,
    required this.maxCount,
    required this.onClear,
    required this.onPriceLot,
  });

  final int selectedCount;
  final int maxCount;
  final VoidCallback? onClear;
  final VoidCallback? onPriceLot;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.34),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              selectedCount == 0
                  ? 'Select at least 2 cards'
                  : '$selectedCount/$maxCount selected',
              style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          TextButton(onPressed: onClear, child: const Text('Clear')),
          const SizedBox(width: 6),
          FilledButton.icon(
            onPressed: onPriceLot,
            icon: const Icon(Icons.price_change_outlined, size: 18),
            label: const Text('Price Lot'),
          ),
        ],
      ),
    );
  }
}

class _SmallPill extends StatelessWidget {
  const _SmallPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: colorScheme.surface.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.12)),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: colorScheme.onSurfaceVariant,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _HubMessage extends StatelessWidget {
  const _HubMessage({
    required this.icon,
    required this.title,
    required this.body,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String body;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.28),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Icon(icon, color: colorScheme.primary, size: 30),
          const SizedBox(height: 10),
          Text(
            title,
            textAlign: TextAlign.center,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            body,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 10),
            TextButton(onPressed: onAction, child: Text(actionLabel!)),
          ],
        ],
      ),
    );
  }
}

String _rowKey(Map<String, dynamic> row) {
  final cardPrintId = _cardPrintIdForRow(row);
  if (cardPrintId.isNotEmpty) {
    return cardPrintId;
  }
  final gvviId = _gvviIdForRow(row);
  if (gvviId.isNotEmpty) {
    return gvviId;
  }
  return _cardNameForRow(row);
}

String _cardPrintIdForRow(Map<String, dynamic> row) {
  return (row['card_id'] ?? '').toString().trim();
}

String _gvviIdForRow(Map<String, dynamic> row) {
  return (row['gv_vi_id'] ?? '').toString().trim();
}

String _cardNameForRow(Map<String, dynamic> row) {
  final value = (row['name'] ?? '').toString().trim();
  return value.isEmpty ? 'Card' : value;
}

String _setLineForRow(Map<String, dynamic> row) {
  final setName = ((row['set_name'] ?? row['set_code']) ?? '')
      .toString()
      .trim();
  final number = (row['number'] ?? '').toString().trim();
  if (setName.isNotEmpty && number.isNotEmpty) {
    return '$setName #$number';
  }
  if (setName.isNotEmpty) {
    return setName;
  }
  if (number.isNotEmpty) {
    return '#$number';
  }
  return 'Vault card';
}

String _conditionForRow(Map<String, dynamic> row) {
  final value = (row['condition_label'] ?? '').toString().trim();
  return normalizeSaleConditionLabel(value);
}

String? _displayImageUrlForRow(Map<String, dynamic> row) {
  return normalizeDisplayImageUrl(row['photo_url']) ??
      resolveDisplayImageUrlFromRow(row);
}
