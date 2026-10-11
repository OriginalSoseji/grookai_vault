import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/services/stores/storefront_service.dart';
import 'package:grookai_vault/screens/stores/store_management_screen.dart';
import 'package:grookai_vault/screens/stores/custom_product_management_screen.dart';
import 'package:grookai_vault/screens/stores/storefront_screen.dart';
import 'package:grookai_vault/screens/stores/custom_product_screen.dart';
import 'storefront_v1_test.dart' as fixtures;
import 'custom_collectibles_v1_test.dart' as products;

class Identity {
  String? owner = 'fixture-owner', token = 'token-a';
  final changes = StreamController<String?>.broadcast(sync: true);
  ({String? ownerId, String? token}) read() => (ownerId: owner, token: token);
  void change(String? id, {bool emit = true}) {
    owner = id;
    token = id == null ? null : 'token-$id';
    if (emit) changes.add(id);
  }

  StorefrontService service(
    Future<http.Response> Function(http.Request) handler, {
    SupabaseClient? supabase,
  }) => StorefrontService(
    client: MockClient(handler),
    supabase: supabase,
    baseUrl: 'http://127.0.0.1:15440',
    sessionReader: read,
    ownerChanges: changes.stream,
  );
}

http.Response ok(Object body) => http.Response(jsonEncode(body), 200);

void main() {
  test(
    'delayed owner response is discarded and A-B-A cannot revive it',
    () async {
      final identity = Identity();
      final pending = Completer<http.Response>();
      final requests = <http.Request>[];
      final service = identity.service((request) {
        requests.add(request);
        return pending.future;
      });
      final result = expectLater(
        service.owner(),
        throwsA(isA<StorefrontException>()),
      );
      identity.change('b');
      identity.change('fixture-owner');
      pending.complete(ok(fixtures.owner()));
      await result;
      await expectLater(
        service.change({'action': 'save'}),
        throwsA(isA<StorefrontException>()),
      );
      expect(requests, hasLength(1));
      expect(requests.single.headers['authorization'], 'Bearer token-a');
      service.dispose();
      await identity.changes.close();
    },
  );

  test(
    'request-time identity check works before the auth event arrives',
    () async {
      final identity = Identity();
      var requests = 0;
      final service = identity.service((_) async {
        requests++;
        return ok({});
      });
      service.bindOwner();
      identity.change('b', emit: false);
      await expectLater(
        service.change({'action': 'save'}),
        throwsA(isA<StorefrontException>()),
      );
      expect(requests, 0);
      expect(service.ownerClosed, isTrue);
      service.dispose();
      await identity.changes.close();
    },
  );

  test(
    'same-owner token refresh stays open and captures the refreshed token',
    () async {
      final identity = Identity();
      final requests = <http.Request>[];
      final service = identity.service((r) async {
        requests.add(r);
        return ok({});
      });
      service.bindOwner();
      identity.token = 'refreshed-a';
      identity.changes.add(identity.owner);
      await service.change({'action': 'publish', 'publish': false});
      expect(service.ownerClosed, isFalse);
      expect(requests.single.headers['authorization'], 'Bearer refreshed-a');
      service.dispose();
      await identity.changes.close();
    },
  );

  for (final actor in <String?>[null, 'b']) {
    test('no-store response rejects unverified actor $actor', () async {
      final identity = Identity();
      final service = identity.service(
        (_) async => ok({...fixtures.owner(draft: true), 'actorId': actor}),
      );
      await expectLater(service.owner(), throwsA(isA<StorefrontException>()));
      expect(service.ownerClosed, isTrue);
      service.dispose();
      await identity.changes.close();
    });
  }

  test(
    'confirmed no-store owner remains a valid independent workspace',
    () async {
      final identity = Identity();
      final service = identity.service(
        (_) async => ok(fixtures.owner(draft: true)),
      );
      expect((await service.owner()).store, isNull);
      expect(service.ownerClosed, isFalse);
      service.dispose();
      await identity.changes.close();
    },
  );

  for (final operation in [
    'owner',
    'products',
    'preview',
    'product-preview',
    'mutation',
    'product-mutation',
  ]) {
    test(
      '$operation discards late response after dispose without retry',
      () async {
        final identity = Identity();
        final pending = Completer<http.Response>();
        var count = 0;
        final service = identity.service((_) {
          count++;
          return pending.future;
        });
        final Future<dynamic> request = switch (operation) {
          'owner' => service.owner(),
          'products' => service.customProducts(),
          'preview' => service.read('test-store', preview: true),
          'product-preview' => service.product(
            'test-store',
            'product',
            preview: true,
          ),
          'mutation' => service.change({'action': 'publish', 'publish': false}),
          _ => service.changeProduct(null, 'save'),
        };
        final result = expectLater(
          request,
          throwsA(isA<StorefrontException>()),
        );
        service.dispose();
        pending.complete(ok({}));
        await result;
        expect(count, 1);
        await identity.changes.close();
      },
    );
  }

  test(
    'SDK media upload keeps original bearer across its async auth lookup; no follow-up attach',
    () async {
      final identity = Identity();
      final authLookup = Completer<String?>();
      final lookupStarted = Completer<void>();
      final uploads = <http.Request>[];
      final backend = SupabaseClient(
        'http://127.0.0.1:15441',
        'synthetic-publishable-key',
        accessToken: () {
          lookupStarted.complete();
          return authLookup.future;
        },
        httpClient: MockClient((r) async {
          uploads.add(r);
          return ok({'Key': 'vendor-store-media/test'});
        }),
      );
      var attaches = 0;
      final service = identity.service((_) async {
        attaches++;
        return ok({});
      }, supabase: backend);
      final result = expectLater(
        service.uploadMedia(
          'store',
          'logo',
          Uint8List.fromList([137, 80, 78, 71, 13, 10, 26, 10]),
        ),
        throwsA(isA<StorefrontException>()),
      );
      await lookupStarted.future;
      identity.change('b');
      authLookup.complete('replacement-token');
      await result;
      expect(uploads, hasLength(1));
      expect(uploads.single.headers['authorization'], 'Bearer token-a');
      expect(attaches, 0);
      service.dispose();
      await backend.dispose();
      await identity.changes.close();
    },
  );

  testWidgets(
    'loaded native store and open publication dialog close on account replacement',
    (tester) async {
      tester.view.physicalSize = const Size(1000, 2400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final identity = Identity();
      var writes = 0;
      final service = identity.service((r) async {
        if (r.method == 'POST') writes++;
        return ok(fixtures.owner());
      });
      await tester.pumpWidget(
        MaterialApp(home: StoreManagementScreen(service: service)),
      );
      await tester.pumpAndSettle();
      final control = find.widgetWithText(SwitchListTile, 'Published in app');
      await tester.ensureVisible(control);
      await tester.tap(control);
      await tester.pumpAndSettle();
      expect(find.text('Publish'), findsOneWidget);
      identity.change('b');
      await tester.pumpAndSettle();
      expect(find.text('Publish'), findsNothing);
      expect(find.byType(TextField), findsNothing);
      expect(find.text('Close'), findsOneWidget);
      await tester.tap(find.text('Close'));
      await tester.pumpAndSettle();
      identity.change('fixture-owner');
      await tester.pumpAndSettle();
      expect(find.text('Store closed'), findsOneWidget);
      expect(writes, 0);
      await tester.pumpWidget(const SizedBox());
      service.dispose();
      await identity.changes.close();
    },
  );

  testWidgets(
    'private draft text is cleared while a save response is pending',
    (tester) async {
      final identity = Identity();
      final pending = Completer<http.Response>();
      final service = identity.service((_) => pending.future);
      await tester.pumpWidget(
        MaterialApp(
          home: CustomProductEditorScreen(
            service: service,
            owner: products.owner(),
          ),
        ),
      );
      await tester.enterText(
        find.byKey(const ValueKey('custom_title')),
        'Private unsaved A',
      );
      final field = tester
          .widget<TextField>(find.byKey(const ValueKey('custom_title')))
          .controller!;
      await tester.scrollUntilVisible(
        find.text('Save draft'),
        400,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.text('Save draft'));
      await tester.pump();
      identity.change('b');
      expect(field.text, isEmpty);
      pending.complete(
        ok({
          'products': [products.product()],
        }),
      );
      await tester.pumpAndSettle();
      expect(find.byType(TextField), findsNothing);
      expect(find.text('Store closed'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      service.dispose();
      await identity.changes.close();
    },
  );

  for (final screen in [
    'owner-pending',
    'products',
    'store-preview',
    'product-preview',
  ]) {
    testWidgets('$screen cannot display a late private response after logout', (
      tester,
    ) async {
      final identity = Identity();
      final pending = Completer<http.Response>();
      final service = identity.service((_) => pending.future);
      final Widget page = switch (screen) {
        'owner-pending' => StoreManagementScreen(service: service),
        'products' => CustomProductManagementScreen(
          service: service,
          owner: products.owner(),
        ),
        'store-preview' => StorefrontScreen(
          slug: 'test-store',
          preview: true,
          service: service,
        ),
        _ => CustomProductScreen(
          slug: 'test-store',
          productId: 'product',
          preview: true,
          service: service,
        ),
      };
      await tester.pumpWidget(MaterialApp(home: page));
      identity.change(null);
      pending.complete(ok({'private': 'must never be rendered'}));
      await tester.pumpAndSettle();
      expect(find.text('Store closed'), findsOneWidget);
      expect(find.textContaining('must never'), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      service.dispose();
      await identity.changes.close();
    });
  }
}
