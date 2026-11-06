import 'dart:async';
import 'scanner_v5_identity_service.dart';

class ScannerV5ErrorCopy {
  const ScannerV5ErrorCopy({required this.title, required this.message});

  final String title;
  final String message;
}

ScannerV5ErrorCopy scannerV5UserFacingError(Object error) {
  if (error is ScannerV5SecureConnectionException) {
    return const ScannerV5ErrorCopy(
      title: 'Secure connection unavailable',
      message:
          'A secure connection to the scanner could not be verified. Try another network, or choose the card manually.',
    );
  }
  if (error is TimeoutException) {
    return const ScannerV5ErrorCopy(
      title: 'Scanner timed out',
      message: 'Scanner took too long. Check your connection and try again.',
    );
  }
  if (error is ScannerV5UnreachableException) {
    return const ScannerV5ErrorCopy(
      title: 'Scanner offline',
      message:
          "Can't reach the scanner service. Check your connection and try again.",
    );
  }
  if (error is ScannerV5HttpException) {
    if (error.statusCode >= 500) {
      return const ScannerV5ErrorCopy(
        title: 'Scanner service error',
        message: 'Scanner service error — try again in a moment.',
      );
    }
    return ScannerV5ErrorCopy(
      title: 'Scanner request failed',
      message: 'Scanner request failed with status ${error.statusCode}.',
    );
  }
  if (error is ScannerV5ProtocolException) {
    return const ScannerV5ErrorCopy(
      title: 'Scanner response error',
      message: 'Scanner returned an unexpected response.',
    );
  }
  return const ScannerV5ErrorCopy(
    title: 'Scanner error',
    message: 'Scanner could not complete this scan. Try again in a moment.',
  );
}
