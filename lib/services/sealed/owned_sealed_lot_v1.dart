import '../../models/grookai_sale_listing.dart';
import 'owned_sealed_service_v1.dart';

GrookaiLotListingItemSource sealedLotItem(
  OwnedSealedCopy copy, {
  String? imageUrl,
}) {
  final currency = copy.text('asking_price_currency');
  if (copy.amount('asking_price_amount') != null && currency != 'USD') {
    throw StateError(
      'This lot supports USD only. Keep other currencies in a separate lot.',
    );
  }
  return GrookaiLotListingItemSource(
    objectKind: 'sealed',
    sealedVariantId: copy.text('sealed_product_variant_id'),
    gvviId: copy.text('gv_vi_id'),
    cardName: copy.name,
    packageIdentity: [
      copy.text('package_form').replaceAll('_', ' '),
      copy.text('language_code').toUpperCase(),
      copy.text('region_code'),
      copy.text('edition'),
      copy.text('wave'),
    ].where((e) => e.isNotEmpty).join(' - '),
    condition:
        '${copy.text('seal_state').replaceAll('_', ' ')} / ${copy.text('package_condition')}',
    printingIdentityLabel: 'Sealed product',
    marketPrice: copy.amount('owned_market_price'),
    price:
        copy.amount('asking_price_amount') ??
        copy.amount('owned_market_price') ??
        0,
    imageUrl: imageUrl,
  );
}
