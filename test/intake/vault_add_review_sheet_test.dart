import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/services/intake/intake_service.dart';
import 'package:grookai_vault/services/intake/intake_models.dart';
import 'package:grookai_vault/main.dart' show buildGrookaiTheme;
import 'package:grookai_vault/theme/gv_tokens.dart';
import 'package:grookai_vault/widgets/vault/vault_add_review_sheet.dart';

class _Service extends IntakeService {
  _Service()
    : super(
        SupabaseClient(
          'http://localhost:54321',
          'fixture-key',
          authOptions: const AuthClientOptions(autoRefreshToken: false),
        ),
      );
  @override
  Future<List<PurchaseLot>> lots() async => [];
}

void main() {
  for (final brightness in Brightness.values) {
    testWidgets(
      'review form fits mobile ${brightness.name} with bundled Roboto',
      (tester) async {
        tester.view.physicalSize = const Size(384, 824);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final iconLoader = FontLoader('MaterialIcons')
          ..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'));
        await iconLoader.load();
        final loader = FontLoader('Roboto')
          ..addFont(rootBundle.load('assets/fonts/Roboto/Roboto-Regular.ttf'))
          ..addFont(rootBundle.load('assets/fonts/Roboto/Roboto-Bold.ttf'));
        await loader.load();
        await tester.pumpWidget(
          MaterialApp(
            theme: buildGrookaiTheme(brightness),
            home: Scaffold(
              body: RepaintBoundary(
                key: const ValueKey('review'),
                child: Material(
                  color: GvPalette.scheme(brightness).surface,
                  child: SafeArea(
                    child: VaultAddReviewSheet(
                      service: _Service(),
                      cardPrintId: 'card',
                      gvId: 'GV-PK-SVP-173',
                      name: 'Eevee',
                      setName: 'Scarlet & Violet Promos · 173',
                      printingId: 'holo',
                      finish: 'Holofoil',
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('Unknown'), findsOneWidget);
        expect(find.text('None'), findsOneWidget);
        expect(find.text('Not recorded · optional'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await expectLater(
          find.byKey(const ValueKey('review')),
          matchesGoldenFile('goldens/vault_add_review_${brightness.name}.png'),
        );
        await tester.tap(find.text('Graded slab'));
        await tester.pumpAndSettle();
        expect(
          find.textContaining('Until verification finishes'),
          findsOneWidget,
        );
        final quantity = tester.widget<TextField>(find.byType(TextField).first);
        expect(quantity.controller!.text, '1');
        expect(quantity.enabled, false);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
