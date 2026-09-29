import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class OwnerCopyFixture {
  final copies = <String, List<Map<String, dynamic>>>{};
  final requests = <http.Request>[];
  int? failOffset;
  int? rowCap;
  bool malformed = false;
  final tableReads = <String, Object?>{};
  bool priceFails = false;
  late final client = SupabaseClient(
    'http://127.0.0.1:54321',
    'fixture-key',
    authOptions: const AuthClientOptions(autoRefreshToken: false),
    httpClient: MockClient((request) async {
      Object? result;
      var status = 200;
      final path = request.url.path;
      if (path.contains('/auth/')) {
        final payload = base64Url
            .encode(
              utf8.encode(jsonEncode({'exp': 4000000000, 'sub': 'owner'})),
            )
            .replaceAll('=', '');
        result = {
          'access_token': 'e30.$payload.fixture',
          'refresh_token': 'fixture',
          'expires_in': 3600,
          'token_type': 'bearer',
          'user': {
            'id': 'owner',
            'email': 'fixture@example.test',
            'aud': 'authenticated',
            'created_at': '2026-09-25T00:00:00Z',
          },
        };
      } else {
        requests.add(request);
        if (request.method == 'GET' &&
            tableReads.containsKey(path.split('/').last)) {
          result = tableReads[path.split('/').last];
        } else if (path.endsWith('/get_market_pricing_read_model_v1') &&
            priceFails) {
          result = {'code': 'P0001', 'message': 'Fixture price unavailable'};
          status = 400;
        } else if (path.endsWith('/vault_mobile_card_copies_v1')) {
          final args = jsonDecode(request.body);
          if (args['p_vault_item_id'] != null) {
            throw StateError('Unexpected legacy-anchor broadening');
          }
          final offset = int.parse(
            request.url.queryParameters['offset'] ?? '0',
          );
          final limit = int.parse(
            request.url.queryParameters['limit'] ?? '200',
          );
          if (offset == failOffset) {
            result = {'code': '42501', 'message': 'Fixture read denied'};
            status = 403;
          } else {
            result = malformed
                ? {'unexpected': true}
                : (copies[args['p_card_print_id']] ?? [])
                      .skip(offset)
                      .take(rowCap == null || rowCap! > limit ? limit : rowCap!)
                      .toList();
          }
        } else if (path.endsWith('/shared_cards')) {
          result = [
            {'card_id': 'raw', 'is_shared': true},
          ];
        } else if (path.endsWith('/vault_items') && request.method == 'GET') {
          result = [
            {'id': 'newest-anchor'},
          ];
        } else {
          throw StateError(
            'Unexpected or mutating ownership request: ${request.method} $path',
          );
        }
      }
      return http.Response(
        jsonEncode(result),
        status,
        request: request,
        headers: {'content-type': 'application/json'},
      );
    }),
  );
  Future<void> signIn() async {
    await client.auth.signInWithPassword(
      email: 'fixture@example.test',
      password: 'fixture',
    );
  }
}

Map<String, dynamic> ownedCopy(
  String id, {
  String? anchor,
  bool slab = false,
  String intent = 'hold',
  bool hasGvvi = true,
}) => {
  'instance_id': id,
  'gv_vi_id': hasGvvi ? 'GVVI-$id' : null,
  'legacy_vault_item_id': anchor,
  'intent': intent,
  'is_graded': slab,
  'created_at': '2026-09-25T00:00:00Z',
  if (slab) 'cert_number': 'fixture-cert-$id',
};
