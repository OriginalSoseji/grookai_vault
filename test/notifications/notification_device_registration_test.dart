import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/notifications/notification_device_registration.dart';

void check(bool condition, String reason) {
  if (!condition) throw StateError(reason);
}

class FakePort implements NotificationDevicePort {
  @override
  String? ownerId = 'owner-a';
  NotificationDeviceBinding? binding = const NotificationDeviceBinding(
    'owner-a',
    'token-1',
  );
  NotificationPermission permission = NotificationPermission.granted;
  final events = <String>[];
  int tokenVersion = 1;
  bool failDelete = false;
  bool failWrite = false;
  bool failRead = false;
  bool failRegister = false;
  bool failDisable = false;
  Completer<void>? permissionWait;
  Completer<void>? tokenWait;
  Completer<void>? registerWait;
  final tokenStarted = Completer<void>();
  final registerStarted = Completer<void>();
  final permissionStarted = Completer<void>();

  @override
  Future<NotificationDeviceBinding?> readBinding() async {
    if (failRead) throw StateError('binding unreadable');
    return binding;
  }

  @override
  Future<void> writeBinding(NotificationDeviceBinding? value) async {
    events.add('persist:${value?.ownerId ?? 'none'}');
    if (failWrite) throw StateError('disk unavailable');
    binding = value;
  }

  @override
  Future<NotificationPermission> readPermission() async {
    events.add('permission-read');
    return permission;
  }

  @override
  Future<NotificationPermission> requestPermission() async {
    events.add('permission-request');
    if (!permissionStarted.isCompleted) permissionStarted.complete();
    await permissionWait?.future;
    return permission = NotificationPermission.granted;
  }

  @override
  Future<String?> getToken() async {
    events.add('get-token');
    if (!tokenStarted.isCompleted) tokenStarted.complete();
    await tokenWait?.future;
    return 'token-$tokenVersion';
  }

  @override
  Future<void> deleteToken() async {
    events.add('delete-token');
    if (failDelete) throw StateError('provider unavailable');
    tokenVersion++;
  }

  @override
  Future<void> registerToken(String owner, String token) async {
    check(ownerId == owner, 'registration must capture the actual owner');
    check(
      binding?.ownerId == owner && binding?.token == token,
      'persist before registration',
    );
    events.add('register:$owner:$token');
    if (!registerStarted.isCompleted) registerStarted.complete();
    await registerWait?.future;
    if (failRegister) throw StateError('response lost');
  }

  @override
  Future<void> disableToken(String owner, String token) async {
    check(ownerId == owner, 'must not disable with a replacement identity');
    events.add('disable:$owner:$token');
    if (failDisable) throw StateError('backend unavailable');
  }
}

void main() {
  void run(String name, Future<void> Function() action) => test(name, action);
  run(
    'passive undetermined permission never prompts or gets a token',
    () async {
      final port = FakePort()
        ..binding = null
        ..permission = NotificationPermission.undetermined;
      final result = await NotificationDeviceRegistration(port).synchronize();
      check(
        result == NotificationDeviceOutcome.permissionNeeded,
        'permission needed',
      );
      check(
        !port.events.contains('permission-request') &&
            !port.events.contains('get-token'),
        'no prompt or acquisition',
      );
    },
  );
  run(
    'explicit permission action registers after ownership persistence',
    () async {
      final port = FakePort()
        ..binding = null
        ..permission = NotificationPermission.undetermined;
      final result = await NotificationDeviceRegistration(
        port,
      ).synchronize(requestPermission: true);
      check(result == NotificationDeviceOutcome.registered, 'registered');
      check(
        port.events.where((e) => e == 'permission-request').length == 1,
        'one prompt',
      );
    },
  );
  run('already granted permission registers without another prompt', () async {
    final port = FakePort();
    check(
      await NotificationDeviceRegistration(port).synchronize() ==
          NotificationDeviceOutcome.registered,
      'registered',
    );
    check(!port.events.contains('permission-request'), 'no prompt');
  });
  run('denied permission retires the prior delivery route', () async {
    final port = FakePort()..permission = NotificationPermission.denied;
    check(
      await NotificationDeviceRegistration(
            port,
          ).synchronize(requestPermission: true) ==
          NotificationDeviceOutcome.permissionDenied,
      'denied',
    );
    check(
      port.binding == null && port.events.contains('delete-token'),
      'retired',
    );
    check(
      !port.events.contains('get-token') &&
          !port.events.contains('permission-request'),
      'no token or repeat prompt',
    );
  });
  run(
    'old in-flight registration settles before replacement retirement and registration',
    () async {
      final port = FakePort()..registerWait = Completer<void>();
      final controller = NotificationDeviceRegistration(port);
      final first = controller.synchronize();
      await port.registerStarted.future;
      port.ownerId = 'owner-b';
      final second = controller.synchronize();
      port.registerWait!.complete();
      check(
        await first == NotificationDeviceOutcome.stale,
        'old result rejected',
      );
      check(
        await second == NotificationDeviceOutcome.registered,
        'new owner registered',
      );
      check(
        port.binding?.ownerId == 'owner-b' && port.binding?.token == 'token-2',
        'new token belongs to replacement',
      );
      check(
        port.events.indexOf('register:owner-a:token-1') <
            port.events.indexOf('delete-token'),
        'old request finishes first',
      );
      check(
        port.events.indexOf('delete-token') <
            port.events.indexOf('register:owner-b:token-2'),
        'old route retired before replacement',
      );
      check(
        !port.events.any((e) => e.startsWith('disable:')),
        'replacement cannot disable old owner row',
      );
    },
  );
  run(
    'account change during token acquisition cannot register the stale token',
    () async {
      final port = FakePort()..tokenWait = Completer<void>();
      final controller = NotificationDeviceRegistration(port);
      final first = controller.synchronize();
      await port.tokenStarted.future;
      port.ownerId = 'owner-b';
      final second = controller.synchronize();
      port.tokenWait!.complete();
      check(
        await first == NotificationDeviceOutcome.stale,
        'stale acquisition',
      );
      check(
        await second == NotificationDeviceOutcome.registered,
        'replacement succeeds',
      );
      check(
        !port.events.any((e) => e.startsWith('register:owner-a')),
        'no stale registration',
      );
    },
  );
  run(
    'retirement failure blocks replacement registration and preserves binding',
    () async {
      final port = FakePort()
        ..ownerId = 'owner-b'
        ..failDelete = true;
      final controller = NotificationDeviceRegistration(port);
      check(
        await controller.synchronize() == NotificationDeviceOutcome.failed,
        'failure visible',
      );
      check(port.binding?.ownerId == 'owner-a', 'binding retained');
      check(
        !port.events.contains('get-token'),
        'no acquisition until retirement',
      );
      port.failDelete = false;
      check(
        await controller.synchronize() == NotificationDeviceOutcome.registered,
        'retry retires and registers',
      );
    },
  );
  run(
    'sign-out invalidates in-flight acquisition and suppresses later refresh',
    () async {
      final port = FakePort()..tokenWait = Completer<void>();
      final controller = NotificationDeviceRegistration(port);
      final first = controller.synchronize();
      await port.tokenStarted.future;
      final signOut = controller.disableBeforeSignOut();
      port.tokenWait!.complete();
      check(await first == NotificationDeviceOutcome.stale, 'stale');
      check(
        await signOut == NotificationDeviceOutcome.signedOut,
        'retired before sign out',
      );
      check(
        await controller.synchronize() == NotificationDeviceOutcome.stale,
        'refresh suppressed',
      );
      check(
        port.binding == null &&
            !port.events.any((e) => e.startsWith('register:')),
        'no reactivation',
      );
    },
  );
  run(
    'dispose discards an in-flight token result without registering',
    () async {
      final port = FakePort()..tokenWait = Completer<void>();
      final controller = NotificationDeviceRegistration(port);
      final result = controller.synchronize();
      await port.tokenStarted.future;
      controller.dispose();
      port.tokenWait!.complete();
      check(await result == NotificationDeviceOutcome.stale, 'stale');
      check(
        !port.events.any((e) => e.startsWith('register:')),
        'no late registration',
      );
    },
  );
  run('ambiguous registration failure retires the acquired token', () async {
    final port = FakePort()..failRegister = true;
    check(
      await NotificationDeviceRegistration(port).synchronize() ==
          NotificationDeviceOutcome.failed,
      'failure visible',
    );
    check(
      port.binding == null && port.events.contains('delete-token'),
      'ambiguous delivery route retired',
    );
  });
  run('failed ownership persistence prevents remote registration', () async {
    final port = FakePort()..failWrite = true;
    check(
      await NotificationDeviceRegistration(port).synchronize() ==
          NotificationDeviceOutcome.failed,
      'failure visible',
    );
    check(
      !port.events.any((e) => e.startsWith('register:')),
      'no untracked remote registration',
    );
  });
  run(
    'signed-out startup retires persisted previous owner without acquiring a token',
    () async {
      final port = FakePort()..ownerId = null;
      check(
        await NotificationDeviceRegistration(port).synchronize() ==
            NotificationDeviceOutcome.signedOut,
        'signed out',
      );
      check(
        port.binding == null && !port.events.contains('get-token'),
        'old route retired',
      );
    },
  );
  run(
    'permission response for an old owner cannot acquire or register a token',
    () async {
      final port = FakePort()
        ..binding = null
        ..permission = NotificationPermission.undetermined
        ..permissionWait = Completer<void>();
      final controller = NotificationDeviceRegistration(port);
      final result = controller.synchronize(requestPermission: true);
      await port.permissionStarted.future;
      port.ownerId = 'owner-b';
      port.permissionWait!.complete();
      check(
        await result == NotificationDeviceOutcome.stale,
        'old permission response rejected',
      );
      check(!port.events.contains('get-token'), 'no old acquisition');
    },
  );
  run(
    'dispose after registration starts rejects completion without removing the same-owner background route',
    () async {
      final port = FakePort()..registerWait = Completer<void>();
      final controller = NotificationDeviceRegistration(port);
      final result = controller.synchronize();
      await port.registerStarted.future;
      controller.dispose();
      port.registerWait!.complete();
      check(
        await result == NotificationDeviceOutcome.stale,
        'completion rejected',
      );
      check(
        port.binding?.ownerId == 'owner-a' &&
            !port.events.contains('delete-token'),
        'valid existing route retained',
      );
    },
  );
  run(
    'provider deletion retires the token even when backend disable fails',
    () async {
      final port = FakePort()..failDisable = true;
      check(
        await NotificationDeviceRegistration(port).disableBeforeSignOut() ==
            NotificationDeviceOutcome.signedOut,
        'provider retirement completes',
      );
      check(
        port.binding == null && port.events.contains('delete-token'),
        'old route removed',
      );
    },
  );
  run(
    'failed provider retirement during sign-out cannot be followed by token refresh registration',
    () async {
      final port = FakePort()..failDelete = true;
      final controller = NotificationDeviceRegistration(port);
      check(
        await controller.disableBeforeSignOut() ==
            NotificationDeviceOutcome.failed,
        'failure remains visible',
      );
      check(
        await controller.synchronize() == NotificationDeviceOutcome.stale,
        'refresh stays suspended',
      );
      check(
        port.binding != null &&
            !port.events.any((e) => e.startsWith('register:')),
        'retained cleanup state',
      );
    },
  );
  run(
    'unreadable ownership retires the unknown physical token and does not register',
    () async {
      final port = FakePort()
        ..failRead = true
        ..ownerId = 'owner-b';
      check(
        await NotificationDeviceRegistration(port).synchronize() ==
            NotificationDeviceOutcome.failed,
        'failure remains visible',
      );
      check(
        port.events.contains('delete-token') &&
            !port.events.contains('get-token'),
        'unknown ownership cannot keep its delivery route',
      );
    },
  );
  run(
    'sign-out retires the physical token even if local ownership is unreadable',
    () async {
      final port = FakePort()..failRead = true;
      check(
        await NotificationDeviceRegistration(port).disableBeforeSignOut() ==
            NotificationDeviceOutcome.signedOut,
        'physical retirement succeeds',
      );
      check(
        port.events.contains('delete-token') && port.binding == null,
        'unknown token is retired',
      );
    },
  );
}
