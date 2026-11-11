import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'square_service.dart';

/// A post-save wakeup only. The durable server queue/worker remains authoritative.
/// A failed wakeup never turns a successful Vault save into an apparent failure.
class SquareSyncNotifier {
  static Future<String> offerSaved(
    SupabaseClient client,
    String instanceId,
  ) async {
    final owner = client.auth.currentUser?.id;
    if (owner == null) return 'not_enabled';
    final service = SquareService(client, ownerId: owner);
    try {
      final result = await service
          .notifyOffer(instanceId)
          .timeout(const Duration(seconds: 12));
      final status = result['status'];
      return ['ready', 'pending', 'review', 'not_enabled'].contains(status)
          ? status as String
          : 'pending';
    } catch (_) {
      return 'pending';
    } finally {
      service.dispose();
    }
  }
}
