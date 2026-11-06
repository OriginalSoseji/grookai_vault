import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Permission belongs to this installation, including when accounts change.
/// Remember the decision before opening the OS prompt so restart and concurrent
/// authentication callbacks cannot ask again after the collector declines.
class NotificationPermissionPolicy {
  NotificationPermissionPolicy({
    required this.readAuthorization,
    required this.requestAuthorization,
    Future<SharedPreferences> Function()? loadPreferences,
  }) : loadPreferences = loadPreferences ?? SharedPreferences.getInstance;

  static const decisionKey = 'grookai_notification_permission_requested_v1';
  final Future<AuthorizationStatus> Function() readAuthorization;
  final Future<AuthorizationStatus> Function() requestAuthorization;
  final Future<SharedPreferences> Function() loadPreferences;
  Future<bool>? _pending;

  static bool isGranted(AuthorizationStatus status) =>
      status == AuthorizationStatus.authorized ||
      status == AuthorizationStatus.provisional;

  Future<bool> ensureCanNotify() =>
      _pending ??= _check().whenComplete(() => _pending = null);

  Future<bool> _check() async {
    final status = await readAuthorization();
    if (isGranted(status)) {
      // A grant from an older build is an existing decision too. If it is later
      // disabled in system settings, do not turn that into another prompt.
      try {
        await (await loadPreferences()).setBool(decisionKey, true);
      } catch (_) {}
      return true;
    }
    try {
      final preferences = await loadPreferences();
      if (preferences.getBool(decisionKey) == true) return false;
      if (!await preferences.setBool(decisionKey, true)) return false;
    } catch (_) {
      return false;
    }
    return isGranted(await requestAuthorization());
  }
}
