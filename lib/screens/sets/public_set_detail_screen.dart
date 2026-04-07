import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../services/public/compare_service.dart';
import '../../services/public/public_sets_service.dart';
import '../../widgets/card_surface_artwork.dart';
import '../../widgets/card_surface_price.dart';
import '../../widgets/card_view_mode.dart';

class PublicSetDetailScreen extends StatefulWidget {
  const PublicSetDetailScreen({required this.setCode, super.key});

  final String setCode;

  @override
  State<PublicSetDetailScreen> createState() => _PublicSetDetailScreenState();
}

class _PublicSetDetailScreenState extends State<PublicSetDetailScreen> {
  final SupabaseClient _client = Supabase.instance.client;
  bool _loading = true;
  String? _error;
  PublicSetDetail? _detail;
  AppCardViewMode _viewMode = AppCardViewMode.grid;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final detail = await PublicSetsService.fetchSetDetail(
        client: _client,
        setCode: widget.setCode,
      );

      if (!mounted) {
        return;
      }

      if (detail == null) {
        setState(() {
          _error = 'This set could not be found.';
          _detail = null;
        });
      } else {
        setState(() {
          _detail = detail;
        });
      }
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _error = error is Error ? error.toString() : 'Unable to load set.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final detail = _detail;

    return Scaffold(
      appBar: AppBar(
        title: Text(detail?.summary.name ?? widget.setCode.toUpperCase()),
        actions: [
          IconButton(
            tooltip: 'Reload',
            onPressed: _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
            children: [
              if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 36),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_error != null)
                _SetDetailSurfaceCard(
                  child: _SetDetailEmptyState(
                    title: 'Unable to load set',
                    body: _error!,
                  ),
                )
              else if (detail != null) ...[
                _SetDetailSurfaceCard(
                  emphasize: true,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Public Set'.toUpperCase(),
                        style: Theme.of(context).textTheme.labelMedium
                            ?.copyWith(
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1.1,
                              color: Theme.of(
                                context,
                              ).colorScheme.onSurface.withValues(alpha: 0.58),
                            ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        detail.summary.name,
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.5,
                            ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        [
                          detail.summary.code.toUpperCase(),
                          if (detail.summary.releaseYear != null)
                            '${detail.summary.releaseYear}',
                          if (detail.summary.printedTotal != null)
                            '${detail.summary.printedTotal} cards',
                        ].join(' • '),
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(
                            context,
                          ).colorScheme.onSurface.withValues(alpha: 0.72),
                          height: 1.45,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                _SetDetailSurfaceCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Set cards',
                              style: Theme.of(context).textTheme.titleLarge
                                  ?.copyWith(
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: -0.2,
                                  ),
                            ),
                          ),
                          SharedCardViewModeButton(
                            value: _viewMode,
                            onChanged: (mode) {
                              setState(() {
                                _viewMode = mode;
                              });
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${detail.summary.cardCount} cards in this set.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(
                            context,
                          ).colorScheme.onSurface.withValues(alpha: 0.72),
                          height: 1.45,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                if (detail.cards.isEmpty)
                  const _SetDetailSurfaceCard(
                    child: _SetDetailEmptyState(
                      title: 'No cards yet',
                      body: 'No public cards were returned for this set.',
                    ),
                  )
                else if (_viewMode == AppCardViewMode.grid)
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: detail.cards.length,
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: resolveSharedCardGridColumns(
                        context,
                        horizontalPadding: 32,
                        minTileWidth: 102,
                      ),
                      mainAxisSpacing: 10,
                      crossAxisSpacing: 10,
                      childAspectRatio: 0.68,
                    ),
                    itemBuilder: (context, index) =>
                        _SetCardGridTile(card: detail.cards[index]),
                  )
                else
                  ...detail.cards.map(
                    (card) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _SetCardTile(
                        card: card,
                        compact: _viewMode == AppCardViewMode.compactList,
                      ),
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

class _SetDetailSurfaceCard extends StatelessWidget {
  const _SetDetailSurfaceCard({
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

class _SetCardTile extends StatelessWidget {
  const _SetCardTile({required this.card, this.compact = false});

  final PublicSetCard card;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final compare = CompareCardSelectionController.instance;
    final inCompare = compare.contains(card.gvId);
    final subtitleParts = <String>[
      '#${card.number}',
      if ((card.rarity ?? '').isNotEmpty) card.rarity!,
    ];

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => CardDetailScreen(
                cardPrintId: card.cardPrintId,
                gvId: card.gvId,
                name: card.name,
                number: card.number,
                rarity: card.rarity,
                imageUrl: card.imageUrl,
              ),
            ),
          );
        },
        child: Container(
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(compact ? 18 : 22),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.14),
            ),
            boxShadow: [
              BoxShadow(
                color: colorScheme.shadow.withValues(alpha: 0.04),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          padding: EdgeInsets.all(compact ? 10 : 14),
          child: Row(
            children: [
              _SetCardArtwork(card: card, compact: compact),
              SizedBox(width: compact ? 10 : 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      card.name,
                      maxLines: compact ? 1 : 2,
                      overflow: TextOverflow.ellipsis,
                      style:
                          (compact
                                  ? theme.textTheme.bodySmall
                                  : theme.textTheme.titleMedium)
                              ?.copyWith(
                                fontWeight: FontWeight.w700,
                                height: 1.18,
                              ),
                    ),
                    SizedBox(height: compact ? 4 : 6),
                    Text(
                      subtitleParts.join(' • '),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.72),
                        fontSize: compact ? 11.5 : null,
                      ),
                    ),
                    if (card.pricing?.hasVisibleValue == true) ...[
                      SizedBox(height: compact ? 4 : 6),
                      CardSurfacePricePill(
                        pricing: card.pricing,
                        size: compact
                            ? CardSurfacePriceSize.dense
                            : CardSurfacePriceSize.list,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              ValueListenableBuilder<List<String>>(
                valueListenable: compare.listenable,
                builder: (context, selectedIds, child) {
                  final selected = compare.contains(card.gvId);
                  return IconButton(
                    tooltip: selected
                        ? 'Remove from compare'
                        : 'Add to compare',
                    onPressed: () {
                      compare.toggle(card.gvId);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            selected
                                ? 'Removed from compare'
                                : 'Added to compare',
                          ),
                        ),
                      );
                    },
                    icon: Icon(
                      selected
                          ? Icons.compare_arrows_rounded
                          : Icons.addchart_rounded,
                      color: selected ? colorScheme.primary : null,
                    ),
                  );
                },
              ),
              if (!inCompare)
                Icon(
                  Icons.chevron_right_rounded,
                  color: colorScheme.onSurface.withValues(alpha: 0.38),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SetCardArtwork extends StatelessWidget {
  const _SetCardArtwork({required this.card, this.compact = false});

  final PublicSetCard card;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return CardSurfaceArtwork(
      label: card.name,
      imageUrl: card.imageUrl,
      width: compact ? 58 : 72,
      height: compact ? 80 : 96,
      borderRadius: 16,
      padding: const EdgeInsets.all(4),
    );
  }
}

class _SetCardGridTile extends StatelessWidget {
  const _SetCardGridTile({required this.card});

  final PublicSetCard card;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final compare = CompareCardSelectionController.instance;
    final subtitle = [
      '#${card.number}',
      if ((card.rarity ?? '').isNotEmpty) card.rarity!,
    ].join(' • ');

    return Material(
      color: colorScheme.surface,
      borderRadius: BorderRadius.circular(15),
      child: InkWell(
        borderRadius: BorderRadius.circular(15),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => CardDetailScreen(
                cardPrintId: card.cardPrintId,
                gvId: card.gvId,
                name: card.name,
                number: card.number,
                rarity: card.rarity,
                imageUrl: card.imageUrl,
              ),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.fromLTRB(7, 7, 7, 6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: CardSurfaceArtwork(
                        label: card.name,
                        imageUrl: card.imageUrl,
                        borderRadius: 12,
                        padding: const EdgeInsets.all(2.5),
                      ),
                    ),
                    Positioned(
                      right: 4,
                      top: 4,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: colorScheme.surface.withValues(alpha: 0.92),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: ValueListenableBuilder<List<String>>(
                          valueListenable: compare.listenable,
                          builder: (context, selectedIds, child) {
                            final selected = compare.contains(card.gvId);
                            return IconButton(
                              tooltip: selected
                                  ? 'Remove from compare'
                                  : 'Add to compare',
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints.tightFor(
                                width: 24,
                                height: 24,
                              ),
                              visualDensity: VisualDensity.compact,
                              onPressed: () => compare.toggle(card.gvId),
                              icon: Icon(
                                selected
                                    ? Icons.check_circle_rounded
                                    : Icons.add_circle_outline_rounded,
                                size: 16,
                                color: selected ? colorScheme.primary : null,
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 6),
              Text(
                card.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  height: 1.05,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.68),
                  fontSize: 10.4,
                ),
              ),
              if (card.pricing?.hasVisibleValue == true) ...[
                const SizedBox(height: 4),
                CardSurfacePricePill(
                  pricing: card.pricing,
                  size: CardSurfacePriceSize.grid,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _SetDetailEmptyState extends StatelessWidget {
  const _SetDetailEmptyState({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          body,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.72),
            height: 1.45,
          ),
        ),
      ],
    );
  }
}
