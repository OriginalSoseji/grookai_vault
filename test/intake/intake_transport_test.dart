import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/services/intake/intake_service.dart';

void main() {
  for (final failure in [
    http.ClientException('Failed host lookup: private-host.example'),
    TimeoutException('response lost at private-host.example'),
  ]) {
    test(
      'SDK ${failure.runtimeType} is safe and leaves retry to the caller',
      () async {
        final bodies = <Map<String, dynamic>>[];
        final client = SupabaseClient(
          'https://example.test',
          'public-test',
          authOptions: const AuthClientOptions(autoRefreshToken: false),
          httpClient: MockClient((request) async {
            bodies.add(jsonDecode(request.body) as Map<String, dynamic>);
            if (bodies.length == 1) throw failure;
            return http.Response(
              jsonEncode({
                'ok': true,
                'result': {'state': 'saved'},
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }),
        );
        addTearDown(client.dispose);
        final service = IntakeService(client);
        const payload = {'id': 'durable-batch', 'revision': 1};
        await expectLater(
          service.call('batch.commit', payload),
          throwsA(
            isA<StateError>().having(
              (error) => error.message,
              'collector message',
              IntakeService.connectionMessage,
            ),
          ),
        );
        expect(
          bodies.length,
          1,
          reason: 'An uncertain write is never auto-retried.',
        );
        expect(await service.call('batch.commit', payload), {'state': 'saved'});
        expect(
          bodies.last,
          bodies.first,
          reason: 'Retry preserves batch identity.',
        );
      },
    );
  }
}
