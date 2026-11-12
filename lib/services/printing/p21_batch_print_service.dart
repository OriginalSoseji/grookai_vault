import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'p21_label.dart';
import 'p21_printer_service.dart';

/// One explicit, bounded batch. Never retries a label or resumes a prior job.
class P21BatchPrintService {
  static bool _running = false;
  static Future<void> send({
    required List<P21Label> labels,
    required P21PrinterService printer,
    required void Function(int) onSent,
    Future<void> Function(Duration)? wait,
  }) async {
    if (_running) {
      throw PlatformException(
        code: 'busy',
        message: 'A label batch is already running.',
      );
    }
    if (labels.isEmpty || labels.length > 50) {
      throw const FormatException('Choose between 1 and 50 labels.');
    }
    _running = true;
    final receipt = <String, dynamic>{
      'id': DateTime.now().toUtc().microsecondsSinceEpoch.toString(),
      'startedAt': DateTime.now().toUtc().toIso8601String(),
      'total': labels.length,
      'sent': 0,
      'attemptedIndex': null,
      'state': 'started',
    };
    SharedPreferences? preferences;
    Future<void> persist() async {
      if (!await preferences!.setString(
        'p21_last_batch_v1',
        jsonEncode(receipt),
      )) {
        throw StateError('Could not retain the batch receipt.');
      }
    }

    try {
      preferences = await SharedPreferences.getInstance();
      await persist();
      for (var index = 0; index < labels.length; index++) {
        var ready = false;
        for (var check = 0; check < 25; check++) {
          final status = await printer.status();
          if (!status.supportedRoll || status.state & 5 != 0) {
            throw PlatformException(
              code: 'printer_not_ready',
              message: status.problem,
            );
          }
          if (status.problem == null) {
            ready = true;
            break;
          }
          await (wait ?? Future<void>.delayed)(
            const Duration(milliseconds: 400),
          );
        }
        if (!ready) {
          throw PlatformException(
            code: 'printer_not_ready',
            message:
                'P21 is still busy. Check the physical labels before choosing the remaining copies.',
          );
        }
        receipt['attemptedIndex'] = index;
        receipt['state'] = 'sending';
        await persist();
        // The single-label service records its own receipt before this write.
        // Any exception stops the batch; the current label is never replayed.
        await printer.printLabel(labels[index]);
        receipt['sent'] = index + 1;
        receipt['state'] = 'in_progress';
        await persist();
        onSent(index + 1);
      }
      receipt['state'] = 'sent';
      await persist();
    } catch (error) {
      receipt['state'] = 'stopped';
      receipt['errorCode'] = error is PlatformException
          ? error.code
          : 'client_error';
      if (preferences != null) {
        try {
          await persist();
        } catch (_) {
          /* A prior started receipt remains; never replay. */
        }
      }
      rethrow;
    } finally {
      receipt['endedAt'] = DateTime.now().toUtc().toIso8601String();
      if (preferences != null) {
        try {
          await persist();
        } catch (_) {
          /* Transmission is not proof of physical output. */
        }
      }
      _running = false;
    }
  }
}
