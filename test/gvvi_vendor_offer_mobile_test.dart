import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/gvvi/gvvi_vendor_offer_service.dart';

void main() {
  test('vendor offer parser accepts only the bounded public contract', () {
    final offer = GvviVendorOffer.fromJson({
      'schema_version': 'GVVI_VENDOR_OFFER_PUBLIC_V1',
      'gvvi_id': 'GVVI-065CAB28-001319',
      'vendor': {
        'slug': 'imnotcesar',
        'display_name': 'ImNotCesar',
        'avatar_url': 'https://example.test/avatar.png',
      },
      'offer': {
        'asking_price_amount': 5,
        'asking_price_currency': 'usd',
        'condition_label': 'NM',
        'availability': 'available',
      },
    });

    expect(offer, isNotNull);
    expect(offer!.askingPriceAmount, 5);
    expect(offer.askingPriceCurrency, 'USD');
    expect(offer.conditionLabel, 'NM');
  });

  test('invalid, unavailable, or zero-price offers fail closed', () {
    Map<String, dynamic> payload(Object? amount, String availability) => {
      'schema_version': 'GVVI_VENDOR_OFFER_PUBLIC_V1',
      'gvvi_id': 'GVVI-065CAB28-001319',
      'vendor': {'slug': 'vendor', 'display_name': 'Vendor'},
      'offer': {
        'asking_price_amount': amount,
        'asking_price_currency': 'USD',
        'availability': availability,
      },
    };

    expect(GvviVendorOffer.fromJson(payload(0, 'available')), isNull);
    expect(GvviVendorOffer.fromJson(payload(5, 'sold')), isNull);
    expect(
      GvviVendorOffer.fromJson({
        ...payload(5, 'available'),
        'schema_version': 'unknown',
      }),
      isNull,
    );
  });

  test('persistent QR URL is independent of mutable offer fields', () {
    expect(
      buildPersistentGvviQrUri('GVVI-065CAB28-001319').toString(),
      'https://grookaivault.com/q/GVVI-065CAB28-001319',
    );
  });
}
