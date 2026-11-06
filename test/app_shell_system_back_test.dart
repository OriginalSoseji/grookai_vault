import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:grookai_vault/main.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    final fonts = FontLoader('Roboto');
    for (final weight in ['Regular', 'Medium', 'Bold', 'Black']) {
      fonts.addFont(rootBundle.load('assets/fonts/Roboto/Roboto-$weight.ttf'));
    }
    await fonts.load();
    await (FontLoader(
      'MaterialIcons',
    )..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
    await Supabase.initialize(
      url: 'http://127.0.0.1:54321',
      publishableKey: 'fixture',
      httpClient: MockClient(
        (_) async => http.Response(
          '[]',
          200,
          headers: {'content-type': 'application/json'},
        ),
      ),
      authOptions: const FlutterAuthClientOptions(
        autoRefreshToken: false,
        detectSessionInUri: false,
      ),
    );
  });
  tearDownAll(() => Supabase.instance.dispose());

  Future<void> mount(WidgetTester tester, Size size) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      GrookaiAppFrame(
        home: AppShell(themeMode: ThemeMode.light, onThemeModeChanged: (_) {}),
      ),
    );
    await tester.pump(const Duration(seconds: 2));
    await tester.pumpAndSettle();
    addTearDown(() async {
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump(const Duration(seconds: 2));
    });
  }

  for (final size in [const Size(384, 824), const Size(1100, 900)]) {
    testWidgets(
      'system Back closes the collector menu at $size',
      (tester) async {
        final platformCalls = <MethodCall>[];
        tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.platform,
          (call) async {
            platformCalls.add(call);
            return null;
          },
        );
        addTearDown(
          () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
            SystemChannels.platform,
            null,
          ),
        );
        await mount(tester, size);
        await tester.tap(find.byTooltip('Menu'));
        await tester.pumpAndSettle();
        final scaffold = tester.state<ScaffoldState>(
          find.byType(Scaffold).first,
        );
        final route = ModalRoute.of(tester.element(find.byType(AppShell)))!;
        expect(scaffold.isEndDrawerOpen, true);
        expect(
          route.popDisposition,
          RoutePopDisposition.doNotPop,
          reason:
              'Android must route Back into the app while the menu is open.',
        );
        await tester.binding.handlePopRoute();
        await tester.pumpAndSettle();
        expect(scaffold.isEndDrawerOpen, false);
        expect(find.byType(AppShell), findsOneWidget);
        expect(
          platformCalls.where((call) => call.method == 'SystemNavigator.pop'),
          isEmpty,
        );
        // Closing the menu must release the interception, so ordinary root Back
        // still reaches Android rather than trapping the user in the app.
        await tester.binding.handlePopRoute();
        await tester.pumpAndSettle();
        expect(
          platformCalls.where((call) => call.method == 'SystemNavigator.pop'),
          hasLength(1),
        );
      },
      variant: TargetPlatformVariant.only(TargetPlatform.android),
    );
  }

  testWidgets(
    'Back dismisses a dialog above the menu before closing the menu',
    (tester) async {
      await mount(tester, const Size(384, 824));
      await tester.tap(find.byTooltip('Menu'));
      await tester.pumpAndSettle();
      final scaffold = tester.state<ScaffoldState>(find.byType(Scaffold).first);
      final context = tester.element(find.byType(AppShell));
      showDialog<void>(
        context: context,
        builder: (_) => const AlertDialog(title: Text('Dialog above menu')),
      );
      await tester.pumpAndSettle();
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.text('Dialog above menu'), findsNothing);
      expect(scaffold.isEndDrawerOpen, true);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(scaffold.isEndDrawerOpen, false);
      expect(find.byType(AppShell), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
    variant: TargetPlatformVariant.only(TargetPlatform.android),
  );
}
