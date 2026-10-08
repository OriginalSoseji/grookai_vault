import 'dart:async';
import 'dart:math';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'vendor_events.dart';
import 'event_journal.dart';
import 'event_journal_store.dart';

String newEventId() {
  final random = Random.secure(),
      bytes = List.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
}

class EventRpcError implements Exception {
  const EventRpcError(this.code, {this.definitive = false});
  final String? code;
  final bool definitive;
}

abstract interface class EventGateway {
  String? get ownerId;
  Stream<String?> get ownerChanges;
  Future<Object?> read(String? eventId);
  Future<Object?> recover(String requestId);
  Future<Object?> mutate(Map<String, dynamic> request);
}

class SupabaseEventGateway implements EventGateway {
  SupabaseEventGateway(this.client);
  final SupabaseClient client;
  @override
  String? get ownerId => client.auth.currentUser?.id;
  @override
  Stream<String?> get ownerChanges =>
      client.auth.onAuthStateChange.map((event) => event.session?.user.id);
  Future<Object?> _rpc(String name, Map<String, dynamic> params) async {
    try {
      return await client
          .rpc(name, params: params)
          .timeout(const Duration(seconds: 20));
    } on PostgrestException catch (error) {
      throw EventRpcError(
        error.code,
        definitive: ['PT409', '22023', '42501'].contains(error.code),
      );
    }
  }

  @override
  Future<Object?> read(String? eventId) =>
      _rpc('vendor_event_read_v1', {'p_event_id': eventId});
  @override
  Future<Object?> recover(String requestId) =>
      _rpc('vendor_event_request_read_v1', {'p_request_id': requestId});
  @override
  Future<Object?> mutate(Map<String, dynamic> request) =>
      _rpc('vendor_event_mutate_v1', eventRequestParams(request));
}

class EventAttempt {
  const EventAttempt(
    this.status,
    this.journal, {
    this.acknowledgement,
    this.code,
    this.message,
  });
  final String status;
  final Map<String, dynamic>? journal, acknowledgement;
  final String? code, message;
}

class EventService {
  EventService({
    required this.gateway,
    EventJournalStore? store,
    String Function()? newId,
  }) : ownerId = gateway.ownerId ?? '',
       _providedStore = store,
       _newId = newId ?? newEventId {
    validateEventJournal(null, ownerId);
    _subscription = gateway.ownerChanges.listen((owner) {
      if (owner != ownerId) _invalidate();
    }, onError: (Object _) => _invalidate());
  }
  factory EventService.supabase(SupabaseClient client) =>
      EventService(gateway: SupabaseEventGateway(client));
  final EventGateway gateway;
  final String ownerId;
  final EventJournalStore? _providedStore;
  final String Function() _newId;
  late final EventJournalStore _store =
      _providedStore ??
      SqliteEventJournalStore(ownerId: ownerId, checkOwner: checkOwner);
  late final StreamSubscription<String?> _subscription;
  final _changes = StreamController<void>.broadcast(sync: true);
  bool _invalid = false, _busy = false;
  Stream<void> get accountChanges => _changes.stream;
  void _invalidate() {
    if (_invalid) return;
    _invalid = true;
    if (!_changes.isClosed) _changes.add(null);
  }

  void checkOwner() {
    if (gateway.ownerId != ownerId) _invalidate();
    if (_invalid) throw StateError('Your account changed. Reopen Events.');
  }

  void dispose() {
    _invalidate();
    unawaited(_subscription.cancel());
    unawaited(_changes.close());
  }

  Future<Map<String, dynamic>> read([String? eventId]) async {
    checkOwner();
    final data = await gateway.read(eventId);
    checkOwner();
    return validateEventState(data, ownerId, eventId);
  }

  Future<Map<String, dynamic>?> journal() async {
    checkOwner();
    final row = await _store.read();
    checkOwner();
    return validateEventJournal(row, ownerId);
  }

  Future<T> _exclusive<T>(Future<T> Function() action) async {
    checkOwner();
    if (_busy) throw StateError('An event save is already being checked.');
    _busy = true;
    try {
      return await action();
    } finally {
      _busy = false;
    }
  }

  Future<EventAttempt> begin(
    Map<String, dynamic> operation,
    String expectedRevision,
    String? expectedLocalRevision,
  ) {
    final request = validateEventRequest({
      'version': 1,
      'requestId': _newId(),
      'expectedRevision': expectedRevision,
      'operation': operation,
    });
    return _exclusive(() async {
      final row = await _store.change({
        'ownerId': ownerId,
        'expectedLocalRevision': expectedLocalRevision,
        'nextLocalRevision': _newId(),
        'action': 'stage',
        'request': request,
      });
      checkOwner();
      return _resolveRow(row, true);
    });
  }

  Future<EventAttempt> recover({bool sendIfMissing = true}) =>
      _exclusive(() async {
        final row = await journal();
        return row?['pending'] != null
            ? _resolveRow(row!, sendIfMissing)
            : EventAttempt('empty', row);
      });
  Future<Map<String, dynamic>> discardRejected(String expectedLocalRevision) =>
      _exclusive(() async {
        final row = await _store.change({
          'ownerId': ownerId,
          'expectedLocalRevision': expectedLocalRevision,
          'nextLocalRevision': _newId(),
          'action': 'discardRejected',
        });
        checkOwner();
        return row;
      });
  Future<EventAttempt> _resolveRow(
    Map<String, dynamic> row,
    bool sendIfMissing,
  ) async {
    final pending =
        validateEventJournal(row, ownerId)!['pending'] as Map<String, dynamic>;
    EventAttempt uncertain() => EventAttempt(
      'unconfirmed',
      row,
      message:
          'This save is not confirmed yet. Its exact request is retained; check it again before starting another edit.',
    );
    Future<EventAttempt> settle(Object? result) async {
      final acknowledgement = confirmedEventRequest(pending, result, ownerId);
      checkOwner();
      final saved = await _store.change({
        'ownerId': ownerId,
        'expectedLocalRevision': row['localRevision'],
        'nextLocalRevision': _newId(),
        'action': 'acknowledge',
        'request': pending,
        'acknowledgement': acknowledgement,
      });
      checkOwner();
      return EventAttempt('saved', saved, acknowledgement: acknowledgement);
    }

    Object? recovered;
    try {
      recovered = await gateway.recover(pending['requestId'] as String);
      checkOwner();
    } catch (_) {
      checkOwner();
      return uncertain();
    }
    if (recovered != null) {
      try {
        return await settle(recovered);
      } catch (_) {
        checkOwner();
        return uncertain();
      }
    }
    if (!sendIfMissing) {
      return row['rejection'] != null
          ? EventAttempt('rejected', row, code: row['rejection'] as String)
          : uncertain();
    }
    Object? result;
    try {
      checkOwner();
      result = await gateway.mutate(pending);
      checkOwner();
    } catch (error) {
      checkOwner();
      if (error is EventRpcError &&
          error.definitive &&
          ['PT409', '22023', '42501'].contains(error.code)) {
        try {
          final saved = await _store.change({
            'ownerId': ownerId,
            'expectedLocalRevision': row['localRevision'],
            'nextLocalRevision': _newId(),
            'action': 'reject',
            'request': pending,
            'code': error.code,
          });
          checkOwner();
          return EventAttempt('rejected', saved, code: error.code);
        } catch (_) {
          checkOwner();
          return uncertain();
        }
      }
      return uncertain();
    }
    try {
      return await settle(result);
    } catch (_) {
      checkOwner();
      return uncertain();
    }
  }
}
