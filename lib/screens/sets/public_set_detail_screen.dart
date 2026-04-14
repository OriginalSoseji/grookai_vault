import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../models/ownership_state.dart';
import '../../services/public/compare_service.dart';
import '../../services/public/public_sets_service.dart';
import '../../services/vault/ownership_resolver_adapter.dart';
import '../../widgets/card_surface_artwork.dart';
import '../../widgets/ownership/ownership_signal.dart';
import '../../widgets/card_surface_price.dart';
import '../../widgets/card_view_mode.dart';
import '../../widgets/card_zoom_viewer.dart';

class PublicSetDetailScreen extends StatefulWidget {
  const PublicSetDetailScreen({required this.setCode, super.key});

  final String setCode;

  @override
  State<PublicSetDetailScreen> createState() => _PublicSetDetailScreenState();
}

class _PublicSetDetailScreenState extends State<PublicSetDetailScreen> {
  final SupabaseClient _client = Supabase.instance.client;
  final OwnershipResolverAdapter _ownershipAdapter =
      OwnershipResolverAdapter.instance;
  Map<String, OwnershipState> _ownershipByCardPrintId =
      <String, OwnershipState>{};
  bool _loading = true;
  String? _error;
  PublicSetDetail? _detail;
  AppCardViewMode _viewMode = AppCardViewMode.grid;

  bool get _hasSignedInViewer =>
      (_client.auth.currentUser?.id ?? '').trim().isNotEmpty;

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
      final ownershipByCardPrintId = await _primeOwnership(
        detail?.cards.map((card) => card.cardPrintId) ?? const <String>[],
      );

      if (!mounted) {
        return;
      }

      if (detail == null) {
        setState(() {
          _error = 'This set could not be found.';
          _detail = null;
          _ownershipByCardPrintId = <String, OwnershipState>{};
        });
      } else {
        setState(() {
          _detail = detail;
          _ownershipByCardPrintId = ownershipByCardPrintId;
        });
      }
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _error = error is Error ? error.toString() : 'Unable to load set.';
        _ownershipByCardPrintId = <String, OwnershipState>{};
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<Map<String, OwnershipState>> _primeOwnership(
    Iterable<String> cardPrintIds,
  ) async {
    if (!_hasSignedInViewer) {
      return <String, OwnershipState>{};
    }

    final normalizedIds = cardPrintIds
        .map((value) => value.trim())
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();
    if (normalizedIds.isEmpty) {
      return <String, OwnershipState>{};
    }

    // PERFORMANCE_P4_SET_DETAIL_SYNC_OWNERSHIP
    // Set detail tiles render ownership from precomputed snapshot state.
    try {
      await _ownershipAdapter.primeBatch(normalizedIds);
    } catch (error) {
      debugPrint('Set detail ownership prime failed: $error');
    }
    return _ownershipAdapter.snapshotForIds(normalizedIds);
  }

  OwnershipState? _ownershipStateForCard(PublicSetCard card) {
    if (!_hasSignedInViewer) {
      return null;
    }
    final cardPrintId = card.cardPrintId.trim();
    if (cardPrintId.isEmpty) {
      return null;
    }
    return _ownershipByCardPrintId[cardPrintId] ??
        _ownershipAdapter.peek(cardPrintId);
  }

  Future<void> _openSetGallery(int initialIndex) async {
    final detail = _detail;
    if (detail == null || detail.cards.isEmpty) {
      return;
    }

    final galleryItems = detail.cards
        .map(
          (card) => CardZoomGalleryItem(
            label: '#${card.number} • ${_setCardGalleryLabel(card)}',
            imageUrl: card.imageUrl,
          ),
        )
        .toList(growable: false);

    await showCardImageGallery(
      context,
      items: galleryItems,
      initialIndex: initialIndex,
    );
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
            padding: const EdgeInsets.fromLTRB(10, 10, 10, 22),
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
                Padding(
                  padding: const EdgeInsets.fromLTRB(2, 2, 2, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        detail.summary.name,
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.55,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        [
                          detail.summary.code.toUpperCase(),
                          if (detail.summary.releaseYear != null)
                            '${detail.summary.releaseYear}',
                          if (detail.summary.printedTotal != null)
                            '${detail.summary.printedTotal} cards',
                        ].join(' • '),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(
                            context,
                          ).colorScheme.onSurface.withValues(alpha: 0.66),
                          height: 1.3,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${detail.summary.cardCount} cards',
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: Theme.of(
                            context,
                          ).colorScheme.onSurface.withValues(alpha: 0.72),
                          fontWeight: FontWeight.w700,
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
                const SizedBox(height: 10),
                if (detail.cards.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
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
                      crossAxisCount: MediaQuery.sizeOf(context).width >= 860
                          ? 4
                          : MediaQuery.sizeOf(context).width >= 620
                          ? 3
                          : 2,
                      mainAxisSpacing: 6,
                      crossAxisSpacing: 6,
                      childAspectRatio: 0.69,
                    ),
                    itemBuilder: (context, index) => _SetCardGridTile(
                      card: detail.cards[index],
                      ownershipState: _ownershipStateForCard(
                        detail.cards[index],
                      ),
                      onOpenViewer: () => _openSetGallery(index),
                    ),
                  )
                else ...[
                  for (var index = 0; index < detail.cards.length; index += 1)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: _SetCardTile(
                        card: detail.cards[index],
                        compact: _viewMode == AppCardViewMode.compactList,
                        ownershipState: _ownershipStateForCard(
                          detail.cards[index],
                        ),
                        onOpenViewer: () => _openSetGallery(index),
                      ),
                    ),
                ],
              ],
            ],
          ),
        ),
      ),
    );
  }
}

String? _setCardVariantLabel(PublicSetCard card) {
  final raw = (card.variantKey ?? '').trim();
  if (raw.isEmpty || raw.toLowerCase() == 'base') {
    return null;
  }

  switch (raw.toLowerCase()) {
    case 'pokemon_together_stamp':
      return 'Pokémon Together Stamp';
    default:
      return raw
          .split(RegExp(r'[_\s-]+'))
          .where((segment) => segment.isNotEmpty)
          .map((segment) {
            final lower = segment.toLowerCase();
            if (lower.length <= 2) {
              return lower.toUpperCase();
            }
            return '${lower[0].toUpperCase()}${lower.substring(1)}';
          })
          .join(' ');
  }
}

String _setCardArtworkLabel(PublicSetCard card) {
  final variantLabel = _setCardVariantLabel(card);
  return variantLabel == null ? card.name : '${card.name}\n$variantLabel';
}

String _setCardGalleryLabel(PublicSetCard card) {
  final variantLabel = _setCardVariantLabel(card);
  return variantLabel == null ? card.name : '${card.name} • $variantLabel';
}

class _SetDetailSurfaceCard extends StatelessWidget {
  const _SetDetailSurfaceCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface.withValues(alpha: 0.82),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.10)),
      ),
      padding: const EdgeInsets.all(16),
      child: child,
    );
  }
}

class _SetCardTile extends StatelessWidget {
  const _SetCardTile({
    required this.card,
    this.compact = false,
    this.ownershipState,
    this.onOpenViewer,
  });

  final PublicSetCard card;
  final bool compact;
  final OwnershipState? ownershipState;
  final VoidCallback? onOpenViewer;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final compare = CompareCardSelectionController.instance;
    final variantLabel = _setCardVariantLabel(card);
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
            color: colorScheme.surface.withValues(alpha: 0.72),
            borderRadius: BorderRadius.circular(compact ? 18 : 20),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.08),
            ),
          ),
          padding: EdgeInsets.all(compact ? 9 : 10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _SetCardArtwork(
                card: card,
                compact: compact,
                onOpenViewer: onOpenViewer,
              ),
              SizedBox(width: compact ? 10 : 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      card.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style:
                          (compact
                                  ? theme.textTheme.bodySmall
                                  : theme.textTheme.titleMedium)
                              ?.copyWith(
                                fontWeight: FontWeight.w800,
                                height: 1.08,
                              ),
                    ),
                    if (variantLabel != null) ...[
                      SizedBox(height: compact ? 3 : 4),
                      Text(
                        variantLabel,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: colorScheme.primary.withValues(alpha: 0.90),
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.1,
                        ),
                      ),
                    ],
                    SizedBox(height: compact ? 4 : 5),
                    SizedBox(
                      height: 18,
                      child: Text(
                        subtitleParts.join(' • '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.62),
                          fontSize: compact ? 11.1 : 11.6,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    SizedBox(height: compact ? 5 : 6),
                    SizedBox(
                      height: 22,
                      child: CardSurfacePricePill(
                        pricing: card.pricing,
                        size: compact
                            ? CardSurfacePriceSize.dense
                            : CardSurfacePriceSize.list,
                      ),
                    ),
                    SizedBox(height: compact ? 4 : 5),
                    SizedBox(
                      height: 16,
                      child: OwnershipSignal(
                        ownershipState: ownershipState,
                        textStyle: theme.textTheme.labelSmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.56),
                          fontWeight: FontWeight.w700,
                        ),
                        labelBuilder: (state) => state.ownedCount > 1
                            ? '${state.ownedCount} copies'
                            : 'In Vault',
                      ),
                    ),
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
                      size: 18,
                      color: selected
                          ? colorScheme.primary
                          : colorScheme.onSurface.withValues(alpha: 0.46),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SetCardArtwork extends StatelessWidget {
  const _SetCardArtwork({
    required this.card,
    this.compact = false,
    this.onOpenViewer,
  });

  final PublicSetCard card;
  final bool compact;
  final VoidCallback? onOpenViewer;

  @override
  Widget build(BuildContext context) {
    return CardSurfaceArtwork(
      label: _setCardArtworkLabel(card),
      imageUrl: card.imageUrl,
      width: compact ? 68 : 86,
      height: compact ? 94 : 118,
      borderRadius: 18,
      padding: const EdgeInsets.all(1.5),
      onTapToZoom: onOpenViewer,
    );
  }
}

class _SetCardGridTile extends StatelessWidget {
  const _SetCardGridTile({
    required this.card,
    this.ownershipState,
    this.onOpenViewer,
  });

  final PublicSetCard card;
  final OwnershipState? ownershipState;
  final VoidCallback? onOpenViewer;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final compare = CompareCardSelectionController.instance;
    final variantLabel = _setCardVariantLabel(card);

    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                children: [
                  Positioned.fill(
                    child: CardSurfaceArtwork(
                      // SET_BIG_MODE_PREV_NEXT_V1
                      // Fullscreen set viewer now preserves current browse
                      // ordering and supports previous/next swipe navigation.
                      label: _setCardArtworkLabel(card),
                      imageUrl: card.imageUrl,
                      borderRadius: 18,
                      padding: const EdgeInsets.all(1.5),
                      backgroundColor: colorScheme.surfaceContainerLow
                          .withValues(alpha: 0.52),
                      onTapToZoom: onOpenViewer,
                    ),
                  ),
                  if (variantLabel != null)
                    Positioned(
                      left: 5,
                      top: 5,
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 106),
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: colorScheme.surface.withValues(alpha: 0.90),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: colorScheme.primary.withValues(
                                alpha: 0.18,
                              ),
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 7,
                              vertical: 5,
                            ),
                            child: Text(
                              variantLabel,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.labelSmall
                                  ?.copyWith(
                                    color: colorScheme.primary.withValues(
                                      alpha: 0.92,
                                    ),
                                    fontWeight: FontWeight.w800,
                                    height: 1.05,
                                  ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  Positioned(
                    right: 5,
                    top: 5,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: colorScheme.surface.withValues(alpha: 0.84),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: colorScheme.outline.withValues(alpha: 0.06),
                        ),
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
                              width: 22,
                              height: 22,
                            ),
                            visualDensity: VisualDensity.compact,
                            onPressed: () => compare.toggle(card.gvId),
                            icon: Icon(
                              selected
                                  ? Icons.check_circle_rounded
                                  : Icons.add_circle_outline_rounded,
                              size: 15,
                              color: selected
                                  ? colorScheme.primary
                                  : colorScheme.onSurface.withValues(
                                      alpha: 0.48,
                                    ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  Positioned(
                    left: 5,
                    bottom: 5,
                    child: OwnershipSignal(
                      ownershipState: ownershipState,
                      variant: OwnershipSignalVariant.badge,
                      backgroundColor: colorScheme.surface.withValues(
                        alpha: 0.88,
                      ),
                      borderColor: colorScheme.outline.withValues(alpha: 0.08),
                      textStyle: Theme.of(context).textTheme.labelSmall
                          ?.copyWith(
                            color: colorScheme.onSurface.withValues(
                              alpha: 0.68,
                            ),
                            fontWeight: FontWeight.w700,
                          ),
                      labelBuilder: (state) => state.ownedCount > 1
                          ? '${state.ownedCount} copies'
                          : 'In Vault',
                    ),
                  ),
                ],
              ),
            ),
          ],
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
