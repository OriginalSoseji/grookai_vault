import 'dart:async';

class ConnectivityService {
  final _controller = StreamController<bool>.broadcast();
  bool _online = true;
  Stream<bool> get onChanged => _controller.stream;
  bool get isOnline => _online;

  // TODO: wire to connectivity_plus; for now manual setters
  void setOnline(bool value) {
    if (_online == value) return;
    _online = value;
    _controller.add(_online);
  }

  void dispose() => _controller.close();
}

