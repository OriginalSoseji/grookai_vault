import 'package:flutter/foundation.dart';
import 'grookai_object_skin.dart';

/// Minimal reference to the underlying card print — swap for whatever the
/// repo's existing card model exposes (name/set-line/image accessor).
@immutable
class CardObjectRef {
  final String cardName;
  final String setLine; // e.g. "Evolving Skies · Secret Rare"
  final String? cardImageUrl;
  const CardObjectRef({
    required this.cardName,
    required this.setLine,
    this.cardImageUrl,
  });
}

/// Typed convenience wrapper around a 'memory.v1' object's fields. Exists so
/// engineers building the capture form get autocomplete/type-safety — the
/// thing actually stored/passed to the renderer is the plain
/// `Map<String, dynamic>` from [toFields], via GrookaiObject.fields. An
/// AI assistant filling this object later produces the same map shape
/// without ever touching this class.
@immutable
class MemoryCardData {
  final GrookaiObjectSkin skin;
  final CardObjectRef card;
  final String listingNo; // display only, e.g. "001"
  final DateTime date;
  final String location;
  final String? photoUrl; // null -> polaroid placeholder
  final String storyText;
  final String authorName;

  const MemoryCardData({
    required this.skin,
    required this.card,
    required this.listingNo,
    required this.date,
    required this.location,
    this.photoUrl,
    required this.storyText,
    required this.authorName,
  });

  factory MemoryCardData.fromFields(
    GrookaiObjectSkin skin,
    Map<String, dynamic> f,
  ) {
    return MemoryCardData(
      skin: skin,
      card: CardObjectRef(
        cardName: f['cardName'] as String,
        setLine: (f['setLine'] as String?) ?? '',
        cardImageUrl: f['cardImageUrl'] as String?,
      ),
      listingNo: f['listingNo'] as String,
      date: DateTime.parse(f['date'] as String),
      location: f['location'] as String,
      photoUrl: f['photoUrl'] as String?,
      storyText: f['storyText'] as String,
      authorName: f['authorName'] as String,
    );
  }

  Map<String, dynamic> toFields() => {
    'cardName': card.cardName,
    'setLine': card.setLine,
    'cardImageUrl': card.cardImageUrl,
    'listingNo': listingNo,
    'date': date.toIso8601String(),
    'location': location,
    'photoUrl': photoUrl,
    'storyText': storyText,
    'authorName': authorName,
  };
}

/// Typed convenience wrapper around a 'sale.v1' object's fields. See
/// [MemoryCardData] doc — same pattern.
@immutable
class SaleListingData {
  final GrookaiObjectSkin skin;
  final CardObjectRef card;
  final String listingNo;
  final double price;
  final bool firm;
  final String
  condition; // "PSA 10", "Raw NM", etc — free text or enum, repo's call
  final int quantity;
  final String sellerHandle;
  final double sellerRating;
  final int sellerTradeCount;
  final bool allowDms;

  const SaleListingData({
    required this.skin,
    required this.card,
    required this.listingNo,
    required this.price,
    required this.firm,
    required this.condition,
    required this.quantity,
    required this.sellerHandle,
    required this.sellerRating,
    required this.sellerTradeCount,
    required this.allowDms,
  });

  factory SaleListingData.fromFields(
    GrookaiObjectSkin skin,
    Map<String, dynamic> f,
  ) {
    return SaleListingData(
      skin: skin,
      card: CardObjectRef(
        cardName: f['cardName'] as String,
        setLine: (f['setLine'] as String?) ?? '',
        cardImageUrl: f['cardImageUrl'] as String?,
      ),
      listingNo: f['listingNo'] as String,
      price: (f['price'] as num).toDouble(),
      firm: f['firm'] as bool? ?? true,
      condition: f['condition'] as String,
      quantity: f['quantity'] as int? ?? 1,
      sellerHandle: f['sellerHandle'] as String,
      sellerRating: (f['sellerRating'] as num?)?.toDouble() ?? 0,
      sellerTradeCount: f['sellerTradeCount'] as int? ?? 0,
      allowDms: f['allowDms'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toFields() => {
    'cardName': card.cardName,
    'setLine': card.setLine,
    'cardImageUrl': card.cardImageUrl,
    'listingNo': listingNo,
    'price': price,
    'firm': firm,
    'condition': condition,
    'quantity': quantity,
    'sellerHandle': sellerHandle,
    'sellerRating': sellerRating,
    'sellerTradeCount': sellerTradeCount,
    'allowDms': allowDms,
  };
}

@immutable
class LotItem {
  final String cardName;
  final String condition;
  final double price;
  final String? imageUrl;
  const LotItem({
    required this.cardName,
    required this.condition,
    required this.price,
    this.imageUrl,
  });

  factory LotItem.fromFields(Map<String, dynamic> f) => LotItem(
    cardName: f['cardName'] as String,
    condition: f['condition'] as String,
    price: (f['price'] as num).toDouble(),
    imageUrl: f['imageUrl'] as String?,
  );

  Map<String, dynamic> toFields() => {
    'cardName': cardName,
    'condition': condition,
    'price': price,
    'imageUrl': imageUrl,
  };
}

/// Typed convenience wrapper around a 'lot.v1' object's fields. See
/// [MemoryCardData] doc — same pattern.
@immutable
class LotListingData {
  final GrookaiObjectSkin skin;
  final String listingNo;
  final String
  title; // free text, e.g. "Mixed SIR Lot" — a lot is not tied to one set
  final List<LotItem> items; // items[0]'s image is used as the front hero
  final double bundlePrice;
  final String sellerHandle;
  final double sellerRating;
  final int sellerTradeCount;

  const LotListingData({
    required this.skin,
    required this.listingNo,
    required this.title,
    required this.items,
    required this.bundlePrice,
    required this.sellerHandle,
    required this.sellerRating,
    required this.sellerTradeCount,
  });

  factory LotListingData.fromFields(
    GrookaiObjectSkin skin,
    Map<String, dynamic> f,
  ) {
    return LotListingData(
      skin: skin,
      listingNo: f['listingNo'] as String,
      title: f['title'] as String,
      items: (f['items'] as List)
          .map((e) => LotItem.fromFields(Map<String, dynamic>.from(e as Map)))
          .toList(),
      bundlePrice: (f['bundlePrice'] as num).toDouble(),
      sellerHandle: f['sellerHandle'] as String,
      sellerRating: (f['sellerRating'] as num?)?.toDouble() ?? 0,
      sellerTradeCount: f['sellerTradeCount'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toFields() => {
    'listingNo': listingNo,
    'title': title,
    'items': items.map((i) => i.toFields()).toList(),
    'bundlePrice': bundlePrice,
    'sellerHandle': sellerHandle,
    'sellerRating': sellerRating,
    'sellerTradeCount': sellerTradeCount,
  };

  double get estimatedValue => items.fold<double>(0, (sum, i) => sum + i.price);
  int get cardCount => items.length;
}
