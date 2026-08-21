import '../services/grookai_objects/sale_listing_service.dart';
import '../services/identity/display_identity.dart';
import '../widgets/grookai_objects/grookai_object_models.dart';
import '../widgets/grookai_objects/grookai_object.dart';
import '../widgets/grookai_objects/grookai_object_skin.dart';
import 'card_print.dart';

const int kGrookaiLotMaxCards = 12;

class GrookaiSaleListingSource {
  const GrookaiSaleListingSource({
    required this.cardName,
    required this.setLine,
    this.cardImageUrl,
    this.sellerHandle = 'Collector',
    this.sellerRating = 0,
    this.sellerTradeCount = 0,
  });

  final String cardName;
  final String setLine;
  final String? cardImageUrl;
  final String sellerHandle;
  final double sellerRating;
  final int sellerTradeCount;
}

class GrookaiSaleListingAdapter {
  const GrookaiSaleListingAdapter._();

  static GrookaiObject fromTerms({
    required GrookaiSaleListingSource source,
    required GrookaiObjectSkin skin,
    required double price,
    required String condition,
    required int quantity,
    required bool firm,
    required bool allowDms,
    required Map<String, dynamic> metadata,
    String? listingNo,
  }) {
    final data = SaleListingData(
      skin: skin,
      card: CardObjectRef(
        cardName: _fallback(source.cardName, 'Card listing'),
        setLine: source.setLine,
        cardImageUrl: _blankToNull(source.cardImageUrl),
      ),
      listingNo: listingNo ?? 'DRAFT',
      price: _normalizePrice(price),
      firm: firm,
      condition: _fallback(condition, 'Condition available'),
      quantity: quantity < 1 ? 1 : quantity,
      sellerHandle: _fallback(source.sellerHandle, 'Collector'),
      sellerRating: source.sellerRating,
      sellerTradeCount: source.sellerTradeCount < 0
          ? 0
          : source.sellerTradeCount,
      allowDms: allowDms,
    );
    return GrookaiObject(
      type: 'sale',
      skin: skin,
      layout: 'sale.v1',
      fields: data.toFields(),
      metadata: metadata,
    );
  }

  static GrookaiObject fromSavedListing({
    required GrookaiSaleListingSource source,
    required GrookaiObjectSkin skin,
    required SaleListingSaveResult listing,
    required String condition,
    required int quantity,
    required bool firm,
    required bool allowDms,
  }) {
    return fromTerms(
      source: source,
      skin: skin,
      price: listing.price,
      condition: condition,
      quantity: quantity,
      firm: firm,
      allowDms: allowDms,
      listingNo: listingNoFor(listing.instanceId),
      metadata: <String, dynamic>{
        'gvvi_id': listing.gvviId,
        'vault_item_instance_id': listing.instanceId,
        'vault_item_id': listing.vaultItemId,
        'card_print_id': listing.cardPrintId,
        'intent': listing.intent,
        'allow_dms': allowDms,
      },
    );
  }

  static String listingNoFor(String id) {
    final cleaned = id.replaceAll(RegExp(r'[^A-Za-z0-9]'), '').toUpperCase();
    if (cleaned.isEmpty) {
      return '001';
    }
    return cleaned.length <= 6
        ? cleaned.padLeft(3, '0')
        : cleaned.substring(cleaned.length - 6);
  }
}

class GrookaiLotListingItemSource {
  const GrookaiLotListingItemSource({
    this.cardPrintId,
    this.gvviId,
    required this.cardName,
    this.setName,
    this.setCode,
    this.collectorNumber,
    this.printedTotal,
    this.variantLabel,
    required this.condition,
    required this.price,
    this.marketPrice,
    this.imageUrl,
  });

  final String? cardPrintId;
  final String? gvviId;
  final String cardName;
  final String? setName;
  final String? setCode;
  final String? collectorNumber;
  final int? printedTotal;
  final String? variantLabel;
  final String condition;

  /// Immutable market reference used to seed, and later compare with, the
  /// seller-controlled price.
  final double? marketPrice;
  final double price;
  final String? imageUrl;

  String get setAndNumberLine {
    final normalizedSet = (setName ?? setCode ?? '').trim();
    final normalizedNumber = (collectorNumber ?? '').trim();
    final numberWithTotal = normalizedNumber.isEmpty
        ? ''
        : printedTotal != null &&
              printedTotal! > 0 &&
              !normalizedNumber.contains('/')
        ? '$normalizedNumber/$printedTotal'
        : normalizedNumber;
    if (normalizedSet.isNotEmpty && numberWithTotal.isNotEmpty) {
      return '$normalizedSet · $numberWithTotal';
    }
    return normalizedSet.isNotEmpty ? normalizedSet : numberWithTotal;
  }

  factory GrookaiLotListingItemSource.fromVaultRow({
    required Map<String, dynamic> row,
    required double? marketPrice,
    required String condition,
    required String? imageUrl,
    CardPrint? canonicalCard,
    String? meaningfulFinishLabel,
  }) {
    final identity = resolveDisplayIdentityFromFields(
      name: canonicalCard?.name ?? row['name']?.toString(),
      variantKey: canonicalCard?.variantKey ?? row['variant_key']?.toString(),
      printedIdentityModifier:
          canonicalCard?.printedIdentityModifier ??
          row['printed_identity_modifier']?.toString(),
      setIdentityModel:
          canonicalCard?.setIdentityModel ??
          row['set_identity_model']?.toString(),
      setCode: canonicalCard?.setCode ?? row['set_code']?.toString(),
      number: canonicalCard?.displayNumber ?? row['number']?.toString(),
    );
    final identitySuffix = (identity.suffix ?? '').trim();
    final variantParts = <String>{
      if (identitySuffix.isNotEmpty && !_isDefaultOnlyFinish(identitySuffix))
        identitySuffix,
      if ((meaningfulFinishLabel ?? '').trim().isNotEmpty)
        meaningfulFinishLabel!.trim(),
    };
    return GrookaiLotListingItemSource(
      cardPrintId: canonicalCard?.id ?? row['card_id']?.toString(),
      gvviId: row['gv_vi_id']?.toString(),
      cardName: identity.baseName,
      setName: canonicalCard?.setName ?? row['set_name']?.toString(),
      setCode: canonicalCard?.setCode ?? row['set_code']?.toString(),
      collectorNumber:
          canonicalCard?.displayNumber ?? row['number']?.toString(),
      printedTotal: canonicalCard?.printedTotal,
      variantLabel: variantParts.isEmpty ? null : variantParts.join(' · '),
      condition: condition,
      marketPrice: marketPrice,
      price: marketPrice ?? 0,
      imageUrl: imageUrl,
    );
  }
}

class GrookaiLotListingSource {
  const GrookaiLotListingSource({
    required this.title,
    required this.items,
    this.sellerHandle = 'Collector',
    this.sellerRating = 0,
    this.sellerTradeCount = 0,
  });

  final String title;
  final List<GrookaiLotListingItemSource> items;
  final String sellerHandle;
  final double sellerRating;
  final int sellerTradeCount;
}

class GrookaiLotListingAdapter {
  const GrookaiLotListingAdapter._();

  static GrookaiObject fromTerms({
    required GrookaiLotListingSource source,
    required GrookaiObjectSkin skin,
    required double bundlePrice,
    required Map<String, dynamic> metadata,
    String? listingNo,
  }) {
    final items = source.items
        .take(kGrookaiLotMaxCards)
        .map(
          (item) => LotItem(
            cardPrintId: _blankToNull(item.cardPrintId),
            gvviId: _blankToNull(item.gvviId),
            cardName: _fallback(item.cardName, 'Card'),
            setName: _blankToNull(item.setName),
            setCode: _blankToNull(item.setCode),
            collectorNumber: _blankToNull(item.collectorNumber),
            printedTotal: item.printedTotal,
            variantLabel: _blankToNull(item.variantLabel),
            condition: _fallback(item.condition, 'Raw NM'),
            marketPrice: item.marketPrice == null
                ? null
                : _normalizePrice(item.marketPrice!),
            price: _normalizePrice(item.price),
            imageUrl: _blankToNull(item.imageUrl),
          ),
        )
        .toList(growable: false);
    final data = LotListingData(
      skin: skin,
      listingNo: listingNo ?? 'DRAFT',
      title: _fallback(source.title, 'Vault Lot'),
      items: items.isEmpty
          ? const [LotItem(cardName: 'Card', condition: 'Raw NM', price: 0)]
          : items,
      bundlePrice: _normalizePrice(bundlePrice),
      sellerHandle: _fallback(source.sellerHandle, 'Collector'),
      sellerRating: source.sellerRating,
      sellerTradeCount: source.sellerTradeCount < 0
          ? 0
          : source.sellerTradeCount,
    );
    return GrookaiObject(
      type: 'lot',
      skin: skin,
      layout: 'lot.v1',
      fields: data.toFields(),
      metadata: metadata,
    );
  }

  static String listingNoFor(Iterable<String> ids) {
    final joined = ids
        .map((id) => id.replaceAll(RegExp(r'[^A-Za-z0-9]'), '').toUpperCase())
        .where((id) => id.isNotEmpty)
        .join();
    if (joined.isEmpty) {
      return 'LOT';
    }
    return joined.length <= 6 ? joined.padLeft(3, '0') : joined.substring(0, 6);
  }
}

double _normalizePrice(double value) {
  if (!value.isFinite || value < 0) {
    return 0;
  }
  return double.parse(value.toStringAsFixed(2));
}

String _fallback(String? value, String fallback) {
  final normalized = (value ?? '').trim();
  return normalized.isEmpty ? fallback : normalized;
}

String? _blankToNull(String? value) {
  final normalized = (value ?? '').trim();
  return normalized.isEmpty ? null : normalized;
}

bool _isDefaultOnlyFinish(String value) {
  return const {
    'holo',
    'normal',
    'standard',
  }.contains(value.trim().toLowerCase());
}
