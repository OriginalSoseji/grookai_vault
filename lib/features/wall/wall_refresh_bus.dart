typedef WallRefreshFn = Future<void> Function();

/// Simple singleton bus to trigger a silent refresh on the Wall page
class WallRefreshBus {
  WallRefreshBus._();
  static final WallRefreshBus instance = WallRefreshBus._();

  WallRefreshFn? _silentRefresh;
  DateTime _lastTrigger = DateTime.fromMillisecondsSinceEpoch(0);

  void register(WallRefreshFn fn) {
    _silentRefresh = fn;
  }

  void unregister(WallRefreshFn fn) {
    if (_silentRefresh == fn) _silentRefresh = null;
  }

  Future<void> triggerIfStale() async {
    final now = DateTime.now();
    if (now.difference(_lastTrigger).inSeconds < 2) return;
    _lastTrigger = now;
    final fn = _silentRefresh;
    if (fn != null) {
      await fn();
    }
  }
}

