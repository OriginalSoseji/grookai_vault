import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/discounted_draft.dart';

void main() {
  final rows =
      jsonDecode(
            File('test/fixtures/discounted_draft_v1.json').readAsStringSync(),
          )
          as List;
  const id = 'a2000000-0000-4000-8000-000000000001';
  for (final row in rows) {
    test('discounted draft: ${row['name']}', () {
      final before = jsonEncode(row);
      Map<String, dynamic> validate() => validateDiscountedDraft(row['draft']);
      Map<String, dynamic> request() =>
          discountedDraftRequest(row['draft'], id, true);
      if (row['draftValid'] == true) {
        expect(validate(), row['draft']);
      } else {
        expect(validate, throwsA(anything));
      }
      if (row['requestValid'] == true) {
        final r = request();
        expect(r['cart']['version'], 6);
        expect(r['cart']['discountMinor'], row['draft']['discountMinor']);
      } else {
        expect(request, throwsA(anything));
      }
      expect(jsonEncode(row), before);
    });
  }
  test('new draft, totals, review and private customer projection', () {
    final draft = rows.first['draft'],
        fresh = newDiscountedDraft(draft['id'] as String);
    expect(fresh['kind'], 'discounted-sale');
    expect(fresh['discountMinor'], 0);
    expect(() => discountedDraftRequest(draft, id, false), throwsA(anything));
    expect(discountedDraftTotals(draft), {
      'subtotal': 200,
      'discount': 20,
      'credit': 0,
      'total': 185,
      'balance': 185,
    });
    final view = discountedDraftCustomerView(draft);
    expect(view['discount'], 20);
    for (final secret in [
      'PRIVATE_NOTE',
      'PRIVATE_WANTS',
      'PRIVATE_CUSTOMER_NOTE',
      'private@example.invalid',
      draft['items'][0]['instanceId'],
    ]) {
      expect(jsonEncode(view), isNot(contains(secret)));
    }
  });
}
