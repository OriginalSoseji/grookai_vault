import 'dart:async';

/// A return carries no credentials or grant result. The mounted owner screen
/// refreshes its authenticated server state rather than trusting a deep link.
class EbaySellerLinkReturn {
  static final _returns = StreamController<void>.broadcast(sync: true);
  static Stream<void> get stream => _returns.stream;
  static bool deliver() {
    if (!_returns.hasListener) return false;
    _returns.add(null);
    return true;
  }
}
