import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/negotiated_draft.dart';
import 'package:grookai_vault/services/sales/sales_drafts.dart';
import 'package:grookai_vault/services/sales/purchase_drafts.dart';

void main() {
  final vectors =
      jsonDecode(
            File(
              'test/fixtures/negotiated_draft_web_v1.json',
            ).readAsStringSync(),
          )
          as Map;
  for (final row in vectors['cases'] as List) {
    test('native negotiated draft: ${row['name']}', () {
      final args = row['args'] as List, before = jsonEncode(row['args']);
      Object? execute() => switch (row['fn']) {
        'newNegotiatedDraft' => newNegotiatedDraft(
          args[0] as String,
          args[1] as String,
        ),
        'validateNegotiatedDraft' => validateNegotiatedDraft(args[0]),
        'negotiatedDraftTotals' => negotiatedDraftTotals(args[0]),
        'negotiatedDraftRequest' => negotiatedDraftRequest(
          args[0],
          args[1] as String,
          args[2] as bool,
        ),
        'negotiatedDraftCustomerView' => negotiatedDraftCustomerView(args[0]),
        _ => throw ArgumentError('Unknown vector function'),
      };
      if (row['expected']['ok'] == true) {
        expect(execute(), row['expected']['value']);
      } else {
        expect(
          execute,
          throwsA(anyOf(isA<FormatException>(), isA<StateError>())),
        );
      }
      expect(
        jsonEncode(args),
        before,
        reason: 'Validation must not mutate saved terms',
      );
    });
  }
  test('native journals preserve old sale, purchase and negotiated drafts', () {
    const owner = '11111111-1111-4111-8111-111111111111',
        id = '22222222-2222-4222-8222-222222222222',
        other = '33333333-3333-4333-8333-333333333333';
    final sale = blankSalesDraft(owner, 'Shop'),
        buy = blankPurchaseDraft(other, 'Shop'),
        trade = newNegotiatedDraft(id, 'Shop');
    final old = {
      'version': 2,
      'revision': 1,
      'active': owner,
      'drafts': [sale, buy],
    };
    expect(readSalesDrafts(jsonEncode(old))['version'], 2);
    final current = {
      ...old,
      'version': 3,
      'active': id,
      'drafts': [sale, buy, trade],
    };
    final read = readSalesDrafts(jsonEncode(current));
    expect((read['drafts'] as List).take(2).toList(), [sale, buy]);
    expect(read['active'], id);
    final discountVersion = readSalesDrafts(
      jsonEncode({...current, 'version': 4}),
    );
    expect(discountVersion['drafts'], read['drafts']);
    expect(discountVersion['active'], id);
    for (final invalid in [
      {...current, 'version': 2},
      {...current, 'version': 5},
      {
        ...current,
        'drafts': [
          sale,
          buy,
          {...trade, 'note': 'x' * 351},
        ],
      },
      {
        ...current,
        'drafts': [sale, buy, trade, trade],
      },
      {...current, 'active': 'missing'},
    ]) {
      expect(() => readSalesDrafts(jsonEncode(invalid)), throwsStateError);
    }
    expect(readSalesDrafts(null)['version'], 1);
  });
}
