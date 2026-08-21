import 'package:flutter/material.dart';
import 'grookai_object_atoms.dart';
import 'grookai_object_frame.dart';
import 'grookai_object_models.dart';
import 'grookai_object_skin.dart';

/// Front side — shareable Lot card. The front must represent the actual
/// bundle, so it renders every selected card image up to the supported lot cap.
class LotCardFront extends StatelessWidget {
  final LotListingData data;
  const LotCardFront({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final t = grookaiObjectTokens[data.skin]!;
    final gridItems = data.items.take(12).toList(growable: false);

    return GrookaiObjectFrame(
      skin: data.skin,
      holePunch: data.skin == GrookaiObjectSkin.kraft,
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'GROOKAI VAULT',
                style: monoLabel(
                  t,
                  size: 10.5,
                  color: t.accent,
                  letterSpacing: 0.24,
                  weight: FontWeight.w600,
                ),
              ),
              CardBadge(tokens: t, label: 'LOT · ${data.cardCount} CARDS'),
            ],
          ),
          const SizedBox(height: 12),
          Expanded(
            child: _BalancedLotGrid(tokens: t, items: gridItems),
          ),
          const SizedBox(height: 12),
          Text(
            data.title,
            style: serifTitle(t, size: 22),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              CardPriceTag(tokens: t, skin: data.skin, price: data.bundlePrice),
              const SizedBox(width: 10),
              Text(
                '\$${data.estimatedValue.toStringAsFixed(0)} market',
                style: TextStyle(
                  fontSize: 11,
                  color: t.mutedText,
                  decoration: TextDecoration.lineThrough,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          CardDivider(tokens: t),
          const SizedBox(height: 9),
          Text(
            'LOT · NO. ${data.listingNo}',
            style: monoLabel(t, size: 9.5, letterSpacing: 0.1),
          ),
        ],
      ),
    );
  }
}

List<int> lotBalancedRowPattern(int itemCount) {
  final count = itemCount.clamp(0, 12);
  return switch (count) {
    0 => const <int>[],
    1 => const [1],
    2 => const [2],
    3 => const [3],
    4 => const [2, 2],
    5 => const [3, 2],
    6 => const [3, 3],
    7 => const [2, 3, 2],
    8 => const [4, 4],
    9 => const [3, 3, 3],
    10 => const [3, 4, 3],
    11 => const [4, 3, 4],
    _ => const [4, 4, 4],
  };
}

class _BalancedLotGrid extends StatelessWidget {
  const _BalancedLotGrid({required this.tokens, required this.items});

  final GrookaiObjectTokens tokens;
  final List<LotItem> items;

  @override
  Widget build(BuildContext context) {
    final pattern = lotBalancedRowPattern(items.length);
    if (pattern.isEmpty) {
      return const SizedBox.shrink();
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        const spacing = 6.0;
        const cardAspectRatio = 0.84;
        final maxColumns = pattern.reduce(
          (left, right) => left > right ? left : right,
        );
        final maxWidth =
            (constraints.maxWidth - spacing * (maxColumns - 1)) / maxColumns;
        final maxHeight =
            (constraints.maxHeight - spacing * (pattern.length - 1)) /
            pattern.length;
        final tileWidth = maxWidth < maxHeight * cardAspectRatio
            ? maxWidth
            : maxHeight * cardAspectRatio;
        final tileHeight = tileWidth / cardAspectRatio;
        var itemIndex = 0;
        return Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (
                var rowIndex = 0;
                rowIndex < pattern.length;
                rowIndex += 1
              ) ...[
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (
                      var column = 0;
                      column < pattern[rowIndex];
                      column += 1
                    ) ...[
                      if (column > 0) const SizedBox(width: spacing),
                      SizedBox(
                        width: tileWidth,
                        height: tileHeight,
                        child: _GridTile(
                          tokens: tokens,
                          item: items[itemIndex],
                          index: itemIndex++,
                        ),
                      ),
                    ],
                  ],
                ),
                if (rowIndex < pattern.length - 1)
                  const SizedBox(height: spacing),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _GridTile extends StatelessWidget {
  final GrookaiObjectTokens tokens;
  final LotItem item;
  final int index;
  const _GridTile({
    required this.tokens,
    required this.item,
    required this.index,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth.isFinite
            ? constraints.maxWidth
            : 58.0;
        final height = constraints.maxHeight.isFinite
            ? constraints.maxHeight
            : 82.0;
        return Stack(
          fit: StackFit.expand,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                color: tokens.primaryText.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(6),
              ),
              child: item.imageUrl == null
                  ? CardArtPlaceholder(width: width, height: height)
                  : GrookaiObjectNetworkImage(
                      imageUrl: item.imageUrl!,
                      width: width,
                      height: height,
                      fit: BoxFit.contain,
                      borderRadius: BorderRadius.circular(6),
                    ),
            ),
            Positioned(
              left: 3,
              top: 3,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: const Color(0xCC000000),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 4,
                    vertical: 1.5,
                  ),
                  child: Text(
                    '${index + 1}'.padLeft(2, '0'),
                    style: monoLabel(
                      tokens,
                      size: 7.5,
                      color: Colors.white,
                      weight: FontWeight.w700,
                      letterSpacing: 0,
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              right: 3,
              bottom: 3,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: const Color(0xCC000000),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 4,
                    vertical: 1.5,
                  ),
                  child: Text(
                    '\$${item.price.toStringAsFixed(0)}',
                    style: monoLabel(
                      tokens,
                      size: 8,
                      color: tokens.accent,
                      weight: FontWeight.w700,
                      letterSpacing: 0,
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

/// Back side — "Card For Sale.dc.html" Row 5, itemized: every card, its
/// condition, and its own price, followed by the bundle-price total.
class LotCardBack extends StatelessWidget {
  final LotListingData data;
  final VoidCallback? onMessageToBuy;
  const LotCardBack({super.key, required this.data, this.onMessageToBuy});

  @override
  Widget build(BuildContext context) {
    final t = grookaiObjectTokens[data.skin]!;
    return GrookaiObjectFrame(
      skin: data.skin,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'LOT DETAILS',
                style: monoLabel(
                  t,
                  size: 9.5,
                  color: t.accent,
                  letterSpacing: 0.2,
                  weight: FontWeight.w600,
                ),
              ),
              Text('NO. ${data.listingNo}', style: monoLabel(t, size: 9.5)),
            ],
          ),
          const SizedBox(height: 12),
          CardDivider(tokens: t),
          const SizedBox(height: 6),
          Expanded(
            child: Column(
              children: [
                for (var index = 0; index < data.items.length; index += 1) ...[
                  Expanded(
                    child: _LotDetailRow(
                      tokens: t,
                      item: data.items[index],
                      index: index,
                      dense: data.items.length > 8,
                    ),
                  ),
                  if (index < data.items.length - 1)
                    Divider(
                      height: 1,
                      color: t.mutedText.withValues(alpha: 0.08),
                    ),
                ],
              ],
            ),
          ),
          CardDivider(tokens: t),
          const SizedBox(height: 10),
          CardDetailRow(
            tokens: t,
            label: 'BUNDLE PRICE · ${data.cardCount} CARDS',
            value: '\$${data.bundlePrice.toStringAsFixed(0)} firm',
            valueColor: t.accent,
            valueSize: 19,
          ),
          const SizedBox(height: 14),
          CardSellerRow(
            tokens: t,
            handle: data.sellerHandle,
            rating: data.sellerRating,
            tradeCount: data.sellerTradeCount,
          ),
          const SizedBox(height: 12),
          Center(
            child: CardCta(
              tokens: t,
              label: 'Message to Buy Lot',
              icon: Icons.chat_bubble,
              onTap: onMessageToBuy,
            ),
          ),
          const SizedBox(height: 12),
          CardDivider(tokens: t),
          const SizedBox(height: 12),
          CardFooterBrand(tokens: t),
        ],
      ),
    );
  }
}

class _LotDetailRow extends StatelessWidget {
  const _LotDetailRow({
    required this.tokens,
    required this.item,
    required this.index,
    required this.dense,
  });

  final GrookaiObjectTokens tokens;
  final LotItem item;
  final int index;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final variantLabel = item.meaningfulVariantLabel;
    final identityParts = <String>[
      if (item.setAndNumberLine.isNotEmpty) item.setAndNumberLine,
      ?variantLabel,
    ];
    return Row(
      children: [
        SizedBox(
          width: 24,
          child: Text(
            '${index + 1}'.padLeft(2, '0'),
            style: monoLabel(
              tokens,
              size: dense ? 7.5 : 8.5,
              color: tokens.accent,
              weight: FontWeight.w700,
            ),
          ),
        ),
        Expanded(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item.cardName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: monoLabel(
                  tokens,
                  size: dense ? 8.3 : 9.5,
                  color: tokens.primaryText.withValues(alpha: 0.92),
                  weight: FontWeight.w700,
                  letterSpacing: 0,
                ),
              ),
              if (identityParts.isNotEmpty)
                Text(
                  identityParts.join(' · '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: monoLabel(
                    tokens,
                    size: dense ? 6.8 : 7.8,
                    color: tokens.mutedText,
                    weight: FontWeight.w400,
                    letterSpacing: 0,
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(width: 6),
        SizedBox(
          width: dense ? 64 : 72,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                item.condition,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: monoLabel(tokens, size: dense ? 6.8 : 7.8),
              ),
              Text(
                '\$${item.price.toStringAsFixed(0)}',
                style: monoLabel(
                  tokens,
                  size: dense ? 8 : 9,
                  color: tokens.accent,
                  weight: FontWeight.w700,
                  letterSpacing: 0,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
