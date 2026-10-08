import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/offer_policies.dart';

void main() {
  final fixture =
      jsonDecode(
            File('test/fixtures/offer_policies_web_v1.json').readAsStringSync(),
          )
          as Map;
  test('policy vectors bind the reviewed web implementation', () {
    expect(
      sha256
          .convert(
            File('apps/web/src/lib/sales/offerPolicies.mjs').readAsBytesSync(),
          )
          .toString(),
      fixture['sourceSha256'],
    );
  });
  for (final dynamic row in fixture['cases'] as List) {
    test('web/native policy parity: ${row['name']}', () {
      final args = row['args'] as List;
      final before = jsonEncode(args);
      dynamic run() => switch (row['fn']) {
        'validateOfferPolicy' => validateOfferPolicy(args[0]),
        'validateOfferPolicies' => validateOfferPolicies(args[0]),
        'readOfferPolicies' => readOfferPolicies(args[0] as String?),
        'removeOfferPolicy' => removeOfferPolicy(
          Map<String, dynamic>.from(args[0] as Map),
          args[1] as String,
        ),
        'quoteOfferPolicy' => quoteOfferPolicy(
          args[0],
          args[1],
          args[2],
          args[3] as int,
        ),
        'projectOfferMarketReference' => projectOfferMarketReference(
          args[0],
          args[1] as String,
          args[2] as String,
          args[3] as int,
        ),
        _ => throw StateError('Unknown vector'),
      };
      if (row['expected']['ok'] == true) {
        final result = run();
        expect(result, row['expected']['value']);
        expect(() => (result as Map)['mutated'] = true, throwsUnsupportedError);
      } else {
        expect(run, throwsFormatException);
      }
      expect(jsonEncode(args), before);
    });
  }
}
