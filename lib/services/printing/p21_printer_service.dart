import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'p21_label.dart';

class P21Device {
  const P21Device(this.id, this.name);
  final String id;
  final String name;
}

class P21Status {
  const P21Status({
    required this.state,
    required this.widthMm,
    required this.lengthMm,
    required this.paperType,
  });
  final int state;
  final int widthMm;
  final int lengthMm;
  final int paperType;
  bool get supportedRoll => widthMm == 14 && lengthMm == 40 && paperType == 1;
  String? get problem {
    if (state & 1 != 0) return 'Close the printer lid, then refresh.';
    if (state & 4 != 0) return 'Load labels, then refresh.';
    if (state != 0) {
      return 'P21 is busy or not ready. Check the printer, then refresh.';
    }
    if (!supportedRoll) {
      return 'Load a 14 × 40 mm gapped P21 roll. The printer reports $widthMm × $lengthMm mm.';
    }
    return null;
  }
}

class P21PrinterService {
  const P21PrinterService();
  static const _channel = MethodChannel('grookai/p21');
  static bool get supported =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS;

  Future<List<P21Device>> scan() async {
    final rows = await _channel.invokeListMethod<dynamic>('scan') ?? [];
    return rows
        .map((row) => P21Device(row['id'] as String, row['name'] as String))
        .toList();
  }

  Future<P21Status> connect(P21Device device) async {
    await _channel.invokeMethod<void>('connect', {'id': device.id});
    return status();
  }

  Future<P21Status> status() async {
    final row = await _channel.invokeMapMethod<String, dynamic>('status');
    if (row == null) {
      throw const FormatException('P21 did not return its label size.');
    }
    return P21Status(
      state: row['state'] as int,
      widthMm: row['widthMm'] as int,
      lengthMm: row['lengthMm'] as int,
      paperType: row['paperType'] as int,
    );
  }

  Future<void> printLabel(P21Label label) async {
    final preferences = await SharedPreferences.getInstance();
    final receipt = <String, Object?>{
      'id': DateTime.now().toUtc().microsecondsSinceEpoch.toString(),
      'startedAt': DateTime.now().toUtc().toIso8601String(),
      'layout': label.layoutVersion,
      'state': 'started',
    };
    // Persist before physical output. An interrupted 'started' receipt is never
    // retried automatically; it may already have produced a label.
    if (!await preferences.setString(
      'p21_last_print_v1',
      jsonEncode(receipt),
    )) {
      throw StateError('Could not save the print attempt. Try again.');
    }
    try {
      await _channel.invokeMethod<void>('printLabel', {
        'bitmap': label.bitmap,
        'rows': P21Label.feedDots,
        'widthMm': P21Label.widthMm,
        'lengthMm': P21Label.lengthMm,
      });
      receipt['state'] = 'sent';
    } catch (error) {
      receipt['state'] = 'failed';
      receipt['errorCode'] = error is PlatformException
          ? error.code
          : 'client_error';
      rethrow;
    } finally {
      receipt['endedAt'] = DateTime.now().toUtc().toIso8601String();
      try {
        final saved = await preferences.setString(
          'p21_last_print_v1',
          jsonEncode(receipt),
        );
        if (!saved) throw StateError('Receipt storage failed');
      } catch (_) {
        if (receipt['state'] == 'sent') {
          throw PlatformException(
            code: 'sent_receipt_failed',
            message:
                'The label was sent, but its receipt could not be saved. Check the label before printing again.',
          );
        }
        // Keep the original transport error and the durable started receipt.
      }
    }
  }

  Future<void> disconnect() => _channel.invokeMethod<void>('disconnect');
}
