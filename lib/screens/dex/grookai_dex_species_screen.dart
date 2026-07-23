import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../services/grookai_dex/grookai_dex_service.dart';
import '../../services/identity/display_identity.dart';
import '../../services/identity/image_presentation.dart';
import '../../utils/pokemon_sprite_url.dart';
import '../../widgets/card_surface_artwork.dart';

enum _DexSpeciesView { all, owned, missing }

class GrookaiDexSpeciesScreen extends StatefulWidget {
  const GrookaiDexSpeciesScreen({
    required this.speciesSlug,
    this.initialDisplayName,
    super.key,
  });

  final String speciesSlug;
  final String? initialDisplayName;

  @override
  State<GrookaiDexSpeciesScreen> createState() =>
      _GrookaiDexSpeciesScreenState();
}

class _GrookaiDexSpeciesScreenState extends State<GrookaiDexSpeciesScreen> {
  final SupabaseClient _client = Supabase.instance.client;

  bool _loading = true;
  String? _error;
  GrookaiDexSpeciesDetail? _detail;
  _DexSpeciesView _view = _DexSpeciesView.all;

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
      final detail = await GrookaiDexService.fetchSpeciesDetail(
        client: _client,
        speciesSlug: widget.speciesSlug,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _detail = detail;
        if (detail == null) {
          _error = 'This Pokemon could not be found.';
        }
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = 'Unable to load this Dex entry.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  List<GrookaiDexCardPrint> _visibleCards(GrookaiDexSpeciesDetail detail) {
    switch (_view) {
      case _DexSpeciesView.owned:
        return detail.cards.where((card) => card.isOwned).toList();
      case _DexSpeciesView.missing:
        return detail.cards
            .where((card) => card.countsForCompletion && !card.isOwned)
            .toList();
      case _DexSpeciesView.all:
        return detail.cards;
    }
  }

  Future<void> _openCard(GrookaiDexCardPrint card) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CardDetailScreen(
          cardPrintId: card.cardPrintId,
          gvId: card.gvId,
          name: card.name,
          setCode: card.setCode,
          setName: card.setName,
          number: card.number,
          rarity: card.rarity,
          imageUrl: card.hostedImageUrl,
          fallbackImageUrl: card.providerFallbackImageUrl,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final detail = _detail;
    final title =
        detail?.displayName ?? widget.initialDisplayName ?? 'Grookai Dex';

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [
          IconButton(
            tooltip: 'Reload',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 28),
            children: [
              if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 44),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_error != null)
                _DexDetailSurfaceCard(
                  child: _DexDetailEmptyState(
                    title: 'Unable to load',
                    body: _error!,
                  ),
                )
              else if (detail != null) ...[
                _DexSpeciesHeader(detail: detail),
                const SizedBox(height: 12),
                _DexSpeciesViewPicker(
                  value: _view,
                  detail: detail,
                  onChanged: (value) => setState(() {
                    _view = value;
                  }),
                ),
                const SizedBox(height: 12),
                for (final card in _visibleCards(detail))
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _DexCardTile(
                      card: card,
                      onTap: () => _openCard(card),
                    ),
                  ),
                if (_visibleCards(detail).isEmpty)
                  const _DexDetailSurfaceCard(
                    child: _DexDetailEmptyState(
                      title: 'No cards here',
                      body: 'This view has no mapped cards.',
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

class _DexSpeciesHeader extends StatelessWidget {
  const _DexSpeciesHeader({required this.detail});

  final GrookaiDexSpeciesDetail detail;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final optionPercent = detail.variantOptionCount <= 0
        ? 0
        : ((detail.ownedVariantOptionCount / detail.variantOptionCount) * 100)
              .round()
              .clamp(0, 100);

    return _DexDetailSurfaceCard(
      emphasize: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _DexSpeciesSprite(
                nationalDexNumber: detail.nationalDexNumber,
                label: detail.displayName,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _DexDetailPill(
                      label:
                          '#${detail.nationalDexNumber.toString().padLeft(4, '0')} Species Dex',
                    ),
                    const SizedBox(height: 10),
                    Text(
                      detail.displayName,
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0,
                        height: 0.98,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${detail.ownedPrintCount} / ${detail.totalPrintCount} printings collected',
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.72),
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          _DexProgressBar(
            label: 'Card Prints',
            value: detail.completionPercent,
            caption:
                '${detail.totalPrintCount} known • ${detail.ownedPrintCount} owned • ${(detail.totalPrintCount - detail.ownedPrintCount).clamp(0, detail.totalPrintCount)} missing',
          ),
          const SizedBox(height: 14),
          _DexProgressBar(
            label: 'Master Set Options',
            value: optionPercent,
            caption:
                '${detail.ownedVariantOptionCount}/${detail.variantOptionCount} finish and parallel options',
          ),
        ],
      ),
    );
  }
}

class _DexSpeciesSprite extends StatelessWidget {
  const _DexSpeciesSprite({
    required this.nationalDexNumber,
    required this.label,
  });

  final int nationalDexNumber;
  final String label;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final url = pokemonSpriteUrl(nationalDexNumber);

    return Container(
      width: 96,
      height: 96,
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHigh.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
        boxShadow: [
          BoxShadow(
            color: colorScheme.primary.withValues(alpha: 0.07),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: url == null
          ? Icon(
              Icons.catching_pokemon_rounded,
              color: colorScheme.onSurface.withValues(alpha: 0.36),
            )
          : Padding(
              padding: const EdgeInsets.all(9),
              child: Image.network(
                url,
                fit: BoxFit.contain,
                cacheWidth: 320,
                filterQuality: FilterQuality.none,
                errorBuilder: (context, error, stackTrace) => Center(
                  child: Text(
                    label.isEmpty ? '?' : label.substring(0, 1),
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
            ),
    );
  }
}

class _DexDetailPill extends StatelessWidget {
  const _DexDetailPill({required this.label});

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
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.68),
            fontWeight: FontWeight.w900,
            letterSpacing: 1.1,
          ),
        ),
      ),
    );
  }
}

class _DexProgressBar extends StatelessWidget {
  const _DexProgressBar({
    required this.label,
    required this.value,
    required this.caption,
  });

  final String label;
  final int value;
  final String caption;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            Text(
              '$value%',
              style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        const SizedBox(height: 7),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            minHeight: 7,
            value: value / 100,
            backgroundColor: colorScheme.surfaceContainerHighest.withValues(
              alpha: 0.72,
            ),
          ),
        ),
        const SizedBox(height: 5),
        Text(
          caption,
          style: theme.textTheme.bodySmall?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.62),
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _DexSpeciesViewPicker extends StatelessWidget {
  const _DexSpeciesViewPicker({
    required this.value,
    required this.detail,
    required this.onChanged,
  });

  final _DexSpeciesView value;
  final GrookaiDexSpeciesDetail detail;
  final ValueChanged<_DexSpeciesView> onChanged;

  @override
  Widget build(BuildContext context) {
    final ownedCount = detail.cards.where((card) => card.isOwned).length;
    final missingCount = detail.cards
        .where((card) => card.countsForCompletion && !card.isOwned)
        .length;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _DexViewChip(
            label: 'All ${detail.cards.length}',
            selected: value == _DexSpeciesView.all,
            onTap: () => onChanged(_DexSpeciesView.all),
          ),
          const SizedBox(width: 8),
          _DexViewChip(
            label: 'Owned $ownedCount',
            selected: value == _DexSpeciesView.owned,
            onTap: () => onChanged(_DexSpeciesView.owned),
          ),
          const SizedBox(width: 8),
          _DexViewChip(
            label: 'Missing $missingCount',
            selected: value == _DexSpeciesView.missing,
            onTap: () => onChanged(_DexSpeciesView.missing),
          ),
        ],
      ),
    );
  }
}

class _DexViewChip extends StatelessWidget {
  const _DexViewChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
    );
  }
}

class _DexCardTile extends StatelessWidget {
  const _DexCardTile({required this.card, required this.onTap});

  final GrookaiDexCardPrint card;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final identity = resolveDisplayIdentityFromFields(
      name: card.name,
      variantKey: card.variantKey,
      printedIdentityModifier: card.printedIdentityModifier,
    );
    final imagePresentation = resolveImagePresentationFromFields(
      imageUrl: card.exactImageUrl,
      representativeImageUrl: card.representativeImageUrl,
      displayImageUrl: card.imageUrl,
      imageStatus: card.imageStatus,
      imageNote: card.imageNote,
    );
    final meta = [
      card.setName ?? card.setCode,
      if ((card.number ?? '').isNotEmpty) '#${card.number}',
      card.rarity,
    ].whereType<String>().where((value) => value.trim().isNotEmpty).join(' • ');

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            color: colorScheme.surface.withValues(alpha: 0.82),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.09),
            ),
          ),
          padding: const EdgeInsets.all(10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CardSurfaceArtwork(
                label: identity.displayName,
                imageUrl: card.hostedImageUrl,
                fallbackImageUrl: card.providerFallbackImageUrl,
                width: 78,
                height: 108,
                borderRadius: 16,
                padding: const EdgeInsets.all(1.5),
                filterQuality: FilterQuality.medium,
                imageTruthLabel: imagePresentation.compactBadgeLabel,
                imageTruthStrong: imagePresentation.isCollisionRepresentative,
                onViewDetails: onTap,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            identity.baseName,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                              height: 1.08,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        _OwnedPrintBadge(card: card),
                      ],
                    ),
                    if (identity.suffix != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        identity.suffix!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: colorScheme.primary,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                    const SizedBox(height: 6),
                    Text(
                      meta,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.62),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 9),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        _DexOptionChip(
                          label:
                              '${card.ownedOptionCount}/${card.totalOptionCount} options',
                          owned: card.missingOptionCount == 0,
                        ),
                        if (card.missingOptionCount > 0)
                          _DexOptionChip(
                            label: '${card.missingOptionCount} missing',
                            owned: false,
                          ),
                      ],
                    ),
                    if (card.printings.isNotEmpty) ...[
                      const SizedBox(height: 9),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          for (final printing in card.printings.take(5))
                            _DexOptionChip(
                              label: printing.ownedCount > 0
                                  ? '${printing.finishName} ${printing.ownedCount}x'
                                  : printing.finishName,
                              owned: printing.ownedCount > 0,
                            ),
                          if (card.printings.length > 5)
                            _DexOptionChip(
                              label: '+${card.printings.length - 5}',
                              owned: false,
                            ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OwnedPrintBadge extends StatelessWidget {
  const _OwnedPrintBadge({required this.card});

  final GrookaiDexCardPrint card;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final owned = card.isOwned;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: owned
            ? Colors.green.withValues(alpha: 0.12)
            : colorScheme.surfaceContainerHighest.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        child: Text(
          owned ? '${card.ownedCount} owned' : 'Missing',
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: owned ? Colors.green.shade800 : colorScheme.onSurfaceVariant,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _DexOptionChip extends StatelessWidget {
  const _DexOptionChip({required this.label, required this.owned});

  final String label;
  final bool owned;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: owned
            ? Colors.green.withValues(alpha: 0.10)
            : colorScheme.surfaceContainerHighest.withValues(alpha: 0.58),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: owned
              ? Colors.green.withValues(alpha: 0.24)
              : colorScheme.outline.withValues(alpha: 0.09),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: owned ? Colors.green.shade800 : colorScheme.onSurfaceVariant,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _DexDetailSurfaceCard extends StatelessWidget {
  const _DexDetailSurfaceCard({required this.child, this.emphasize = false});

  final Widget child;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: emphasize
            ? colorScheme.primaryContainer.withValues(alpha: 0.16)
            : colorScheme.surface.withValues(alpha: 0.82),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.09)),
      ),
      padding: const EdgeInsets.all(16),
      child: child,
    );
  }
}

class _DexDetailEmptyState extends StatelessWidget {
  const _DexDetailEmptyState({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        Icon(
          Icons.catching_pokemon_rounded,
          size: 30,
          color: colorScheme.onSurface.withValues(alpha: 0.46),
        ),
        const SizedBox(height: 10),
        Text(
          title,
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 5),
        Text(
          body,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.62),
          ),
        ),
      ],
    );
  }
}
