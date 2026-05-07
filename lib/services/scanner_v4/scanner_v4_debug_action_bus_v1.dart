import 'dart:async';

import 'package:flutter/foundation.dart';

class ScannerV4DebugActionBusV1 {
  ScannerV4DebugActionBusV1._();

  static const String scannerV4AutoTestAction = 'scanner_v4_auto_test';

  static final StreamController<String> _actions =
      StreamController<String>.broadcast();
  static int _activeScannerListeners = 0;

  static bool get hasActiveScanner => _activeScannerListeners > 0;

  static StreamSubscription<String> attachScannerActionListener(
    void Function(String action) onAction,
  ) {
    _activeScannerListeners += 1;
    final subscription = _actions.stream.listen(onAction);
    return _ScannerV4DebugActionSubscription(
      subscription,
      () {
        _activeScannerListeners -= 1;
        if (_activeScannerListeners < 0) {
          _activeScannerListeners = 0;
        }
      },
    );
  }

  static void dispatch(String action) {
    if (!kDebugMode) return;
    _actions.add(action);
  }
}

class _ScannerV4DebugActionSubscription implements StreamSubscription<String> {
  _ScannerV4DebugActionSubscription(this._delegate, this._onCancel);

  final StreamSubscription<String> _delegate;
  final VoidCallback _onCancel;
  bool _cancelled = false;

  @override
  Future<void> cancel() async {
    if (!_cancelled) {
      _cancelled = true;
      _onCancel();
    }
    await _delegate.cancel();
  }

  @override
  void onData(void Function(String data)? handleData) {
    _delegate.onData(handleData);
  }

  @override
  void onError(Function? handleError) {
    _delegate.onError(handleError);
  }

  @override
  void onDone(void Function()? handleDone) {
    _delegate.onDone(handleDone);
  }

  @override
  void pause([Future<void>? resumeSignal]) {
    _delegate.pause(resumeSignal);
  }

  @override
  void resume() {
    _delegate.resume();
  }

  @override
  bool get isPaused => _delegate.isPaused;

  @override
  Future<E> asFuture<E>([E? futureValue]) {
    return _delegate.asFuture<E>(futureValue);
  }
}
