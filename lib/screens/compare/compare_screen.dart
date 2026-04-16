import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../models/ownership_state.dart';
import '../../services/identity/display_identity.dart';
import '../../services/public/compare_service.dart';
import '../../services/vault/ownership_resolver_adapter.dart';
import '../../widgets/ownership/ownership_signal.dart';

ResolvedDisplayIdentity _compareDisplayIdentity(ComparePublicCard card) {
  return resolveDisplayIdentityFromFields(
    name: card.name,
    variantKey: card.variantKey,
    printedIdentityModifier: card.printedIdentityModifier,
    setIdentityModel: card.setIdentityModel,
    setCode: card.setCode,
    number: card.number == '—' ? null : card.number,
  );
}

class CompareScreen extends StatefulWidget {
  const CompareScreen({super.key});

  @override
  State<CompareScreen> createState() => _CompareScreenState();
}

class _CompareScreenState extends State<CompareScreen> {
  final SupabaseClient _client = Supabase.instance.client;
  final OwnershipResolverAdapter _ownershipAdapter =
      OwnershipResolverAdapter.instance;
  String? _referenceGvId;
  bool _showDifferencesOnly = false;
  int _gridColumns = 2;

  bool get _hasSignedInViewer =>
      (_client.auth.currentUser?.id ?? '').trim().isNotEmpty;

  Future<void> _primeOwnership(Iterable<String> cardPrintIds) async {
    if (!_hasSignedInViewer) {
      return;
    }

    final normalizedIds = cardPrintIds
        .map((value) => value.trim())
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();
    if (normalizedIds.isEmpty) {
      return;
    }

    // PERFORMANCE_P4_COMPARE_SYNC_OWNERSHIP
    // Compare cards render ownership from precomputed snapshot state.
    try {
      await _ownershipAdapter.primeBatch(normalizedIds);
    } catch (error) {
      debugPrint('Compare ownership prime failed: $error');
    }
  }

  Future<List<ComparePublicCard>> _loadCompareCards(List<String> gvIds) async {
    final cards = await PublicCompareService.fetchCardsByGvIds(
      client: _client,
      gvIds: gvIds,
    );
    await _primeOwnership(cards.map((card) => card.id));
    return cards;
  }

  @override
  Widget build(BuildContext context) {
    final compare = CompareCardSelectionController.instance;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Compare'),
        actions: [
          ValueListenableBuilder<List<String>>(
            valueListenable: compare.listenable,
            builder: (context, selectedIds, _) {
              return IconButton(
                tooltip: 'Clear compare',
                onPressed: selectedIds.isEmpty ? null : compare.clear,
                icon: const Icon(Icons.clear_all_rounded),
              );
            },
          ),
        ],
      ),
      body: ValueListenableBuilder<List<String>>(
        valueListenable: compare.listenable,
        builder: (context, selectedIds, _) {
          final normalizedIds = normalizeCompareCardIds(selectedIds);

          return FutureBuilder<List<ComparePublicCard>>(
            future: _loadCompareCards(normalizedIds),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              if (snapshot.hasError) {
                return _CompareScaffoldBody(
                  child: _CompareSurfaceCard(
                    child: _CompareEmptyState(
                      title: 'Unable to load compare workspace',
                      body: '${snapshot.error}',
                    ),
                  ),
                );
              }

              final cards = snapshot.data ?? const <ComparePublicCard>[];
              final ownershipByCardPrintId = _hasSignedInViewer
                  ? _ownershipAdapter.snapshotForIds(
                      cards.map((card) => card.id),
                    )
                  : const <String, OwnershipState>{};
              final referenceCard = _resolveReferenceCard(cards);
              final clampedGridColumns = _gridColumns.clamp(
                1,
                cards.isEmpty ? 1 : cards.length,
              );

              if (cards.length < kMinCompareCards) {
                return _CompareScaffoldBody(
                  child: _CompareUnderfilledState(cards: cards),
                );
              }

              return _CompareScaffoldBody(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _CompareSurfaceCard(
                      emphasize: true,
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Compare'.toUpperCase(),
                            style: Theme.of(context).textTheme.labelMedium
                                ?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 1.1,
                                  color: Theme.of(context).colorScheme.onSurface
                                      .withValues(alpha: 0.58),
                                ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Card comparison',
                            style: Theme.of(context).textTheme.headlineSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.5,
                                ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Compare cards side by side, pin a reference, and focus on what changes.',
                            style: Theme.of(context).textTheme.bodyMedium
                                ?.copyWith(
                                  color: Theme.of(context).colorScheme.onSurface
                                      .withValues(alpha: 0.72),
                                  height: 1.45,
                                ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    _CompareControlCard(
                      visibleGridColumns: clampedGridColumns,
                      cardCount: cards.length,
                      showDifferencesOnly: _showDifferencesOnly,
                      onGridColumnsChanged: (value) {
                        setState(() {
                          _gridColumns = value;
                        });
                      },
                      onToggleDifferencesOnly: () {
                        setState(() {
                          _showDifferencesOnly = !_showDifferencesOnly;
                        });
                      },
                      onClear: compare.clear,
                    ),
                    const SizedBox(height: 20),
                    _CompareCardPreviewGrid(
                      cards: cards,
                      columns: clampedGridColumns,
                      referenceGvId: referenceCard.gvId,
                      ownershipStateForCard: (card) =>
                          ownershipByCardPrintId[card.id.trim()] ??
                          _ownershipAdapter.peek(card.id),
                      onReferenceChanged: (gvId) {
                        setState(() {
                          _referenceGvId = gvId;
                        });
                      },
                    ),
                    const SizedBox(height: 20),
                    ..._buildAttributeSections(
                      context: context,
                      cards: cards,
                      referenceCard: referenceCard,
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }

  ComparePublicCard _resolveReferenceCard(List<ComparePublicCard> cards) {
    if (cards.isEmpty) {
      return const ComparePublicCard(id: '', gvId: '', name: '', number: '');
    }

    final reference = cards.where((card) => card.gvId == _referenceGvId);
    if (reference.isNotEmpty) {
      return reference.first;
    }

    return cards.first;
  }

  List<Widget> _buildAttributeSections({
    required BuildContext context,
    required List<ComparePublicCard> cards,
    required ComparePublicCard referenceCard,
  }) {
    final sections = <_AttributeSection>[
      const _AttributeSection(
        title: 'Identity',
        rows: [
          _AttributeRow(key: 'set', label: 'Set'),
          _AttributeRow(key: 'number', label: 'Number'),
          _AttributeRow(key: 'rarity', label: 'Rarity'),
          _AttributeRow(key: 'variant', label: 'Variant'),
          _AttributeRow(key: 'price', label: 'Grookai Value'),
        ],
      ),
      const _AttributeSection(
        title: 'Art',
        rows: [_AttributeRow(key: 'artist', label: 'Illustrator')],
      ),
      const _AttributeSection(
        title: 'Release',
        rows: [
          _AttributeRow(key: 'release', label: 'Release Year'),
          _AttributeRow(key: 'set_code', label: 'Set Code'),
          _AttributeRow(key: 'gv_id', label: 'GV-ID'),
        ],
      ),
    ];

    final widgets = <Widget>[];
    for (final section in sections) {
      final visibleRows = section.rows.where((row) {
        if (!_showDifferencesOnly) {
          return true;
        }

        final referenceValue = _formatAttribute(referenceCard, row.key);
        return cards.any(
          (card) => _formatAttribute(card, row.key) != referenceValue,
        );
      }).toList();

      if (visibleRows.isEmpty) {
        continue;
      }

      widgets.add(
        _CompareSectionCard(
          title: section.title,
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              headingRowHeight: 44,
              dataRowMinHeight: 52,
              dataRowMaxHeight: 70,
              columns: [
                const DataColumn(label: Text('Attribute')),
                ...cards.map(
                  (card) => DataColumn(
                    label: Text(_compareDisplayIdentity(card).displayName),
                  ),
                ),
              ],
              rows: visibleRows.map((row) {
                return DataRow(
                  cells: [
                    DataCell(Text(row.label)),
                    ...cards.map((card) {
                      final matchesReference =
                          _formatAttribute(card, row.key) ==
                          _formatAttribute(referenceCard, row.key);
                      final value = _formatAttribute(card, row.key);

                      return DataCell(
                        Text(
                          value,
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(
                                fontWeight: matchesReference
                                    ? FontWeight.w500
                                    : FontWeight.w700,
                                color: matchesReference
                                    ? Theme.of(context).colorScheme.onSurface
                                          .withValues(alpha: 0.82)
                                    : Theme.of(context).colorScheme.primary,
                              ),
                        ),
                      );
                    }),
                  ],
                );
              }).toList(),
            ),
          ),
        ),
      );
      widgets.add(const SizedBox(height: 20));
    }

    if (widgets.isNotEmpty) {
      widgets.removeLast();
    }

    return widgets;
  }

  String _formatAttribute(ComparePublicCard card, String key) {
    switch (key) {
      case 'set':
        return (card.setName ?? '').isEmpty ? '—' : card.setName!;
      case 'number':
        return card.number.isEmpty ? '—' : card.number;
      case 'rarity':
        return (card.rarity ?? '').isEmpty ? '—' : card.rarity!;
      case 'variant':
        return (card.variantLabel ?? '').isEmpty ? '—' : card.variantLabel!;
      case 'price':
        return card.rawPrice == null
            ? '—'
            : '\$${card.rawPrice!.toStringAsFixed(2)}';
      case 'artist':
        return (card.artist ?? '').isEmpty ? '—' : card.artist!;
      case 'release':
        return card.releaseYear == null ? '—' : '${card.releaseYear}';
      case 'set_code':
        return (card.setCode ?? '').isEmpty ? '—' : card.setCode!.toUpperCase();
      case 'gv_id':
        return card.gvId;
      default:
        return '—';
    }
  }
}

class _CompareScaffoldBody extends StatelessWidget {
  const _CompareScaffoldBody({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
        children: [child],
      ),
    );
  }
}

class _CompareSurfaceCard extends StatelessWidget {
  const _CompareSurfaceCard({
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.emphasize = false,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: emphasize ? 0.22 : 0.14),
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(
              alpha: emphasize ? 0.08 : 0.05,
            ),
            blurRadius: emphasize ? 28 : 22,
            offset: Offset(0, emphasize ? 14 : 10),
          ),
        ],
      ),
      padding: padding,
      child: child,
    );
  }
}

class _CompareUnderfilledState extends StatelessWidget {
  const _CompareUnderfilledState({required this.cards});

  final List<ComparePublicCard> cards;

  @override
  Widget build(BuildContext context) {
    final compare = CompareCardSelectionController.instance;
    final selectedIds = compare.selectedIds;
    final missingCount = (kMinCompareCards - cards.length).clamp(0, 4);
    final title = cards.isEmpty ? 'Pick cards to compare' : 'Add one more card';
    final body = cards.isEmpty
        ? 'Select at least two cards from Explore, Sets, or a card page to open the compare workspace.'
        : 'You have ${cards.length} selected. Add $missingCount more card${missingCount == 1 ? '' : 's'} to compare side by side.';

    return _CompareSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            body,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.72),
              height: 1.45,
            ),
          ),
          if (selectedIds.isNotEmpty) ...[
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: selectedIds
                  .map(
                    (gvId) => Chip(
                      label: Text(gvId),
                      onDeleted: () => compare.toggle(gvId),
                    ),
                  )
                  .toList(),
            ),
          ],
        ],
      ),
    );
  }
}

class _CompareControlCard extends StatelessWidget {
  const _CompareControlCard({
    required this.visibleGridColumns,
    required this.cardCount,
    required this.showDifferencesOnly,
    required this.onGridColumnsChanged,
    required this.onToggleDifferencesOnly,
    required this.onClear,
  });

  final int visibleGridColumns;
  final int cardCount;
  final bool showDifferencesOnly;
  final ValueChanged<int> onGridColumnsChanged;
  final VoidCallback onToggleDifferencesOnly;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    return _CompareSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Workspace controls',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 14),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (var count = 1; count <= 4; count++) ...[
                  ChoiceChip(
                    label: Text('$count'),
                    selected: visibleGridColumns == count,
                    onSelected: count <= cardCount
                        ? (_) => onGridColumnsChanged(count)
                        : null,
                  ),
                  if (count < 4) const SizedBox(width: 8),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            value: showDifferencesOnly,
            title: const Text('Show only differences'),
            onChanged: (_) => onToggleDifferencesOnly(),
          ),
          const SizedBox(height: 6),
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton.icon(
              onPressed: onClear,
              icon: const Icon(Icons.clear_all_rounded),
              label: const Text('Clear compare'),
            ),
          ),
        ],
      ),
    );
  }
}

class _CompareCardPreviewGrid extends StatelessWidget {
  const _CompareCardPreviewGrid({
    required this.cards,
    required this.columns,
    required this.referenceGvId,
    required this.ownershipStateForCard,
    required this.onReferenceChanged,
  });

  final List<ComparePublicCard> cards;
  final int columns;
  final String referenceGvId;
  final OwnershipState? Function(ComparePublicCard card) ownershipStateForCard;
  final ValueChanged<String> onReferenceChanged;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: cards.length,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: columns,
        crossAxisSpacing: 14,
        mainAxisSpacing: 14,
        childAspectRatio: 0.74,
      ),
      itemBuilder: (context, index) {
        final card = cards[index];
        final isReference = card.gvId == referenceGvId;
        final ownershipState = ownershipStateForCard(card);
        final displayIdentity = _compareDisplayIdentity(card);

        return _CompareSurfaceCard(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: InkWell(
                  borderRadius: BorderRadius.circular(18),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => CardDetailScreen(
                          cardPrintId: card.id,
                          gvId: card.gvId,
                          name: card.name,
                          setName: card.setName,
                          setCode: card.setCode,
                          number: card.number,
                          rarity: card.rarity,
                          imageUrl: card.imageUrl,
                        ),
                      ),
                    );
                  },
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(18),
                      color: Theme.of(context)
                          .colorScheme
                          .surfaceContainerHighest
                          .withValues(alpha: 0.45),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: card.imageUrl == null
                        ? Center(
                            child: Icon(
                              Icons.style_outlined,
                              color: Theme.of(
                                context,
                              ).colorScheme.onSurface.withValues(alpha: 0.36),
                            ),
                          )
                        : Image.network(
                            card.imageUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                Center(
                                  child: Icon(
                                    Icons.style_outlined,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withValues(alpha: 0.36),
                                  ),
                                ),
                          ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              if (isReference)
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade100,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    'Reference',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: Colors.amber.shade900,
                    ),
                  ),
                ),
              Text(
                displayIdentity.displayName,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                card.setName ?? 'Unknown set',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.72),
                ),
              ),
              const SizedBox(height: 6),
              SizedBox(
                height: 24,
                child: OwnershipSignal(
                  ownershipState: ownershipState,
                  variant: OwnershipSignalVariant.badge,
                  backgroundColor: Theme.of(
                    context,
                  ).colorScheme.surfaceContainerHighest.withValues(alpha: 0.42),
                  textStyle: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.66),
                    fontWeight: FontWeight.w700,
                  ),
                  labelBuilder: (state) => state.ownedCount > 1
                      ? '${state.ownedCount} copies'
                      : 'In Vault',
                ),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: () => onReferenceChanged(card.gvId),
                child: Text(isReference ? 'Reference' : 'Pin as reference'),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _CompareSectionCard extends StatelessWidget {
  const _CompareSectionCard({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return _CompareSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: -0.2,
            ),
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

class _CompareEmptyState extends StatelessWidget {
  const _CompareEmptyState({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        Text(
          body,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.72),
            height: 1.45,
          ),
        ),
      ],
    );
  }
}

class _AttributeSection {
  const _AttributeSection({required this.title, required this.rows});

  final String title;
  final List<_AttributeRow> rows;
}

class _AttributeRow {
  const _AttributeRow({required this.key, required this.label});

  final String key;
  final String label;
}
