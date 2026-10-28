import 'dart:async';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'intake_models.dart';

class IntakeService {
  IntakeService(this.client);
  final SupabaseClient client;
  static const connectionMessage =
      'Could not connect. Your local draft is retained. Reconnect and retry.';
  String get userId =>
      client.auth.currentUser?.id ??
      (throw StateError('Sign in to use intake.'));
  Future<dynamic> call(
    String action, [
    Map<String, dynamic> payload = const {},
  ]) async {
    late final FunctionResponse response;
    try {
      response = await client.functions.invoke(
        'vault-intake-v1',
        body: {'action': action, 'payload': payload},
      );
    } on http.ClientException {
      throw StateError(connectionMessage);
    } on TimeoutException {
      // A timeout can follow a successful commit. The controller reconciles
      // the same durable batch before attempting another save.
      throw StateError(connectionMessage);
    } on FunctionException catch (error) {
      final details = error.details;
      final code = details is Map ? details['error']?.toString() : null;
      throw StateError(switch (code) {
        'intake_service_unavailable' =>
          'Saving is temporarily unavailable. Your local draft is retained. Try again shortly.',
        'invalid_payload' =>
          'Review the card, quantity, acquisition date and costs before retrying. Your draft is retained.',
        'not_found' =>
          'This draft or lot is unavailable for this account. Refresh its cloud version.',
        'revision_conflict' =>
          'This draft or lot changed on another device. Refresh its cloud version before saving.',
        'lot_changed_review_costs_again' =>
          'This lot changed during cost review. Review the latest available costs and save again.',
        'allocation_exceeds_lot_total' =>
          'Assigned intake costs exceed the lot total. Review the split and reserve.',
        'total_below_allocated_cost' =>
          'The lot total cannot be lower than costs already assigned to its copies.',
        'disposed_copy_cost_locked' =>
          'Sold or archived copies keep their original intake cost.',
        'lot_currency_locked' =>
          'A lot with saved copies keeps its original currency.',
        _ =>
          'Intake could not be saved. Your local draft is retained. Check the connection and retry.',
      });
    }
    final data = response.data;
    if (response.status >= 300 || data is! Map || data['ok'] != true) {
      throw StateError(
        'Intake could not be confirmed. Your local draft is retained. Check the connection and retry.',
      );
    }
    return data['result'];
  }

  Future<List<PurchaseLot>> lots() async => (await call('lots.list') as List)
      .map((v) => PurchaseLot.fromJson(Map<String, dynamic>.from(v as Map)))
      .toList();
  Future<PurchaseLot> saveLot(PurchaseLot lot) async => PurchaseLot.fromJson(
    Map<String, dynamic>.from(await call('lot.save', lot.toJson()) as Map),
  );
  Future<List<Map<String, dynamic>>> drafts() async =>
      (await call('batches.list') as List)
          .map((v) => Map<String, dynamic>.from(v as Map))
          .toList();
  Future<Map<String, dynamic>> getBatch(String id) async =>
      Map<String, dynamic>.from(await call('batch.get', {'id': id}) as Map);
  Future<Map<String, dynamic>> saveBatch(IntakeBatch batch) async =>
      Map<String, dynamic>.from(
        await call('batch.save', {
              ...batch.toJson(),
              'snapshot': batch.toJson(),
            })
            as Map,
      );
  Future<Map<String, dynamic>> commit(IntakeBatch batch) async =>
      Map<String, dynamic>.from(
        await call('batch.commit', {'id': batch.id, 'revision': batch.revision})
            as Map,
      );
  Future<Map<String, dynamic>> copies([
    Map<String, dynamic> filters = const {},
  ]) async => Map<String, dynamic>.from(
    await call(
          filters['lot_id'] == null ? 'copies.filter' : 'lot.detail',
          filters,
        )
        as Map,
  );
  Future<void> upload(String path, Uint8List bytes) async {
    if (!path.startsWith('$userId/')) throw StateError('Image owner mismatch');
    await client.storage
        .from('vault-intake-private')
        .uploadBinary(
          path,
          bytes,
          fileOptions: const FileOptions(
            contentType: 'image/jpeg',
            upsert: true,
          ),
        );
  }

  Future<Uint8List> download(String path) async {
    if (!path.startsWith('$userId/')) throw StateError('Image owner mismatch');
    return client.storage.from('vault-intake-private').download(path);
  }
}
