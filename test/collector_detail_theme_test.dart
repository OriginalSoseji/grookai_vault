import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/card_detail_screen.dart';
import 'package:grookai_vault/main.dart' show buildGrookaiTheme;
import 'package:grookai_vault/theme/gv_tokens.dart';
import 'package:grookai_vault/widgets/card_surface_artwork.dart';
import 'support/collector_refinement/main.dart' show previewRequest;

void main() {
  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: 'http://127.0.0.1:54321',
      publishableKey: 'local-theme-test',
      httpClient: MockClient(previewRequest),
      authOptions: const FlutterAuthClientOptions(
        detectSessionInUri: false,
        autoRefreshToken: false,
      ),
    );
  });
  tearDownAll(() => Supabase.instance.dispose());

  testWidgets(
    'card detail follows a live theme switch and retains compact artwork and actions',
    (tester) async {
      tester.view.physicalSize = const Size(384, 824);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final mode = ValueNotifier(ThemeMode.dark);
      addTearDown(mode.dispose);
      await tester.pumpWidget(
        ValueListenableBuilder(
          valueListenable: mode,
          builder: (_, value, child) => MaterialApp(
            theme: buildGrookaiTheme(Brightness.light),
            darkTheme: buildGrookaiTheme(Brightness.dark),
            themeMode: value,
            home: const CardDetailScreen(
              cardPrintId: 'theme-probe',
              name: 'Eevee',
              setName: 'Scarlet & Violet Promos',
              number: '173',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final detail = find.byType(CardDetailScreen);
      final scaffold = find.descendant(
        of: detail,
        matching: find.byType(Scaffold),
      );
      expect(
        Theme.of(tester.element(scaffold)).colorScheme.surface,
        GvPalette.ink,
      );
      final art = find.descendant(
        of: detail,
        matching: find.byType(CardSurfaceArtwork),
      );
      expect(tester.getSize(art).width, lessThanOrEqualTo(214));
      expect(tester.widget<CardSurfaceArtwork>(art).borderRadius, 10);
      final add = find.widgetWithText(FilledButton, 'Add to Vault');
      final shape =
          tester.widget<FilledButton>(add).style!.shape!.resolve({})
              as RoundedRectangleBorder;
      expect(shape.borderRadius, BorderRadius.circular(8));
      mode.value = ThemeMode.light;
      await tester.pumpAndSettle();
      final theme = Theme.of(tester.element(scaffold));
      expect(theme.brightness, Brightness.light);
      expect(theme.colorScheme.surface, GvPalette.bone);
      expect(theme.colorScheme.primary, const Color(0xFF466D00));
      expect(tester.takeException(), isNull);
    },
  );

  test('system chrome and sheets use each theme and contract geometry', () {
    for (final brightness in Brightness.values) {
      final theme = buildGvRedesignV2Theme(brightness: brightness);
      expect(theme.brightness, brightness);
      final sheet = theme.bottomSheetTheme.shape! as RoundedRectangleBorder;
      expect(
        sheet.borderRadius,
        const BorderRadius.vertical(top: Radius.circular(16)),
      );
      final appSheet =
          buildGrookaiTheme(brightness).bottomSheetTheme.shape!
              as RoundedRectangleBorder;
      expect(appSheet.borderRadius, sheet.borderRadius);
      final chrome = gvSystemUiStyle(brightness);
      expect(chrome.statusBarColor, theme.colorScheme.surface);
      expect(
        chrome.statusBarIconBrightness,
        brightness == Brightness.dark ? Brightness.light : Brightness.dark,
      );
      expect(
        chrome.systemNavigationBarIconBrightness,
        chrome.statusBarIconBrightness,
      );
    }
  });
}
