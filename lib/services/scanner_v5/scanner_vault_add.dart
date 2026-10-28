import 'package:flutter/foundation.dart';

/// Once the write succeeds, ancillary failures must never invite another write.
Future<T> commitScannerVaultAdd<T>({
  required Future<T> Function() commit,
  required Future<void> Function(T) afterCommit,
}) async {
  final result = await commit();
  try {
    await afterCommit(result).timeout(const Duration(seconds: 3));
  } catch (error) {
    debugPrint('[scanner_v5] post_commit_diagnostic_failed: $error');
  }
  return result;
}
