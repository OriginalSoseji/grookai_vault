import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/vault/copy_cost_models.dart';

const owner = '11111111-1111-4111-8111-111111111111';
const instance = '22222222-2222-4222-8222-222222222222';
const request = '33333333-3333-4333-8333-333333333333';
CopyCostRequest make({
  String? amount = '12.00',
  String? currency = 'USD',
  String? expectedAmount,
}) => CopyCostRequest(
  ownerId: owner,
  requestId: request,
  instanceId: instance,
  expectedAmount: expectedAmount,
  expectedCurrency: null,
  amount: amount,
  currency: currency,
);

void main() {
  test('zero is explicit and unknown is a separate null pair', () {
    expect(CopyCostInput.parse('0', 'cad').minor, '0');
    expect(CopyCostInput.parse('0', 'cad').currency, 'CAD');
    expect(CopyCostInput.parse('', '').amount, isNull);
    expect(() => CopyCostInput.parse('0', ''), throwsFormatException);
    expect(() => CopyCostInput.parse('', 'USD'), throwsFormatException);
  });
  test(
    'decimal normalization is exact at the maximum and with trailing zeroes',
    () {
      expect(CopyCostInput.parse('9999999999.99', 'USD').minor, '999999999999');
      expect(CopyCostInput.parse('00012.3400', 'USD').amount, '12.34');
      expect(CopyCostInput.parse('.50', 'USD').amount, '0.50');
      expect(CopyCostInput.parse('1.', 'USD').amount, '1.00');
      expect(
        () => CopyCostInput.parse('10000000000', 'USD'),
        throwsFormatException,
      );
    },
  );
  for (final invalid in [
    '-1',
    '1.001',
    'NaN',
    'Infinity',
    '1e2',
    '1,000',
    '+1',
    '.',
    '1/2',
  ]) {
    test('cost never rounds or invents a value for $invalid', () {
      expect(() => CopyCostInput.parse(invalid, 'USD'), throwsFormatException);
    });
  }
  test('legacy negative evidence survives expected-pair roundtrip', () {
    final original = make(expectedAmount: '-12.123');
    expect(
      CopyCostRequest.fromJson(original.toJson()).expectedAmount,
      '-12.123',
    );
    expect(original.rpcParams['p_expected_currency'], isNull);
  });
  test(
    'request rejects changed shape, noncanonical input and wrong identities',
    () {
      expect(
        () => CopyCostRequest.fromJson({...make().toJson(), 'extra': true}),
        throwsFormatException,
      );
      expect(
        () =>
            CopyCostRequest.fromJson({...make().toJson(), 'requestId': 'bad'}),
        throwsFormatException,
      );
      expect(() => make(amount: '12'), throwsFormatException);
      expect(() => make(currency: 'usd'), throwsFormatException);
    },
  );
  test('confirmation binds all identities and exact currency and amount', () {
    final value = make();
    final confirmed = {
      'ownerId': owner,
      'instanceId': instance,
      'requestId': request,
      'cost': {
        'amount': '12.000',
        'currency': 'USD',
        'minor': '1200',
        'status': 'known',
      },
    };
    expect(value.confirms(confirmed), isTrue);
    for (final field in ['ownerId', 'instanceId', 'requestId']) {
      expect(
        value.confirms({
          ...confirmed,
          field: '44444444-4444-4444-8444-444444444444',
        }),
        isFalse,
      );
    }
    expect(
      value.confirms({
        ...confirmed,
        'cost': {
          'amount': '12.00',
          'currency': 'CAD',
          'minor': '1200',
          'status': 'known',
        },
      }),
      isFalse,
    );
    expect(
      value.confirms({
        ...confirmed,
        'cost': {
          'amount': '12.00',
          'currency': 'USD',
          'minor': '1201',
          'status': 'known',
        },
      }),
      isFalse,
    );
  });
  test(
    'unknown confirmation requires unknown evidence and clears both fields',
    () {
      final value = make(amount: null, currency: null);
      expect(
        value.confirms({
          'ownerId': owner,
          'instanceId': instance,
          'requestId': request,
          'cost': {
            'amount': null,
            'currency': null,
            'minor': null,
            'status': 'missing_amount',
          },
        }),
        isTrue,
      );
      expect(
        value.confirms({
          'ownerId': owner,
          'instanceId': instance,
          'requestId': request,
          'cost': {
            'amount': '0',
            'currency': 'USD',
            'minor': '0',
            'status': 'known',
          },
        }),
        isFalse,
      );
    },
  );
  test('malformed evidence is never displayed as a known cost', () {
    expect(
      const CopyCostEvidence(
        amount: '12',
        currency: null,
        minor: null,
        status: 'missing_currency',
      ).label,
      'Cost currency needed',
    );
    expect(
      const CopyCostEvidence(
        amount: '12',
        currency: 'USD',
        minor: '1300',
        status: 'known',
      ).label,
      'Cost needs review',
    );
    expect(
      const CopyCostEvidence(
        amount: '0',
        currency: 'USD',
        minor: '0',
        status: 'known',
      ).label,
      'USD 0.00',
    );
  });
}
