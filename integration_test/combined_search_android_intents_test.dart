import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/main.dart' as app;
import 'package:grookai_vault/secrets.dart';

// Local Android VIEW-intent acceptance. Start the isolated application through
// /explore?q=Wurmple%20reverse%20holo%20Yuka%20Morii, then deliver
// /search?q=Yuka%20Morii%20Wurmple when PHYSICAL_LINK_READY=warm is printed.
// Use loopback ADB reverse and a private local-origin manifest; never production.
// The host driver attaches to the already-running app's VM service.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  Future<void> until(WidgetTester tester, Finder finder) async {
    for (var i = 0; i < 300; i++) {
      await tester.pump(const Duration(milliseconds: 200));
      if (finder.evaluate().isNotEmpty) return;
    }
    expect(finder, findsWidgets);
  }

  Finder query(String value) => find.byWidgetPredicate(
    (w) => w is TextField && w.controller?.text == value,
  );
  testWidgets('physical Android cold and warm targeted local search intents', (
    tester,
  ) async {
    expect(supabaseUrl, 'http://127.0.0.1:54321');
    expect(grookaiWebBaseUrl, 'http://127.0.0.1:3202');
    const email = String.fromEnvironment('COMBINED_SEARCH_TEST_EMAIL');
    const password = String.fromEnvironment('COMBINED_SEARCH_TEST_PASSWORD');
    expect(email, matches(r'^combined-search-owner-.*@example\.invalid$'));
    expect(password, isNotEmpty);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('sb-127-auth-token');
    final errors = FlutterError.onError;
    final platformErrors = PlatformDispatcher.instance.onError;
    await app.main();
    FlutterError.onError = errors;
    PlatformDispatcher.instance.onError = platformErrors;
    await until(tester, find.text('Showing 24 of 168'));
    expect(Supabase.instance.client.auth.currentSession, isNull);
    expect(query('Wurmple reverse holo Yuka Morii'), findsOneWidget);
    debugPrint('PHYSICAL_LINK_GUEST_COLD=verified');
    await Supabase.instance.client.auth.signInWithPassword(
      email: email,
      password: password,
    );
    await until(tester, find.byType(app.AppShell));
    await until(tester, find.text('Showing 24 of 168'));
    expect(query('Wurmple reverse holo Yuka Morii'), findsOneWidget);
    expect(find.text('Artist: Yuka Morii'), findsOneWidget);
    expect(find.byTooltip('Remove Finish: Reverse Holo'), findsOneWidget);
    debugPrint('PHYSICAL_LINK_CAPTURE_READY=cold');
    await Future<void>.delayed(const Duration(seconds: 6));
    await tester.pump();
    debugPrint('PHYSICAL_LINK_READY=warm');
    await until(tester, find.text('Showing 24 of 335'));
    expect(query('Yuka Morii Wurmple'), findsOneWidget);
    expect(find.text('Artist: Yuka Morii'), findsOneWidget);
    expect(find.byTooltip('Remove Finish: Reverse Holo'), findsNothing);
    debugPrint('PHYSICAL_LINK_CAPTURE_READY=warm');
    await Future<void>.delayed(const Duration(seconds: 6));
    await tester.pump();
    await Supabase.instance.client.auth.signOut();
    await until(tester, find.text('Sign in with email').hitTestable());
    // The root becomes visible before popped routes finish their exit animation.
    // Wait for their disposal, then require all cached search state to be gone.
    for (var i = 0; i < 30; i++) {
      await tester.pump(const Duration(milliseconds: 100));
      if (query('Yuka Morii Wurmple').evaluate().isEmpty) break;
    }
    expect(Supabase.instance.client.auth.currentSession, isNull);
    expect(query('Yuka Morii Wurmple'), findsNothing);
    expect(find.text('In Vault'), findsNothing);
    debugPrint('PHYSICAL_LINK_CAPTURE_READY=signedout');
    await Future<void>.delayed(const Duration(seconds: 6));
    await tester.pump();
    debugPrint('PHYSICAL_LINK_VERIFIED=cold-warm-explicit-package-local');
  });
}
