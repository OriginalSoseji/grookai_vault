import 'dart:async';
import 'package:flutter/widgets.dart';
import 'package:grookai_vault/services/scan_queue.dart';

class AppLifecycle with WidgetsBindingObserver {
  static final AppLifecycle instance = AppLifecycle._();
  AppLifecycle._();

  final _queue = ScanQueue();
  Timer? _timer;
  bool _started = false;

  void start() {
    if (_started) return;
    _started = true;
    WidgetsBinding.instance.addObserver(this);
    // periodic sync every 10 minutes
    _timer = Timer.periodic(
      const Duration(minutes: 10),
      (_) => _queue.syncIfOnline(),
    );
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
    WidgetsBinding.instance.removeObserver(this);
    _started = false;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Attempt one sync tick on resume
      _queue.syncIfOnline();
    }
  }
}
