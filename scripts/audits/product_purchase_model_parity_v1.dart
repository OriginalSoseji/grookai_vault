import 'dart:convert';
import 'dart:io';
import 'package:grookai_vault/services/sales/sales_purchase.dart';

dynamic canonical(dynamic value) {
  if (value is Map) {
    final keys = value.keys.cast<String>().toList()..sort();
    return {for (final key in keys) key: canonical(value[key])};
  }
  if (value is List) return value.map(canonical).toList();
  return value;
}

void main() {
  final fixture =
      jsonDecode(
            File('test/fixtures/sales_purchase_web_v1.json').readAsStringSync(),
          )
          as Map;
  var passed = 0;
  for (final example in fixture['cases'] as List) {
    final args = example['args'] as List, expected = example['expected'] as Map;
    Object? error;
    dynamic actual;
    try {
      actual = switch (example['action']) {
        'offer' => purchaseOffer(args[0], args[1]),
        'request' => purchaseRequest(args[0], args[1]),
        'receipt' => validatePurchaseReceipt(args[0]),
        'confirm' => confirmedPurchaseReceipt(args[0], args[1]),
        'public' => purchaseCustomerView(args[0]),
        _ => throw StateError('Unknown parity action'),
      };
    } catch (failure) {
      error = failure;
    }
    if ((error == null) != expected['ok'] ||
        error == null &&
            jsonEncode(canonical(actual)) !=
                jsonEncode(canonical(expected['value']))) {
      throw StateError(
        'Purchase parity failed: ${example['name']}; error=$error; result=${jsonEncode(actual)}',
      );
    }
    if (error != null && error is! FormatException && error is! StateError) {
      throw StateError('Unexpected validation failure: $error');
    }
    passed++;
  }
  stdout.writeln(jsonEncode({'status': 'passed', 'cases': passed}));
}
