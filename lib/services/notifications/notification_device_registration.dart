import 'dart:async';

enum NotificationPermission { undetermined, denied, granted }

enum NotificationDeviceOutcome {
  registered,
  permissionNeeded,
  permissionDenied,
  signedOut,
  stale,
  failed,
}

class NotificationDeviceBinding {
  const NotificationDeviceBinding(this.ownerId, this.token);
  final String ownerId;
  final String token;
}

/// Provider and persistence boundaries are injectable; tests never acquire real
/// tokens or deliver notifications. Backend adapters must check the given owner.
abstract interface class NotificationDevicePort {
  String? get ownerId;
  Future<NotificationDeviceBinding?> readBinding();
  Future<void> writeBinding(NotificationDeviceBinding? binding);
  Future<NotificationPermission> readPermission();
  Future<NotificationPermission> requestPermission();
  Future<String?> getToken();
  Future<void> deleteToken();
  Future<void> registerToken(String ownerId, String token);
  Future<void> disableToken(String ownerId, String token);
}

class NotificationDeviceRegistration {
  NotificationDeviceRegistration(this.port) : _owner = port.ownerId;

  final NotificationDevicePort port;
  String? _owner;
  String? _suspendedOwner;
  int _generation = 0;
  bool _disposed = false;
  bool _unknownTokenRetired = false;
  Future<void> _tail = Future<void>.value();

  void _observeOwner() {
    if (_owner == port.ownerId) return;
    _owner = port.ownerId;
    _suspendedOwner = null;
    _generation++;
  }

  bool _current(int generation, String? owner) {
    _observeOwner();
    return !_disposed &&
        generation == _generation &&
        owner == _owner &&
        (owner == null || _suspendedOwner != owner);
  }

  Future<NotificationDeviceOutcome> _enqueue(
    Future<NotificationDeviceOutcome> Function() operation,
  ) {
    final result = _tail.then((_) => operation());
    _tail = result.then<void>((_) {}, onError: (Object _, StackTrace _) {});
    return result;
  }

  /// Call on every auth owner change and token refresh. Passive synchronization
  /// reads permission and never invokes the operating-system permission prompt.
  Future<NotificationDeviceOutcome> synchronize({
    bool requestPermission = false,
  }) {
    _observeOwner();
    final generation = _generation;
    final owner = _owner;
    return _enqueue(() => _synchronize(generation, owner, requestPermission));
  }

  Future<void> _retire(NotificationDeviceBinding? binding) async {
    if (binding != null && port.ownerId == binding.ownerId) {
      try {
        await port.disableToken(binding.ownerId, binding.token);
      } catch (_) {
        // Deleting the physical token also retires its old delivery route.
        // If deletion fails, keep the binding and prevent new registration.
      }
    }
    await port.deleteToken();
    await port.writeBinding(null);
    _unknownTokenRetired = true;
  }

  Future<NotificationDeviceOutcome> _stale(
    String? owner,
    NotificationDeviceBinding? binding,
  ) async {
    if (port.ownerId != owner) await _retire(binding);
    return NotificationDeviceOutcome.stale;
  }

  Future<NotificationDeviceOutcome> _synchronize(
    int generation,
    String? owner,
    bool ask,
  ) async {
    NotificationDeviceBinding? binding;
    bool acquiredToken = false;
    bool bindingRead = false;
    try {
      if (!_current(generation, owner)) return NotificationDeviceOutcome.stale;
      binding = await port.readBinding();
      bindingRead = true;
      if (!_current(generation, owner)) return NotificationDeviceOutcome.stale;
      if ((binding == null && !_unknownTokenRetired) ||
          (binding != null && (owner == null || binding.ownerId != owner))) {
        await _retire(binding);
        binding = null;
      }
      if (!_current(generation, owner)) return NotificationDeviceOutcome.stale;
      if (owner == null) return NotificationDeviceOutcome.signedOut;
      var permission = await port.readPermission();
      if (!_current(generation, owner)) return NotificationDeviceOutcome.stale;
      if (permission == NotificationPermission.undetermined && ask) {
        permission = await port.requestPermission();
        if (!_current(generation, owner)) {
          return NotificationDeviceOutcome.stale;
        }
      }
      if (permission != NotificationPermission.granted) {
        if (binding != null) await _retire(binding);
        if (!_current(generation, owner)) {
          return NotificationDeviceOutcome.stale;
        }
        return permission == NotificationPermission.denied
            ? NotificationDeviceOutcome.permissionDenied
            : NotificationDeviceOutcome.permissionNeeded;
      }
      final token = await port.getToken();
      acquiredToken = token != null && token.trim().isNotEmpty;
      if (!_current(generation, owner)) return await _stale(owner, binding);
      if (!acquiredToken) return NotificationDeviceOutcome.failed;
      binding = NotificationDeviceBinding(owner, token);
      // Persist ownership before any possibly ambiguous remote registration.
      // A later launch can retire it even if the server response was lost.
      await port.writeBinding(binding);
      if (!_current(generation, owner)) return await _stale(owner, binding);
      await port.registerToken(owner, token);
      if (!_current(generation, owner)) return await _stale(owner, binding);
      return NotificationDeviceOutcome.registered;
    } catch (_) {
      if (acquiredToken || !bindingRead) {
        try {
          await _retire(binding);
        } catch (_) {
          // Retained ownership makes the next attempt retry retirement first.
          _unknownTokenRetired = false;
        }
      }
      return NotificationDeviceOutcome.failed;
    }
  }

  Future<NotificationDeviceOutcome> disableBeforeSignOut() {
    _observeOwner();
    final owner = _owner;
    _suspendedOwner = owner;
    _generation++;
    return _enqueue(() async {
      if (_disposed || port.ownerId != owner) {
        return NotificationDeviceOutcome.stale;
      }
      try {
        NotificationDeviceBinding? binding;
        try {
          binding = await port.readBinding();
        } catch (_) {
          // Unreadable local ownership must still retire the physical token.
        }
        await _retire(binding);
        return NotificationDeviceOutcome.signedOut;
      } catch (_) {
        _unknownTokenRetired = false;
        return NotificationDeviceOutcome.failed;
      }
    });
  }

  void dispose() {
    _disposed = true;
    _generation++;
  }
}
