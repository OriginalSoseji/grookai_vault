import 'dart:async';
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
import 'package:grookai_vault/widgets/pricing/card_marketplace_sheet.dart';
import 'package:grookai_vault/services/navigation/pending_personal_card_action.dart';
import 'package:grookai_vault/screens/auth/sign_in_continuation_screen.dart';
import 'support/collector_refinement/main.dart';

const parent = 'a36f8d8a-353f-4cca-ba89-912eb7f10c3a';
const reverse = '33333333-3333-4333-8333-333333333333';
const conditions = {
  'NM': 'Near Mint',
  'LP': 'Lightly Played',
  'MP': 'Moderately Played',
  'HP': 'Heavily Played',
  'DMG': 'Damaged',
};

Map<String, dynamic> publication(String printing, {bool qualified = true}) => {
  'link': qualified
      ? {
          'card_print_id': parent,
          'card_printing_id': printing,
          'finish': printing == reverse ? 'Reverse Holofoil' : 'Holofoil',
          'language': 'English',
          'conditions': [
            for (final entry in conditions.entries)
              {
                'code': entry.key,
                'label': entry.value,
                'url': Uri.https('www.tcgplayer.com', '/product/610758', {
                  'Condition': entry.value,
                  'Language': 'English',
                  'Printing': printing == reverse
                      ? 'Reverse Holofoil'
                      : 'Holofoil',
                }).toString(),
              },
          ],
        }
      : null,
};

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final urls = <Uri>[];
  final pending = <String, Completer<http.Response>>{};
  var mode = 'ok';
  var launchWorks = true;
  var twoFinishes = false;
  var requests = 0;
  Completer<http.Response>? relatedRead;
  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: 'http://127.0.0.1:54321',
      publishableKey: 'local-inline-test',
      authOptions: const FlutterAuthClientOptions(
        detectSessionInUri: false,
        autoRefreshToken: false,
      ),
      httpClient: MockClient((request) async {
        if (request.url.path == '/rest/v1/card_prints' &&
            request.url.queryParameters['name'] == 'eq.Eevee') {
          if (mode == 'related-delayed') {
            relatedRead ??= Completer<http.Response>();
            return relatedRead!.future;
          }
          if (mode == 'related-error') {
            return http.Response(
              jsonEncode({'message': 'Related versions fixture unavailable'}),
              400,
              headers: {'content-type': 'application/json'},
              request: request,
            );
          }
        }
        if (request.url.path.endsWith('card-marketplace-links-v1')) {
          requests++;
          final id = jsonDecode(request.body)['card_printing_id'] as String;
          if (mode == 'delayed') {
            final completer = Completer<http.Response>();
            pending[id] = completer;
            return completer.future;
          }
          return http.Response(
            jsonEncode(
              mode == 'error'
                  ? {'message': 'offline'}
                  : publication(
                      mode == 'mismatch' ? 'wrong-printing' : id,
                      qualified: mode != 'unavailable',
                    ),
            ),
            mode == 'error' ? 503 : 200,
            request: request,
            headers: {'content-type': 'application/json'},
          );
        }
        if (twoFinishes &&
            request.url.path.endsWith('get_public_card_printing_options_v1')) {
          return http.Response(
            jsonEncode([
              {
                'id': previewPrintingId,
                'card_print_id': parent,
                'finish_key': 'holo',
                'finish_sort_order': 1,
              },
              {
                'id': reverse,
                'card_print_id': parent,
                'finish_key': 'reverse',
                'finish_sort_order': 2,
              },
            ]),
            200,
            request: request,
            headers: {'content-type': 'application/json'},
          );
        }
        final response = await previewRequest(request);
        // Layout/link tests don't need the on-device artwork HTTP/cache stack.
        if (request.url.path == '/rest/v1/card_prints') {
          final rows = jsonDecode(response.body);
          if (rows is List) {
            for (final row in rows.whereType<Map>()) {
              row['gv_id'] = null;
              row['image_url'] = null;
            }
          }
          return http.Response(
            jsonEncode(rows),
            response.statusCode,
            request: request,
            headers: {'content-type': 'application/json'},
          );
        }
        return response;
      }),
    );
  });
  tearDownAll(() => Supabase.instance.dispose());
  setUp(() {
    urls.clear();
    pending.clear();
    mode = 'ok';
    requests = 0;
    launchWorks = true;
    twoFinishes = false;
    relatedRead = null;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
          const MethodChannel('plugins.flutter.io/url_launcher'),
          (call) async {
            if (call.method == 'launch') {
              urls.add(Uri.parse((call.arguments as Map)['url'] as String));
            }
            return launchWorks;
          },
        );
  });
  tearDown(
    () => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
          const MethodChannel('plugins.flutter.io/url_launcher'),
          null,
        ),
  );

  Widget inline(String id) => MaterialApp(
    theme: buildGrookaiTheme(Brightness.dark),
    home: Scaffold(
      body: CardMarketplaceSheet(
        inline: true,
        cardPrintId: parent,
        cardPrintingId: id,
        identity: 'Eevee',
      ),
    ),
  );
  Future<void> drain(WidgetTester tester) async {
    // FunctionsClient crosses real isolate and fake widget-scheduler boundaries.
    for (var i = 0; i < 4; i++) {
      await tester.pump();
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 50)),
      );
      await tester.pumpAndSettle();
    }
  }

  testWidgets('each condition opens its exact published destination directly', (
    tester,
  ) async {
    await tester.pumpWidget(inline(previewPrintingId));
    await drain(tester);
    for (final entry in conditions.entries) {
      await tester.tap(find.widgetWithText(OutlinedButton, entry.key));
      await tester.pumpAndSettle();
      expect(urls.last.queryParameters['Condition'], entry.value);
      expect(urls.last.queryParameters['Printing'], 'Holofoil');
      expect(urls.last.queryParameters['Language'], 'English');
    }
    expect(requests, 1);
  });
  for (final state in ['related-delayed', 'related-error']) {
    testWidgets('$state cannot block verified printing marketplace actions', (
      tester,
    ) async {
      mode = state;
      await tester.pumpWidget(
        MaterialApp(
          theme: buildGrookaiTheme(Brightness.dark),
          home: const CardDetailScreen(cardPrintId: parent, name: 'Eevee'),
        ),
      );
      try {
        await drain(tester);
        if (state == 'related-delayed') {
          expect(relatedRead, isNotNull);
          expect(relatedRead!.isCompleted, false);
        }
        expect(
          find.text(
            'Exact printing is unavailable. Marketplace links need a verified finish.',
          ),
          findsNothing,
        );
        final lp = find.widgetWithText(OutlinedButton, 'LP');
        await tester.ensureVisible(lp);
        await tester.tap(lp);
        await tester.pumpAndSettle();
        expect(urls.single.queryParameters['Condition'], 'Lightly Played');
        expect(urls.single.queryParameters['Printing'], 'Holofoil');
      } finally {
        if (relatedRead != null && !relatedRead!.isCompleted) {
          relatedRead!.complete(http.Response('[]', 200));
        }
        await drain(tester);
      }
    });
  }
  for (final state in ['unavailable', 'mismatch']) {
    testWidgets('$state never exposes condition links', (tester) async {
      mode = state;
      await tester.pumpWidget(inline(previewPrintingId));
      await drain(tester);
      expect(
        find.text('No qualified exact TCGplayer link for this printing.'),
        findsOneWidget,
      );
      expect(find.byType(OutlinedButton), findsNothing);
      expect(urls, isEmpty);
    });
  }
  testWidgets('failed link read retries without changing printing', (
    tester,
  ) async {
    mode = 'error';
    await tester.pumpWidget(inline(previewPrintingId));
    await drain(tester);
    expect(find.text('Marketplace links could not be loaded.'), findsOneWidget);
    mode = 'ok';
    await tester.tap(find.text('Retry TCGplayer'));
    await drain(tester);
    await tester.tap(find.widgetWithText(OutlinedButton, 'LP'));
    await tester.pumpAndSettle();
    expect(urls.single.queryParameters['Printing'], 'Holofoil');
    expect(requests, 2);
  });
  testWidgets('old finish response cannot replace a newer selection', (
    tester,
  ) async {
    mode = 'delayed';
    await tester.pumpWidget(inline(previewPrintingId));
    await drain(tester);
    await tester.pumpWidget(inline(reverse));
    await drain(tester);
    expect(find.byType(OutlinedButton), findsNothing);
    pending[reverse]!.complete(
      http.Response(
        jsonEncode(publication(reverse)),
        200,
        headers: {'content-type': 'application/json'},
      ),
    );
    await drain(tester);
    pending[previewPrintingId]!.complete(
      http.Response(
        jsonEncode(publication(previewPrintingId)),
        200,
        headers: {'content-type': 'application/json'},
      ),
    );
    await drain(tester);
    expect(find.text('Reverse Holofoil · English'), findsOneWidget);
    await tester.tap(find.widgetWithText(OutlinedButton, 'LP'));
    await tester.pumpAndSettle();
    expect(urls.single.queryParameters['Printing'], 'Reverse Holofoil');
  });
  testWidgets('browser launch failure stays actionable', (tester) async {
    launchWorks = false;
    await tester.pumpWidget(inline(previewPrintingId));
    await drain(tester);
    await tester.tap(find.widgetWithText(OutlinedButton, 'NM'));
    await tester.pumpAndSettle();
    expect(find.text('Could not open TCGplayer. Try again.'), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, 'NM'), findsOneWidget);
  });
  for (final brightness in Brightness.values) {
    for (final scale in [1.0, 1.6]) {
      for (final size in [const Size(384, 824), const Size(1100, 800)]) {
        testWidgets('card market fits $brightness $scale $size', (
          tester,
        ) async {
          await tester.binding.setSurfaceSize(size);
          addTearDown(() => tester.binding.setSurfaceSize(null));
          await tester.pumpWidget(
            MaterialApp(
              theme: buildGrookaiTheme(brightness),
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(
                  context,
                ).copyWith(textScaler: TextScaler.linear(scale)),
                child: child!,
              ),
              home: const CardDetailScreen(cardPrintId: parent, name: 'Eevee'),
            ),
          );
          await drain(tester);
          final lp = find.widgetWithText(OutlinedButton, 'LP');
          await tester.ensureVisible(lp);
          await tester.pumpAndSettle();
          expect(lp.hitTestable(), findsOneWidget);
          if (scale == 1 && size.width < 500) {
            expect(tester.getBottomLeft(lp).dy, lessThan(650));
          }
          final ebay = find.text('Active listings');
          await tester.ensureVisible(ebay);
          await tester.tap(ebay);
          await tester.pumpAndSettle();
          expect(
            urls.single.queryParameters['_nkw'],
            'Eevee Scarlet & Violet Promos 173 Holo',
          );
          expect(tester.takeException(), isNull);
        });
      }
    }
  }
  testWidgets(
    'finish choice is available beside market before Collection tab',
    (tester) async {
      twoFinishes = true;
      await tester.pumpWidget(
        MaterialApp(
          theme: buildGrookaiTheme(Brightness.dark),
          home: const CardDetailScreen(cardPrintId: parent, name: 'Eevee'),
        ),
      );
      await drain(tester);
      expect(requests, 0);
      await tester.tap(find.text('Choose finish'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Reverse Holo'));
      await drain(tester);
      expect(find.text('Finish · Reverse Holo'), findsOneWidget);
      await tester.tap(find.widgetWithText(OutlinedButton, 'LP'));
      await tester.pumpAndSettle();
      expect(urls.single.queryParameters['Printing'], 'Reverse Holofoil');
      expect(urls.single.queryParameters['Condition'], 'Lightly Played');
    },
  );
  testWidgets(
    'Collection selection controls market and the signed-out add continuation',
    (tester) async {
      twoFinishes = true;
      PendingPersonalCardActionCoordinator.clearForTesting();
      addTearDown(PendingPersonalCardActionCoordinator.clearForTesting);
      await tester.pumpWidget(
        MaterialApp(
          theme: buildGrookaiTheme(Brightness.dark),
          home: const CardDetailScreen(cardPrintId: parent, name: 'Eevee'),
        ),
      );
      await drain(tester);
      await tester.tap(find.text('Collection'));
      await tester.pumpAndSettle();
      final reverseChoice = find.text('Reverse Holo');
      expect(
        tester.getTopLeft(reverseChoice).dy,
        lessThan(tester.getTopLeft(find.text('No pricing data available')).dy),
        reason: 'Printing choice should precede market data on Collection.',
      );
      await tester.ensureVisible(reverseChoice);
      await tester.tap(reverseChoice);
      await drain(tester);
      final selectedMarket = find.text('View selected market');
      await tester.ensureVisible(selectedMarket);
      await tester.tap(selectedMarket);
      await tester.pumpAndSettle();
      final lp = find.widgetWithText(OutlinedButton, 'LP');
      expect(lp.hitTestable(), findsOneWidget);
      await tester.tap(lp);
      await tester.pumpAndSettle();
      expect(urls.single.queryParameters['Printing'], 'Reverse Holofoil');
      final active = find.text('Active listings');
      await tester.ensureVisible(active);
      await tester.tap(active);
      await tester.pumpAndSettle();
      expect(
        urls.last.queryParameters['_nkw'],
        'Eevee Scarlet & Violet Promos 173 Reverse Holo',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Add to Vault'));
      await tester.pumpAndSettle();
      expect(find.text('Sign in to add to Vault'), findsOneWidget);
      await tester.tap(find.text('Sign in to add'));
      await tester.pumpAndSettle();
      expect(find.byType(SignInContinuationScreen), findsOneWidget);
      final pending = PendingPersonalCardActionCoordinator.pending!;
      expect(pending.cardPrintingId, reverse);
      expect(pending.finishLabel, 'Reverse Holo');
      expect(Supabase.instance.client.auth.currentUser, isNull);
      Navigator.of(
        tester.element(find.byType(SignInContinuationScreen)),
      ).pop(false);
      await tester.pumpAndSettle();
      expect(PendingPersonalCardActionCoordinator.pending, isNull);
    },
  );
}
