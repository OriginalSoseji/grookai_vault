import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/square/square_sync_notifier.dart';

void main() {
  testWidgets('foreground confirmation accepts a real reply after 12 seconds', (
    tester,
  ) async {
    final response = Completer<Map<String, dynamic>>();
    String? result;
    var calls = 0;
    final done = awaitSquareOfferNotification(() {
      calls++;
      return response.future;
    }, waitForConfirmation: true).then((value) => result = value);
    await tester.pump(const Duration(seconds: 13));
    expect(result, isNull);
    response.complete({'status': 'ready'});
    await tester.pump();
    await done;
    expect(result, 'ready');
    expect(calls, 1);
  });

  testWidgets('ordinary post-save wakeups keep their short deadline', (
    tester,
  ) async {
    final response = Completer<Map<String, dynamic>>();
    String? result;
    final done = awaitSquareOfferNotification(
      () => response.future,
    ).then((value) => result = value);
    await tester.pump(const Duration(seconds: 12));
    await done;
    expect(result, 'pending');
    response.complete({'status': 'ready'});
    await tester.pump();
    expect(result, 'pending');
  });

  testWidgets('known pending replies retry confirmation without another save', (
    tester,
  ) async {
    var requests = 0;
    String? result;
    final done = awaitSquareOfferNotification(() async {
      requests++;
      return {'status': requests == 1 ? 'pending' : 'ready'};
    }, waitForConfirmation: true).then((value) => result = value);
    await tester.pump();
    expect(requests, 1);
    expect(result, isNull);
    await tester.pump(const Duration(seconds: 2));
    await done;
    expect(requests, 2);
    expect(result, 'ready');
  });

  testWidgets('persistent busy replies stop after the bounded retry budget', (
    tester,
  ) async {
    var requests = 0;
    String? result;
    final done = awaitSquareOfferNotification(() async {
      requests++;
      return {'status': 'pending'};
    }, waitForConfirmation: true).then((value) => result = value);
    await tester.pump();
    for (final seconds in [2, 4, 8, 12]) {
      await tester.pump(Duration(seconds: seconds));
    }
    await done;
    expect(result, 'pending');
    expect(requests, 5);
    await tester.pump(const Duration(minutes: 2));
    expect(requests, 5);
  });

  testWidgets(
    'late replies cannot restart requests after the overall timeout',
    (tester) async {
      final late = Completer<Map<String, dynamic>>();
      var requests = 0;
      String? result;
      final done = awaitSquareOfferNotification(() async {
        requests++;
        return requests == 1 ? {'status': 'pending'} : late.future;
      }, waitForConfirmation: true).then((value) => result = value);
      await tester.pump();
      await tester.pump(const Duration(seconds: 2));
      expect(requests, 2);
      await tester.pump(const Duration(seconds: 53));
      await done;
      expect(result, 'pending');
      late.complete({'status': 'pending'});
      await tester.pump(const Duration(minutes: 2));
      expect(requests, 2);
      expect(result, 'pending');
    },
  );

  testWidgets('review and disabled are terminal server results', (
    tester,
  ) async {
    for (final status in ['review', 'not_enabled']) {
      var calls = 0;
      String? result;
      final done = awaitSquareOfferNotification(() async {
        calls++;
        return {'status': status};
      }, waitForConfirmation: true).then((value) => result = value);
      await tester.pump();
      await done;
      expect(result, status);
      expect(calls, 1);
    }
  });

  testWidgets('unknown replies and transport failures never invent readiness', (
    tester,
  ) async {
    for (final fails in [false, true]) {
      var calls = 0;
      String? result;
      final done = awaitSquareOfferNotification(() async {
        calls++;
        if (fails) throw StateError('uncertain transport');
        return {'status': 'unexpected'};
      }, waitForConfirmation: true).then((value) => result = value);
      await tester.pump();
      await done;
      expect(result, 'pending');
      expect(calls, 1);
    }
  });
}
