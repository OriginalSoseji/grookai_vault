import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/vault/copy_cost_review_service.dart';
import 'support/copy_cost_review_fakes.dart';

void main() {
  late ReviewGateway gateway;
  late CopyCostReviewService service;
  setUp(() {
    gateway = ReviewGateway();
    service = CopyCostReviewService(gateway);
  });
  tearDown(() async {
    service.dispose();
    await gateway.changes.close();
  });
  test('zero, foreign currency and absent evidence remain distinct', () async {
    gateway.rows.addAll([
      reviewRow(0),
      reviewRow(1, cost: reviewCost('missing_currency', amount: '0')),
      reviewRow(
        2,
        cost: reviewCost('known', amount: '0', currency: 'USD', minor: '0'),
      ),
      reviewRow(
        3,
        cost: reviewCost(
          'known',
          amount: '12.34',
          currency: 'CAD',
          minor: '1234',
        ),
      ),
      reviewRow(
        4,
        cost: reviewCost('invalid_amount', amount: '-1', currency: 'USD'),
      ),
      reviewRow(5, archived: true),
    ]);
    final rows = await service.read(List.generate(7, reviewId));
    expect(rows.map((row) => row.state), [
      CopyCostReviewState.missingAmount,
      CopyCostReviewState.missingCurrency,
      CopyCostReviewState.known,
      CopyCostReviewState.known,
      CopyCostReviewState.needsReview,
      CopyCostReviewState.unavailable,
      CopyCostReviewState.unavailable,
    ]);
    expect(rows[2].label, 'USD 0.00');
    expect(rows[3].label, 'CAD 12.34');
    expect(rows.where((row) => row.needsAttention).length, 3);
    expect(() => rows.clear(), throwsUnsupportedError);
  });
  test(
    '201 copies are read in 100/100/1 batches, preserving requested order',
    () async {
      gateway.rows.addAll(List.generate(201, (index) => reviewRow(index)));
      final rows = await service.read([
        ...List.generate(201, reviewId),
        reviewId(0).toUpperCase(),
      ]);
      expect(gateway.calls.map((batch) => batch.length), [100, 100, 1]);
      expect(rows.map((row) => row.instanceId), List.generate(201, reviewId));
    },
  );
  test(
    'empty scope reads nothing; invalid or oversized scopes fail before dispatch',
    () async {
      expect(await service.read([]), isEmpty);
      await expectLater(service.read(['invalid']), throwsFormatException);
      await expectLater(
        service.read(List.generate(10001, reviewId)),
        throwsFormatException,
      );
      expect(gateway.calls, isEmpty);
    },
  );
  test('a failed later batch never publishes partial coverage', () async {
    gateway.respond = (ids) async {
      if (gateway.calls.length == 2) throw StateError('network');
      return {'ownerId': reviewOwner, 'editEnabled': false, 'copies': []};
    };
    await expectLater(
      service.read(List.generate(201, reviewId)),
      throwsStateError,
    );
    expect(gateway.calls.length, 2);
  });
  test('superseded scope cancels before another batch', () async {
    var current = true;
    gateway.respond = (ids) async {
      current = false;
      return {'ownerId': reviewOwner, 'editEnabled': true, 'copies': []};
    };
    await expectLater(
      service.read(List.generate(201, reviewId), isCurrent: () => current),
      throwsStateError,
    );
    expect(gateway.calls.length, 1);
  });
  test(
    'away-and-back account changes invalidate late and future reads',
    () async {
      final pending = Completer<Object?>();
      gateway.respond = (_) => pending.future;
      final expectation = expectLater(
        service.read([reviewId(0)]),
        throwsStateError,
      );
      gateway.change(null);
      gateway.change(reviewOwner);
      pending.complete({
        'ownerId': reviewOwner,
        'editEnabled': true,
        'copies': [reviewRow(0)],
      });
      await expectation;
      await expectLater(service.read([]), throwsStateError);
    },
  );
  test('observed owner mismatch permanently prevents reads', () async {
    gateway.ownerId = reviewId(8);
    await expectLater(service.read([reviewId(0)]), throwsStateError);
    gateway.ownerId = reviewOwner;
    await expectLater(service.read([]), throwsStateError);
    expect(gateway.calls, isEmpty);
  });
  test('disposal prevents further reads', () async {
    service.dispose();
    await expectLater(service.read([reviewId(0)]), throwsStateError);
    expect(gateway.calls, isEmpty);
  });
  for (final kind in ['owner', 'duplicate', 'unrequested', 'shape', 'cost']) {
    test('rejects $kind response instead of inventing missing cost', () async {
      gateway.respond = (_) async => {
        'ownerId': kind == 'owner' ? reviewId(8) : reviewOwner,
        'editEnabled': true,
        'copies': switch (kind) {
          'duplicate' => [reviewRow(0), reviewRow(0)],
          'unrequested' => [reviewRow(1)],
          'shape' => [
            {'instanceId': reviewId(0)},
          ],
          'cost' => [
            {'instanceId': reviewId(0), 'archived': false, 'cost': 12},
          ],
          _ => [reviewRow(0)],
        },
      };
      await expectLater(service.read([reviewId(0)]), throwsFormatException);
    });
  }
  test(
    'contradictory known evidence needs review and cannot count as covered',
    () async {
      gateway.rows.addAll([
        reviewRow(
          0,
          cost: reviewCost('known', amount: '1', currency: 'USD', minor: '200'),
        ),
        reviewRow(
          1,
          cost: reviewCost('known', amount: '1', currency: 'usd', minor: '100'),
        ),
        reviewRow(2, cost: reviewCost('missing_amount', amount: '5')),
      ]);
      expect(
        (await service.read(
          List.generate(3, reviewId),
        )).every((row) => row.state == CopyCostReviewState.needsReview),
        isTrue,
      );
    },
  );
}
