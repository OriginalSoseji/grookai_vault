import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/purchase_drafts.dart';
import 'package:grookai_vault/services/sales/sales_drafts.dart';
import 'package:grookai_vault/services/sales/sales_payments.dart';

const purchaseDraftId = '22222222-2222-4222-8222-222222222222';
const purchaseRequestId = '33333333-3333-4333-8333-333333333333';
Map<String, dynamic> quickPurchaseLine({int amount = 650}) => {
  'description': 'Quick card',
  'quantity': 1,
  'unitMinor': amount,
  'referenceMinor': 1000,
  'rateBps': 6500,
  'cardId': null,
  'printingId': null,
  'condition': null,
  'addToVault': false,
};
Map<String, dynamic> samplePurchaseDraft() => addPurchaseItem(
  blankPurchaseDraft(purchaseDraftId, 'Sample shop'),
  quickPurchaseLine(),
);

void main() {
  test('empty and zero held offers are editable, but cannot be completed', () {
    for (final draft in [
      blankPurchaseDraft(purchaseDraftId, ''),
      addPurchaseItem(
        blankPurchaseDraft(purchaseDraftId, 'Shop'),
        quickPurchaseLine(amount: 0),
      ),
    ]) {
      expect(validatePurchaseDraft(draft), draft);
      expect(
        () => purchaseDraftRequest(draft, purchaseRequestId, confirmed: true),
        throwsFormatException,
      );
    }
  });
  test(
    'legacy sales coexist with explicit purchase drafts only in book v2',
    () {
      final sale = blankSalesDraft('legacy-sale', 'Shop');
      final book = {
        'version': 2,
        'revision': 4,
        'active': purchaseDraftId,
        'drafts': [sale, samplePurchaseDraft()],
      };
      final parsed = readSalesDrafts(jsonEncode(book));
      expect(parsed['drafts'][0], sale);
      expect(parsed['drafts'][1], samplePurchaseDraft());
      expect(
        () => readSalesDrafts(jsonEncode({...book, 'version': 1})),
        throwsStateError,
      );
      expect(
        () => readSalesDrafts(
          jsonEncode({
            ...book,
            'drafts': [
              {...sale, 'kind': 'unknown'},
            ],
          }),
        ),
        throwsStateError,
      );
    },
  );
  test(
    'editing references preserves agreed amount and private preview omits evidence',
    () {
      final source = samplePurchaseDraft();
      final draft = validatePurchaseDraft({
        ...source,
        'note': 'Secret note',
        'customer': {
          ...source['customer'] as Map,
          'email': 'private@example.test',
        },
        'items': [
          {...quickPurchaseLine(), 'referenceMinor': 2000},
        ],
      });
      expect(purchaseDraftTotal(draft), 650);
      expect(purchaseOfferView(draft), {
        'kind': 'purchase',
        'storeName': 'Sample shop',
        'purchaseMinor': 650,
        'items': [
          {'description': 'Quick card', 'quantity': 1, 'unitMinor': 650},
        ],
      });
    },
  );
  for (final method in salesTenderMethods) {
    test('explicit confirmation and exact single payout: $method', () {
      final draft = {...samplePurchaseDraft(), 'method': method};
      expect(
        () => purchaseDraftRequest(draft, purchaseRequestId, confirmed: false),
        throwsFormatException,
      );
      final request = purchaseDraftRequest(
        draft,
        purchaseRequestId,
        confirmed: true,
      );
      expect(request['cart']['payments'], [
        {'method': method, 'amountMinor': 650, 'tenderedMinor': 650},
      ]);
    });
  }
  test(
    'split payout keeps incomplete editing but final amount must reconcile',
    () {
      final draft = {
        ...samplePurchaseDraft(),
        'payments': [
          {'method': 'Cash', 'amountMinor': 400, 'tenderedMinor': 400},
        ],
      };
      expect(validatePurchaseDraft(draft), draft);
      expect(
        () => purchaseDraftRequest(draft, purchaseRequestId, confirmed: true),
        throwsStateError,
      );
      final finalDraft = {
        ...draft,
        'payments': [
          ...draft['payments'] as List,
          {'method': 'Other', 'amountMinor': 250, 'tenderedMinor': 250},
        ],
      };
      expect(
        purchaseDraftRequest(
          finalDraft,
          purchaseRequestId,
          confirmed: true,
        )['cart']['payments'],
        hasLength(2),
      );
      expect(
        () => validatePurchaseDraft({...draft, 'payments': null}),
        throwsFormatException,
      );
    },
  );
  test(
    'drafts reject unknown fields, excess items and unsafe quick intake',
    () {
      expect(
        () => validatePurchaseDraft({...samplePurchaseDraft(), 'tax': '1'}),
        throwsFormatException,
      );
      expect(
        () => addPurchaseItem(samplePurchaseDraft(), {
          ...quickPurchaseLine(),
          'addToVault': true,
        }),
        throwsFormatException,
      );
      expect(
        () => validatePurchaseDraft({
          ...samplePurchaseDraft(),
          'items': List.generate(51, (_) => quickPurchaseLine()),
        }),
        throwsFormatException,
      );
    },
  );
}
