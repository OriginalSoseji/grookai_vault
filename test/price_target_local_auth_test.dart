import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';
import 'package:grookai_vault/services/notifications/price_target_service.dart';

class PriceLocalOnlyClient extends http.BaseClient {
  final http.Client inner = http.Client();
  bool loseNextSave = false, holdNextSave = false;
  Completer<void>? arrived, release;
  final posts = <String>[], bearers = <String?>[], statuses = <int>[];
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    if (!{
      'http://127.0.0.1:36141',
      'http://127.0.0.1:36171',
    }.contains(request.url.origin)) {
      throw StateError('Nonlocal request refused');
    }
    if (request.url.path == '/api/price-alerts' && request.method == 'POST') {
      expect(request.headers.containsKey('cookie'), false);
      posts.add((request as http.Request).body);
      bearers.add(request.headers['authorization']);
      if (holdNextSave) {
        holdNextSave = false;
        arrived!.complete();
        await release!.future;
      }
      final response = await http.Response.fromStream(
        await inner.send(request),
      );
      statuses.add(response.statusCode);
      if (loseNextSave) {
        loseNextSave = false;
        expect(response.statusCode, 200);
        throw http.ClientException('Synthetic response loss after commit');
      }
      return http.StreamedResponse(
        Stream.value(response.bodyBytes),
        response.statusCode,
        headers: response.headers,
      );
    }
    return inner.send(request);
  }

  void hold() {
    holdNextSave = true;
    arrived = Completer<void>();
    release = Completer<void>();
  }

  @override
  void close() => inner.close();
}

void main() {
  final input = Platform.environment['GROOKAI_PRICE_TARGET_LOCAL_PROOF'];
  test(
    'actual local Auth and native price targets preserve retries and original actor',
    () async {
      HttpOverrides.global = null;
      final config = jsonDecode(File(input!).readAsStringSync()) as Map;
      expect(config['apiUrl'], 'http://127.0.0.1:36141');
      expect(config['origin'], 'http://127.0.0.1:36171');
      final users = config['users'] as List,
          checks = <String>[],
          services = <PriceTargetService>[];
      final auth = SupabaseClient(
        config['apiUrl'] as String,
        config['publishableKey'] as String,
        httpClient: PriceLocalOnlyClient(),
        authOptions: const AuthClientOptions(autoRefreshToken: false),
      );
      final transport = PriceLocalOnlyClient();
      Future<void> signIn(int i) async {
        final u = users[i] as Map;
        final r = await auth.auth.signInWithPassword(
          email: u['email'] as String,
          password: u['password'] as String,
        );
        expect(r.user!.id, u['id']);
      }

      PriceTargetService create([PriceLocalOnlyClient? client]) {
        final service = PriceTargetService(
          ownerId: auth.auth.currentUser!.id,
          supabase: auth,
          httpClient: client ?? PriceLocalOnlyClient(),
          baseUrl: config['origin'] as String,
        );
        services.add(service);
        return service;
      }

      try {
        await signIn(0);
        final service = create(transport);
        expect((await service.read()).targets, isEmpty);
        final catalog = await service.catalog(config['gv'] as String, 0);
        expect(
          (catalog['cards'] as List).any(
            (c) => (c['printings'] as List).any(
              (p) => p['id'] == config['printing'],
            ),
          ),
          true,
        );
        checks.add(
          'Actual native Auth reads its empty owner list and exact catalog printing',
        );
        final body = <String, dynamic>{
          'requestId': const Uuid().v4(),
          'id': const Uuid().v4(),
          'expectedRevision': '0',
          'printingId': config['printing'],
          'direction': 'at_or_below',
          'amount': '12.34000000000000000001',
          'currency': 'USD',
          'enabled': true,
        };
        transport.loseNextSave = true;
        await expectLater(
          service.save(body),
          throwsA(
            isA<PriceTargetFailure>().having(
              (e) => e.definitive,
              'uncertain',
              false,
            ),
          ),
        );
        expect(transport.posts.length, 1);
        await service.save(body);
        expect(transport.posts[0], transport.posts[1]);
        final saved = (await service.read()).targets.single;
        expect(saved.id, body['id']);
        expect(saved.amount, body['amount']);
        checks.add(
          'Real committed-response loss recovers one target with identical request and exact amount',
        );
        final oldBearer = 'Bearer ${auth.auth.currentSession!.accessToken}';
        transport.hold();
        final pending = expectLater(
          service.save({
            ...body,
            'requestId': const Uuid().v4(),
            'expectedRevision': '1',
            'enabled': false,
          }),
          throwsA(isA<PriceTargetFailure>()),
        );
        await transport.arrived!.future;
        await auth.auth.signOut();
        await signIn(1);
        expect(service.closed, true);
        transport.release!.complete();
        await pending;
        expect(transport.posts.length, 3);
        expect(transport.bearers.last, oldBearer);
        expect(transport.statuses.last, 401);
        expect((await create().read()).targets, isEmpty);
        checks.add(
          'Actual logout and replacement login do not retarget a paused native save; server rejects its original token once',
        );
        await auth.auth.signOut();
        await signIn(0);
        await expectLater(service.read(), throwsA(isA<PriceTargetFailure>()));
        final reopened = create();
        final original = (await reopened.read()).targets.single;
        expect(original.revision, '1');
        expect(original.enabled, true);
        checks.add(
          'Returning to original owner requires a new service; its unchanged target remains active',
        );
        await reopened.save({
          ...body,
          'requestId': const Uuid().v4(),
          'expectedRevision': '1',
          'enabled': false,
        });
        expect((await reopened.read()).targets.single.status, 'Paused');
        checks.add(
          'Explicit owner pause advances the retained target without duplicate records',
        );
        File(config['result'] as String).writeAsStringSync(
          '${const JsonEncoder.withIndent('  ').convert({'status': 'passed', 'checks': checks, 'actualSdkAuth': true, 'actualNativeService': true, 'physicalDevice': false, 'productionWrites': 0, 'providerCalls': 0})}\n',
        );
      } finally {
        if (transport.release != null && !transport.release!.isCompleted) {
          transport.release!.complete();
        }
        for (final s in services) {
          s.dispose();
        }
        await auth.dispose();
      }
    },
    skip: input == null ? 'Dedicated isolated price-target proof only' : false,
  );
}
