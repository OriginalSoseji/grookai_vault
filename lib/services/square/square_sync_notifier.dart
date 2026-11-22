import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'square_service.dart';

/// A post-save wakeup only. The durable server queue/worker remains authoritative.
/// A failed wakeup never turns a successful Vault save into an apparent failure.
class SquareSyncNotifier {
  static Future<String> offerSaved(
    SupabaseClient client,
    String instanceId, {
    bool waitForConfirmation = false,
  }) async {
    final owner = client.auth.currentUser?.id;
    if (owner == null) return 'not_enabled';
    final service = SquareService(client, ownerId: owner);
    try {
      return await awaitSquareOfferNotification(
        () => service.notifyOffer(instanceId),
        waitForConfirmation: waitForConfirmation,
      );
    } catch (_) {
      return 'pending';
    } finally {
      service.dispose();
    }
  }
}

/// Wait for the server's focused result, never infer readiness from elapsed time.
/// Known busy/pending replies may wake the same idempotent worker again; an
/// uncertain transport result is retained for recovery without a blind replay.
Future<String> awaitSquareOfferNotification(
  Future<Map<String, dynamic>> Function() notify, {
  bool waitForConfirmation = false,
}) async {
  var active = true;
  Future<String> run() async {
    final attempts = waitForConfirmation ? 5 : 1;
    const delays = [2, 4, 8, 12];
    for (var attempt = 0; attempt < attempts && active; attempt++) {
      final result = await notify();
      if (!active) return 'pending';
      final status = result['status'];
      if (!['ready', 'pending', 'review', 'not_enabled'].contains(status)) {
        return 'pending';
      }
      if (status != 'pending' || attempt == attempts - 1) {
        return status as String;
      }
      await Future<void>.delayed(Duration(seconds: delays[attempt]));
    }
    return 'pending';
  }

  try {
    return await run().timeout(
      Duration(seconds: waitForConfirmation ? 55 : 12),
    );
  } catch (_) {
    return 'pending';
  } finally {
    // Future.timeout cannot cancel the in-flight transport. This prevents a
    // late response or delay from starting another request after disposal.
    active = false;
  }
}
