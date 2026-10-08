import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/vault/portfolio_history.dart';
import 'package:grookai_vault/services/vault/portfolio_history_journal.dart';
import 'helpers/portfolio_history_fakes.dart';

void main() {
  final fixture =
      jsonDecode(
            File('test/fixtures/portfolio_history_v1.json').readAsStringSync(),
          )
          as Map;
  for (final dynamic sample in fixture['cases'] as List) {
    test('native server projection parity ${sample['name']}', () {
      expect(validatePortfolioSummary(sample['before']), sample['before']);
      expect(validatePortfolioSummary(sample['after']), sample['after']);
      expect(
        validatePortfolioComparison(
          sample['comparison'],
          sample['before']['snapshotId'] as String,
          sample['after']['snapshotId'] as String,
        ),
        sample['comparison'],
      );
    });
  }
  test(
    'impossible dates and invented owner fields cannot enter a pending request',
    () {
      for (final day in ['2026-02-30', '2026-1-01', '0000-01-01']) {
        expect(
          () => validatePortfolioRequest({
            'version': 1,
            'requestId': portfolioTestId(5),
            'day': day,
          }),
          throwsFormatException,
        );
      }
      expect(
        () => validatePortfolioRequest({
          'version': 1,
          'requestId': portfolioTestId(5),
          'day': portfolioTestDay,
          'ownerId': portfolioTestId(1),
        }),
        throwsFormatException,
      );
    },
  );
  test('coverage corruption and fabricated zero values are rejected', () {
    final point = portfolioTestPoint(owned: 1);
    point['coverage']['priced'] = 1;
    expect(() => validatePortfolioSummary(point), throwsFormatException);
    final valued = Map<String, dynamic>.from(
      portfolioCopy((fixture['cases'] as List).first['after']) as Map,
    );
    valued['totals']['USD']['exact'] = 'Infinity';
    expect(() => validatePortfolioSummary(valued), throwsFormatException);
  });
  test(
    'journal requires exact durable terminal outcome and preserves failed day',
    () {
      final gateway = PortfolioFakeGateway()..failure = 'pricing_unavailable';
      addTearDown(gateway.changes.close);
      final owner = gateway.ownerId!,
          request = {
            'version': 1,
            'requestId': portfolioTestId(5),
            'day': portfolioTestDay,
          };
      final staged = changePortfolioJournal(null, {
        'ownerId': owner,
        'expectedLocalRevision': null,
        'nextLocalRevision': portfolioTestId(6),
        'action': 'stage',
        'request': request,
      });
      for (final action in ['discard', 'reset', 'cancel', 'acknowledge']) {
        expect(
          () => changePortfolioJournal(staged, {
            'ownerId': owner,
            'expectedLocalRevision': portfolioTestId(6),
            'nextLocalRevision': portfolioTestId(7),
            'action': action,
            'request': request,
            'acknowledgement': null,
          }),
          throwsFormatException,
        );
      }
      final next = changePortfolioJournal(staged, {
        'ownerId': owner,
        'expectedLocalRevision': portfolioTestId(6),
        'nextLocalRevision': portfolioTestId(7),
        'action': 'acknowledge',
        'request': request,
        'acknowledgement': gateway.result(request, 'failed'),
      });
      expect(next['pending'], null);
      expect(next['lastOutcome']['request']['day'], portfolioTestDay);
      expect(staged['pending'], request);
    },
  );
  test('page watermark and point ordering are enforced', () {
    final page = {
      'version': 1,
      'ownerId': portfolioTestId(1),
      'watermark': '2',
      'points': [portfolioTestPoint(sequence: 2), portfolioTestPoint()],
      'nextBefore': null,
    };
    expect(validatePortfolioPage(page, portfolioTestId(1)), page);
    expect(
      () => validatePortfolioPage(page, portfolioTestId(1), watermark: '1'),
      throwsFormatException,
    );
    page['points'] = [portfolioTestPoint(), portfolioTestPoint(sequence: 2)];
    expect(
      () => validatePortfolioPage(page, portfolioTestId(1)),
      throwsFormatException,
    );
  });
}
