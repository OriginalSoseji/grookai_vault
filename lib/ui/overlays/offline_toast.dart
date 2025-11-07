import 'package:flutter/material.dart';

void showOfflineToast(BuildContext context) {
  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('You are offline')));
}

