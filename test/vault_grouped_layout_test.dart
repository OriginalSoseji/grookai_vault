import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/main.dart' show buildGrookaiTheme;
import 'package:grookai_vault/screens/vault/vault_manage_card_screen.dart';
import 'package:grookai_vault/screens/vault/vault_gvvi_screen.dart';
import 'package:grookai_vault/services/vault/vault_card_service.dart';
import 'package:grookai_vault/widgets/card_surface_artwork.dart';
import 'support/collector_refinement/main.dart';
import 'support/collector_refinement/catalog.dart';

void main() {
  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: 'http://127.0.0.1:54321',
      publishableKey: 'local-grouped-test',
      httpClient: MockClient(previewRequest),
      authOptions: const FlutterAuthClientOptions(
        detectSessionInUri: false,
        autoRefreshToken: false,
      ),
    );
  });
  tearDownAll(() => Supabase.instance.dispose());

  Future<void> open(
    WidgetTester tester, {
    Brightness brightness = Brightness.dark,
    Size size = const Size(384, 824),
    double scale = 1,
  }) async {
    tester.view.physicalSize = size;
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
        home: VaultManageCardScreen(
          vaultItemId: 'preview-bucket',
          cardPrintId: previewCatalog.first['id']!,
          ownedCount: 3,
          loadCard: previewGroupedCard,
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  for (final brightness in Brightness.values) {
    for (final scale in [1.0, 1.6]) {
      testWidgets('grouped copies scroll in $brightness with ${scale}x text', (
        tester,
      ) async {
        await open(tester, brightness: brightness, scale: scale);
        expect(tester.widget<TabBar>(find.byType(TabBar)).controller!.index, 1);
        expect(tester.getSize(find.byType(CardSurfaceArtwork).first).width, 96);
        expect(find.text('Raw Unknown'), findsOneWidget);
        expect(
          find.text('Remove'),
          findsNothing,
          reason: 'Destructive controls stay inside the disclosure.',
        );
        await tester.drag(find.byType(NestedScrollView), const Offset(0, -500));
        await tester.pumpAndSettle();
        final last = find.text('GVVI-PREVIEW-000003');
        await tester.ensureVisible(last);
        await tester.pumpAndSettle();
        expect(tester.getCenter(last).dy, inInclusiveRange(0, 824));
        expect(tester.takeException(), isNull);
      });
    }
  }

  testWidgets(
    'copy actions expand without navigation, then the row opens its exact LP copy',
    (tester) async {
      await open(tester);
      final actions = find.text('Actions & sections').first;
      await tester.ensureVisible(actions);
      await tester.tap(actions);
      await tester.pumpAndSettle();
      expect(find.byType(VaultGvviScreen), findsNothing);
      expect(find.text('Edit copy'), findsOneWidget);
      final copy = find.text(previewGvviId);
      await tester.ensureVisible(copy);
      await tester.tap(copy);
      await tester.pumpAndSettle();
      expect(find.byType(VaultGvviScreen), findsOneWidget);
      expect(find.text('View LP on TCGplayer'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'enlarged text on a short landscape viewport still reaches copies',
    (tester) async {
      await open(tester, size: const Size(700, 360), scale: 1.6);
      await tester.drag(find.byType(NestedScrollView), const Offset(0, -800));
      await tester.pumpAndSettle();
      final copy = find.text('GVVI-PREVIEW-000003');
      await tester.ensureVisible(copy);
      await tester.pumpAndSettle();
      expect(tester.getCenter(copy).dy, inInclusiveRange(0, 360));
      expect(tester.takeException(), isNull);
    },
  );

  test('missing condition stays Unknown rather than becoming NM', () {
    for (final condition in [null, '', '  ']) {
      expect(
        VaultManageCardCopy.fromJson({
          'id': 'local',
          'condition_label': condition,
        }).conditionLabel,
        'Unknown',
      );
    }
    expect(
      VaultManageCardCopy.fromJson({
        'id': 'local',
        'condition_label': 'LP',
      }).conditionLabel,
      'LP',
    );
  });
}
