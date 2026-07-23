import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../models/ownership_state.dart';
import '../../services/identity/display_identity.dart';
import '../../services/identity/image_presentation.dart';
import '../../services/public/compare_service.dart';
import '../../services/public/public_sets_service.dart';
import '../../services/vault/ownership_resolver_adapter.dart';
import '../../theme/gv_grid_constants.dart';
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

  void _openCardDetails(PublicSetCard card) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CardDetailScreen(
          cardPrintId: card.cardPrintId,
          gvId: card.gvId,
          name: card.name,
          number: card.number,
          rarity: card.rarity,
          imageUrl: card.catalogImageUrl,
          fallbackImageUrl: card.providerFallbackImageUrl,
        ),
      ),
    );
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
            imageUrl: card.catalogImageUrl,
            fallbackImageUrl: card.providerFallbackImageUrl,
            onViewDetails: () => _openCardDetails(card),
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
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            cacheExtent: 320,
            slivers: _buildBodySlivers(context, detail),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildBodySlivers(
    BuildContext context,
    PublicSetDetail? detail,
  ) {
    if (_loading) {
      return const <Widget>[
        SliverPadding(
          padding: EdgeInsets.fromLTRB(10, 10, 10, 22),
          sliver: SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 36),
              child: Center(child: CircularProgressIndicator()),
            ),
          ),
        ),
      ];
    }

    if (_error != null) {
      return <Widget>[
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(10, 10, 10, 22),
          sliver: SliverToBoxAdapter(
            child: _SetDetailSurfaceCard(
              child: _SetDetailEmptyState(
                title: 'Unable to load set',
                body: _error!,
              ),
            ),
          ),
        ),
      ];
    }

    if (detail == null) {
      return const <Widget>[SliverToBoxAdapter(child: SizedBox.shrink())];
    }

    final headerChildren = <Widget>[
      Padding(
        padding: const EdgeInsets.fromLTRB(2, 2, 2, 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              detail.summary.name,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w800,
                letterSpacing: 0,
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
      _SetDetailMasterSetPanel(stats: detail.masterSetStats),
      const SizedBox(height: 10),
      if (detail.worldChampionshipDecklist != null) ...[
        _WorldChampionshipDecklistPanel(
          decklist: detail.worldChampionshipDecklist!,
        ),
        const SizedBox(height: 10),
      ],
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
          padding: EdgeInsets.only(top: 8, bottom: 22),
          child: _SetDetailEmptyState(
            title: 'No cards yet',
            body: 'No public cards were returned for this set.',
          ),
        ),
    ];

    final slivers = <Widget>[
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(10, 10, 10, 0),
        sliver: SliverList(delegate: SliverChildListDelegate(headerChildren)),
      ),
    ];
    if (detail.cards.isEmpty) {
      return slivers;
    }

    if (_viewMode == AppCardViewMode.grid) {
      slivers.add(
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(10, 0, 10, 22),
          sliver: SliverGrid(
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
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                final card = detail.cards[index];
                return _SetCardGridTile(
                  card: card,
                  ownershipState: _ownershipStateForCard(card),
                  onOpenViewer: () => _openSetGallery(index),
                );
              },
              childCount: detail.cards.length,
              addAutomaticKeepAlives: false,
            ),
          ),
        ),
      );
      return slivers;
    }

    slivers.add(
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(10, 0, 10, 14),
        sliver: SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final card = detail.cards[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _SetCardTile(
                  card: card,
                  compact: _viewMode == AppCardViewMode.compactList,
                  ownershipState: _ownershipStateForCard(card),
                  onOpenViewer: () => _openSetGallery(index),
                ),
              );
            },
            childCount: detail.cards.length,
            addAutomaticKeepAlives: false,
          ),
        ),
      ),
    );
    return slivers;
  }
}

ResolvedDisplayIdentity _setCardDisplayIdentity(PublicSetCard card) {
  return resolveDisplayIdentityFromFields(
    name: card.name,
    variantKey: card.variantKey,
    printedIdentityModifier: card.printedIdentityModifier,
    setIdentityModel: card.setIdentityModel,
  );
}

String? _setCardVariantLabel(PublicSetCard card) {
  return _setCardDisplayIdentity(card).suffix;
}

String _setCardArtworkLabel(PublicSetCard card) {
  return _setCardDisplayIdentity(card).displayName;
}

String _setCardGalleryLabel(PublicSetCard card) {
  return _setCardDisplayIdentity(card).displayName;
}

String _worldChampionshipDecklistBlurb(
  PublicWorldChampionshipDecklist decklist,
) {
  final yearLabel = decklist.deckYear == null
      ? 'World Championship'
      : '${decklist.deckYear} World Championship';
  final deckLabel = (decklist.deckName ?? '').trim().isEmpty
      ? 'deck'
      : '${decklist.deckName} deck';
  final playerLine = (decklist.playerName ?? '').trim().isEmpty
      ? ''
      : ' Player: ${decklist.playerName}.';

  return '$yearLabel decks preserve tournament lists from that year\'s top players. This $deckLabel is tracked as a replica list: Grookai stores one row per unique printed card, and the Qty column reconstructs the 60-card deck.$playerLine';
}

ResolvedImagePresentation _setCardImagePresentation(PublicSetCard card) {
  return resolveImagePresentationFromFields(
    imageUrl: card.imageUrl,
    representativeImageUrl: card.representativeImageUrl,
    displayImageUrl: card.displayImageUrl,
    displayImageKind: card.displayImageKind,
    imageStatus: card.imageStatus,
    imageNote: card.imageNote,
  );
}

class _SetDetailMasterSetPanel extends StatelessWidget {
  const _SetDetailMasterSetPanel({required this.stats});

  final PublicSetMasterSetStats stats;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final completionPercent = stats.completionPercent;

    return _SetDetailSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.grid_view_rounded,
                size: 19,
                color: colorScheme.primary,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Master Set',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Text(
                completionPercent == null
                    ? '${stats.variantOptionCount}'
                    : '$completionPercent%',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _SetMasterMetric(
                label: 'Prints',
                value: '${stats.parentPrintCount}',
              ),
              _SetMasterMetric(
                label: 'Options',
                value: '${stats.variantOptionCount}',
              ),
              _SetMasterMetric(
                label: 'Owned',
                value: stats.ownedVariantOptionCount == null
                    ? 'Sign in'
                    : '${stats.ownedVariantOptionCount}/${stats.variantOptionCount}',
              ),
            ],
          ),
          if (completionPercent != null) ...[
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                minHeight: 7,
                value: completionPercent / 100,
                backgroundColor: colorScheme.surfaceContainerHighest.withValues(
                  alpha: 0.72,
                ),
              ),
            ),
          ],
          if (stats.unclassifiedOwnedCount > 0) ...[
            const SizedBox(height: 9),
            Text(
              '${stats.unclassifiedOwnedCount} owned copies need finish selection',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.62),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _WorldChampionshipDecklistPanel extends StatelessWidget {
  const _WorldChampionshipDecklistPanel({required this.decklist});

  final PublicWorldChampionshipDecklist decklist;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return _SetDetailSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.format_list_numbered_rounded,
                size: 19,
                color: colorScheme.primary,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '60-card Decklist',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              _DecklistMetricPill(label: '${decklist.totalQuantity} cards'),
              const SizedBox(width: 6),
              _DecklistMetricPill(label: '${decklist.uniqueCardCount} unique'),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            _worldChampionshipDecklistBlurb(decklist),
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.68),
              height: 1.42,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          for (final entry in decklist.entries)
            _WorldChampionshipDecklistEntryRow(entry: entry),
        ],
      ),
    );
  }
}

class _DecklistMetricPill extends StatelessWidget {
  const _DecklistMetricPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.64),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.74),
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _WorldChampionshipDecklistEntryRow extends StatelessWidget {
  const _WorldChampionshipDecklistEntryRow({required this.entry});

  final PublicWorldChampionshipDecklistEntry entry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final originalPrint = [
      if ((entry.sourceSetName ?? '').trim().isNotEmpty) entry.sourceSetName,
      if ((entry.sourceCardNumber ?? '').trim().isNotEmpty)
        '#${entry.sourceCardNumber}',
    ].whereType<String>().join(' ');

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => CardDetailScreen(
                  cardPrintId: entry.cardPrintId,
                  gvId: entry.gvId,
                  name: entry.name,
                  number: entry.number,
                  rarity: entry.rarity,
                ),
              ),
            );
          },
          child: Container(
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest.withValues(
                alpha: 0.34,
              ),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: colorScheme.outline.withValues(alpha: 0.08),
              ),
            ),
            padding: const EdgeInsets.fromLTRB(10, 9, 10, 9),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 34,
                  child: Text(
                    '${entry.quantity ?? '—'}x',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        entry.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          height: 1.12,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        [
                          if (originalPrint.isNotEmpty) originalPrint,
                          'Deck #${entry.number}',
                        ].join(' • '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.58),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Icon(
                  Icons.chevron_right_rounded,
                  size: 20,
                  color: colorScheme.onSurface.withValues(alpha: 0.36),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SetMasterMetric extends StatelessWidget {
  const _SetMasterMetric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.56),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _SetPrintingOptionChips extends StatelessWidget {
  const _SetPrintingOptionChips({required this.card, required this.compact});

  final PublicSetCard card;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final visible = card.printings
        .take(compact ? 3 : 4)
        .toList(growable: false);
    return Wrap(
      spacing: 5,
      runSpacing: 5,
      children: [
        for (final option in visible)
          _SetPrintingOptionChip(
            label: option.ownedCount > 0
                ? '${option.finishName} ${option.ownedCount}x'
                : option.finishName,
            owned: option.ownedCount > 0,
          ),
        if (card.printings.length > visible.length)
          _SetPrintingOptionChip(
            label: '+${card.printings.length - visible.length}',
            owned: false,
          ),
      ],
    );
  }
}

class _SetPrintingOptionChip extends StatelessWidget {
  const _SetPrintingOptionChip({required this.label, required this.owned});

  final String label;
  final bool owned;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: owned
            ? Colors.green.withValues(alpha: 0.10)
            : colorScheme.surfaceContainerHighest.withValues(alpha: 0.54),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: owned
              ? Colors.green.withValues(alpha: 0.22)
              : colorScheme.outline.withValues(alpha: 0.08),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: owned ? Colors.green.shade800 : colorScheme.onSurfaceVariant,
            fontWeight: FontWeight.w800,
            fontSize: 10.6,
          ),
        ),
      ),
    );
  }
}

class _ImageStatusBadge extends StatelessWidget {
  const _ImageStatusBadge({required this.label, this.strong = false});

  final String label;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final backgroundColor = strong
        ? colorScheme.tertiaryContainer.withValues(alpha: 0.92)
        : colorScheme.surface.withValues(alpha: 0.94);
    final borderColor = strong
        ? colorScheme.tertiary.withValues(alpha: 0.22)
        : colorScheme.outline.withValues(alpha: 0.12);
    final textColor = strong
        ? colorScheme.onTertiaryContainer
        : colorScheme.onSurface.withValues(alpha: 0.78);

    return DecoratedBox(
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: borderColor),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: textColor,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.2,
          ),
        ),
      ),
    );
  }
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
    final displayIdentity = _setCardDisplayIdentity(card);
    final imagePresentation = _setCardImagePresentation(card);
    final variantLabel = _setCardVariantLabel(card);
    final subtitleParts = <String>[
      '#${card.number}',
      if ((card.rarity ?? '').isNotEmpty) card.rarity!,
    ];

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(GvGridConstants.tileTapRadius),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => CardDetailScreen(
                cardPrintId: card.cardPrintId,
                gvId: card.gvId,
                name: card.name,
                number: card.number,
                rarity: card.rarity,
                imageUrl: card.catalogImageUrl,
                fallbackImageUrl: card.providerFallbackImageUrl,
              ),
            ),
          );
        },
        child: Container(
          decoration: BoxDecoration(
            color: colorScheme.surface.withValues(alpha: 0.72),
            borderRadius: BorderRadius.circular(GvGridConstants.tileTapRadius),
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
                      displayIdentity.baseName,
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
                    if ((displayIdentity.printedName ?? '').isNotEmpty) ...[
                      SizedBox(height: compact ? 3 : 4),
                      Text(
                        displayIdentity.printedName!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.62),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
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
                    if (imagePresentation.compactBadgeLabel != null) ...[
                      SizedBox(height: compact ? 5 : 6),
                      _ImageStatusBadge(
                        label: imagePresentation.compactBadgeLabel!,
                        strong: imagePresentation.isCollisionRepresentative,
                      ),
                    ],
                    if (card.printings.isNotEmpty) ...[
                      SizedBox(height: compact ? 6 : 8),
                      _SetPrintingOptionChips(card: card, compact: compact),
                    ],
                    SizedBox(height: compact ? 5 : 6),
                    SizedBox(
                      height: 22,
                      child: CardSurfacePriceText(
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
      imageUrl: card.catalogImageUrl,
      fallbackImageUrl: card.providerFallbackImageUrl,
      width: compact ? 68 : 86,
      height: compact ? 94 : 118,
      borderRadius: GvGridConstants.imageRadius,
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
    final imagePresentation = _setCardImagePresentation(card);

    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(GvGridConstants.tileTapRadius),
      child: InkWell(
        borderRadius: BorderRadius.circular(GvGridConstants.tileTapRadius),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => CardDetailScreen(
              cardPrintId: card.cardPrintId,
              gvId: card.gvId,
              name: card.name,
              number: card.number,
              rarity: card.rarity,
              imageUrl: card.catalogImageUrl,
              fallbackImageUrl: card.providerFallbackImageUrl,
            ),
          ),
        ),
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
                      imageUrl: card.catalogImageUrl,
                      fallbackImageUrl: card.providerFallbackImageUrl,
                      borderRadius: GvGridConstants.imageRadius,
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
                    top: variantLabel == null ? 5 : 39,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: colorScheme.surface.withValues(alpha: 0.90),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: colorScheme.outline.withValues(alpha: 0.08),
                        ),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 7,
                          vertical: 5,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.info_outline_rounded,
                              size: 12,
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.70,
                              ),
                            ),
                            const SizedBox(width: 3),
                            Text(
                              'Details',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.labelSmall
                                  ?.copyWith(
                                    color: colorScheme.onSurface.withValues(
                                      alpha: 0.72,
                                    ),
                                    fontSize: 9.8,
                                    fontWeight: FontWeight.w900,
                                  ),
                            ),
                          ],
                        ),
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
                  if (imagePresentation.compactBadgeLabel != null)
                    Positioned(
                      right: 5,
                      bottom: 5,
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 118),
                        child: _ImageStatusBadge(
                          label: imagePresentation.compactBadgeLabel!,
                          strong: imagePresentation.isCollisionRepresentative,
                        ),
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
