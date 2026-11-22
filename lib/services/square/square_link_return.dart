import 'dart:async';

/// A link only requests a refresh. Authenticated server state proves success.
class SquareLinkReturn {
  static final _returns = StreamController<void>.broadcast(sync: true);
  static Stream<void> get stream => _returns.stream;
  static void deliver() => _returns.add(null);
}
