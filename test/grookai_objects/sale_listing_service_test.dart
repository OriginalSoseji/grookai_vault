import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/grookai_objects/sale_listing_service.dart';

void main() {
  test(
    'save listing writes exact-copy sale intent and asking price fields',
    () async {
      final writes = <String, dynamic>{};
      final service = SaleListingService(
        currentUserId: 'user-1',
        persist:
            ({required userId, required instanceId, required values}) async {
              writes['userId'] = userId;
              writes['instanceId'] = instanceId;
              writes['values'] = values;
              return <String, dynamic>{
                'id': instanceId,
                'gv_vi_id': 'GVVI-123',
                'card_print_id': 'CARD-123',
                'intent': 'sell',
                'asking_price_amount': values['asking_price_amount'],
                'asking_price_currency': values['asking_price_currency'],
                'asking_price_note': values['asking_price_note'],
              };
            },
      );

      final result = await service.saveSingleCardListing(
        instanceId: 'INSTANCE-123',
        gvviId: 'GVVI-123',
        vaultItemId: 'VAULT-123',
        cardPrintId: 'CARD-123',
        price: 42.499,
        note: 'Local pickup available.',
      );

      expect(writes['userId'], 'user-1');
      expect(writes['instanceId'], 'INSTANCE-123');
      expect(writes['values'], <String, dynamic>{
        'intent': 'sell',
        'pricing_mode': 'asking',
        'asking_price_amount': 42.5,
        'asking_price_currency': 'USD',
        'asking_price_note': 'Local pickup available.',
      });
      expect(result.intent, 'sell');
      expect(result.price, 42.5);
      expect(result.vaultItemId, 'VAULT-123');
    },
  );

  test('save listing rejects invalid price before persistence', () async {
    final service = SaleListingService(
      currentUserId: 'user-1',
      persist: ({required userId, required instanceId, required values}) {
        fail('invalid listing should not persist');
      },
    );

    await expectLater(
      service.saveSingleCardListing(
        instanceId: 'INSTANCE-123',
        gvviId: 'GVVI-123',
        vaultItemId: 'VAULT-123',
        cardPrintId: 'CARD-123',
        price: 0,
      ),
      throwsA(isA<Exception>()),
    );
  });
}
