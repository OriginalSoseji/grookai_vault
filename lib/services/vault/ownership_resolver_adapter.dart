import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/ownership_state.dart';
import 'ownership_resolver_service.dart';

class OwnershipResolverAdapter {
  OwnershipResolverAdapter._(SupabaseClient client)
    : _client = client,
      _resolver = OwnershipResolverService(client: client);

  static final OwnershipResolverAdapter instance = OwnershipResolverAdapter._(
    Supabase.instance.client,
  );

  final SupabaseClient _client;
  final OwnershipResolverService _resolver;
  final Map<String, Future<OwnershipState>> _cache =
      <String, Future<OwnershipState>>{};
  final Map<String, OwnershipState> _resolvedStates =
      <String, OwnershipState>{};

  Future<OwnershipState> get(String cardPrintId, {String? subjectUserId}) {
    final key = _cacheKey(cardPrintId, subjectUserId: subjectUserId);
    final resolved = _resolvedStates[key];
    if (resolved != null) {
      return Future<OwnershipState>.value(resolved);
    }
    final existing = _cache[key];
    if (existing != null) {
      return existing;
    }

    final future = _resolver
        .resolve(cardPrintId: cardPrintId, subjectUserId: subjectUserId)
        .then((state) {
          _resolvedStates[key] = state;
          return state;
        })
        .catchError((Object error) {
          _cache.remove(key);
          _resolvedStates.remove(key);
          throw error;
        });
    _cache[key] = future;
    return future;
  }

  Future<OwnershipState> refresh(String cardPrintId, {String? subjectUserId}) {
    invalidate(cardPrintId, subjectUserId: subjectUserId);
    return get(cardPrintId, subjectUserId: subjectUserId);
  }

  void invalidate(String cardPrintId, {String? subjectUserId}) {
    final key = _cacheKey(cardPrintId, subjectUserId: subjectUserId);
    _cache.remove(key);
    _resolvedStates.remove(key);
  }

  void primeAll(Iterable<String> cardPrintIds, {String? subjectUserId}) {
    unawaited(primeBatch(cardPrintIds, subjectUserId: subjectUserId));
  }

  Future<void> primeBatch(
    Iterable<String> cardPrintIds, {
    String? subjectUserId,
  }) async {
    final normalizedIds = cardPrintIds
        .map(_clean)
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList(growable: false);

    if (normalizedIds.isEmpty) {
      return;
    }

    final pendingCompleters = <String, Completer<OwnershipState>>{};
    final pendingIds = <String>[];

    for (final cardPrintId in normalizedIds) {
      final key = _cacheKey(cardPrintId, subjectUserId: subjectUserId);
      if (_resolvedStates.containsKey(key) || _cache.containsKey(key)) {
        continue;
      }

      final completer = Completer<OwnershipState>();
      pendingCompleters[cardPrintId] = completer;
      pendingIds.add(cardPrintId);
      _cache[key] = completer.future;
    }

    if (pendingIds.isNotEmpty) {
      try {
        final states = await _resolver.resolveMany(
          cardPrintIds: pendingIds,
          subjectUserId: subjectUserId,
        );

        for (final cardPrintId in pendingIds) {
          final key = _cacheKey(cardPrintId, subjectUserId: subjectUserId);
          final state =
              states[cardPrintId] ??
              OwnershipState.empty(
                isSelfContext: _isSelfContext(subjectUserId: subjectUserId),
              );
          _resolvedStates[key] = state;
          _cache[key] = Future<OwnershipState>.value(state);
          pendingCompleters[cardPrintId]?.complete(state);
        }
      } catch (error, stackTrace) {
        for (final cardPrintId in pendingIds) {
          final key = _cacheKey(cardPrintId, subjectUserId: subjectUserId);
          _cache.remove(key);
          _resolvedStates.remove(key);
          pendingCompleters[cardPrintId]?.completeError(error, stackTrace);
        }
        rethrow;
      }
    }

    await Future.wait(
      normalizedIds.map(
        (cardPrintId) => get(cardPrintId, subjectUserId: subjectUserId),
      ),
    );
  }

  OwnershipState? peek(String cardPrintId, {String? subjectUserId}) {
    return _resolvedStates[_cacheKey(
      cardPrintId,
      subjectUserId: subjectUserId,
    )];
  }

  Map<String, OwnershipState> snapshotForIds(
    Iterable<String> cardPrintIds, {
    String? subjectUserId,
  }) {
    final states = <String, OwnershipState>{};
    for (final cardPrintId in cardPrintIds) {
      final normalized = _clean(cardPrintId);
      if (normalized.isEmpty) {
        continue;
      }
      final state = peek(normalized, subjectUserId: subjectUserId);
      if (state != null) {
        states[normalized] = state;
      }
    }
    return states;
  }

  String _cacheKey(String cardPrintId, {String? subjectUserId}) {
    final normalizedCardPrintId = _clean(cardPrintId);
    final normalizedSubjectUserId = _clean(subjectUserId);
    if (normalizedSubjectUserId.isNotEmpty) {
      return '$normalizedSubjectUserId::$normalizedCardPrintId';
    }

    final currentUserId = _clean(_client.auth.currentUser?.id);
    final viewerScope = currentUserId.isEmpty ? 'anon' : currentUserId;
    return 'self:$viewerScope::$normalizedCardPrintId';
  }

  bool _isSelfContext({String? subjectUserId}) {
    final currentUserId = _clean(_client.auth.currentUser?.id);
    final normalizedSubjectUserId = _clean(subjectUserId);
    return normalizedSubjectUserId.isEmpty ||
        (currentUserId.isNotEmpty && normalizedSubjectUserId == currentUserId);
  }

  String _clean(dynamic value) => (value ?? '').toString().trim();
}
