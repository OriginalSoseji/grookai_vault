import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart';

/// Owns the single sanitized Binder detail subscription that may be active.
///
/// The server publishes only `binder_refresh_signals` rows containing
/// `{binder_public_id, revision, changed_at}`. The payload is deliberately
/// ignored: it is merely a prompt to refetch guarded Binder RPC projections.
class BinderRealtimeLease {
  BinderRealtimeLease({
    required SupabaseClient client,
    required String publicId,
    required Future<bool> Function() onGuardedRefresh,
  }) : _client = client,
       _publicId = publicId.trim(),
       _onGuardedRefresh = onGuardedRefresh;

  final SupabaseClient _client;
  final String _publicId;
  final Future<bool> Function() _onGuardedRefresh;

  static final List<BinderRealtimeLease> _openLeases = <BinderRealtimeLease>[];
  static int _channelSequence = 0;

  RealtimeChannel? _channel;
  StreamSubscription<AuthState>? _authSubscription;
  Timer? _debounce;
  bool _started = false;
  bool _disposed = false;
  int _generation = 0;
  String? _boundUserId;

  Future<void> start() async {
    if (_disposed || _started || _publicId.isEmpty) return;
    _started = true;
    final previous = _openLeases.isEmpty ? null : _openLeases.last;
    _openLeases.remove(this);
    _openLeases.add(this);
    if (previous != null && previous != this) {
      await previous._deactivate();
    }
    await _activate();
  }

  Future<void> _activate() async {
    if (_disposed || _openLeases.isEmpty || _openLeases.last != this) return;
    await _deactivate();
    if (_disposed || _openLeases.isEmpty || _openLeases.last != this) return;

    final userId = (_client.auth.currentUser?.id ?? '').trim();
    if (userId.isEmpty) return;
    _boundUserId = userId;
    final generation = ++_generation;
    _authSubscription = _client.auth.onAuthStateChange.listen((state) {
      final currentId = (state.session?.user.id ?? '').trim();
      if (currentId != _boundUserId) {
        // Account changes and logout invalidate the RLS authorization that
        // existed when this channel was opened.
        dispose();
      }
    });

    final channel = _client
        .channel('binder-refresh-$_publicId-${++_channelSequence}')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'binder_refresh_signals',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'binder_public_id',
            value: _publicId,
          ),
          callback: (_) {
            if (_disposed ||
                generation != _generation ||
                _openLeases.isEmpty ||
                _openLeases.last != this) {
              return;
            }
            _debounce?.cancel();
            _debounce = Timer(const Duration(milliseconds: 350), () async {
              if (_disposed ||
                  generation != _generation ||
                  _openLeases.isEmpty ||
                  _openLeases.last != this) {
                return;
              }
              final stillAuthorized = await _onGuardedRefresh();
              if (!stillAuthorized) dispose();
            });
          },
        );
    _channel = channel;
    channel.subscribe();
  }

  Future<void> _deactivate() async {
    _generation++;
    _debounce?.cancel();
    _debounce = null;
    await _authSubscription?.cancel();
    _authSubscription = null;
    _boundUserId = null;
    final channel = _channel;
    _channel = null;
    if (channel != null) {
      await _client.removeChannel(channel);
    }
  }

  void dispose() {
    if (_disposed) return;
    _disposed = true;
    final wasActive = _openLeases.isNotEmpty && _openLeases.last == this;
    _openLeases.remove(this);
    unawaited(
      _deactivate().whenComplete(() {
        if (wasActive && _openLeases.isNotEmpty) {
          unawaited(_openLeases.last._activate());
        }
      }),
    );
  }
}
