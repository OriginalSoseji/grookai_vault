import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ScannerSessionLog {
  static const key = 'scanner_v5_session_log_jsonl_v1';
  static Future<void> _pending = Future<void>.value();

  /// Diagnostics never control whether a scan or committed Vault add succeeds.
  static Future<void> append(Map<String, dynamic> event) {
    _pending = _pending.then((_) async {
      try {
        final prefs = await SharedPreferences.getInstance();
        final rows = prefs.getStringList(key) ?? const <String>[];
        final retained = rows.length > 499
            ? rows.sublist(rows.length - 499)
            : rows;
        await prefs.setStringList(key, [...retained, jsonEncode(event)]);
      } catch (error) {
        debugPrint('[scanner_v5] session_log_failed: $error');
      }
    });
    return _pending;
  }

  static Future<String> export() async {
    await _pending;
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getStringList(key) ?? const <String>[]).join('\n');
  }
}
