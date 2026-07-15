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
    final columns = gridItems.length <= 4 ? gridItems.length : 4;

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
          GridView.count(
            crossAxisCount: columns.clamp(1, 4),
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 6,
            crossAxisSpacing: 6,
            childAspectRatio: 0.84,
            children: [
              for (final item in gridItems) _GridTile(tokens: t, item: item),
            ],
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
                '\$${data.estimatedValue.toStringAsFixed(0)} value',
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

class _GridTile extends StatelessWidget {
  final GrookaiObjectTokens tokens;
  final LotItem item;
  const _GridTile({required this.tokens, required this.item});

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
