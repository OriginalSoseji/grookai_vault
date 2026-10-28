import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/card_detail_screen.dart';
import 'package:grookai_vault/main.dart' show buildGrookaiTheme;
import 'package:grookai_vault/screens/vault/vault_gvvi_screen.dart';
import 'package:grookai_vault/widgets/card_surface_artwork.dart';

const parent = '11111111-1111-4111-8111-111111111111';
const normal = '22222222-2222-4222-8222-222222222222';
const reverse = '33333333-3333-4333-8333-333333333333';

void main() {
  final requestedPairs = <Map>[];
  final rejectedRequests = <String>[];
  final launchedUrls = <Uri>[];
  const launcherChannel = MethodChannel('plugins.flutter.io/url_launcher');
  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: 'http://127.0.0.1:54321',
      publishableKey: 'local-navigation-test',
      authOptions: const FlutterAuthClientOptions(autoRefreshToken: false),
      httpClient: MockClient((request) async {
        dynamic body;
        final path = request.url.path;
        if (path.endsWith('/vault_mobile_instance_detail_v1')) {
          body = {
            'id': 'local-instance',
            'card_print_id': parent,
            'card_name': 'Test card',
            'card_set_code': 'local',
            'card_set_name': 'Test set',
            'card_number': '7',
            'active_copy_count': 1,
            'condition_label': 'LP',
            'intent': 'hold',
          };
        } else if (path.endsWith('/vault_mobile_instance_pricing_target_v1')) {
          body = [
            {
              'card_print_id': parent,
              'card_printing_id': reverse,
              'is_graded': false,
            },
          ];
        } else if (path.endsWith('/get_public_card_printing_options_v1')) {
          body = [
            {
              'id': normal,
              'card_print_id': parent,
              'finish_key': 'normal',
              'finish_sort_order': 1,
            },
            {
              'id': reverse,
              'card_print_id': parent,
              'finish_key': 'reverse',
              'finish_sort_order': 2,
            },
          ];
        } else if (path == '/rest/v1/card_prints') {
          body = request.url.queryParameters['id']?.startsWith('neq.') == true
              ? []
              : [
                  {
                    'id': parent,
                    'name': 'Test card',
                    'set_code': 'local',
                    'number': '7',
                    'sets': {'name': 'Test set'},
                  },
                ];
        } else if (path.endsWith('/card-marketplace-links-v1')) {
          requestedPairs.add(jsonDecode(request.body) as Map);
          body = {
            'link': {
              'card_print_id': parent,
              'card_printing_id': reverse,
              'finish': 'Reverse Holofoil',
              'language': 'English',
              'conditions': [
                for (final entry in const [
                  ['NM', 'Near Mint'],
                  ['LP', 'Lightly Played'],
                  ['MP', 'Moderately Played'],
                  ['HP', 'Heavily Played'],
                  ['DMG', 'Damaged'],
                ])
                  {
                    'code': entry[0],
                    'label': entry[1],
                    'url': Uri.https('www.tcgplayer.com', '/product/1', {
                      'Condition': entry[1],
                      'Printing': 'Reverse Holofoil',
                      'Language': 'English',
                    }).toString(),
                  },
              ],
            },
          };
        } else if (const [
          'get_card_print_image_faces_v1',
          'get_market_pricing_read_model_v1',
          'collector_memories_for_gvvi_v1',
          'collector_memory_prompt_state_v1',
        ].any((name) => path.endsWith('/$name'))) {
          body = [];
        } else {
          rejectedRequests.add('${request.method} $path');
          return http.Response('{}', 403, request: request);
        }
        return http.Response(
          jsonEncode(body),
          200,
          request: request,
          headers: {'content-type': 'application/json'},
        );
      }),
    );
  });
  tearDownAll(() => Supabase.instance.dispose());
  setUp(() {
    requestedPairs.clear();
    rejectedRequests.clear();
    launchedUrls.clear();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(launcherChannel, (call) async {
          if (call.method == 'launch') {
            final args = call.arguments as Map;
            expect(args['useWebView'], isFalse);
            expect(args['useSafariVC'], isFalse);
            launchedUrls.add(Uri.parse(args['url'] as String));
          }
          return true;
        });
  });
  tearDown(
    () => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(launcherChannel, null),
  );

  for (final brightness in Brightness.values) {
    for (final scale in [1.0, 1.6]) {
      testWidgets(
        'compact copy keeps market actions usable in $brightness at ${scale}x text',
        (tester) async {
          tester.view.physicalSize = const Size(384, 824);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          await tester.pumpWidget(
            MaterialApp(
              theme: buildGrookaiTheme(brightness),
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(
                  context,
                ).copyWith(textScaler: TextScaler.linear(scale)),
                child: child!,
              ),
              home: const VaultGvviScreen(gvviId: 'GVVI-LOCAL'),
            ),
          );
          await tester.pumpAndSettle();
          final art = find.byType(CardSurfaceArtwork).first;
          expect(tester.getSize(art).width, 112);
          expect(tester.widget<CardSurfaceArtwork>(art).borderRadius, 10);
          final tcg = find.text('View LP on TCGplayer');
          if (scale == 1) expect(tester.getBottomLeft(tcg).dy, lessThan(600));
          final ebay = find.text('Active listings');
          await tester.ensureVisible(ebay);
          await tester.tap(ebay);
          await tester.pumpAndSettle();
          expect(
            launchedUrls.single.queryParameters['_nkw'],
            'Test card Test set 7 Reverse Holo',
          );
          expect(
            launchedUrls.single.queryParameters.containsKey('LH_Sold'),
            isFalse,
          );
          expect(rejectedRequests, isEmpty);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  testWidgets(
    'owned LP reverse copy keeps its printing through View card and marketplace handoff',
    (tester) async {
      tester.view.physicalSize = const Size(700, 1200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        MaterialApp(
          theme: buildGrookaiTheme(Brightness.dark),
          home: const VaultGvviScreen(gvviId: 'GVVI-LOCAL'),
        ),
      );
      await tester.pumpAndSettle();
      final direct = find.text('View LP on TCGplayer');
      await tester.ensureVisible(direct);
      await tester.runAsync(() async {
        await tester.tap(direct);
        await Future<void>.delayed(const Duration(milliseconds: 50));
      });
      await tester.pumpAndSettle();
      expect(rejectedRequests, isEmpty);
      expect(requestedPairs, hasLength(1));
      expect(
        launchedUrls,
        hasLength(1),
        reason: tester
            .widgetList<Text>(
              find.descendant(
                of: find.byType(SnackBar),
                matching: find.byType(Text),
              ),
            )
            .map((text) => text.data)
            .join(' '),
      );
      expect(
        launchedUrls.single.queryParameters['Condition'],
        'Lightly Played',
      );
      expect(
        launchedUrls.single.queryParameters['Printing'],
        'Reverse Holofoil',
      );

      final viewCard = find.text('View card');
      await tester.ensureVisible(viewCard);
      await tester.tap(viewCard);
      await tester.pumpAndSettle();
      expect(find.byType(CardDetailScreen), findsOneWidget);
      for (var i = 0; i < 4; i++) {
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 50)),
        );
        await tester.pumpAndSettle();
      }
      final market = find.widgetWithText(OutlinedButton, 'NM');
      expect(
        market,
        findsOneWidget,
        reason: 'The known printing must survive parent navigation.',
      );
      expect(find.textContaining('Reverse Holofoil · English'), findsOneWidget);
      await tester.ensureVisible(market);
      await tester.tap(market);
      await tester.pumpAndSettle();
      expect(launchedUrls.last.queryParameters['Condition'], 'Near Mint');
      expect(launchedUrls.last.queryParameters['Printing'], 'Reverse Holofoil');
      expect(requestedPairs, hasLength(2));
      expect(
        requestedPairs.every(
          (pair) =>
              pair['card_print_id'] == parent &&
              pair['card_printing_id'] == reverse,
        ),
        isTrue,
      );
      expect(rejectedRequests, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'a scan-style parent match requires a finish choice before marketplace navigation',
    (tester) async {
      tester.view.physicalSize = const Size(700, 1200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        MaterialApp(
          theme: buildGrookaiTheme(Brightness.dark),
          home: const CardDetailScreen(cardPrintId: parent, name: 'Test card'),
        ),
      );
      await tester.pumpAndSettle();
      final market = find.widgetWithText(OutlinedButton, 'NM');
      expect(market, findsNothing);
      expect(requestedPairs, isEmpty);
      final collection = find.text('Collection');
      await tester.ensureVisible(collection);
      await tester.tap(collection);
      await tester.pumpAndSettle();
      final finish = find.text('Reverse Holo');
      await tester.ensureVisible(finish);
      await tester.tap(finish);
      await tester.pumpAndSettle();
      for (var i = 0; i < 4; i++) {
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 50)),
        );
        await tester.pumpAndSettle();
      }
      expect(market, findsOneWidget);
      expect(requestedPairs.single['card_printing_id'], reverse);
      expect(
        launchedUrls,
        isEmpty,
        reason: 'Selecting a finish must not guess or launch a condition.',
      );
      final lp = find.widgetWithText(OutlinedButton, 'LP');
      await tester.ensureVisible(lp);
      await tester.tap(lp);
      await tester.pumpAndSettle();
      expect(
        launchedUrls.single.queryParameters['Condition'],
        'Lightly Played',
      );
      expect(
        launchedUrls.single.queryParameters['Printing'],
        'Reverse Holofoil',
      );
      expect(rejectedRequests, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
}
