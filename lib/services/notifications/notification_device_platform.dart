import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

class NotificationDevicePlatform {
  static const channel = MethodChannel('grookai/notifications/device');

  static Future<void> clearDelivered() async {
    if (kIsWeb ||
        (defaultTargetPlatform != TargetPlatform.android &&
            defaultTargetPlatform != TargetPlatform.iOS)) {
      return;
    }
    await channel.invokeMethod<void>('clearDelivered');
  }
}
