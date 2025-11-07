import 'package:flutter/foundation.dart';

/// Simple global toggle for accent intensity modes (Subtle vs Dynamic).
class ThunderDebug {
  static final ValueNotifier<bool> dynamicAccent = ValueNotifier<bool>(false);
}

