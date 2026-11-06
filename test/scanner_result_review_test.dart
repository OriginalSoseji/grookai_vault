import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/card_detail_screen.dart';
import 'package:grookai_vault/main.dart' show buildGrookaiTheme;
import 'package:grookai_vault/screens/scanner_v5/widgets/scanner_result_sheet.dart';
import 'package:grookai_vault/services/scanner_v5/scanner_v5_identity_service.dart';
import 'package:grookai_vault/widgets/vault/vault_add_review_sheet.dart';
import 'package:grookai_vault/widgets/pricing/ebay_listing_links.dart';
import 'support/collector_refinement/main.dart';

const candidate = ScannerV5Candidate(
  id: 'GV-PK-PR-SV-173',
  cardId: 'a36f8d8a-353f-4cca-ba89-912eb7f10c3a',
  name: 'Eevee',
  setCode: 'svp',
  number: '173',
);
const alternate = ScannerV5Candidate(
  id: 'b8e8cc5e-cc82-40b1-b202-0ebdc7593742',
  name: 'Alakazam',
  setCode: 'base1',
  number: '1',
);

Widget review({
  Brightness brightness = Brightness.dark,
  double scale = 1,
  bool exact = true,
  bool busy = false,
  bool alternates = false,
  ValueChanged<ScannerV5Candidate>? onAdd,
  ValueChanged<ScannerV5Candidate>? onView,
}) => MaterialApp(
  theme: buildGrookaiTheme(brightness),
  builder: (context, child) => MediaQuery(
    data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(scale)),
    child: child!,
  ),
  home: Scaffold(
    body: Stack(
      children: [
        ScannerResultSheet(
          result: ScannerV5IdentifyResult(
            ok: true,
            mode: exact ? 'ocr_exact' : 'fused',
            candidates: const [candidate, alternate],
            latencyMs: 1,
          ),
          addingToVault: busy,
          showExactAlternates: alternates,
          onAddCandidate: onAdd ?? (_) {},
          onViewCandidate: onView,
          onDismiss: () {},
          onRetake: () {},
          onShowAlternates: () {},
        ),
      ],
    ),
  ),
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  var twoPrintings = false;
  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: 'http://127.0.0.1:54321',
      publishableKey: 'local-scan-review',
      authOptions: const FlutterAuthClientOptions(
        detectSessionInUri: false,
        autoRefreshToken: false,
      ),
      httpClient: MockClient((request) async {
        if (twoPrintings &&
            request.url.path.endsWith('get_public_card_printing_options_v1')) {
          return http.Response(
            jsonEncode([
              {
                'id': previewPrintingId,
                'card_print_id': candidate.cardId,
                'finish_key': 'holo',
                'finish_label': 'Holofoil',
              },
              {
                'id': '33333333-3333-4333-8333-333333333333',
                'card_print_id': candidate.cardId,
                'finish_key': 'reverse',
                'finish_label': 'Reverse Holofoil',
              },
            ]),
            200,
            request: request,
            headers: {'content-type': 'application/json'},
          );
        }
        return previewRequest(request);
      }),
    );
  });
  tearDownAll(() => Supabase.instance.dispose());

  for (final brightness in Brightness.values) {
    for (final scale in [1.0, 1.6]) {
      for (final exact in [true, false]) {
        testWidgets(
          '$brightness $scale exact=$exact keeps recovery reachable',
          (tester) async {
            await tester.binding.setSurfaceSize(const Size(360, 640));
            addTearDown(() => tester.binding.setSurfaceSize(null));
            await tester.pumpWidget(
              review(
                brightness: brightness,
                scale: scale,
                exact: exact,
                alternates: true,
              ),
            );
            await tester.pumpAndSettle();
            final retake = find.widgetWithText(TextButton, 'Retake');
            await tester.ensureVisible(retake);
            await tester.pumpAndSettle();
            expect(retake.hitTestable(), findsOneWidget);
            expect(tester.takeException(), isNull);
          },
        );
      }
    }
  }
  testWidgets(
    'candidate market action never invokes add; review keeps selected identity',
    (tester) async {
      final added = <ScannerV5Candidate>[];
      final viewed = <ScannerV5Candidate>[];
      await tester.pumpWidget(
        review(exact: false, onAdd: added.add, onView: viewed.add),
      );
      await tester.pumpAndSettle();
      await tester.tap(
        find.widgetWithText(TextButton, 'View card & market').last,
      );
      expect(viewed, [alternate]);
      expect(added, isEmpty);
      await tester.tap(find.text('Review this copy').last);
      expect(added, [alternate]);
    },
  );

  testWidgets(
    'scan detail opens canonical parent without inventing finish or condition',
    (tester) async {
      await tester.pumpWidget(review());
      await tester.pumpAndSettle();
      await tester.tap(find.text('View card & market'));
      await tester.pumpAndSettle();
      final detail = tester.widget<CardDetailScreen>(
        find.byType(CardDetailScreen),
      );
      expect(detail.cardPrintId, candidate.cardId);
      expect(detail.entrySurface, 'scanner');
      expect(detail.selectedPrintingGvId, isNull);
      expect(detail.selectedFinishLabel, isNull);
      expect(detail.condition, isNull);
      final ebay = tester.widget<EbayListingLinks>(
        find.byType(EbayListingLinks),
      );
      expect(ebay.cardName, 'Eevee');
      expect(ebay.finish, 'Holo');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'scan add requires finish choice and leaves condition unspecified',
    (tester) async {
      twoPrintings = true;
      addTearDown(() => twoPrintings = false);
      await tester.pumpWidget(
        MaterialApp(
          theme: buildGrookaiTheme(Brightness.dark),
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () => showVaultAddReview(
                  context: context,
                  cardPrintId: candidate.cardId!,
                  gvId: candidate.id,
                  name: candidate.name,
                  setName: 'Test printing options',
                  service: PreviewIntakeService(),
                ),
                child: const Text('Review scan'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Review scan'));
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 50)),
      );
      await tester.pumpAndSettle();
      expect(find.text('Which variant is this?'), findsOneWidget);
      expect(find.byType(VaultAddReviewSheet), findsNothing);
      await tester.tap(find.text('Reverse Holo'));
      await tester.pumpAndSettle();
      final sheet = tester.widget<VaultAddReviewSheet>(
        find.byType(VaultAddReviewSheet),
      );
      expect(sheet.printingId, '33333333-3333-4333-8333-333333333333');
      expect(sheet.finish, 'Reverse Holo');
      final unknown = tester.widget<OutlinedButton>(
        find.widgetWithText(OutlinedButton, 'Unknown'),
      );
      final nm = tester.widget<OutlinedButton>(
        find.widgetWithText(OutlinedButton, 'NM'),
      );
      final colors = Theme.of(
        tester.element(find.byType(VaultAddReviewSheet)),
      ).colorScheme;
      expect(unknown.style!.foregroundColor!.resolve({}), colors.primary);
      expect(nm.style!.foregroundColor!.resolve({}), colors.onSurfaceVariant);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('all result actions remain disabled while saving', (
    tester,
  ) async {
    var calls = 0;
    await tester.pumpWidget(
      review(
        busy: true,
        alternates: true,
        onAdd: (_) => calls++,
        onView: (_) => calls++,
      ),
    );
    await tester.pump();
    for (final button in tester.widgetList<ButtonStyleButton>(
      find.byType(TextButton),
    )) {
      expect(button.onPressed, isNull);
    }
    expect(
      tester.widget<OutlinedButton>(find.byType(OutlinedButton)).onPressed,
      isNull,
    );
    expect(
      tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
      isNull,
    );
    expect(calls, 0);
  });
}
