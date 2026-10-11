import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/services/stores/storefront_service.dart';

class LocalOnlyClient extends http.BaseClient {
  final http.Client inner = http.Client();
  final allowed = {'http://127.0.0.1:35941', 'http://127.0.0.1:35971'};
  Completer<void>? arrived, release;
  String? holdMethod;
  int ownerPosts = 0;
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    if (!allowed.contains(request.url.origin)) {
      throw StateError('Nonlocal request refused');
    }
    if (request.url.path == '/api/stores/owner') {
      expect(request.headers['authorization'], startsWith('Bearer '));
      expect(request.headers.containsKey('cookie'), isFalse);
      if (request.method == 'POST') ownerPosts++;
      if (request.method == holdMethod) {
        holdMethod = null;
        if (request.method == 'POST') {
          arrived!.complete();
          await release!.future;
          return inner.send(request);
        }
        final response = await http.Response.fromStream(
          await inner.send(request),
        );
        expect(response.statusCode, 200);
        arrived!.complete();
        await release!.future;
        return http.StreamedResponse(
          Stream.value(response.bodyBytes),
          response.statusCode,
          headers: response.headers,
        );
      }
    }
    return inner.send(request);
  }

  void hold(String method) {
    holdMethod = method;
    arrived = Completer<void>();
    release = Completer<void>();
  }

  @override
  void close() => inner.close();
}

void main() {
  final input = Platform.environment['GROOKAI_STORE_OWNER_LOCAL_PROOF'];
  test(
    'actual local Auth closes native service across delayed read and mutation handoff',
    () async {
      HttpOverrides.global = null;
      final config = jsonDecode(File(input!).readAsStringSync()) as Map;
      expect(config['apiUrl'], 'http://127.0.0.1:35941');
      expect(config['origin'], 'http://127.0.0.1:35971');
      final users = config['users'] as List;
      final authTransport = LocalOnlyClient();
      final auth = SupabaseClient(
        config['apiUrl'] as String,
        config['publishableKey'] as String,
        httpClient: authTransport,
        authOptions: const AuthClientOptions(autoRefreshToken: false),
      );
      final checks = <String>[];
      final services = <StorefrontService>[];
      final transport = LocalOnlyClient();
      Future<void> signIn(int index) async {
        final user = users[index] as Map;
        final response = await auth.auth.signInWithPassword(
          email: user['email'] as String,
          password: user['password'] as String,
        );
        expect(response.user!.id, user['id']);
      }

      StorefrontService create([LocalOnlyClient? client]) {
        final service = StorefrontService(
          client: client ?? LocalOnlyClient(),
          supabase: auth,
          baseUrl: config['origin'] as String,
        );
        services.add(service);
        return service;
      }

      try {
        await signIn(0);
        final original = create(transport);
        expect((await original.owner()).store!['id'], users[0]['store']);
        checks.add(
          'Actual SDK sign-in and native owner projection agree on account A',
        );
        transport.hold('GET');
        final pending = expectLater(
          original.owner(),
          throwsA(isA<StorefrontException>()),
        );
        await transport.arrived!.future;
        await auth.auth.signOut();
        await signIn(1);
        expect(original.ownerClosed, isTrue);
        transport.release!.complete();
        await pending;
        checks.add(
          'Actual SDK logout/login closes native service before delayed private response completes',
        );
        final replacement = create();
        expect((await replacement.owner()).store!['id'], users[1]['store']);
        checks.add(
          'Explicit new native service opens only replacement owner B',
        );
        await auth.auth.signOut();
        await signIn(0);
        await expectLater(
          original.owner(),
          throwsA(isA<StorefrontException>()),
        );
        checks.add(
          'Returning to original account cannot revive its closed native service',
        );
        final mutationTransport = LocalOnlyClient();
        final mutation = create(mutationTransport);
        await mutation.owner();
        mutationTransport.hold('POST');
        final result = expectLater(
          mutation.change({
            'action': 'publish',
            'surface': 'app',
            'publish': false,
          }),
          throwsA(isA<StorefrontException>()),
        );
        await mutationTransport.arrived!.future;
        await auth.auth.signOut();
        await signIn(1);
        mutationTransport.release!.complete();
        await result;
        expect(mutationTransport.ownerPosts, 1);
        final finalOwner = await create().owner();
        expect(finalOwner.store!['id'], users[1]['store']);
        expect(finalOwner.store!['app_published'], false);
        checks.add(
          'Actual native unpublish paused before HTTP send cannot use replacement session and is not retried',
        );
        File(config['result'] as String).writeAsStringSync(
          '${const JsonEncoder.withIndent('  ').convert({'status': 'passed', 'checks': checks, 'actualSdkAuth': true, 'actualNativeService': true, 'physicalDevice': false, 'productionWrites': 0, 'providerCalls': 0})}\n',
        );
      } finally {
        if (transport.release != null && !transport.release!.isCompleted) {
          transport.release!.complete();
        }
        for (final service in services) {
          service.dispose();
        }
        await auth.dispose();
      }
    },
    skip: input == null
        ? 'Dedicated retained local-store proof runner only'
        : false,
  );
}
