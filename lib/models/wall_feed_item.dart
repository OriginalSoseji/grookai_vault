import 'package:grookai_vault/services/image_resolver.dart';

class WallFeedItem {
  final String listingId;
  final String cardPrintId;
  final String cardName;
  final String setCode;
  final String cardNumber;
  final String? rarity;
  final String condition;
  final int priceCents;
  final String currency;
  final int quantity;
  final bool isTrade;
  final DateTime createdAt;
  final String? sellerDisplayName;
  final String? sellerAvatarUrl;
  final String? primaryPhotoUrl;
  final String? thumbUrl;
  final num? mvPriceMid;
  final DateTime? mvObservedAt;

  WallFeedItem({
    required this.listingId,
    required this.cardPrintId,
    required this.cardName,
    required this.setCode,
    required this.cardNumber,
    required this.rarity,
    required this.condition,
    required this.priceCents,
    required this.currency,
    required this.quantity,
    required this.isTrade,
    required this.createdAt,
    required this.sellerDisplayName,
    required this.sellerAvatarUrl,
    required this.primaryPhotoUrl,
    required this.thumbUrl,
    required this.mvPriceMid,
    required this.mvObservedAt,
  });

  static WallFeedItem fromMap(Map<String, dynamic> m) {
    DateTime? parseTime(dynamic v) {
      if (v == null) return null;
      try { return DateTime.parse(v.toString()); } catch (_) { return null; }
    }
    return WallFeedItem(
      listingId: (m['listing_id'] ?? '').toString(),
      cardPrintId: (m['card_print_id'] ?? '').toString(),
      cardName: (m['card_name'] ?? '').toString(),
      setCode: (m['set_code'] ?? '').toString(),
      cardNumber: (m['card_number'] ?? '').toString(),
      rarity: (m['rarity']?.toString()),
      condition: (m['condition'] ?? '').toString(),
      priceCents: int.tryParse((m['price_cents'] ?? '0').toString()) ?? 0,
      currency: (m['currency'] ?? 'USD').toString(),
      quantity: int.tryParse((m['quantity'] ?? '1').toString()) ?? 1,
      isTrade: (m['is_trade'] == true || m['is_trade'] == 1),
      createdAt: parseTime(m['created_at']) ?? DateTime.now().toUtc(),
      sellerDisplayName: m['seller_display_name']?.toString(),
      sellerAvatarUrl: m['seller_avatar_url']?.toString(),
      primaryPhotoUrl: m['primary_photo_url']?.toString(),
      thumbUrl: m['thumb_url']?.toString(),
      mvPriceMid: (m['mv_price_mid'] is num)
          ? (m['mv_price_mid'] as num)
          : num.tryParse((m['mv_price_mid'] ?? '').toString()),
      mvObservedAt: parseTime(m['mv_observed_at']),
    );
  }

  String priceText() => (priceCents / 100).toStringAsFixed(2);
  String conditionText() => condition.toUpperCase();

  String imageUrlOrFallback() {
    // Prefer thumb if available (resolves storage paths to public URL when possible)
    final t = (thumbUrl ?? '').trim();
    if (t.isNotEmpty) {
      final u = toImageUrl(t);
      if (u.isNotEmpty) return u;
    }
    final url = (primaryPhotoUrl ?? '').trim();
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    final set = setCode.toLowerCase();
    final rawNum = cardNumber.toLowerCase();
    if (set.isNotEmpty && rawNum.isNotEmpty) {
      // Normalize to images.pokemontcg.io slugs directly to avoid tcgdex 404s.
      String mapSet(String s) {
        if (s == 'lc') return 'base6';
        if (s == 'bs' || s == 'base') return 'base1';
        return s;
      }
      final slug = mapSet(set);
      final m = RegExp(r'^0*([0-9]+)([a-z]*)$').firstMatch(rawNum);
      final numSlug = (m != null) ? '${int.parse(m.group(1)!)}${m.group(2)!}' : rawNum;
      return 'https://images.pokemontcg.io/$slug/$numSlug.png';
    }
    return '';
  }
}

class WallFeedPageData {
  final List<WallFeedItem> items;
  final int? total;
  final int offset;
  final int limit;
  WallFeedPageData({required this.items, required this.total, required this.offset, required this.limit});
}


