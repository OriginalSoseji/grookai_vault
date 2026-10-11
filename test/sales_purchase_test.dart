import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/sales_purchase.dart';

void main() {
  final fixture =
      jsonDecode(
            File('test/fixtures/sales_purchase_web_v1.json').readAsStringSync(),
          )
          as Map;
  for (final example in fixture['cases'] as List) {
    test('web/native purchase parity: ${example['name']}', () {
      final args = example['args'] as List;
      dynamic run() => switch (example['action']) {
        'offer' => purchaseOffer(args[0], args[1]),
        'request' => purchaseRequest(args[0], args[1]),
        'receipt' => validatePurchaseReceipt(args[0]),
        'confirm' => confirmedPurchaseReceipt(args[0], args[1]),
        'public' => purchaseCustomerView(args[0]),
        _ => throw StateError('Unknown parity action'),
      };
      if (example['expected']['ok'] == true) {
        expect(run(), example['expected']['value']);
      } else {
        expect(run, throwsA(anyOf(isA<FormatException>(), isA<StateError>())));
      }
    });
  }
  test(
    'purchase requests are deeply immutable without freezing caller data',
    () {
      final example = (fixture['cases'] as List).firstWhere(
        (row) => row['name'] == 'canonical request',
      );
      final input = example['args'][0];
      final result = purchaseRequest(input, example['args'][1]);
      expect(
        () => (result['cart']['items'][0] as Map)['unitMinor'] = 1,
        throwsUnsupportedError,
      );
      input['items'][0]['unitMinor'] = 1;
      expect(result['cart']['items'][0]['unitMinor'], 650);
    },
  );
}
