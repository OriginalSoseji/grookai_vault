import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/intake/intake_models.dart';
import 'package:grookai_vault/services/intake/intake_cost_allocation.dart';
import 'package:grookai_vault/services/scanner_v5/scanner_v5_identity_service.dart';

IntakeItem item(String id, {int? value, int? cost, int qty = 1}) => IntakeItem(
  id: id,
  captureId: 'photo',
  imagePath: '',
  selected: ScannerV5Candidate.fromJson({
    'card_id': '00000000-0000-4000-8000-000000000001',
    'name': id,
  }),
  state: 'confirmed',
  referenceValueCents: value,
  manualTotalCents: cost,
  quantity: qty,
);
void main() {
  test(
    'money parsing distinguishes blank, zero, exact cents and rejects overflow',
    () {
      expect(parseIntakeMoney(''), isNull);
      expect(parseIntakeMoney('0'), 0);
      expect(parseIntakeMoney('1,200.05'), 120005);
      for (final input in [
        '-1',
        '1.005',
        '1,2',
        '999999999999999999999999999999',
      ]) {
        expect(() => parseIntakeMoney(input), throwsFormatException);
      }
    },
  );
  test(
    'proportional lot cost counts each duplicate copy and retains reserve',
    () {
      final result = allocateIntakeCosts(
        items: [item('a', value: 6000), item('b', value: 2000, qty: 2)],
        availableCents: 12001,
        reserveCents: 2001,
      );
      expect(result.valid, isTrue);
      expect(result.costs, {
        'a': [6000],
        'b': [2000, 2000],
      });
      expect(result.remainingCents, 2001);
    },
  );
  test(
    'manual row lock splits across copies and remaining values round exactly',
    () {
      final result = allocateIntakeCosts(
        items: [
          item('lock', cost: 101, qty: 2),
          item('a', value: 1),
          item('b', value: 1),
          item('c', value: 1),
        ],
        availableCents: 201,
      );
      expect(result.costs['lock'], [51, 50]);
      expect(result.costs['a'], [34]);
      expect(result.costs['b'], [33]);
      expect(result.costs['c'], [33]);
      expect(result.remainingCents, 0);
    },
  );
  test('unknown price requires a retained reserve or explicit manual cost', () {
    final items = [item('priced', value: 50), item('unknown')];
    expect(
      allocateIntakeCosts(items: items, availableCents: 1000).valid,
      isFalse,
    );
    final result = allocateIntakeCosts(
      items: items,
      availableCents: 1000,
      reserveCents: 300,
    );
    expect(result.valid, isTrue);
    expect(result.costs['priced'], [700]);
    expect(result.costs['unknown'], [null]);
    expect(result.remainingCents, 300);
  });
  test(
    'blank lot total retains unknown costs while known free lot stores zero',
    () {
      expect(allocateIntakeCosts(items: [item('x')]).costs['x'], [null]);
      expect(
        allocateIntakeCosts(items: [item('x')], availableCents: 0).costs['x'],
        [0],
      );
    },
  );
  test('over-budget manual costs block allocation', () {
    expect(
      allocateIntakeCosts(
        items: [item('x', cost: 1001)],
        availableCents: 1000,
      ).valid,
      isFalse,
    );
  });
  test('large weights and budget conserve cents without double rounding', () {
    final result = allocateIntakeCosts(
      items: [
        item('a', value: 99999999999, qty: 100),
        item('b', value: 33333333333, qty: 100),
      ],
      availableCents: 100000000000,
      reserveCents: 17,
    );
    expect(result.allocatedCents, 99999999983);
    expect(result.remainingCents, 17);
    expect(
      result.costs.values.expand((v) => v).every((v) => v != null && v >= 0),
      isTrue,
    );
  });
  test('saved copies never participate in a later batch allocation', () {
    final saved = item('saved', value: 100000)
      ..savedInstanceIds = ['owned-copy'];
    final result = allocateIntakeCosts(
      items: [saved, item('new', value: 1)],
      availableCents: 100,
    );
    expect(result.costs.containsKey('saved'), isFalse);
    expect(result.costs['new'], [100]);
  });
}
