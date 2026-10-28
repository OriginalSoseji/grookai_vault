import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/main.dart' show buildGrookaiTheme;
import 'package:grookai_vault/card_detail_screen.dart';
import 'package:grookai_vault/screens/auth/sign_in_continuation_screen.dart';
import 'package:grookai_vault/services/network/card_engagement_service.dart';
import 'package:grookai_vault/widgets/cards/card_comments_sheet.dart';
import 'support/collector_refinement/main.dart';

const comments = [
  CardCommentEntry(
    id: 'local-1',
    userId: 'other',
    body:
        'The printed promo number distinguishes this card from other cards with the same name. Keep the number visible when comparing copies.',
    intentType: 'trade',
  ),
];

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: 'http://127.0.0.1:54321',
      publishableKey: 'local-activity-test',
      httpClient: MockClient(previewRequest),
      authOptions: const FlutterAuthClientOptions(autoRefreshToken: false),
    );
  });
  tearDownAll(() => Supabase.instance.dispose());
  Widget sheet({
    Brightness brightness = Brightness.dark,
    double scale = 1,
    double keyboard = 0,
    Future<List<CardCommentEntry>> Function()? load,
  }) => MaterialApp(
    theme: buildGrookaiTheme(brightness),
    builder: (context, child) => MediaQuery(
      data: MediaQuery.of(context).copyWith(
        textScaler: TextScaler.linear(scale),
        viewInsets: EdgeInsets.only(bottom: keyboard),
      ),
      child: child!,
    ),
    home: Scaffold(
      body: CardCommentsSheet(
        cardPrintId: 'local-card',
        cardName:
            'A long printed card identity with a finish and collector number',
        loadComments: load ?? () async => comments,
      ),
    ),
  );
  for (final brightness in Brightness.values) {
    for (final scale in [1.0, 1.6]) {
      for (final size in [const Size(384, 824), const Size(700, 360)]) {
        testWidgets('comments fit $brightness $scale $size', (tester) async {
          await tester.binding.setSurfaceSize(size);
          addTearDown(() => tester.binding.setSurfaceSize(null));
          await tester.pumpWidget(sheet(brightness: brightness, scale: scale));
          await tester.pumpAndSettle();
          final signIn = find.text('Sign in to comment');
          expect(find.text(comments.single.body), findsOneWidget);
          if (signIn.evaluate().isEmpty) {
            await tester.scrollUntilVisible(signIn, 120);
          } else {
            await tester.ensureVisible(signIn);
          }
          await tester.pumpAndSettle();
          expect(signIn.hitTestable(), findsOneWidget);
          expect(find.text('Post'), findsNothing);
          expect(tester.takeException(), isNull);
        });
      }
    }
  }
  testWidgets('short keyboard viewport remains scrollable with large text', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(384, 600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(sheet(scale: 1.6, keyboard: 300));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Sign in to comment'), 120);
    await tester.pumpAndSettle();
    expect(find.text('Sign in to comment').hitTestable(), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('failed comments retry without claiming an empty conversation', (
    tester,
  ) async {
    var reads = 0;
    await tester.pumpWidget(
      sheet(
        load: () async {
          if (++reads == 1) throw StateError('local read failed');
          return comments;
        },
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('No comments yet.'), findsNothing);
    await tester.tap(find.text('Retry comments'));
    await tester.pumpAndSettle();
    expect(find.text(comments.single.body), findsOneWidget);
    expect(reads, 2);
  });
  testWidgets('loading skeleton and confirmed empty result are distinct', (
    tester,
  ) async {
    final pending = Completer<List<CardCommentEntry>>();
    await tester.pumpWidget(sheet(load: () => pending.future));
    await tester.pump();
    expect(find.bySemanticsLabel('Loading comments'), findsOneWidget);
    expect(find.text('No comments yet.'), findsNothing);
    pending.complete([]);
    await tester.pumpAndSettle();
    expect(find.text('No comments yet.'), findsOneWidget);
  });
  testWidgets('comment sign-in is explicit and never posts automatically', (
    tester,
  ) async {
    await tester.pumpWidget(sheet());
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sign in to comment'));
    await tester.pumpAndSettle();
    expect(find.byType(SignInContinuationScreen), findsOneWidget);
    expect(Supabase.instance.client.auth.currentUser, isNull);
    Navigator.of(
      tester.element(find.byType(SignInContinuationScreen)),
    ).pop(false);
    await tester.pumpAndSettle();
    expect(find.text('Sign in to comment'), findsOneWidget);
    expect(find.text('Post'), findsNothing);
  });
  testWidgets(
    'Activity leads with comments and does not equate signed-out with empty',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: buildGrookaiTheme(Brightness.dark),
          home: const CardDetailScreen(
            cardPrintId: 'a36f8d8a-353f-4cca-ba89-912eb7f10c3a',
            name: 'Eevee',
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Activity'));
      await tester.pumpAndSettle();
      expect(find.text('Sign in to see collector activity.'), findsOneWidget);
      expect(
        find.text('You could be the first to vault this card.'),
        findsNothing,
      );
      expect(
        tester.getTopLeft(find.text('Comments')).dy,
        lessThan(tester.getTopLeft(find.text('No pricing data available')).dy),
      );
      await tester.ensureVisible(find.text('Comments'));
      await tester.tap(find.text('Comments'));
      await tester.pumpAndSettle();
      expect(find.byType(CardCommentsSheet), findsOneWidget);
      expect(find.textContaining('Sample comment:').evaluate().length, 2);
      await tester.tap(find.byTooltip('Close comments'));
      await tester.pumpAndSettle();
      expect(find.byType(CardCommentsSheet), findsNothing);
    },
  );
}
