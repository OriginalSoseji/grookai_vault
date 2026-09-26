import 'dart:convert';
import 'dart:io';
import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:grookai_vault/services/stores/storefront_service.dart';
import 'package:grookai_vault/services/navigation/grookai_web_route_service.dart';
import 'package:grookai_vault/screens/stores/custom_product_management_screen.dart';
import 'package:grookai_vault/screens/stores/custom_product_screen.dart';
import 'package:grookai_vault/screens/stores/storefront_screen.dart';

const productId = '00000000-0000-4000-8000-000000000099';
Map<String, dynamic> product() => {
  'entry_type': 'custom_product',
  'id': productId,
  'store_id': 'store',
  'title': 'Regional boxed figure',
  'description': 'Vendor-described collectible from Japan.',
  'category': 'Figure',
  'franchise': 'Pokémon',
  'manufacturer': 'Seller claim',
  'release_region': 'Japan',
  'language': 'Japanese',
  'condition_description': 'Light shelf wear',
  'packaging_description': 'Original box',
  'private_sku': 'PRIVATE-SKU',
  'asking_price_amount': 48,
  'asking_price_currency': 'USD',
  'available_quantity': 3,
  'photo_ids': <String>[],
  'photo_paths': <String>[],
  'section_ids': <String>[],
  'published': false,
  'version': 2,
  'archived_at': null,
  'ineligible_reason': null,
  'suspension_reason': null,
};
Map<String, dynamic> store() => {
  'id': 'store',
  'slug': 'test-store',
  'display_name': 'Fixture collectibles',
  'description': 'Independent vendor',
  'collector_slug': null,
};
StoreOwnerData owner() => StoreOwnerData.fromJson({
  'store': store(),
  'capabilities': {'store_app': true, 'store_web': false},
  'rollout': {'app_enabled': true, 'web_enabled': true, 'custom_enabled': true},
  'sections': [
    {'id': 'section', 'name': 'Featured', 'selected': true},
  ],
});
StorefrontService service(Future<http.Response> Function(http.Request) fn) =>
    StorefrontService(
      client: MockClient(fn),
      baseUrl: 'http://127.0.0.1:15440',
      accessToken: 'local-fixture-token',
    );
Future<void> scroll(WidgetTester tester, Finder finder, double delta) =>
    tester.scrollUntilVisible(
      finder,
      delta,
      scrollable: find.byType(Scrollable).first,
    );
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    if (const bool.fromEnvironment('CUSTOM_VISUALS')) {
      await (FontLoader(
        'MaterialIcons',
      )..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
      final font = File('C:/Windows/Fonts/segoeui.ttf');
      if (font.existsSync()) {
        await (FontLoader('StorefrontTest')..addFont(
              Future.value(ByteData.sublistView(font.readAsBytesSync())),
            ))
            .load();
      }
    }
  });
  test(
    'stable custom routes preserve native/web preview destinations and reject malformed IDs',
    () {
      for (final base in [
        'https://grookaivault.com/store',
        'grookai://store',
        'grookai:///store',
      ]) {
        final route = GrookaiWebRouteService.parseCanonicalUri(
          Uri.parse('$base/test-store/products/$productId?preview=1'),
        );
        expect(route?.kind, GrookaiCanonicalRouteKind.storeProduct);
        expect(route?.productId, productId);
        expect(route?.path, '/store/test-store/products/$productId?preview=1');
        expect(route?.preview, true);
      }
      for (final path in [
        '/store/test-store/products/GVVI-FAKE',
        '/store/test-store/other/$productId',
        '/store/test-store/products/$productId/extra',
      ]) {
        expect(
          GrookaiWebRouteService.parseCanonicalUri(Uri.parse(path)),
          isNull,
        );
      }
    },
  );
  test(
    'custom service preserves audience and expected version; conflict is actionable',
    () async {
      final requests = <http.Request>[];
      final s = service((r) async {
        requests.add(r);
        return r.method == 'POST'
            ? http.Response('', 409)
            : http.Response('{}', 200);
      });
      await s.product('test-store', productId);
      await s.product('test-store', productId, preview: true);
      expect(requests.map((r) => r.url.path), [
        '/api/stores/test-store/app/products/$productId',
        '/api/stores/test-store/preview/products/$productId',
      ]);
      await expectLater(
        s.changeProduct(product(), 'save', {'available_quantity': 4}),
        throwsA(
          predicate((e) => e.toString().contains('Reload before saving')),
        ),
      );
      expect(jsonDecode(requests.last.body)['version'], 2);
      expect(jsonDecode(requests.last.body)['data'], {'available_quantity': 4});
      await expectLater(
        s.uploadProductPhoto('store', productId, Uint8List.fromList([1, 2, 3])),
        throwsA(isA<StorefrontException>()),
      );
      await expectLater(
        s.uploadProductPhoto('store', productId, Uint8List(5242881)),
        throwsA(isA<StorefrontException>()),
      );
    },
  );
  testWidgets(
    'mixed native grid routes custom listings without fabricating GVVI',
    (tester) async {
      final s = service(
        (r) async => http.Response(
          jsonEncode(
            r.url.path.contains('/products/')
                ? {'store': store(), 'product': product(), 'preview': false}
                : {
                    'schema_version': 'VENDOR_STORE_V2',
                    'store': store(),
                    'items': [
                      product(),
                      {
                        'entry_type': 'catalog_copy',
                        'id': 'copy',
                        'display_name': 'Catalog card',
                        'gv_vi_id': 'GVVI-REAL',
                        'asking_price_amount': 20,
                        'asking_price_currency': 'USD',
                      },
                    ],
                    'sections': [],
                    'total': 2,
                    'offset': 0,
                    'limit': 40,
                    'preview': false,
                  },
          ),
          200,
        ),
      );
      await tester.pumpWidget(
        MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
            fontFamily: const bool.fromEnvironment('CUSTOM_VISUALS')
                ? 'StorefrontTest'
                : null,
          ),
          home: StorefrontScreen(slug: 'test-store', service: s),
        ),
      );
      await tester.pumpAndSettle();
      await scroll(tester, find.text('Regional boxed figure'), 250);
      await tester.tap(find.text('Regional boxed figure'));
      await tester.pumpAndSettle();
      expect(find.byType(CustomProductScreen), findsOneWidget);
      expect(find.text('Seller-provided details'), findsOneWidget);
      expect(find.textContaining('GVVI'), findsNothing);
      expect(find.textContaining('PRIVATE-SKU'), findsNothing);
    },
  );
  testWidgets(
    'draft save is explicit, incomplete drafts accepted, publish is separate',
    (tester) async {
      final actions = <Map<String, dynamic>>[];
      final s = service((r) async {
        actions.add(jsonDecode(r.body));
        return http.Response(
          jsonEncode({
            'products': [product()],
          }),
          200,
        );
      });
      await tester.pumpWidget(
        MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
            fontFamily: const bool.fromEnvironment('CUSTOM_VISUALS')
                ? 'StorefrontTest'
                : null,
          ),
          home: CustomProductEditorScreen(service: s, owner: owner()),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('custom_title')),
        'My collectible',
      );
      await scroll(tester, find.text('Save draft'), 400);
      await tester.tap(find.text('Save draft'));
      await tester.pumpAndSettle();
      expect(actions.length, 1);
      expect(actions.single['action'], 'save');
      expect(actions.single['id'], isNull);
      expect(actions.single['data']['available_quantity'], 0);
      await scroll(tester, find.text('Publish saved product'), 400);
      await tester.tap(find.text('Publish saved product'));
      await tester.pumpAndSettle();
      expect(actions.length, 1);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(actions.length, 1);
    },
  );
  testWidgets(
    'conflict retains text; reload requires explicit discard and reads latest version',
    (tester) async {
      final latest = {...product(), 'version': 9, 'title': 'Saved elsewhere'};
      final s = service(
        (r) async => r.method == 'POST'
            ? http.Response('', 409)
            : http.Response(
                jsonEncode({
                  'products': [latest],
                }),
                200,
              ),
      );
      await tester.pumpWidget(
        MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
            fontFamily: const bool.fromEnvironment('CUSTOM_VISUALS')
                ? 'StorefrontTest'
                : null,
          ),
          home: CustomProductEditorScreen(
            service: s,
            owner: owner(),
            product: product(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('custom_title')),
        'Unsaved local text',
      );
      await scroll(tester, find.text('Save details'), 400);
      await tester.tap(find.text('Save details'));
      await tester.pumpAndSettle();
      await scroll(tester, find.byKey(const ValueKey('custom_title')), -500);
      expect(
        tester
            .widget<TextField>(find.byKey(const ValueKey('custom_title')))
            .controller!
            .text,
        'Unsaved local text',
      );
      expect(find.textContaining('Reload before saving'), findsOneWidget);
      await tester.tap(find.byTooltip('Reload saved product'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Keep editing'));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<TextField>(find.byKey(const ValueKey('custom_title')))
            .controller!
            .text,
        'Unsaved local text',
      );
      await tester.tap(find.byTooltip('Reload saved product'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Reload'));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<TextField>(find.byKey(const ValueKey('custom_title')))
            .controller!
            .text,
        'Saved elsewhere',
      );
    },
  );
  testWidgets(
    'native custom detail visual and seller claims remain distinct from canonical identity',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final s = service(
        (r) async => http.Response(
          jsonEncode({'store': store(), 'product': product(), 'preview': true}),
          200,
        ),
      );
      await tester.pumpWidget(
        MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
            fontFamily: const bool.fromEnvironment('CUSTOM_VISUALS')
                ? 'StorefrontTest'
                : null,
          ),
          home: CustomProductScreen(
            slug: 'test-store',
            productId: productId,
            preview: true,
            service: s,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Seller-provided details'), findsOneWidget);
      expect(find.textContaining('PRIVATE-SKU'), findsNothing);
      expect(tester.takeException(), isNull);
      if (const bool.fromEnvironment('CUSTOM_VISUALS')) {
        await expectLater(
          find.byType(MaterialApp),
          matchesGoldenFile('../.local/storefront/custom-native-detail.png'),
        );
      }
    },
  );
  testWidgets(
    'native editor visual shows draft state and independent authoring',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final s = service((r) async => http.Response('{}', 200));
      await tester.pumpWidget(
        MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
            fontFamily: const bool.fromEnvironment('CUSTOM_VISUALS')
                ? 'StorefrontTest'
                : null,
          ),
          home: CustomProductEditorScreen(
            service: s,
            owner: owner(),
            product: product(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      if (const bool.fromEnvironment('CUSTOM_VISUALS')) {
        await expectLater(
          find.byType(MaterialApp),
          matchesGoldenFile('../.local/storefront/custom-native-editor.png'),
        );
      }
    },
  );
}
