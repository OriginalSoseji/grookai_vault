import 'package:flutter/material.dart';
import 'grookai_object_atoms.dart';
import 'grookai_object_frame.dart';
import 'grookai_object_models.dart';
import 'grookai_object_skin.dart';

/// Front side — "Card For Sale.dc.html" Row 5, lot front: hero card + a
/// priced thumbnail grid + a "+N more · $total" summary tile once there are
/// more than 5 cards. Not tied to any single set — [LotListingData.title]
/// is free text (e.g. "Mixed SIR Lot").
class LotCardFront extends StatelessWidget {
  final LotListingData data;
  const LotCardFront({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final t = grookaiObjectTokens[data.skin]!;
    final hero = data.items.first;
    final gridItems = data.items.skip(1).take(4).toList();
    final remaining = data.items.length - 1 - gridItems.length;
    final remainingValue = data.items
        .skip(1 + gridItems.length)
        .fold<double>(0, (s, i) => s + i.price);

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
          const SizedBox(height: 14),
          hero.imageUrl != null
              ? GrookaiObjectNetworkImage(imageUrl: hero.imageUrl!, width: 108)
              : const CardArtPlaceholder(width: 108, height: 150),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 4,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 7,
            crossAxisSpacing: 7,
            childAspectRatio: 1.8,
            children: [
              for (final item in gridItems)
                _GridTile(tokens: t, price: item.price),
              if (remaining > 0)
                _MoreTile(tokens: t, count: remaining, value: remainingValue),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            data.title,
            style: serifTitle(t, size: 24),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              CardPriceTag(tokens: t, skin: data.skin, price: data.bundlePrice),
              const SizedBox(width: 10),
              Text(
                '\$${data.estimatedValue.toStringAsFixed(0)} value',
                style: TextStyle(
                  fontSize: 11,
                  color: t.mutedText,
                  decoration: TextDecoration.lineThrough,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          CardDivider(tokens: t),
          const SizedBox(height: 10),
          Text(
            'LOT · NO. ${data.listingNo}',
            style: monoLabel(t, size: 9.5, letterSpacing: 0.1),
          ),
        ],
      ),
    );
  }
}

class _GridTile extends StatelessWidget {
  final GrookaiObjectTokens tokens;
  final double price;
  const _GridTile({required this.tokens, required this.price});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(
          decoration: BoxDecoration(
            color: tokens.primaryText.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(6),
          ),
        ),
        Positioned(
          bottom: 4,
          left: 6,
          child: Text(
            '\$${price.toStringAsFixed(0)}',
            style: monoLabel(
              tokens,
              size: 9,
              color: tokens.accent,
              weight: FontWeight.w700,
              letterSpacing: 0,
            ),
          ),
        ),
      ],
    );
  }
}

class _MoreTile extends StatelessWidget {
  final GrookaiObjectTokens tokens;
  final int count;
  final double value;
  const _MoreTile({
    required this.tokens,
    required this.count,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: tokens.primaryText.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(6),
      ),
      alignment: Alignment.center,
      child: Text(
        '+$count more · \$${value.toStringAsFixed(0)}',
        style: monoLabel(tokens, size: 9),
      ),
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
            child: ListView.separated(
              padding: EdgeInsets.zero,
              itemCount: data.items.length,
              separatorBuilder: (_, index) => Divider(
                height: 1,
                color: t.mutedText.withValues(alpha: 0.08),
              ),
              itemBuilder: (context, i) {
                final item = data.items[i];
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 5),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          item.cardName,
                          overflow: TextOverflow.ellipsis,
                          style: monoLabel(
                            t,
                            size: 10.5,
                            color: t.primaryText.withValues(alpha: 0.85),
                            weight: FontWeight.w400,
                          ),
                        ),
                      ),
                      Text(item.condition, style: monoLabel(t, size: 10.5)),
                      const SizedBox(width: 10),
                      Text(
                        '\$${item.price.toStringAsFixed(0)}',
                        style: monoLabel(
                          t,
                          size: 10.5,
                          color: t.accent,
                          weight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                );
              },
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
