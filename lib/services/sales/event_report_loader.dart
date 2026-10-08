import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'vendor_events.dart';
import 'event_service.dart';

Future<Map<String, dynamic>> loadEventReportInput({
  required String ownerId,
  required String eventId,
  required Future<Object?> Function(String) readState,
  required Future<Object?> Function() readBook,
  required Future<Object?> Function(List<String>) readCosts,
  required void Function() checkOwner,
}) async {
  checkOwner();
  final state = validateEventState(await readState(eventId), ownerId, eventId);
  checkOwner();
  if (state['receiptAccess'] != true) {
    throw StateError(
      'Receipt access is unavailable. Event details and saved changes remain available.',
    );
  }
  final book = await readBook();
  checkOwner();
  if (book is! Map ||
      book['revision'] is! num ||
      (book['revision'] as num) < 0 ||
      (book['revision'] as num) > 9007199254740991 ||
      (book['revision'] as num) != (book['revision'] as num).truncate() ||
      '${(book['revision'] as num).toInt()}' !=
          state['selected']['bookRevision'] ||
      book['book'] is! Map ||
      book['book']['receipts'] is! List ||
      (book['book']['receipts'] as List).length > 10000) {
    throw const FormatException(
      'Receipt history changed. Refresh before reviewing this event.',
    );
  }
  final bookRevision = '${(book['revision'] as num).toInt()}',
      receipts =
          jsonDecode(
                jsonEncode(
                  (book['book']['receipts'] as List)
                      .map((r) => r is Map ? r['receipt'] : null)
                      .toList(),
                ),
              )
              as List,
      ids = (state['selected']['assignments'] as List)
          .where((r) => r['eventId'] == eventId)
          .map((r) => r['receiptId'] as String)
          .toList(),
      snapshots = <dynamic>[];
  for (var offset = 0; offset < ids.length; offset += 100) {
    checkOwner();
    final batch = ids.sublist(
          offset,
          offset + 100 < ids.length ? offset + 100 : ids.length,
        ),
        result = await readCosts(List.unmodifiable(batch));
    checkOwner();
    if (result is! Map ||
        result['ownerId'] != ownerId ||
        result['snapshots'] is! List ||
        (result['snapshots'] as List).length > batch.length) {
      throw const FormatException(
        'Private cost history could not be verified. Refresh this event.',
      );
    }
    final seen = <String>{};
    for (final row in result['snapshots'] as List) {
      if (row is! Map ||
          row['receiptId'] is! String ||
          !batch.contains(row['receiptId']) ||
          !seen.add(row['receiptId'] as String)) {
        throw const FormatException(
          'Private cost history could not be verified. Refresh this event.',
        );
      }
    }
    snapshots.addAll(jsonDecode(jsonEncode(result['snapshots'])) as List);
  }
  checkOwner();
  return {
    'state': state,
    'ownerId': ownerId,
    'eventId': eventId,
    'bookRevision': bookRevision,
    'receipts': receipts,
    'snapshots': snapshots,
  };
}

abstract interface class EventReportSource {
  Future<Map<String, dynamic>> report(
    String eventId, {
    Map<String, dynamic>? state,
    bool Function()? isCurrent,
  });
  Future<Map<String, dynamic>> history(
    String eventId, {
    String? beforeRevision,
    int limit = 50,
  });
}

class EventReportReader implements EventReportSource {
  EventReportReader(this.client, this.service);
  final SupabaseClient client;
  final EventService service;
  Future<Object?> _read(String name, Map<String, dynamic> params) async {
    service.checkOwner();
    final result = await client
        .rpc(name, params: params)
        .timeout(const Duration(seconds: 20));
    service.checkOwner();
    return result;
  }

  @override
  Future<Map<String, dynamic>> report(
    String eventId, {
    Map<String, dynamic>? state,
    bool Function()? isCurrent,
  }) => loadEventReportInput(
    ownerId: service.ownerId,
    eventId: eventId,
    checkOwner: () {
      service.checkOwner();
      if (isCurrent != null && !isCurrent()) {
        throw StateError('Another event is now selected.');
      }
    },
    readState: (id) => state != null ? Future.value(state) : service.read(id),
    readBook: () => _read('vendor_receipt_book_read_v1', {}),
    readCosts: (ids) =>
        _read('vendor_sale_cost_read_v1', {'p_request_ids': ids}),
  );
  @override
  Future<Map<String, dynamic>> history(
    String eventId, {
    String? beforeRevision,
    int limit = 50,
  }) async {
    service.checkOwner();
    final result = await _read('vendor_event_history_read_v1', {
      'p_event_id': eventId,
      'p_before_revision': beforeRevision,
      'p_limit': limit,
    });
    service.checkOwner();
    return validateEventHistory(
      result,
      service.ownerId,
      eventId,
      beforeRevision: beforeRevision,
      limit: limit,
    );
  }
}
