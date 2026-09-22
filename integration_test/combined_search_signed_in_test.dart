import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grookai_vault/main.dart' as app;
import 'package:grookai_vault/secrets.dart';
import 'package:grookai_vault/widgets/onboarding/onboarding_ladder_sheet.dart';

// Run only with the contained owner fixture. Credentials are supplied in a
// private dart-define file; never put them or production settings in this test.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  const email = String.fromEnvironment('COMBINED_SEARCH_TEST_EMAIL');
  const password = String.fromEnvironment('COMBINED_SEARCH_TEST_PASSWORD');

  Future<void> until(WidgetTester tester, Finder finder) async {
    for (var i = 0; i < 300; i++) {
      await tester.pump(const Duration(milliseconds: 200));
      if (finder.evaluate().isNotEmpty) return;
    }
    expect(finder, findsWidgets);
  }

  Future<void> tap(WidgetTester tester, Finder finder) async {
    await until(tester, finder);
    await tester.ensureVisible(finder.first);
    await until(tester, finder.first.hitTestable());
    await tester.tap(finder.first);
    await tester.pump(const Duration(milliseconds: 400));
  }

  Finder field(String label) => find.byWidgetPredicate(
    (widget) => widget is TextField && widget.decoration?.labelText == label,
  );

  testWidgets(
    'real app password sign-in, profile gate, shell and owned search',
    (tester) async {
      expect([
        '127.0.0.1',
        'localhost',
        '10.0.2.2',
      ], contains(Uri.parse(supabaseUrl).host));
      expect(email, matches(r'^combined-search-owner-.*@example\.invalid$'));
      expect(password, isNotEmpty);
      final preferences = await SharedPreferences.getInstance();
      await preferences.remove(
        'sb-${Uri.parse(supabaseUrl).host.split('.').first}-auth-token',
      );
      final testErrorHandler = FlutterError.onError;
      final testPlatformErrorHandler = PlatformDispatcher.instance.onError;
      await app.main();
      // app.main installs crash reporting; restore the test binding so failures
      // remain test failures instead of being intercepted by Crashlytics.
      FlutterError.onError = testErrorHandler;
      PlatformDispatcher.instance.onError = testPlatformErrorHandler;
      await tap(tester, find.text('Sign in with email'));
      await until(tester, field('Email').hitTestable());
      await tester.enterText(field('Email'), email);
      await tester.enterText(field('Password'), password);
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pump(const Duration(milliseconds: 500));
      for (var i = 0; i < 300; i++) {
        await tester.pump(const Duration(milliseconds: 200));
        if (find
                .text('Claim your collector link')
                .hitTestable()
                .evaluate()
                .isNotEmpty ||
            find.text('Search').hitTestable().evaluate().isNotEmpty) {
          break;
        }
      }
      if (find.text('Claim your collector link').evaluate().isNotEmpty) {
        await tester.enterText(
          field('Display name'),
          'Combined Search Fixture',
        );
        await tester.enterText(
          field('Collector URL'),
          'combined-search-shell-fixture',
        );
        await tester.testTextInput.receiveAction(TextInputAction.done);
      }
      await until(tester, find.byType(app.AppShell));
      await tester.pump(const Duration(seconds: 3));
      final shellScaffold = find
          .descendant(
            of: find.byType(app.AppShell),
            matching: find.byType(Scaffold),
          )
          .first;
      Finder dock() => find.byWidget(
        tester.widget<Scaffold>(shellScaffold).bottomNavigationBar!,
      );
      final screenHeight = MediaQuery.sizeOf(
        tester.element(shellScaffold),
      ).height;
      // An expanding Align used to report a screen-height dock, which made
      // Scaffold's extended-body safe area push onboarding above the viewport.
      expect(tester.getSize(dock()).height, lessThan(screenHeight / 3));
      final overlay = find.byType(OnboardingLadderOverlay);
      if (overlay.evaluate().isNotEmpty) {
        final close = find.byTooltip('Close onboarding');
        expect(close.hitTestable(), findsOneWidget);
        expect(
          tester.getRect(close).top,
          greaterThanOrEqualTo(tester.getRect(overlay).top),
        );
        debugPrint('COMBINED_SHELL_CAPTURE_READY=onboarding');
        await Future<void>.delayed(const Duration(seconds: 8));
        await tester.pump();
        await tap(tester, close);
        expect(overlay, findsNothing);
        debugPrint('COMBINED_SHELL_ONBOARDING=visible-and-dismissed');
      }
      expect(Supabase.instance.client.auth.currentUser?.email, email);
      await tap(tester, find.text('Search').last);
      final search = find.byWidgetPredicate(
        (widget) =>
            widget is TextField &&
            widget.decoration?.hintText == 'Search in a sentence',
      );
      await until(tester, search);
      await tester.enterText(search, 'Yuka Morii Wurmple owned');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await until(tester, find.text('3 cards'));
      await until(tester, find.text('Wurmple'));
      expect(find.text('Owned'), findsOneWidget);
      expect(find.text('Vault ownership requires sign in'), findsNothing);
      debugPrint('COMBINED_SHELL_CAPTURE_READY=owned');
      await Future<void>.delayed(const Duration(seconds: 8));
      await tester.pump();
      await tap(tester, search);
      await tester.enterText(search, 'Yuka Morri Wurmple reverse holo');
      await tester.pump(const Duration(milliseconds: 300));
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await until(tester, find.text('Showing 24 of 168'));
      expect(find.byTooltip('Remove Finish: Reverse Holo'), findsOneWidget);
      expect(find.text('Artist: Yuka Morii'), findsOneWidget);
      expect(overlay, findsNothing);
      expect(tester.getSize(dock()).height, lessThan(screenHeight / 3));
      debugPrint('COMBINED_SHELL_CAPTURE_READY=combined');
      await Future<void>.delayed(const Duration(seconds: 8));
      await tester.pump();
      await tap(tester, find.byTooltip('Remove Finish: Reverse Holo'));
      await until(tester, find.text('Showing 24 of 335'));
      expect(find.text('Artist: Yuka Morii'), findsOneWidget);
      await Supabase.instance.client.auth.signOut();
      await until(tester, find.text('Sign in with email'));
      debugPrint(
        'COMBINED_SHELL_VERIFIED=password-profile-shell-owned-combined-signout',
      );
    },
  );
}
