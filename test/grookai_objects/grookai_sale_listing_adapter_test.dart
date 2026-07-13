import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/grookai_sale_listing.dart';
import 'package:grookai_vault/services/grookai_objects/sale_listing_service.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_skin.dart';

void main() {
  test('saved sale listing maps to generic sale Grookai object object', () {
    final object = GrookaiSaleListingAdapter.fromSavedListing(
      source: const GrookaiSaleListingSource(
        cardName: 'Umbreon VMAX',
        setLine: 'Evolving Skies #215',
        cardImageUrl: 'https://example.test/umbreon.webp',
        sellerHandle: 'Casey',
      ),
      skin: GrookaiObjectSkin.onyx,
      listing: const SaleListingSaveResult(
        instanceId: '33333333-3333-3333-3333-333333333333',
        gvviId: 'GVVI-123',
        vaultItemId: 'VAULT-123',
        cardPrintId: 'CARD-123',
        intent: 'sell',
        price: 420,
        currency: 'USD',
      ),
      condition: 'PSA 10',
      quantity: 1,
      firm: true,
      allowDms: true,
    );

    expect(object.type, 'sale');
    expect(object.layout, 'sale.v1');
    expect(object.skin, GrookaiObjectSkin.onyx);
    expect(object.fields['cardName'], 'Umbreon VMAX');
    expect(object.fields['setLine'], 'Evolving Skies #215');
    expect(object.fields['price'], 420);
    expect(object.fields['condition'], 'PSA 10');
    expect(object.fields['sellerHandle'], 'Casey');
    expect(object.fields['allowDms'], isTrue);
    expect(object.metadata['intent'], 'sell');
    expect(object.metadata['vault_item_id'], 'VAULT-123');
  });

  test('draft sale listing keeps skin in envelope and normalizes values', () {
    final object = GrookaiSaleListingAdapter.fromTerms(
      source: const GrookaiSaleListingSource(cardName: '', setLine: ''),
      skin: GrookaiObjectSkin.kraft,
      price: -1,
      condition: '',
      quantity: 0,
      firm: false,
      allowDms: false,
      metadata: const <String, dynamic>{},
    );

    expect(object.skin, GrookaiObjectSkin.kraft);
    expect(object.fields['cardName'], 'Card listing');
    expect(object.fields['price'], 0);
    expect(object.fields['condition'], 'Condition available');
    expect(object.fields['quantity'], 1);
    expect(object.fields['allowDms'], isFalse);
  });

  test('lot listing maps selected vault rows to generic lot card object', () {
    final object = GrookaiLotListingAdapter.fromTerms(
      source: const GrookaiLotListingSource(
        title: 'Mixed SIR Lot',
        sellerHandle: 'Casey',
        items: [
          GrookaiLotListingItemSource(
            cardName: 'Charizard ex',
            condition: 'Raw NM',
            price: 120,
            imageUrl: 'https://example.test/charizard.webp',
          ),
          GrookaiLotListingItemSource(
            cardName: 'Blastoise ex',
            condition: 'Raw LP',
            price: 80,
          ),
        ],
      ),
      skin: GrookaiObjectSkin.ivory,
      bundlePrice: 175,
      metadata: const <String, dynamic>{
        'card_print_ids': ['CARD-1', 'CARD-2'],
      },
      listingNo: 'LOT123',
    );

    expect(object.type, 'lot');
    expect(object.layout, 'lot.v1');
    expect(object.skin, GrookaiObjectSkin.ivory);
    expect(object.fields['title'], 'Mixed SIR Lot');
    expect(object.fields['bundlePrice'], 175);
    expect(object.fields['sellerHandle'], 'Casey');
    expect(object.fields['items'], hasLength(2));
    expect(object.metadata['card_print_ids'], ['CARD-1', 'CARD-2']);
  });
}
