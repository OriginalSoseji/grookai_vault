import 'package:flutter/material.dart';
import 'package:grookai_vault/core/platform.dart';

void showToastSuccess(BuildContext context, String message) {
  if (isIOS) {
    final overlay = Overlay.of(context);
    final entry = OverlayEntry(builder: (_) => _Banner(message: message, color: Colors.green.shade700));
    overlay.insert(entry);
    Future.delayed(const Duration(seconds: 2), entry.remove);
  } else {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}

void showToastError(BuildContext context, String message) {
  if (isIOS) {
    final overlay = Overlay.of(context);
    final entry = OverlayEntry(builder: (_) => _Banner(message: message, color: Colors.red.shade700));
    overlay.insert(entry);
    Future.delayed(const Duration(seconds: 2), entry.remove);
  } else {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}

class _Banner extends StatelessWidget {
  final String message;
  final Color color;
  const _Banner({required this.message, required this.color});
  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 40,
      left: 16,
      right: 16,
      child: Material(
        color: color,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Text(message, style: const TextStyle(color: Colors.white)),
        ),
      ),
    );
  }
}

