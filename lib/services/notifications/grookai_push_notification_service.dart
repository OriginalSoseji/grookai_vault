import 'dart:async';
import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:shared_preferences/shared_preferences.dart';
import 'notification_device_registration.dart';
import 'notification_device_platform.dart';
import '../../firebase_options.dart';
import '../navigation/grookai_web_route_service.dart';

typedef GrookaiNotificationRouteHandler =
    void Function(GrookaiCanonicalRoute route);

@pragma('vm:entry-point')
Future<void> grookaiFirebaseMessagingBackgroundHandler(
  RemoteMessage message,
) async {
  try {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
    }
  } catch (_) {
    // Background delivery must never crash the app isolate if native Firebase
    // configuration is absent in a local/dev build.
  }
}

class GrookaiPushNotificationService {
  GrookaiPushNotificationService._();
  static final GrookaiPushNotificationService instance =
      GrookaiPushNotificationService._();
  static const String _logPrefix = '[NOTIFICATIONS_E2]';
  final SupabaseClient _client = Supabase.instance.client;
  FirebaseMessaging? _messaging;
  StreamSubscription<String>? _tokenRefreshSubscription;
  StreamSubscription<RemoteMessage>? _foregroundSubscription;
  StreamSubscription<RemoteMessage>? _openedSubscription;
  StreamSubscription<AuthState>? _authSubscription;
  GrookaiNotificationRouteHandler? _onRoute;
  NotificationMessagingPort? _testMessaging;
  SupabaseNotificationDevicePort? _devicePort;
  NotificationDeviceRegistration? _registration;
  Future<void>? _starting;
  bool _firebaseReady = false;
  bool _started = false;
  int _generation = 0;

  @visibleForTesting
  void installMessagingForTest(NotificationMessagingPort messaging) {
    if (!kDebugMode || _started) {
      throw StateError('Test messaging requires an unstarted debug service.');
    }
    _testMessaging = messaging;
  }

  Future<void> start({required GrookaiNotificationRouteHandler onRoute}) async {
    _onRoute = onRoute;
    if (_starting != null) {
      await _starting;
      return;
    }
    if (_started) {
      await registerForCurrentUser(reason: 'route_handler_refresh');
      return;
    }
    _started = true;
    final generation = ++_generation;
    final future = _start(generation);
    _starting = future;
    try {
      await future;
    } finally {
      if (generation == _generation) _starting = null;
    }
  }

  Future<void> _start(int generation) async {
    _devicePort = SupabaseNotificationDevicePort(
      client: _client,
      messaging:
          _testMessaging ??
          FirebaseNotificationMessagingPort(() => _firebaseMessaging),
      platform: defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android',
    );
    _registration = NotificationDeviceRegistration(_devicePort!);
    _authSubscription = _client.auth.onAuthStateChange.listen((_) {
      if (_started && generation == _generation && _firebaseReady) {
        unawaited(registerForCurrentUser(reason: 'session_changed'));
      }
    });
    final ready = _testMessaging != null || await _initializeFirebase();
    if (!_started || generation != _generation) return;
    _firebaseReady = ready;
    if (!ready) {
      _debug('firebase_not_ready');
      return;
    }
    if (_testMessaging == null) {
      FirebaseMessaging.onBackgroundMessage(
        grookaiFirebaseMessagingBackgroundHandler,
      );
      _foregroundSubscription = FirebaseMessaging.onMessage.listen((message) {
        // Foreground notifications are intentionally non-navigating.
        if (_started && generation == _generation) _debug('foreground_message');
      });
      _openedSubscription = FirebaseMessaging.onMessageOpenedApp.listen((
        message,
      ) {
        if (_started && generation == _generation) {
          unawaited(_handleOpenedMessage(message, source: 'opened'));
        }
      });
      _tokenRefreshSubscription = _firebaseMessaging.onTokenRefresh.listen((_) {
        if (_started && generation == _generation) {
          unawaited(registerForCurrentUser(reason: 'token_refresh'));
        }
      });
      try {
        final initialMessage = await _firebaseMessaging.getInitialMessage();
        if (_started && generation == _generation && initialMessage != null) {
          unawaited(
            _handleOpenedMessage(initialMessage, source: 'initial_message'),
          );
        }
      } catch (_) {
        _debug('initial_message_unavailable');
      }
    }
    if (_started && generation == _generation) {
      await registerForCurrentUser(reason: 'start');
    }
  }

  Future<void> dispose() async {
    _started = false;
    _firebaseReady = false;
    _generation++;
    _starting = null;
    _registration?.dispose();
    _registration = null;
    _devicePort = null;
    _onRoute = null;
    final cancellations = <Future<void>>[
      if (_authSubscription != null) _authSubscription!.cancel(),
      if (_tokenRefreshSubscription != null)
        _tokenRefreshSubscription!.cancel(),
      if (_foregroundSubscription != null) _foregroundSubscription!.cancel(),
      if (_openedSubscription != null) _openedSubscription!.cancel(),
    ];
    _authSubscription = null;
    _tokenRefreshSubscription = null;
    _foregroundSubscription = null;
    _openedSubscription = null;
    await Future.wait(cancellations);
  }

  Future<void> registerForCurrentUser({required String reason}) async {
    if (!_started || !_firebaseReady || kIsWeb) return;
    final result = await _registration?.synchronize();
    _debug('registration_${result?.name ?? 'unavailable'} reason=$reason');
  }

  Future<void> _ensureStarted() async {
    if (!_started) await start(onRoute: _onRoute ?? (_) {});
    if (_starting != null) await _starting;
  }

  Future<NotificationPermission?> readDevicePermission() async {
    try {
      await _ensureStarted();
      if (!_started || !_firebaseReady || kIsWeb) return null;
      return await _devicePort?.readPermission();
    } catch (_) {
      return null;
    }
  }

  Future<NotificationDeviceOutcome> enableForCurrentUser() async {
    final owner = _client.auth.currentUser?.id;
    if (owner == null) return NotificationDeviceOutcome.signedOut;
    await _ensureStarted();
    if (_client.auth.currentUser?.id != owner) {
      return NotificationDeviceOutcome.stale;
    }
    if (!_started || !_firebaseReady || kIsWeb) {
      return NotificationDeviceOutcome.failed;
    }
    return await _registration?.synchronize(requestPermission: true) ??
        NotificationDeviceOutcome.failed;
  }

  Future<NotificationDeviceOutcome> disableCurrentTokenBeforeSignOut() async {
    final owner = _client.auth.currentUser?.id;
    if (owner == null) return NotificationDeviceOutcome.signedOut;
    await _ensureStarted();
    if (_client.auth.currentUser?.id != owner) {
      return NotificationDeviceOutcome.stale;
    }
    // Even when Firebase is unavailable, attempt the owner-only backend disable.
    return await _registration?.disableBeforeSignOut() ??
        NotificationDeviceOutcome.failed;
  }

  Future<bool> _initializeFirebase() async {
    if (kIsWeb) {
      return false;
    }
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(
          options: DefaultFirebaseOptions.currentPlatform,
        );
      }
      return true;
    } catch (error) {
      _debug('firebase_initialize_failed error=$error');
      return false;
    }
  }

  FirebaseMessaging get _firebaseMessaging {
    return _messaging ??= FirebaseMessaging.instance;
  }

  Future<void> _handleOpenedMessage(
    RemoteMessage message, {
    required String source,
  }) async {
    if (!_started) return;
    final route = _routeFromMessage(message);
    final notificationId = _notificationIdFromMessage(message);
    if (notificationId != null) {
      unawaited(_markTapped(notificationId));
    }
    if (route == null) {
      _debug('tap_without_supported_route source=$source');
      return;
    }
    _debug('tap_route source=$source path=${route.path}');
    _onRoute?.call(route);
  }

  GrookaiCanonicalRoute? _routeFromMessage(RemoteMessage message) {
    final deepLink = _stringData(message, 'deep_link');
    final webUrl = _stringData(message, 'web_url');
    for (final value in <String?>[deepLink, webUrl]) {
      final uri = value == null ? null : Uri.tryParse(value);
      final route = GrookaiWebRouteService.parseCanonicalUri(uri);
      if (route != null) {
        return route;
      }
    }
    return null;
  }

  String? _notificationIdFromMessage(RemoteMessage message) {
    return _stringData(message, 'notification_id');
  }

  String? _stringData(RemoteMessage message, String key) {
    final value = message.data[key];
    if (value == null) {
      return null;
    }
    final normalized = value.toString().trim();
    return normalized.isEmpty ? null : normalized;
  }

  Future<void> _markTapped(String notificationId) async {
    try {
      await _client.rpc(
        'mark_notification_tapped_v1',
        params: <String, dynamic>{'p_notification_id': notificationId},
      );
    } catch (error) {
      _debug('tap_mark_failed id=$notificationId error=$error');
    }
  }

  void _debug(String message) {
    if (kDebugMode) {
      debugPrint('$_logPrefix $message');
    }
  }
}

abstract interface class NotificationMessagingPort {
  Future<NotificationPermission> readPermission();
  Future<NotificationPermission> requestPermission();
  Future<String?> getToken();
  Future<void> deleteToken();
}

class FirebaseNotificationMessagingPort implements NotificationMessagingPort {
  FirebaseNotificationMessagingPort(this.messaging);
  final FirebaseMessaging Function() messaging;
  NotificationPermission _permission(NotificationSettings settings) =>
      switch (settings.authorizationStatus) {
        AuthorizationStatus.authorized ||
        AuthorizationStatus.provisional => NotificationPermission.granted,
        AuthorizationStatus.denied => NotificationPermission.denied,
        AuthorizationStatus.notDetermined =>
          NotificationPermission.undetermined,
      };
  @override
  Future<NotificationPermission> readPermission() async =>
      _permission(await messaging().getNotificationSettings());
  @override
  Future<NotificationPermission> requestPermission() async => _permission(
    await messaging().requestPermission(
      alert: true,
      badge: true,
      sound: true,
      announcement: false,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
    ),
  );
  @override
  Future<String?> getToken() => messaging().getToken();
  @override
  Future<void> deleteToken() => messaging().deleteToken();
}

class SupabaseNotificationDevicePort implements NotificationDevicePort {
  SupabaseNotificationDevicePort({
    required this.client,
    required this.messaging,
    required this.platform,
  });
  final SupabaseClient client;
  final NotificationMessagingPort messaging;
  final String platform;
  static const bindingKey = 'grookai.notification.device.binding.v1';
  @override
  String? get ownerId => client.auth.currentUser?.id;
  @override
  Future<NotificationDeviceBinding?> readBinding() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(bindingKey);
    if (stored == null) return null;
    final value = jsonDecode(stored);
    if (value is! Map ||
        value['ownerId'] is! String ||
        value['token'] is! String ||
        (value['ownerId'] as String).isEmpty ||
        (value['token'] as String).isEmpty) {
      throw const FormatException(
        'Device notification ownership is unreadable.',
      );
    }
    return NotificationDeviceBinding(
      value['ownerId'] as String,
      value['token'] as String,
    );
  }

  @override
  Future<void> writeBinding(NotificationDeviceBinding? binding) async {
    final prefs = await SharedPreferences.getInstance();
    final saved = binding == null
        ? await prefs.remove(bindingKey)
        : await prefs.setString(
            bindingKey,
            jsonEncode({'ownerId': binding.ownerId, 'token': binding.token}),
          );
    if (!saved) {
      throw StateError('Device notification ownership could not be saved.');
    }
  }

  String _accessToken(String owner) {
    final session = client.auth.currentSession;
    if (session == null || session.user.id != owner || session.isExpired) {
      throw const AuthException('The notification owner session changed.');
    }
    return session.accessToken;
  }

  @override
  Future<void> registerToken(String owner, String token) async {
    final accessToken = _accessToken(owner);
    await client
        .rpc(
          'notification_register_device_token_v1',
          params: <String, dynamic>{
            'p_token': token,
            'p_platform': platform,
            'p_app_build': null,
            'p_device_label': null,
          },
        )
        .setHeader('Authorization', 'Bearer $accessToken');
  }

  @override
  Future<void> disableToken(String owner, String token) async {
    final accessToken = _accessToken(owner);
    await client
        .rpc(
          'notification_disable_device_token_v1',
          params: <String, dynamic>{'p_token': token},
        )
        .setHeader('Authorization', 'Bearer $accessToken');
  }

  @override
  Future<NotificationPermission> readPermission() => messaging.readPermission();
  @override
  Future<NotificationPermission> requestPermission() =>
      messaging.requestPermission();
  @override
  Future<String?> getToken() => messaging.getToken();
  @override
  Future<void> deleteToken() async {
    try {
      await messaging.deleteToken();
    } finally {
      // Also remove already-delivered notices belonging to the retired account.
      await NotificationDevicePlatform.clearDelivered();
    }
  }
}
