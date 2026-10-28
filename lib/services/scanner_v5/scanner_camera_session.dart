/// Serializes camera ownership across initialization, backgrounding and disposal.
/// A camera created for an obsolete lifecycle generation is always released.
class ScannerCameraSession<T> {
  ScannerCameraSession({required this.create, required this.release});

  final Future<T> Function() create;
  final Future<void> Function(T) release;
  T? _current;
  Future<void> _pending = Future<void>.value();
  bool _active = false;
  bool _closed = false;
  int _generation = 0;

  T? get current => _current;

  Future<void> resume() {
    if (_closed) return Future<void>.value();
    if (_active) return _pending;
    _active = true;
    final generation = ++_generation;
    _pending = _pending.catchError((Object _) {}).then((_) async {
      if (_closed || !_active || generation != _generation) return;
      try {
        final camera = await create();
        if (_closed || !_active || generation != _generation) {
          await release(camera);
        } else {
          _current = camera;
        }
      } catch (_) {
        if (generation == _generation) _active = false;
        rethrow;
      }
    });
    return _pending;
  }

  Future<void> suspend() {
    _active = false;
    ++_generation;
    final camera = _current;
    _current = null;
    _pending = _pending.catchError((Object _) {}).then((_) async {
      if (camera != null) await release(camera);
    });
    return _pending;
  }

  Future<void> close() {
    _closed = true;
    return suspend();
  }
}
