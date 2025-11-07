import 'package:flutter/material.dart';

void showRetryBanner(BuildContext context, {required String message, required VoidCallback onRetry}) {
  final snack = SnackBar(
    content: Text(message),
    action: SnackBarAction(label: 'Retry', onPressed: onRetry),
  );
  ScaffoldMessenger.of(context).showSnackBar(snack);
}

