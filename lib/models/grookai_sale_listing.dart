import '../services/grookai_objects/sale_listing_service.dart';
import '../services/identity/display_identity.dart';
import '../widgets/grookai_objects/grookai_object_models.dart';
import '../widgets/grookai_objects/grookai_object.dart';
import '../widgets/grookai_objects/grookai_object_skin.dart';

const int kGrookaiLotMaxCards = 12;

class GrookaiSaleListingSource {
  const GrookaiSaleListingSource({
    required this.cardName,
    required this.setLine,
    this.printingIdentityLabel = 'Printing not recorded',
    this.cardImageUrl,
    this.cardImageFallbackUrl,
    this.sellerHandle = 'Collector',
    this.sellerRating = 0,
    this.sellerTradeCount = 0,
  });

  final String cardName;
  final String setLine;
  final String printingIdentityLabel;
  final String? cardImageUrl;
  final String? cardImageFallbackUrl;
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
        printingIdentityLabel: _fallback(
          source.printingIdentityLabel,
          'Printing not recorded',
        ),
        cardImageUrl: _blankToNull(source.cardImageUrl),
        cardImageFallbackUrl: _blankToNull(source.cardImageFallbackUrl),
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
    this.printingIdentityLabel = 'Printing not recorded',
    this.imageUrl,
    this.fallbackImageUrl,
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

  /// Immutable market reference. [price] remains seller-controlled.
  final double? marketPrice;
  final double price;
  final String printingIdentityLabel;
  final String? imageUrl;
  final String? fallbackImageUrl;

  String get setAndNumberLine => _lotSetAndNumberLine(
    setName: setName,
    setCode: setCode,
    collectorNumber: collectorNumber,
    printedTotal: printedTotal,
  );

  factory GrookaiLotListingItemSource.fromVaultRow({
    required Map<String, dynamic> row,
    required double? marketPrice,
    required String condition,
    required String? imageUrl,
    String? fallbackImageUrl,
    String? meaningfulVariantLabel,
  }) {
    final identity = resolveDisplayIdentityFromFields(
      name: row['name']?.toString(),
      variantKey: row['variant_key']?.toString(),
      printedIdentityModifier: row['printed_identity_modifier']?.toString(),
      setIdentityModel: row['set_identity_model']?.toString(),
      setCode: row['set_code']?.toString(),
      number: row['number']?.toString(),
    );
    final variants = <String>{
      ?_meaningfulLotVariant(identity.suffix),
      ?_meaningfulLotVariant(meaningfulVariantLabel),
    };
    final variantLabel = variants.isEmpty ? null : variants.join(' · ');

    return GrookaiLotListingItemSource(
      cardPrintId: row['card_id']?.toString(),
      gvviId: row['gv_vi_id']?.toString(),
      cardName: identity.baseName,
      setName: row['set_name']?.toString(),
      setCode: row['set_code']?.toString(),
      collectorNumber: row['number']?.toString(),
      variantLabel: variantLabel,
      condition: condition,
      marketPrice: marketPrice,
      price: marketPrice ?? 0,
      printingIdentityLabel: variantLabel ?? 'Printing not recorded',
      imageUrl: imageUrl,
      fallbackImageUrl: fallbackImageUrl,
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
            printingIdentityLabel: _fallback(
              item.printingIdentityLabel,
              'Printing not recorded',
            ),
            condition: _fallback(item.condition, 'Raw NM'),
            marketPrice: item.marketPrice == null
                ? null
                : _normalizePrice(item.marketPrice!),
            price: _normalizePrice(item.price),
            imageUrl: _blankToNull(item.imageUrl),
            fallbackImageUrl: _blankToNull(item.fallbackImageUrl),
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

String _lotSetAndNumberLine({
  required String? setName,
  required String? setCode,
  required String? collectorNumber,
  required int? printedTotal,
}) {
  final normalizedSet = (setName ?? setCode ?? '').trim();
  final normalizedNumber = (collectorNumber ?? '').trim();
  final numberWithTotal = normalizedNumber.isEmpty
      ? ''
      : printedTotal != null &&
            printedTotal > 0 &&
            !normalizedNumber.contains('/')
      ? '$normalizedNumber/$printedTotal'
      : normalizedNumber;
  if (normalizedSet.isNotEmpty && numberWithTotal.isNotEmpty) {
    return '$normalizedSet · $numberWithTotal';
  }
  return normalizedSet.isNotEmpty ? normalizedSet : numberWithTotal;
}

String? _meaningfulLotVariant(String? value) {
  var normalized = (value ?? '').trim();
  if (normalized.toLowerCase().startsWith('printing:')) {
    normalized = normalized.substring('printing:'.length).trim();
  }
  if (normalized.isEmpty ||
      const {
        'holo',
        'normal',
        'standard',
        'printing not recorded',
        'printing status unavailable',
        'exact printing assigned',
        'unassigned',
      }.contains(normalized.toLowerCase())) {
    return null;
  }
  return normalized;
}
