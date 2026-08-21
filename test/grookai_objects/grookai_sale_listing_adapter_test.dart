import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/grookai_sale_listing.dart';
import 'package:grookai_vault/services/grookai_objects/sale_listing_service.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_models.dart';
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
            cardPrintId: 'CARD-1',
            cardName: 'Charizard ex',
            setName: 'Obsidian Flames',
            collectorNumber: '223',
            printedTotal: 197,
            variantLabel: 'Pokémon Center Stamp',
            condition: 'Raw NM',
            marketPrice: 125,
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
    final firstItem = Map<String, dynamic>.from(
      (object.fields['items'] as List).first as Map,
    );
    expect(firstItem['cardPrintId'], 'CARD-1');
    expect(firstItem['setName'], 'Obsidian Flames');
    expect(firstItem['collectorNumber'], '223');
    expect(firstItem['printedTotal'], 197);
    expect(firstItem['variantLabel'], 'Pokémon Center Stamp');
    expect(firstItem['marketPrice'], 125);
    expect(object.metadata['card_print_ids'], ['CARD-1', 'CARD-2']);
  });

  test('lot listing caps emitted items at the supported maximum', () {
    final object = GrookaiLotListingAdapter.fromTerms(
      source: GrookaiLotListingSource(
        title: 'Oversized Lot',
        items: [
          for (var index = 0; index < kGrookaiLotMaxCards + 3; index += 1)
            GrookaiLotListingItemSource(
              cardName: 'Card $index',
              condition: 'Raw NM',
              price: index.toDouble(),
            ),
        ],
      ),
      skin: GrookaiObjectSkin.onyx,
      bundlePrice: 100,
      metadata: const <String, dynamic>{},
    );

    expect(object.fields['items'], hasLength(kGrookaiLotMaxCards));
  });

  test(
    'lot identity suppresses default finish and keeps meaningful finish',
    () {
      final baseRow = <String, dynamic>{
        'card_id': 'CARD-1',
        'name': 'Pikachu',
        'set_name': 'Ascended Heroes',
        'number': '25',
        'variant_key': 'holo',
      };

      final soleFinish = GrookaiLotListingItemSource.fromVaultRow(
        row: baseRow,
        marketPrice: 10,
        condition: 'Raw NM',
        imageUrl: null,
      );
      final siblingFinish = GrookaiLotListingItemSource.fromVaultRow(
        row: baseRow,
        marketPrice: 10,
        condition: 'Raw NM',
        imageUrl: null,
        meaningfulFinishLabel: 'Reverse Holo',
      );

      expect(soleFinish.variantLabel, isNull);
      expect(soleFinish.marketPrice, 10);
      expect(soleFinish.price, 10);
      expect(siblingFinish.variantLabel, 'Reverse Holo');
    },
  );

  test('lot estimated value remains tied to market after seller override', () {
    final object = GrookaiLotListingAdapter.fromTerms(
      source: const GrookaiLotListingSource(
        title: 'Market Reference Lot',
        items: [
          GrookaiLotListingItemSource(
            cardName: 'Pikachu',
            condition: 'Raw NM',
            marketPrice: 25,
            price: 20,
          ),
          GrookaiLotListingItemSource(
            cardName: 'Raichu',
            condition: 'Raw NM',
            marketPrice: 15,
            price: 12,
          ),
        ],
      ),
      skin: GrookaiObjectSkin.onyx,
      bundlePrice: 30,
      metadata: const <String, dynamic>{},
    );

    final data = LotListingData.fromFields(object.skin, object.fields);
    expect(data.estimatedValue, 40);
    expect(data.items.map((item) => item.price), [20, 12]);
  });
}
