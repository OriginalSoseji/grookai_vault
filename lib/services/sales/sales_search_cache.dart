/// Short-lived, bounded reuse for catalog reads. Writes always revalidate on
/// the server. Failures are never cached, and clear invalidates in-flight work.
class SalesSearchCache<T> {
  SalesSearchCache({
    this.capacity = 32,
    this.ttl = const Duration(seconds: 30),
    DateTime Function()? now,
  }) : _now = now ?? DateTime.now;

  final int capacity;
  final Duration ttl;
  final DateTime Function() _now;
  final _values = <String, ({T value, DateTime expires})>{};
  final _pending = <String, Future<T>>{};
  int _generation = 0;

  void clear() {
    _generation++;
    _values.clear();
    _pending.clear();
  }

  Future<T> get(String key, Future<T> Function() read) {
    final cached = _values.remove(key);
    if (cached != null && _now().isBefore(cached.expires)) {
      _values[key] = cached;
      return Future.value(cached.value);
    }
    if (_pending[key] case final pending?) return pending;
    final generation = _generation;
    late final Future<T> pending;
    pending = Future.sync(read)
        .then((value) {
          if (generation == _generation) {
            _values[key] = (value: value, expires: _now().add(ttl));
            while (_values.length > capacity) {
              _values.remove(_values.keys.first);
            }
          }
          return value;
        })
        .whenComplete(() {
          if (identical(_pending[key], pending)) _pending.remove(key);
        });
    _pending[key] = pending;
    return pending;
  }
}
