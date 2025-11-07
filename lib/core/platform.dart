import 'package:flutter/foundation.dart';

bool get isIOS => defaultTargetPlatform == TargetPlatform.iOS || defaultTargetPlatform == TargetPlatform.macOS;
bool get isAndroid => defaultTargetPlatform == TargetPlatform.android;
