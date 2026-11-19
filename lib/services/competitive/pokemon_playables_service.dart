import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../../secrets.dart';

/// Display metadata from the backend's published classification, never a
/// client-side decision about a card's mechanics or tournament eligibility.
class PokemonPlayableUsage {
  const PokemonPlayableUsage({required this.lists, required this.events});
  final int lists;
  final int events;
}

class PokemonPlayablesSnapshot {
  PokemonPlayablesSnapshot._({
    required this.id,
    required this.asOf,
    required this.validUntil,
    required this.state,
    required Map<String, PokemonPlayableUsage> rows,
  }) : rows = Map.unmodifiable(rows);

  final String id;
  final DateTime asOf;
  final DateTime validUntil;
  final String state;
  final Map<String, PokemonPlayableUsage> rows;

  bool isCurrentAt(DateTime now) =>
      !now.isBefore(asOf) && now.isBefore(validUntil);

  factory PokemonPlayablesSnapshot.fromJson(Map<String, dynamic> json) {
    final asOf = DateTime.tryParse('${json['as_of']}');
    final until = DateTime.tryParse('${json['valid_until']}');
    final id = json['snapshot_id'];
    final state = json['state'];
    final entries = json['rows'];
    if (json['ok'] != true ||
        json['version'] != 'pokemon_playables_public:v1' ||
        json['game'] != 'pokemon' ||
        json['format'] != 'standard' ||
        json['platform'] != 'paper' ||
        !const {'ready', 'insufficient_evidence'}.contains(state) ||
        id is! String ||
        !RegExp(r'^[a-f0-9]{64}$').hasMatch(id) ||
        asOf == null ||
        until == null ||
        !until.isAfter(asOf) ||
        until.difference(asOf) > const Duration(hours: 24) ||
        entries is! List ||
        entries.length > 20000 ||
        (state != 'ready' && entries.isNotEmpty)) {
      throw const FormatException('Invalid current playables publication.');
    }
    final rows = <String, PokemonPlayableUsage>{};
    final gvIds = <String>{};
    for (final row in entries) {
      if (row is! Map<String, dynamic>) {
        throw const FormatException('Invalid playable card.');
      }
      final cardId = row['card_print_id'];
      final gvId = row['gv_id'];
      final lists = row['lists'];
      final events = row['events'];
      if (cardId is! String ||
          !RegExp(
            r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$',
            caseSensitive: false,
          ).hasMatch(cardId) ||
          gvId is! String ||
          !gvId.startsWith('GV-PK-') ||
          rows.containsKey(cardId) ||
          !gvIds.add(gvId) ||
          lists is! int ||
          events is! int ||
          events <= 0 ||
          lists < events) {
        throw const FormatException('Invalid playable card.');
      }
      rows[cardId] = PokemonPlayableUsage(lists: lists, events: events);
    }
    return PokemonPlayablesSnapshot._(
      id: id,
      asOf: asOf.toUtc(),
      validUntil: until.toUtc(),
      state: state as String,
      rows: rows,
    );
  }
}

/// One bounded public read shared by visible consumers. Refreshes see revoked
/// membership; failure or expiry removes highlights instead of keeping flags.
class PokemonPlayablesService extends ChangeNotifier {
  PokemonPlayablesService({
    Future<http.Response> Function(Uri)? fetch,
    DateTime Function()? clock,
    Uri? endpoint,
    this.refreshInterval = const Duration(minutes: 1),
  }) : _fetch =
           fetch ??
           ((uri) => http.get(uri, headers: {'Accept': 'application/json'})),
       _clock = clock ?? DateTime.now,
       _endpoint = endpoint,
       assert(
         refreshInterval > Duration.zero &&
             refreshInterval <= const Duration(minutes: 1),
       );

  static final instance = PokemonPlayablesService();
  final Future<http.Response> Function(Uri) _fetch;
  final DateTime Function() _clock;
  final Uri? _endpoint;
  final Duration refreshInterval;
  PokemonPlayablesSnapshot? _snapshot;
  DateTime? _checkedAt;
  Future<PokemonPlayablesSnapshot?>? _inFlight;
  Timer? _timer;
  bool _disposed = false;

  PokemonPlayablesSnapshot? get currentSnapshot {
    final snapshot = _snapshot;
    return snapshot != null && snapshot.isCurrentAt(_clock()) ? snapshot : null;
  }

  PokemonPlayableUsage? usageFor(String cardPrintId) =>
      currentSnapshot?.rows[cardPrintId];

  Future<PokemonPlayablesSnapshot?> refresh({bool force = false}) {
    if (_disposed) return Future.value(null);
    _expire();
    if (_inFlight != null) return _inFlight!;
    if (!force &&
        _checkedAt != null &&
        _clock().difference(_checkedAt!) < refreshInterval) {
      _schedule();
      return Future.value(currentSnapshot);
    }
    return _inFlight = Future<PokemonPlayablesSnapshot?>.microtask(_load);
  }

  Future<PokemonPlayablesSnapshot?> _load() async {
    PokemonPlayablesSnapshot? next;
    try {
      final response = await _fetch(
        _endpoint ?? Uri.parse(grookaiWebBaseUrl).resolve('/api/playables'),
      ).timeout(const Duration(seconds: 10));
      if (response.statusCode != 200 ||
          response.bodyBytes.length > 4 * 1024 * 1024) {
        throw const FormatException('Current playables unavailable.');
      }
      final json = jsonDecode(response.body);
      if (json is! Map<String, dynamic>) {
        throw const FormatException('Invalid current playables publication.');
      }
      next = PokemonPlayablesSnapshot.fromJson(json);
      if (!next.isCurrentAt(_clock())) next = null;
    } catch (_) {
      // This optional read must not affect ordinary catalog, Vault or pricing.
      next = null;
    }
    if (_disposed) return null;
    _snapshot = next;
    _checkedAt = _clock();
    _inFlight = null;
    notifyListeners();
    _schedule();
    return currentSnapshot;
  }

  void _expire() {
    if (_snapshot != null && !_snapshot!.isCurrentAt(_clock())) {
      _snapshot = null;
      notifyListeners();
    }
  }

  void _schedule() {
    _timer?.cancel();
    if (_disposed || !hasListeners) return;
    var delay = refreshInterval;
    final now = _clock();
    final refreshRemaining = _checkedAt?.add(refreshInterval).difference(now);
    if (refreshRemaining != null && refreshRemaining < delay) {
      delay = refreshRemaining;
    }
    final remaining = currentSnapshot?.validUntil.difference(now);
    if (remaining != null && remaining < delay) delay = remaining;
    _timer = Timer(delay.isNegative ? Duration.zero : delay, () {
      _expire();
      unawaited(refresh(force: true));
    });
  }

  @override
  void removeListener(VoidCallback listener) {
    super.removeListener(listener);
    if (!hasListeners) _timer?.cancel();
  }

  @override
  void dispose() {
    _disposed = true;
    _timer?.cancel();
    super.dispose();
  }
}
