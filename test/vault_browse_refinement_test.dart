import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/main.dart';
import 'package:grookai_vault/services/vault/vault_grid_preferences.dart';

void main() {
  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: 'http://127.0.0.1:54321',
      publishableKey: 'fixture',
      authOptions: const FlutterAuthClientOptions(autoRefreshToken: false),
      httpClient: MockClient((_) async => http.Response('[]', 200)),
    );
  });
  tearDownAll(() => Supabase.instance.dispose());
  setUp(() => SharedPreferences.setMockInitialValues({}));
  test('density saves only a bounded device preference and restores', () async {
    final prefs = VaultGridPreferences();
    expect(await prefs.select(3), isTrue);
    expect(await prefs.select(8), isFalse);
    final next = VaultGridPreferences();
    await next.ensureLoaded();
    expect(next.value, 3);
    expect((await SharedPreferences.getInstance()).getKeys(), {
      VaultGridPreferences.key,
    });
    next.dispose();
    prefs.dispose();
  });
  test('late read cannot override an explicit density choice', () async {
    final read = Completer<int?>();
    final prefs = VaultGridPreferences(
      read: () => read.future,
      write: (_) async => true,
    );
    final loading = prefs.ensureLoaded();
    await prefs.select(4);
    read.complete(2);
    await loading;
    expect(prefs.value, 4);
    prefs.dispose();
  });
  test('unavailable storage keeps the selected density usable', () async {
    final prefs = VaultGridPreferences(
      read: () async => throw StateError('read'),
      write: (_) async => false,
    );
    await prefs.ensureLoaded();
    expect(await prefs.select(3), isFalse);
    expect(prefs.value, 3);
    prefs.dispose();
  });
  for (final mode in Brightness.values) {
    for (final size in [const Size(320, 800), const Size(1280, 1000)]) {
      testWidgets('Vault browsing controls fit $mode at $size', (tester) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        await tester.pumpWidget(
          MaterialApp(
            theme: buildGrookaiTheme(mode),
            home: const Scaffold(body: VaultPage()),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('Binders'), findsOneWidget);
        await tester.tap(find.byTooltip('Grid density'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('3 columns'));
        await tester.pumpAndSettle();
        expect(
          (await SharedPreferences.getInstance()).getInt(
            VaultGridPreferences.key,
          ),
          3,
        );
        final search = find.byType(TextField).first;
        await tester.enterText(search, 'Eevee');
        await tester.pumpAndSettle();
        await tester.tap(find.byTooltip('Clear Vault search'));
        await tester.pumpAndSettle();
        expect(tester.widget<TextField>(search).controller!.text, isEmpty);
        expect(tester.takeException(), isNull);
      });
    }
  }
}
