import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../square/square_service.dart';

/// Existing archive RPCs remain the owner writer. Only an explicit transactional
/// rollback naming an exact Square-held copy can prepare a withdrawal and retry.
Future<T> squareAwareVaultArchive<T>({
  required SupabaseClient client,
  required Future<T> Function() archive,
  SquareGateway? gateway,
}) async {
  final owner = client.auth.currentUser?.id;
  if (owner == null) throw Exception('Sign in to remove this card.');
  final prepared = <String>{};
  SquareGateway? connection;
  try {
    for (var attempt = 0; attempt <= 1000; attempt++) {
      if (client.auth.currentUser?.id != owner) {
        throw Exception('Sign in to the same grookai account to continue.');
      }
      try {
        return await archive();
      } on PostgrestException catch (error) {
        if (error.code == '55000' && error.message == 'square_removal_busy') {
          throw Exception(
            'Square is updating this card. Wait a moment, then try removing it again.',
          );
        }
        if (error.code != '55000' || error.message != 'square_stock_reserved') {
          rethrow;
        }
        final target = squareArchiveRecoveryTarget(error.details);
        if (target == null) {
          throw Exception(
            'This card is reserved in Square. Check its stock status before removing it.',
          );
        }
        final instanceId = target['instanceId']!;
        if (!prepared.add(instanceId)) {
          throw Exception(
            'Removal could not be confirmed. Reload this card before trying again.',
          );
        }
        connection ??= gateway ?? SquareService(client, ownerId: owner);
        final result = await connection.call('prepareRemoval', {
          'instanceId': instanceId,
        });
        if (client.auth.currentUser?.id != owner ||
            result['status'] != 'ready_to_archive' ||
            result['instanceId'] != instanceId ||
            result['gvvi'] != target['gvvi']) {
          throw Exception(
            'Removal could not be confirmed. Reload this card before trying again.',
          );
        }
      }
    }
    throw Exception('Remove fewer cards at a time, then try again.');
  } on StateError catch (error) {
    throw Exception(error.message);
  } finally {
    if (gateway == null) connection?.dispose();
  }
}

Map<String, String>? squareArchiveRecoveryTarget(dynamic details) {
  if (details is! String || details.length > 2048) return null;
  try {
    final dynamic value = jsonDecode(details);
    if (value is! Map || value['kind'] != 'square_vault_removal_v1') {
      return null;
    }
    final id = value['instanceId'];
    final gvvi = value['gvvi'];
    if (id is! String ||
        !RegExp(
          r'^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$',
        ).hasMatch(id) ||
        gvvi is! String ||
        !RegExp(r'^GVVI-[A-Z0-9]{6,12}-[0-9]{6}$').hasMatch(gvvi)) {
      return null;
    }
    return {'instanceId': id, 'gvvi': gvvi};
  } on FormatException {
    return null;
  }
}
