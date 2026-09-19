import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:grookai_vault/services/stores/storefront_service.dart';
import 'package:grookai_vault/services/navigation/grookai_web_route_service.dart';
import 'package:grookai_vault/screens/stores/store_management_screen.dart';

Map<String, dynamic> inventory() => {
  'schema_version': 'VENDOR_STORE_V1',
  'store': {'id': 'store', 'slug': 'test-store', 'display_name': 'Test store'},
  'items': [
    {
      'id': 'eligible',
      'display_name': 'Sale copy',
      'gv_vi_id': 'GVVI-ONE',
      'selected': false,
      'ineligible_reason': null,
      'asking_price_amount': 25,
      'asking_price_currency': 'USD',
    },
    {
      'id': 'private',
      'display_name': 'Private copy',
      'gv_vi_id': 'GVVI-TWO',
      'selected': false,
      'ineligible_reason': 'Copy is not for sale',
    },
  ],
  'sections': [],
  'total': 2,
  'offset': 0,
  'limit': 40,
  'preview': true,
};
Map<String, dynamic> owner({bool draft = false, bool web = true}) => {
  'store': draft
      ? null
      : {
          'id': 'store',
          'slug': 'test-store',
          'display_name': 'Test store',
          'description': '',
          'app_published': false,
          'web_published': false,
          'first_published_at': null,
        },
  'capabilities': {'store_app': true, 'store_web': web},
  'rollout': {'app_enabled': true, 'web_enabled': true},
  'sections': [],
  'inventory': draft ? null : inventory(),
};
void main() {
  test('store links preserve their canonical destination and legacy links', () {
    final preview = GrookaiWebRouteService.parseCanonicalUri(
      Uri.parse('https://grookaivault.com/store/test-store?preview=1'),
    );
    expect(preview?.preview, true);
    expect(preview?.path, '/store/test-store?preview=1');
    for (final url in [
      'https://grookaivault.com/store/test-store',
      'grookai://store/test-store',
    ]) {
      final route = GrookaiWebRouteService.parseCanonicalUri(Uri.parse(url));
      expect(route?.kind, GrookaiCanonicalRouteKind.store);
      expect(route?.path, '/store/test-store');
    }
    expect(
      GrookaiWebRouteService.parseCanonicalUri(Uri.parse('/store/bad_slug')),
      isNull,
    );
    expect(
      GrookaiWebRouteService.parseCanonicalUri(
        Uri.parse('/gvvi/GVVI-ONE'),
      )?.kind,
      GrookaiCanonicalRouteKind.gvvi,
    );
  });
  test(
    'authenticated app, private preview and public reads use distinct routes',
    () async {
      final requests = <http.Request>[];
      final client = MockClient((r) async {
        requests.add(r);
        return http.Response(jsonEncode(inventory()), 200);
      });
      final signed = StorefrontService(
        client: client,
        baseUrl: 'http://127.0.0.1:15440',
        accessToken: 'local-token',
      );
      await signed.read(
        'test-store',
        query: 'GV-TEST',
        condition: 'NM',
        kind: 'raw',
        offset: 40,
      );
      await signed.read('test-store', preview: true);
      final public = StorefrontService(
        client: client,
        baseUrl: 'http://127.0.0.1:15440',
      );
      await public.read('test-store');
      expect(requests.map((r) => r.url.path), [
        '/api/stores/test-store/app',
        '/api/stores/test-store/preview',
        '/api/stores/test-store',
      ]);
      expect(requests.first.url.queryParameters['q'], 'GV-TEST');
      expect(requests.first.url.queryParameters['offset'], '40');
      expect(requests.first.headers['authorization'], 'Bearer local-token');
      expect(requests.last.headers.containsKey('authorization'), false);
    },
  );
  test(
    'unavailable, unauthorized, invalid version, and media type fail closed',
    () async {
      for (final code in [401, 404, 503]) {
        final service = StorefrontService(
          client: MockClient((r) async => http.Response('', code)),
          baseUrl: 'http://127.0.0.1:15440',
        );
        await expectLater(
          service.read('test-store'),
          throwsA(isA<StorefrontException>()),
        );
      }
      expect(
        () => StorefrontData.fromJson({
          ...inventory(),
          'schema_version': 'future',
        }),
        throwsA(isA<StorefrontException>()),
      );
      await expectLater(
        StorefrontService().uploadMedia(
          'store',
          'logo',
          Uint8List.fromList([60, 115, 118, 103, 62]),
        ),
        throwsA(isA<StorefrontException>()),
      );
    },
  );
  testWidgets(
    'creation sends a draft save only, never a publication or item action',
    (tester) async {
      tester.view.physicalSize = const Size(1000, 1600);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final actions = <Map<String, dynamic>>[];
      final service = StorefrontService(
        baseUrl: 'http://127.0.0.1:15440',
        accessToken: 'local-token',
        client: MockClient((r) async {
          if (r.method == 'POST') {
            actions.add(jsonDecode(r.body));
            return http.Response('{}', 200);
          }
          return http.Response(jsonEncode(owner(draft: true)), 200);
        }),
      );
      await tester.pumpWidget(
        MaterialApp(home: StoreManagementScreen(service: service)),
      );
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('store_name')),
        'My Store',
      );
      await tester.enterText(
        find.byKey(const ValueKey('store_slug')),
        'My Store',
      );
      await tester.tap(find.byKey(const ValueKey('store_save')));
      await tester.pumpAndSettle();
      expect(actions, [
        {
          'action': 'save',
          'slug': 'my-store',
          'display_name': 'My Store',
          'description': '',
        },
      ]);
    },
  );
  testWidgets(
    'publication needs explicit confirmation, app package disables web, private copy disabled',
    (tester) async {
      tester.view.physicalSize = const Size(1000, 2400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final actions = <Map<String, dynamic>>[];
      final service = StorefrontService(
        baseUrl: 'http://127.0.0.1:15440',
        accessToken: 'local-token',
        client: MockClient((r) async {
          if (r.method == 'POST') {
            actions.add(jsonDecode(r.body));
            return http.Response('{}', 200);
          }
          return http.Response(jsonEncode(owner(web: false)), 200);
        }),
      );
      await tester.pumpWidget(
        MaterialApp(home: StoreManagementScreen(service: service)),
      );
      await tester.pumpAndSettle();
      final app = find.widgetWithText(SwitchListTile, 'Published in app');
      expect(
        tester
            .widget<SwitchListTile>(
              find.widgetWithText(SwitchListTile, 'Published on web'),
            )
            .onChanged,
        isNull,
      );
      expect(
        tester
            .widget<CheckboxListTile>(
              find.byKey(const ValueKey('store_copy_private')),
            )
            .onChanged,
        isNull,
      );
      await tester.ensureVisible(app);
      await tester.tap(app);
      await tester.pumpAndSettle();
      expect(actions, isEmpty);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(actions, isEmpty);
      await tester.tap(app);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Publish'));
      await tester.pumpAndSettle();
      expect(actions, [
        {'action': 'publish', 'surface': 'app', 'publish': true},
      ]);
    },
  );
}
