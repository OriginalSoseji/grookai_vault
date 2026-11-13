import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/square/square_screen.dart';
import 'package:grookai_vault/services/square/square_service.dart';
import 'package:grookai_vault/services/square/square_link_return.dart';

class Gateway implements SquareGateway {
  bool connected = true,
      locationFails = false,
      preferencesFail = false,
      requiresReconnect = false;
  String? savedLocation;
  bool enabled = false;
  int reads = 0;
  final calls = <(String, Map<String, dynamic>)>[];
  List<Map<String, dynamic>> locations = [
    {'id': 'one', 'name': 'My shop'},
  ];
  @override
  Future<Map<String, dynamic>> workspace() async {
    reads++;
    return jsonDecode(
          jsonEncode({
            'linkingEnabled': true,
            'catalogEnabled': true,
            'connections': [
              if (connected)
                {
                  'id': 'connection',
                  'status': requiresReconnect
                      ? 'reconnect_required'
                      : 'connected',
                  'environment': 'production',
                  'locationId': savedLocation,
                  'autoSync': enabled,
                },
            ],
            'commerce': {
              'enabled': true,
              'connections': [
                if (connected)
                  {
                    'id': 'connection',
                    'autoEnroll': enabled,
                    'sellOnSquare': enabled,
                  },
              ],
            },
          }),
        )
        as Map<String, dynamic>;
  }

  @override
  Future<Map<String, dynamic>> call(
    String action,
    Map<String, dynamic> data,
  ) async {
    calls.add((action, Map.of(data)));
    if (action == 'locations') {
      if (locationFails) throw StateError('Unavailable');
      return {'locations': locations};
    }
    if (action == 'link') {
      return {
        'launchUrl':
            'https://grookaivault.com/api/square/oauth/launch?capability=fixture',
      };
    }
    if (action == 'configure') savedLocation = data['locationId'] as String;
    if (action == 'preferences') {
      if (preferencesFail) {
        throw StateError('Setup could not be saved. Try again.');
      }
      enabled = true;
    }
    return {};
  }

  @override
  void dispose() {}
}

class Routes extends NavigatorObserver {
  final names = <String?>[];
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    names.add(route.settings.name);
  }
}

class PendingLink extends Gateway {
  final result = Completer<Map<String, dynamic>>();
  @override
  Future<Map<String, dynamic>> call(String action, Map<String, dynamic> data) =>
      action == 'link' ? result.future : super.call(action, data);
}

Future<void> open(
  WidgetTester tester,
  Gateway gateway, {
  Future<bool> Function(Uri)? launcher,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      home: SquareScreen(gateway: gateway, openAuthorization: launcher),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> enable(WidgetTester tester) async {
  final button = find.widgetWithText(
    FilledButton,
    'Enable automatic Square sales',
  );
  await tester.ensureVisible(button);
  await tester.tap(button);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'an existing seller sees location failures and retry refreshes authorization status',
    (tester) async {
      final gateway = Gateway()
        ..savedLocation = 'one'
        ..enabled = true
        ..locationFails = true;
      await open(tester, gateway);
      expect(
        find.text('Could not load Square locations. Try again.'),
        findsOneWidget,
      );
      gateway.requiresReconnect = true;
      await tester.ensureVisible(find.text('Retry locations'));
      await tester.tap(find.text('Retry locations'));
      await tester.pumpAndSettle();
      expect(
        find.widgetWithText(FilledButton, 'Reconnect Square'),
        findsOneWidget,
      );
      expect(find.text('Automatic Square sales are on'), findsNothing);
      expect(gateway.calls.every((call) => call.$1 == 'locations'), isTrue);
    },
  );
  testWidgets(
    'leaving during a slow link request cannot launch a browser afterward',
    (tester) async {
      final gateway = PendingLink()..connected = false;
      var launches = 0;
      await open(
        tester,
        gateway,
        launcher: (_) async {
          launches++;
          return true;
        },
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Connect Square'));
      await tester.pump();
      await tester.pumpWidget(const MaterialApp(home: SizedBox()));
      gateway.result.complete({
        'launchUrl':
            'https://grookaivault.com/api/square/oauth/launch?capability=fixture',
      });
      await tester.pumpAndSettle();
      expect(launches, 0);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'Square always opens on the named root route and a return reuses it',
    (tester) async {
      final gateway = Gateway(), root = Routes(), nested = Routes();
      final rootKey = GlobalKey<NavigatorState>();
      late BuildContext childContext;
      await tester.pumpWidget(
        MaterialApp(
          navigatorKey: rootKey,
          navigatorObservers: [root],
          home: Navigator(
            observers: [nested],
            onGenerateRoute: (_) => MaterialPageRoute<void>(
              builder: (context) {
                childContext = context;
                return Scaffold(
                  body: TextButton(
                    onPressed: () =>
                        unawaited(SquareScreen.open(context, gateway: gateway)),
                    child: const Text('Connect register'),
                  ),
                );
              },
            ),
          ),
        ),
      );
      await tester.tap(find.text('Connect register'));
      await tester.pumpAndSettle();
      expect(
        root.names.where((name) => name == SquareScreen.routeName),
        hasLength(1),
      );
      expect(nested.names, hasLength(1));
      final reads = gateway.reads;
      await SquareScreen.handleReturn(childContext);
      await tester.pumpAndSettle();
      expect(gateway.reads, reads + 1);
      expect(
        root.names.where((name) => name == SquareScreen.routeName),
        hasLength(1),
      );
      expect(find.text('Finish Square setup'), findsOneWidget);
      rootKey.currentState!.pop();
      await tester.pumpAndSettle();
      expect(find.text('Connect register'), findsOneWidget);
    },
  );
  testWidgets(
    'locations load automatically but no stock or preference write occurs until explicit enable',
    (tester) async {
      final gateway = Gateway();
      await open(tester, gateway);
      expect(gateway.calls.map((call) => call.$1), ['locations']);
      expect(find.text('Finish Square setup'), findsOneWidget);
      expect(find.text('Reconnect Square'), findsNothing);
      await enable(tester);
      final writes = gateway.calls
          .where((call) => call.$1 != 'locations')
          .toList();
      expect(writes.map((call) => call.$1), ['configure', 'preferences']);
      expect(writes.first.$2['locationId'], 'one');
      expect(writes.last.$2['confirmed'], isTrue);
      expect(writes.last.$2['autoEnroll'], isTrue);
      expect(writes.last.$2['sellOnSquare'], isTrue);
      expect(find.text('Automatic Square sales are on'), findsOneWidget);
    },
  );
  testWidgets(
    'multiple locations require an explicit choice rather than silently picking the first',
    (tester) async {
      final gateway = Gateway()
        ..locations = [
          {'id': 'one', 'name': 'First shop'},
          {'id': 'two', 'name': 'Second shop'},
        ];
      await open(tester, gateway);
      final button = find.widgetWithText(
        FilledButton,
        'Enable automatic Square sales',
      );
      expect(tester.widget<FilledButton>(button).onPressed, isNull);
      await tester.ensureVisible(find.byType(DropdownButtonFormField<String>));
      await tester.tap(find.byType(DropdownButtonFormField<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Second shop').last);
      await tester.pumpAndSettle();
      await enable(tester);
      expect(gateway.savedLocation, 'two');
    },
  );
  testWidgets(
    'location outages are recoverable without reconnecting or writing preferences',
    (tester) async {
      final gateway = Gateway()..locationFails = true;
      await open(tester, gateway);
      expect(
        find.text('Could not load Square locations. Try again.'),
        findsOneWidget,
      );
      final button = find.widgetWithText(
        FilledButton,
        'Enable automatic Square sales',
      );
      expect(tester.widget<FilledButton>(button).onPressed, isNull);
      gateway.locationFails = false;
      await tester.ensureVisible(find.text('Retry locations'));
      await tester.tap(find.text('Retry locations'));
      await tester.pumpAndSettle();
      expect(tester.widget<FilledButton>(button).onPressed, isNotNull);
      expect(gateway.calls.every((call) => call.$1 == 'locations'), isTrue);
    },
  );
  testWidgets('a partial setup can be retried and is never shown as complete', (
    tester,
  ) async {
    final gateway = Gateway()..preferencesFail = true;
    await open(tester, gateway);
    await enable(tester);
    expect(find.text('Automatic Square sales are on'), findsNothing);
    expect(find.text('Setup could not be saved. Try again.'), findsOneWidget);
    gateway.preferencesFail = false;
    await enable(tester);
    expect(find.text('Automatic Square sales are on'), findsOneWidget);
  });
  testWidgets(
    'a return during browser launch refreshes after the in-flight operation',
    (tester) async {
      final gateway = Gateway()..connected = false;
      final launch = Completer<bool>();
      Uri? opened;
      await open(
        tester,
        gateway,
        launcher: (uri) {
          opened = uri;
          return launch.future;
        },
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Connect Square'));
      await tester.pump();
      expect(opened?.host, 'grookaivault.com');
      expect(gateway.calls.single.$2['clientReturn'], 'native');
      gateway.connected = true;
      SquareLinkReturn.deliver();
      await tester.pump();
      expect(gateway.reads, 1);
      launch.complete(true);
      await tester.pumpAndSettle();
      expect(gateway.reads, 2);
      expect(find.text('Finish Square setup'), findsOneWidget);
      expect(gateway.calls.map((call) => call.$1), ['link', 'locations']);
    },
  );
  testWidgets(
    'opening an already configured seller leaves all saved settings alone',
    (tester) async {
      final gateway = Gateway()
        ..savedLocation = 'one'
        ..enabled = true;
      await open(tester, gateway);
      expect(find.text('Automatic Square sales are on'), findsOneWidget);
      expect(find.text('Enable automatic Square sales'), findsNothing);
      expect(gateway.calls.map((call) => call.$1), ['locations']);
    },
  );
}
