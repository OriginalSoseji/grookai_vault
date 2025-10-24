import 'package:flutter/foundation.dart';

class EventBus {
  static final ValueNotifier<int> vaultReloadTick = ValueNotifier<int>(0);
  static void reloadVault() => vaultReloadTick.value++;
}

