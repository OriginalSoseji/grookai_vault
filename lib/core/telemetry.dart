import 'package:flutter/foundation.dart';
import 'dart:io' show Platform;
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

class Telemetry {
  static final ValueNotifier<List<String>> _events =
      ValueNotifier<List<String>>(<String>[]);

  static ValueListenable<List<String>> get events => _events;

  static void log(String event, [Map<String, Object?> props = const {}]) {
    final enriched = {'plat': _platformTag(), ...props};
    final line = enriched.isEmpty ? event : '$event ${_short(enriched)}';
    if (kDebugMode) {
      // ignore: avoid_print
      print('telemetry: $line');
    }
    void push() {
      final list = List<String>.from(_events.value);
      list.add(line);
      while (list.length > 50) {
        list.removeAt(0);
      }
      _events.value = list;
    }

    final phase = SchedulerBinding.instance.schedulerPhase;
    if (phase == SchedulerPhase.idle ||
        phase == SchedulerPhase.postFrameCallbacks) {
      push();
    } else {
      WidgetsBinding.instance.addPostFrameCallback((_) => push());
    }
  }

  static String _platformTag() {
    try {
      if (kIsWeb) return 'web';
      if (Platform.isAndroid) return 'android';
      if (Platform.isIOS) return 'ios';
      if (Platform.isWindows) return 'windows';
      if (Platform.isMacOS) return 'macos';
      if (Platform.isLinux) return 'linux';
    } catch (_) {}
    return 'unknown';
  }

  static String _short(Map<String, Object?> m) {
    final parts = <String>[];
    m.forEach((k, v) => parts.add('$k=$v'));
    return '{${parts.join(', ')}}';
  }
}
