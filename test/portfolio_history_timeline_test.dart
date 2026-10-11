import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/vault/portfolio_history_timeline.dart';
import 'helpers/portfolio_history_fakes.dart';

Map<String, dynamic> point(int sequence, int day, String? amount) {
  final p = portfolioTestPoint(sequence: sequence, owned: 1);
  p['capturedAt'] = '2026-10-${day.toString().padLeft(2, '0')}T12:00:00.000Z';
  if (amount != null) {
    p['state'] = 'priced';
    p['totals'] = {
      'USD': {'exact': amount, 'display': '$amount.00'},
    };
    p['coverage']['priced'] = 1;
    p['coverage']['unpriced'] = 0;
    p['coverage']['byKind']['raw'] = {'owned': 1, 'priced': 1, 'unpriced': 0};
    p['coverage']['byReason'] = <String, dynamic>{};
    p['coverage']['byCurrency'] = {'USD': 1};
  }
  return p;
}

void main() {
  test(
    'actual dates determine spacing and unpriced observations remain gaps',
    () {
      final plot = portfolioTimeline([
        point(3, 11, '30'),
        point(2, 2, null),
        point(1, 1, '10'),
      ], 'USD');
      expect(plot.map((p) => [p['x'], p['y']]).toList(), [
        [0, 1000],
        [100, null],
        [1000, 0],
      ]);
      expect(plot[1]['label'], null);
    },
  );
  test(
    'one point has no gain and foreign currencies have no invented zero',
    () {
      expect(
        portfolioTimeline([
          point(1, 1, '10'),
        ], 'USD').map((p) => [p['x'], p['y']]).toList(),
        [
          [500, 500],
        ],
      );
      expect(portfolioTimeline([point(1, 1, '10')], 'CAD').single['y'], null);
    },
  );
  test('large exact values plot without floating point overflow', () {
    final huge = '1${'0' * 900}', more = '2${'0' * 900}';
    final plot = portfolioTimeline([
      point(1, 1, huge),
      point(2, 2, more),
    ], 'USD');
    expect(plot.map((p) => p['y']).toList(), [1000, 0]);
    expect(plot.last['label'], '$more.00');
  });
  test('duplicate sequence and backward dates are rejected', () {
    expect(
      () => portfolioTimeline([point(1, 1, '1'), point(1, 2, '2')], 'USD'),
      throwsFormatException,
    );
    expect(
      () => portfolioTimeline([point(1, 2, '1'), point(2, 1, '2')], 'USD'),
      throwsFormatException,
    );
  });
}
