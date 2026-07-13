import 'package:flutter/material.dart';
import 'grookai_object_atoms.dart';
import 'grookai_object_frame.dart';
import 'grookai_object_models.dart';
import 'grookai_object_skin.dart';

/// Front side — "Card For Sale.dc.html" Row 1 FRONT.
class SaleCardFront extends StatelessWidget {
  final SaleListingData data;
  const SaleCardFront({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final t = grookaiObjectTokens[data.skin]!;
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
              CardBadge(
                tokens: t,
                label: 'FOR SALE',
                rotationDeg: data.skin == GrookaiObjectSkin.kraft ? 3 : 0,
              ),
            ],
          ),
          Expanded(
            child: Center(
              child: data.card.cardImageUrl != null
                  ? GrookaiObjectNetworkImage(
                      imageUrl: data.card.cardImageUrl!,
                      width: 200,
                    )
                  : const CardArtPlaceholder(width: 200, height: 280),
            ),
          ),
          Text(
            data.card.cardName,
            style: serifTitle(t, size: 28),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 5),
          Text(
            data.card.setLine.toUpperCase(),
            style: monoLabel(t, size: 9, letterSpacing: 0.12),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              CardPriceTag(tokens: t, skin: data.skin, price: data.price),
              const SizedBox(width: 10),
              CardConditionChip(tokens: t, label: data.condition),
            ],
          ),
          const SizedBox(height: 14),
          CardDivider(tokens: t),
          const SizedBox(height: 10),
          Text(
            'LISTING · NO. ${data.listingNo}',
            style: monoLabel(t, size: 9.5, letterSpacing: 0.1),
          ),
        ],
      ),
    );
  }
}

/// Back side — "Card For Sale.dc.html" Row 1 BACK.
class SaleCardBack extends StatelessWidget {
  final SaleListingData data;

  /// Wired by PR3 to ContactOwnerButton / CardInteractionService when a
  /// contact channel is resolvable; leave null to render the CTA disabled.
  final VoidCallback? onMessageToBuy;

  const SaleCardBack({super.key, required this.data, this.onMessageToBuy});

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
                'LISTING DETAILS',
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
          const SizedBox(height: 14),
          CardDivider(tokens: t),
          const SizedBox(height: 16),
          CardDetailRow(
            tokens: t,
            label: 'ASKING PRICE',
            value:
                '\$${data.price.toStringAsFixed(0)}${data.firm ? " firm" : ""}',
            valueColor: t.accent,
            valueSize: 20,
          ),
          const SizedBox(height: 10),
          CardDetailRow(tokens: t, label: 'CONDITION', value: data.condition),
          const SizedBox(height: 10),
          CardDetailRow(
            tokens: t,
            label: 'AVAILABLE',
            value: '${data.quantity} ${data.quantity == 1 ? "copy" : "copies"}',
          ),
          const SizedBox(height: 18),
          CardDivider(tokens: t),
          const SizedBox(height: 18),
          CardSellerRow(
            tokens: t,
            handle: data.sellerHandle,
            rating: data.sellerRating,
            tradeCount: data.sellerTradeCount,
          ),
          const Spacer(),
          Center(
            child: CardCta(
              tokens: t,
              label: 'Message to Buy',
              icon: Icons.chat_bubble,
              onTap: data.allowDms ? onMessageToBuy : null,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Ships in 2–3 days · Buyer covers shipping',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11, color: t.mutedText),
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
