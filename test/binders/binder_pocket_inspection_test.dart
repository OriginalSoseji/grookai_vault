import 'dart:convert';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/widgets/binders/binder_pocket_sheet.dart';
import 'package:grookai_vault/widgets/binders/binder_slot_choice_sheet.dart';
import 'package:grookai_vault/screens/binders/binder_custom_checklist_screen.dart';
import 'binder_refinement_test.dart' as f;
import 'binder_editor_navigation_test.dart' as nav;
import 'binder_checklist_find_test.dart' as search;
import 'binder_draft_exit_test.dart' as exit;
import 'binder_drag_arrangement_test.dart' as drag;
import 'binder_grid_size_test.dart' as grid;
import 'binder_move_history_test.dart' as history;

const conditions = {
  'NM': 'Near Mint',
  'LP': 'Lightly Played',
  'MP': 'Moderately Played',
  'HP': 'Heavily Played',
  'DMG': 'Damaged',
};
const exact = BinderCustomSlotDraft(
  card: f.card,
  finish: f.reverseFinish,
  requiredQuantity: 3,
);
const any = BinderCustomSlotDraft(
  card: f.card,
  finish: f.anyFinish,
  requiredQuantity: 2,
);
final inspection = find.byType(BinderPocketSheet);
final close = find.byTooltip('Close card inspection');
final urls = <Uri>[];
final bodies = <Map<String, dynamic>>[];
var mode = 'ok';
var launchWorks = true;
Completer<http.Response>? pending;

Map<String, dynamic> publication(Map<String, dynamic> body) => {
  'link': mode == 'unavailable'
      ? null
      : {
          'card_print_id': body['card_print_id'],
          'card_printing_id': mode == 'mismatch'
              ? 'wrong-child'
              : body['card_printing_id'],
          'finish': body['card_printing_id'] == 'exact-reverse'
              ? 'Reverse Holo'
              : 'Holofoil',
          'language': 'English',
          'conditions': [
            for (final c in conditions.entries)
              {
                'code': c.key,
                'label': c.value,
                'url': Uri.https('www.tcgplayer.com', '/product/610758', {
                  'Condition': c.value,
                  'Language': 'English',
                  'Printing': body['card_printing_id'] == 'exact-reverse'
                      ? 'Reverse Holo'
                      : 'Holofoil',
                }).toString(),
              },
          ],
        },
};

Future<void> drain(WidgetTester tester) async {
  for (var i = 0; i < 3; i++) {
    await tester.pump();
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 40)),
    );
    await tester.pumpAndSettle();
  }
}

Future<void> show(
  WidgetTester tester,
  BinderCustomSlotDraft slot, {
  bool canEdit = false,
  Brightness brightness = Brightness.dark,
  double scale = 1,
  void Function(BinderPocketAction?)? result,
}) async {
  await tester.pumpWidget(
    f.app(
      Scaffold(
        body: Builder(
          builder: (context) => TextButton(
            onPressed: () async {
              final action = await showBinderPocketSheet(
                context,
                slot: slot,
                pocketNumber: 12,
                canEdit: canEdit,
              );
              result?.call(action);
            },
            child: const Text('Open'),
          ),
        ),
      ),
      mode: brightness,
      scale: scale,
    ),
  );
  await tester.tap(find.text('Open'));
  await drain(tester);
}

Future<void> scrollTo(WidgetTester tester, Finder target) async {
  await tester.scrollUntilVisible(
    target,
    160,
    scrollable: find.descendant(
      of: find.byKey(const ValueKey('binder-pocket-inspection-scroll')),
      matching: find.byType(Scrollable),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> inspectMenu(WidgetTester tester) async {
  await nav.openOptions(tester);
  await tester.tap(find.text('Inspect card'));
  await drain(tester);
}

void main() {
  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: 'http://127.0.0.1:54321',
      publishableKey: 'local-pocket-test',
      authOptions: const FlutterAuthClientOptions(autoRefreshToken: false),
      httpClient: MockClient((request) async {
        if (request.url.host != '127.0.0.1' ||
            !request.url.path.endsWith('card-marketplace-links-v1')) {
          throw StateError('Unexpected request: ${request.url.path}');
        }
        final body = Map<String, dynamic>.from(jsonDecode(request.body));
        bodies.add(body);
        if (mode == 'pending') {
          pending = Completer<http.Response>();
          return pending!.future;
        }
        return http.Response(
          jsonEncode(
            mode == 'error' ? {'message': 'offline'} : publication(body),
          ),
          mode == 'error' ? 503 : 200,
          headers: {'content-type': 'application/json'},
        );
      }),
    );
  });
  tearDownAll(() => Supabase.instance.dispose());
  setUp(() {
    mode = 'ok';
    launchWorks = true;
    pending = null;
    urls.clear();
    bodies.clear();
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

  testWidgets(
    'exact requirement opens all five qualified condition destinations without inferring condition',
    (tester) async {
      await show(tester, exact);
      expect(find.text('Pocket 12'), findsOneWidget);
      expect(find.text('Reverse Holo · 3 copies required'), findsOneWidget);
      expect(find.text('Checklist requirement'), findsOneWidget);
      expect(bodies, [
        {'card_print_id': 'parent-eevee', 'card_printing_id': 'exact-reverse'},
      ]);
      for (final c in conditions.entries) {
        final button = find.widgetWithText(OutlinedButton, c.key);
        await scrollTo(tester, button);
        await tester.tap(button);
        await tester.pumpAndSettle();
        expect(urls.last.host, 'www.tcgplayer.com');
        expect(urls.last.queryParameters, containsPair('Condition', c.value));
        expect(
          urls.last.queryParameters,
          containsPair('Printing', 'Reverse Holo'),
        );
        expect(urls.last.queryParameters, containsPair('Language', 'English'));
      }
      expect(urls.length, 5);
      expect(bodies.length, 1);
      expect(find.textContaining('owned'), findsNothing);
    },
  );

  testWidgets(
    'any-finish requirement ignores catalog preference and searches eBay without invented finish',
    (tester) async {
      const slot = BinderCustomSlotDraft(
        card: BinderCatalogCard(
          cardPrintId: 'parent-eevee',
          name: 'Eevee',
          setLabel: 'Promos',
          number: '173',
          preferredCardPrintingId: 'hint-not-authority',
        ),
        finish: f.anyFinish,
      );
      await show(tester, slot, canEdit: true);
      expect(bodies, isEmpty);
      expect(
        find.text('Choose a finish for exact condition links.'),
        findsOneWidget,
      );
      expect(find.text('NM'), findsNothing);
      for (final sold in [true, false]) {
        final button = find.text(
          sold ? 'eBay sold listings' : 'Active listings',
        );
        await scrollTo(tester, button);
        await tester.tap(button);
        await tester.pumpAndSettle();
        expect(urls.last.queryParameters['_nkw'], 'Eevee Promos 173');
        expect(urls.last.queryParameters['LH_Sold'], sold ? '1' : null);
        expect(urls.last.queryParameters['LH_Complete'], sold ? '1' : null);
      }
      expect(urls.length, 2);
    },
  );

  testWidgets(
    'eBay query preserves printed stamp and exact finish once, with separate sold and active filters',
    (tester) async {
      const slot = BinderCustomSlotDraft(
        card: BinderCatalogCard(
          cardPrintId: 'stamped',
          name: 'Eevee',
          setLabel: 'Promos',
          number: '173',
          printedIdentityModifier: 'pokemon_center_stamp',
        ),
        finish: f.holoFinish,
      );
      await show(tester, slot);
      final button = find.text('eBay sold listings');
      await scrollTo(tester, button);
      await tester.tap(button);
      await tester.pumpAndSettle();
      final terms = urls.single.queryParameters['_nkw']!;
      expect(terms, contains('Pokémon Center Stamp'));
      expect('Holofoil'.allMatches(terms).length, 1);
      expect(terms, contains('173'));
      expect(terms, isNot(contains('required')));
    },
  );

  for (final state in ['unavailable', 'mismatch']) {
    testWidgets(
      '$state fails closed for exact TCGplayer while eBay remains an explicit search',
      (tester) async {
        mode = state;
        await show(tester, exact);
        expect(
          find.text('No qualified exact TCGplayer link for this printing.'),
          findsOneWidget,
        );
        expect(find.text('NM'), findsNothing);
        await scrollTo(tester, find.text('eBay sold listings'));
        expect(
          find.text('Search results may include other printings.'),
          findsOneWidget,
        );
        expect(urls, isEmpty);
      },
    );
  }
  testWidgets('resolver retry retains the exact requirement', (tester) async {
    mode = 'error';
    await show(tester, exact);
    final retry = find.text('Retry TCGplayer');
    await scrollTo(tester, retry);
    mode = 'ok';
    await tester.tap(retry);
    await drain(tester);
    expect(find.text('NM'), findsOneWidget);
    expect(bodies.length, 2);
    expect(bodies.last, bodies.first);
    expect(find.text('Reverse Holo · 3 copies required'), findsOneWidget);
  });
  testWidgets(
    'external launch failure reports recovery without closing the inspection',
    (tester) async {
      await show(tester, exact);
      launchWorks = false;
      final lp = find.widgetWithText(OutlinedButton, 'LP');
      await scrollTo(tester, lp);
      await tester.tap(lp);
      await tester.pumpAndSettle();
      expect(find.text('Could not open TCGplayer. Try again.'), findsOneWidget);
      expect(inspection, findsOneWidget);
    },
  );
  testWidgets(
    'closing while exact-link read is pending cannot update disposed sheet',
    (tester) async {
      mode = 'pending';
      await show(tester, exact);
      expect(pending, isNotNull);
      await tester.tap(close);
      await tester.pumpAndSettle();
      final body = bodies.single;
      mode = 'ok';
      pending!.complete(
        http.Response(
          jsonEncode(publication(body)),
          200,
          headers: {'content-type': 'application/json'},
        ),
      );
      await drain(tester);
      expect(inspection, findsNothing);
      expect(urls, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
  for (final brightness in Brightness.values) {
    for (final size in [
      const Size(320, 640),
      const Size(390, 844),
      const Size(700, 420),
      const Size(1100, 700),
    ]) {
      testWidgets(
        'enlarged inspection scrolls with fixed accessible close $brightness $size',
        (tester) async {
          tester.view.physicalSize = size;
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          await show(
            tester,
            any,
            canEdit: true,
            brightness: brightness,
            scale: 1.6,
          );
          final edit = find.byKey(const ValueKey('binder-pocket-edit'));
          await scrollTo(tester, edit);
          expect(tester.getRect(close).top, greaterThanOrEqualTo(0));
          expect(tester.getSize(close).height, greaterThanOrEqualTo(48));
          await tester.tap(close);
          await tester.pumpAndSettle();
          expect(inspection, findsNothing);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }
  testWidgets(
    'filtered inspector returns to the same query and exits cleanly',
    (tester) async {
      await exit.openEditor(tester);
      await search.search(tester, 'reverse');
      await inspectMenu(tester);
      final sheet = tester.widget<BinderPocketSheet>(inspection);
      expect(sheet.slot.finish.cardPrintingId, 'exact-reverse');
      expect(sheet.slot.requiredQuantity, 3);
      expect(sheet.pocketNumber, 1);
      await tester.tap(close);
      await tester.pumpAndSettle();
      expect(
        tester.widget<TextField>(search.searchField).controller!.text,
        'reverse',
      );
      expect(find.text('1. Eevee'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Open editor'), findsOneWidget);
      expect(find.text('Discard checklist changes?'), findsNothing);
    },
  );
  testWidgets(
    'inspector edit opens the exact filtered original slot, not the first slot',
    (tester) async {
      await tester.pumpWidget(
        f.app(
          BinderCustomChecklistEditorScreen(
            repository: f.TestRepository(),
            initialSlots: const [
              BinderCustomSlotDraft(card: f.card, finish: f.holoFinish),
              exact,
            ],
          ),
        ),
      );
      await tester.pumpAndSettle();
      await search.search(tester, 'reverse');
      await inspectMenu(tester);
      await scrollTo(tester, find.byKey(const ValueKey('binder-pocket-edit')));
      await tester.tap(find.byKey(const ValueKey('binder-pocket-edit')));
      await tester.pumpAndSettle();
      final choice = tester.widget<BinderSlotChoiceSheet>(
        find.byType(BinderSlotChoiceSheet),
      );
      expect(choice.existing!.finish.cardPrintingId, 'exact-reverse');
      expect(choice.existing!.requiredQuantity, 3);
    },
  );
  testWidgets(
    'any-finish inspection leads through explicit finish choice before exact links appear',
    (tester) async {
      await tester.pumpWidget(
        f.app(
          BinderCustomChecklistEditorScreen(
            repository: f.TestRepository(),
            initialSlots: const [any],
          ),
        ),
      );
      await tester.pumpAndSettle();
      await inspectMenu(tester);
      expect(bodies, isEmpty);
      final choose = find.byKey(const ValueKey('binder-pocket-edit'));
      await scrollTo(tester, choose);
      expect(find.text('Choose requirement finish'), findsOneWidget);
      await tester.tap(choose);
      await tester.pumpAndSettle();
      final finish = find.byKey(const ValueKey('custom-finish-exact-holo'));
      await f.reveal(tester, finish);
      await tester.tap(finish);
      final confirm = find.byKey(const ValueKey('binder-slot-confirm'));
      await f.reveal(tester, confirm);
      await tester.tap(confirm);
      await tester.pumpAndSettle();
      expect(find.textContaining('Holofoil · 2 copies'), findsOneWidget);
      await inspectMenu(tester);
      expect(find.text('Holofoil · 2 copies required'), findsOneWidget);
      expect(bodies.single, {
        'card_print_id': 'parent-eevee',
        'card_printing_id': 'exact-holo',
      });
      expect(find.text('NM'), findsOneWidget);
    },
  );

  testWidgets(
    'located card inspection retains location, query and an unarmed move',
    (tester) async {
      await exit.openEditor(tester);
      await search.search(tester, 'reverse');
      await search.locate(tester, 'Eevee');
      final button = find.byKey(const ValueKey('binder-inspect-card'));
      await tester.ensureVisible(button);
      await tester.pumpAndSettle();
      await tester.tap(button);
      await drain(tester);
      final sheet = tester.widget<BinderPocketSheet>(inspection);
      expect(sheet.slot.finish.cardPrintingId, 'exact-reverse');
      expect(sheet.pocketNumber, 1);
      await tester.tap(close);
      await tester.pumpAndSettle();
      expect(find.textContaining('Located pocket 1:'), findsOneWidget);
      expect(find.textContaining('Moving from pocket'), findsNothing);
      await nav.switchView(tester, 'checklist');
      expect(
        tester.widget<TextField>(search.searchField).controller!.text,
        'reverse',
      );
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text('Open editor'), findsOneWidget);
    },
  );

  testWidgets(
    'read-only arrangement inspection preserves move selection, page, and Undo history',
    (tester) async {
      final slots = drag.sampleSlots(12);
      final moves = <List<int>>[];
      await grid.showGrid(tester, grid.localPreferences(), slots, moves);
      await history.move(tester, 0, 1);
      final pocket = find.byKey(const ValueKey('binder-pocket-2'));
      await tester.ensureVisible(pocket);
      await tester.pumpAndSettle();
      await tester.tapAt(tester.getTopLeft(pocket) + const Offset(20, 20));
      await tester.pumpAndSettle();
      final inspect = find.byKey(const ValueKey('binder-inspect-card'));
      await tester.ensureVisible(inspect);
      await tester.pumpAndSettle();
      await tester.tap(inspect);
      await drain(tester);
      expect(tester.widget<BinderPocketSheet>(inspection).pocketNumber, 3);
      expect(find.byKey(const ValueKey('binder-pocket-edit')), findsNothing);
      await tester.tap(close);
      await tester.pumpAndSettle();
      expect(find.text('Moving from pocket 3'), findsOneWidget);
      expect(moves, [
        [0, 1],
      ]);
      await history.action(tester, 'undo');
      expect(moves, [
        [0, 1],
        [1, 0],
      ]);
    },
  );
}
