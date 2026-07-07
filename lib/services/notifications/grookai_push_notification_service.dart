import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../navigation/grookai_web_route_service.dart';

typedef GrookaiNotificationRouteHandler =
    void Function(GrookaiCanonicalRoute route);

@pragma('vm:entry-point')
Future<void> grookaiFirebaseMessagingBackgroundHandler(
  RemoteMessage message,
) async {
  try {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp();
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

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final SupabaseClient _client = Supabase.instance.client;

  StreamSubscription<String>? _tokenRefreshSubscription;
  StreamSubscription<RemoteMessage>? _foregroundSubscription;
  StreamSubscription<RemoteMessage>? _openedSubscription;
  GrookaiNotificationRouteHandler? _onRoute;
  bool _firebaseReady = false;
  bool _started = false;
  String? _lastRegisteredToken;

  Future<void> start({required GrookaiNotificationRouteHandler onRoute}) async {
    _onRoute = onRoute;
    if (_started) {
      await registerForCurrentUser(reason: 'route_handler_refresh');
      return;
    }

    _started = true;
    _firebaseReady = await _initializeFirebase();
    if (!_firebaseReady) {
      _debug('firebase_not_ready');
      return;
    }

    FirebaseMessaging.onBackgroundMessage(
      grookaiFirebaseMessagingBackgroundHandler,
    );

    _foregroundSubscription = FirebaseMessaging.onMessage.listen((message) {
      _debug('foreground_message id=${message.messageId ?? 'unknown'}');
      // Foreground notifications are intentionally non-navigating. The app can
      // add an in-app affordance later without surprising active collectors.
    });

    _openedSubscription = FirebaseMessaging.onMessageOpenedApp.listen(
      (message) => unawaited(_handleOpenedMessage(message, source: 'opened')),
    );

    try {
      final initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) {
        unawaited(
          _handleOpenedMessage(initialMessage, source: 'initial_message'),
        );
      }
    } catch (error) {
      _debug('initial_message_error=$error');
    }

    _tokenRefreshSubscription = _messaging.onTokenRefresh.listen((token) {
      unawaited(_registerToken(token, reason: 'token_refresh'));
    });

    await registerForCurrentUser(reason: 'start');
  }

  Future<void> dispose() async {
    await _tokenRefreshSubscription?.cancel();
    await _foregroundSubscription?.cancel();
    await _openedSubscription?.cancel();
    _tokenRefreshSubscription = null;
    _foregroundSubscription = null;
    _openedSubscription = null;
    _onRoute = null;
    _started = false;
  }

  Future<void> registerForCurrentUser({required String reason}) async {
    if (!_started || !_firebaseReady || kIsWeb) {
      return;
    }
    if (_client.auth.currentUser == null) {
      return;
    }

    try {
      final settings = await _messaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );
      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        _debug('permission_denied reason=$reason');
        return;
      }

      final token = await _messaging.getToken();
      if (token == null || token.trim().isEmpty) {
        _debug('empty_token reason=$reason');
        return;
      }

      await _registerToken(token, reason: reason);
    } catch (error) {
      _debug('register_failed reason=$reason error=$error');
    }
  }

  Future<void> disableCurrentTokenBeforeSignOut() async {
    final token = _lastRegisteredToken ?? await _safeCurrentToken();
    if (token == null || token.trim().isEmpty) {
      return;
    }

    try {
      await _client.rpc(
        'notification_disable_device_token_v1',
        params: <String, dynamic>{'p_token': token},
      );
      _debug('token_disabled_before_sign_out');
    } catch (error) {
      _debug('token_disable_failed error=$error');
    }
  }

  Future<bool> _initializeFirebase() async {
    if (kIsWeb) {
      return false;
    }
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp();
      }
      return true;
    } catch (error) {
      _debug('firebase_initialize_failed error=$error');
      return false;
    }
  }

  Future<String?> _safeCurrentToken() async {
    if (!_firebaseReady || kIsWeb) {
      return null;
    }
    try {
      return await _messaging.getToken();
    } catch (_) {
      return null;
    }
  }

  Future<void> _registerToken(String token, {required String reason}) async {
    if (_client.auth.currentUser == null) {
      return;
    }

    final platform = defaultTargetPlatform == TargetPlatform.iOS
        ? 'ios'
        : 'android';
    await _client.rpc(
      'notification_register_device_token_v1',
      params: <String, dynamic>{
        'p_token': token,
        'p_platform': platform,
        'p_app_build': null,
        'p_device_label': null,
      },
    );
    _lastRegisteredToken = token;
    _debug('token_registered platform=$platform reason=$reason');
  }

  Future<void> _handleOpenedMessage(
    RemoteMessage message, {
    required String source,
  }) async {
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
